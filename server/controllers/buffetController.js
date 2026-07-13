const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");

// Create buffet
exports.createBuffet = async (req, res) => {
  try {
    const {
      title,
      buffetType,
      scheduleType,
      category,
      description,
      price,
      thumbnail,
      images,
      videos,
      recurringDays,
      availableFromDate,
      availableToDate,
      specialDate,
      timeSlots,
      location,
      status,
      highlights,
    } = req.body;

    if (!title || price === undefined || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({
        message: "Title, price and at least one time slot are required.",
      });
    }

    let hotelId = req.body.hotel;

    if (req.user.role !== "admin") {
      const myHotel = await Hotel.findOne({ owner: req.user.id });

      if (!myHotel) {
        return res.status(404).json({ message: "Hotel profile not found." });
      }

      if (!myHotel.isApproved || myHotel.status !== "approved") {
        return res.status(403).json({
          message: "Your hotel must be approved before creating buffets.",
        });
      }

      hotelId = myHotel._id;
    }

    const formattedSlots = timeSlots.map((slot) => {
      const totalSeats = Number(slot.totalSeats);
      const availableSeats =
        slot.availableSeats === undefined ? totalSeats : Number(slot.availableSeats);

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        totalSeats,
        availableSeats,
      };
    });

    if (formattedSlots.some((slot) => !slot.startTime || !slot.endTime || Number.isNaN(slot.totalSeats))) {
      return res.status(400).json({ message: "Invalid time slot data." });
    }

    const buffet = await Buffet.create({
      hotel: hotelId,
      title,
      buffetType,
      scheduleType,
      category,
      description,
      price: Number(price),
      thumbnail: thumbnail || images?.[0] || "",
      images: images || [],
      videos: videos || [],
      recurringDays: recurringDays || [],
      availableFromDate: availableFromDate || null,
      availableToDate: availableToDate || null,
      specialDate: specialDate || null,
      timeSlots: formattedSlots,
      location,
      status: ["draft", "active", "paused", "expired"].includes(status) ? status : "draft",
      isActive: status === "active",
      highlights: Array.isArray(highlights) ? highlights : [],
    });

    res.status(201).json({
      message: "Buffet created successfully.",
      buffet,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create buffet.",
      error: error.message,
    });
  }
};

// Public - all active buffets, featured first, highest rated second, newest third
exports.getBuffets = async (req, res) => {
  try {
    const buffets = await Buffet.find({
      isActive: true,
      $or: [{ status: "active" }, { status: { $exists: false } }],
    })
      .populate("hotel")
      .sort({ isFeatured: -1, averageRating: -1, createdAt: -1 });

    res.status(200).json(buffets);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch buffets.",
      error: error.message,
    });
  }
};

// Public - single buffet
exports.getBuffetById = async (req, res) => {
  try {
    const buffet = await Buffet.findById(req.params.id).populate("hotel");

    if (!buffet) {
      return res.status(404).json({ message: "Buffet not found." });
    }

    res.status(200).json(buffet);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch buffet.",
      error: error.message,
    });
  }
};

// Hotel - my buffets
exports.getMyBuffets = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.user.id });

    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found." });
    }

    const buffets = await Buffet.find({ hotel: hotel._id }).sort({
      createdAt: -1,
    });

    res.status(200).json(buffets);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch hotel buffets.",
      error: error.message,
    });
  }
};

// Hotel - delete own buffet
exports.deleteBuffet = async (req, res) => {
  try {
    const buffet = await Buffet.findById(req.params.id);

    if (!buffet) {
      return res.status(404).json({ message: "Buffet not found." });
    }

    if (req.user.role !== "admin") {
      const hotel = await Hotel.findOne({ owner: req.user.id });

      if (!hotel) {
        return res.status(404).json({ message: "Hotel not found." });
      }

      if (buffet.hotel.toString() !== hotel._id.toString()) {
        return res.status(403).json({ message: "Not authorized." });
      }
    }

    await buffet.deleteOne();

    res.status(200).json({ message: "Buffet deleted successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete buffet.",
      error: error.message,
    });
  }
};



// Hotel/Admin - update buffet media only
exports.updateBuffetMedia = async (req, res) => {
  try {
    const buffet = await Buffet.findById(req.params.id);

    if (!buffet) {
      return res.status(404).json({ message: "Buffet not found." });
    }

    if (req.user.role !== "admin") {
      const hotel = await Hotel.findOne({ owner: req.user.id });

      if (!hotel) {
        return res.status(404).json({ message: "Hotel profile not found." });
      }

      if (buffet.hotel.toString() !== hotel._id.toString()) {
        return res.status(403).json({ message: "You can update media only for your own buffet." });
      }
    }

    const allowedUpdates = ["thumbnail", "images", "videos"];
    allowedUpdates.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        buffet[field] = req.body[field];
      }
    });

    if (!buffet.thumbnail && buffet.images?.length) {
      buffet.thumbnail = buffet.images[0];
    }

    await buffet.save();

    res.status(200).json({
      message: "Buffet media updated successfully.",
      buffet,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update buffet media.",
      error: error.message,
    });
  }
};

// Admin - mark buffet as featured
exports.featureBuffet = async (req, res) => {
  try {
    const { featuredUntil } = req.body;

    const buffet = await Buffet.findByIdAndUpdate(
      req.params.id,
      {
        isFeatured: true,
        featuredUntil: featuredUntil || null,
      },
      { new: true }
    );

    if (!buffet) {
      return res.status(404).json({ message: "Buffet not found." });
    }

    res.status(200).json({
      message: "Buffet marked as featured.",
      buffet,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to feature buffet.",
      error: error.message,
    });
  }
};

// Admin - remove featured status
exports.unfeatureBuffet = async (req, res) => {
  try {
    const buffet = await Buffet.findByIdAndUpdate(
      req.params.id,
      {
        isFeatured: false,
        featuredUntil: null,
      },
      { new: true }
    );

    if (!buffet) {
      return res.status(404).json({ message: "Buffet not found." });
    }

    res.status(200).json({
      message: "Featured status removed.",
      buffet,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to unfeature buffet.",
      error: error.message,
    });
  }
};
