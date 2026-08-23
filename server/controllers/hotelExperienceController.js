const Hotel = require("../models/Hotel");
const Buffet = require("../models/Buffet");
const Review = require("../models/Review");
const { findByIdentifier } = require("../utils/seoSlug");

const getMediaUrl = (url) => url || "";

const buildGallery = (hotel) => {
  const gallery = [];

  if (hotel.coverMediaUrl) {
    gallery.push({ url: getMediaUrl(hotel.coverMediaUrl), type: hotel.coverMediaType || "image", role: "cover" });
  }

  (hotel.galleryImages || hotel.images || []).forEach((url) => {
    if (url) gallery.push({ url: getMediaUrl(url), type: "image", role: "gallery" });
  });

  (hotel.videos || []).forEach((url) => {
    if (url) gallery.push({ url: getMediaUrl(url), type: "video", role: "video" });
  });

  return gallery;
};

const calculateReviewSummary = (reviews) => {
  const total = reviews.length;
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  reviews.forEach((review) => {
    const rating = Math.max(1, Math.min(5, Number(review.rating || 0)));
    distribution[rating] += 1;
  });

  const average = total
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total
    : 0;

  return {
    average: Number(average.toFixed(1)),
    total,
    distribution,
    label: average >= 4.5 ? "Excellent" : average >= 4 ? "Very good" : average >= 3 ? "Good" : total ? "Needs improvement" : "No reviews yet",
  };
};

exports.getHotelExperience = async (req, res) => {
  try {
    const hotelQuery = await findByIdentifier(Hotel, req.params.id);
    const hotel = hotelQuery ? await hotelQuery.populate("owner", "name email role") : null;

    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found." });
    }

    const [buffets, reviews, similarHotels] = await Promise.all([
      Buffet.find({ hotel: hotel._id, isActive: true }).populate("hotel").sort({ isFeatured: -1, averageRating: -1, createdAt: -1 }),
      Review.find({ hotel: hotel._id, status: "published" }).populate("user", "name avatarUrl city").populate("buffet", "title").sort({ createdAt: -1 }).limit(30),
      Hotel.find({
        _id: { $ne: hotel._id },
        isApproved: true,
        status: "approved",
        $or: [
          { city: hotel.city || hotel.location },
          { location: hotel.location },
          { province: hotel.province },
        ],
      })
        .sort({ featured: -1, averageRating: -1, totalReviews: -1 })
        .limit(6),
    ]);

    const gallery = buildGallery(hotel);
    const reviewSummary = calculateReviewSummary(reviews);

    res.status(200).json({
      hotel,
      gallery,
      buffets,
      reviews,
      reviewSummary,
      similarHotels,
      contactActions: {
        phone: hotel.contactNumber || "",
        email: hotel.email || "",
        directions: hotel.mapLocation?.googleMapUrl || "",
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hotel experience.", error: error.message });
  }
};

exports.getHotelGallery = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ message: "Hotel not found." });
    res.status(200).json(buildGallery(hotel));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hotel gallery.", error: error.message });
  }
};

exports.getHotelBuffets = async (req, res) => {
  try {
    const buffets = await Buffet.find({ hotel: req.params.id, isActive: true }).populate("hotel").sort({ isFeatured: -1, averageRating: -1, createdAt: -1 });
    res.status(200).json(buffets);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hotel buffets.", error: error.message });
  }
};

exports.getSimilarHotels = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ message: "Hotel not found." });

    const hotels = await Hotel.find({
      _id: { $ne: hotel._id },
      isApproved: true,
      status: "approved",
      $or: [
        { city: hotel.city || hotel.location },
        { location: hotel.location },
        { province: hotel.province },
      ],
    })
      .sort({ featured: -1, averageRating: -1, totalReviews: -1 })
      .limit(8);

    res.status(200).json(hotels);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch similar hotels.", error: error.message });
  }
};
