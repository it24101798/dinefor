const Booking = require("../models/Booking");
const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const Review = require("../models/Review");

const bookingPopulate = [
  { path: "user", select: "name email role" },
  { path: "buffet", populate: { path: "hotel" } },
  { path: "checkedInBy", select: "name email role" },
];

const getMyHotel = async (req) => {
  if (req.user.role === "admin" && req.query.hotelId) return Hotel.findById(req.query.hotelId);
  return Hotel.findOne({ owner: req.user.id });
};

const getHotelBuffetIds = async (hotelId) => {
  const buffets = await Buffet.find({ hotel: hotelId }).select("_id");
  return buffets.map((buffet) => buffet._id);
};

const buildDateRangeFilter = (range) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (range === "today") return { $gte: startOfToday, $lte: endOfToday };
  if (range === "tomorrow") {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() + 1);
    const end = new Date(endOfToday);
    end.setDate(end.getDate() + 1);
    return { $gte: start, $lte: end };
  }
  if (range === "week") {
    const end = new Date(endOfToday);
    end.setDate(end.getDate() + 7);
    return { $gte: startOfToday, $lte: end };
  }
  if (range === "month") {
    const end = new Date(endOfToday);
    end.setMonth(end.getMonth() + 1);
    return { $gte: startOfToday, $lte: end };
  }
  return null;
};

const filterBookingsForQuery = (bookings, q) => {
  if (!q) return bookings;
  const needle = q.toLowerCase();
  return bookings.filter((booking) => {
    const haystack = [
      booking.bookingCode,
      booking.user?.name,
      booking.user?.email,
      booking.buffet?.title,
      booking.selectedTimeSlot?.startTime,
      booking.selectedTimeSlot?.endTime,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
};

exports.getSummary = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const buffets = await Buffet.find({ hotel: hotel._id }).sort({ createdAt: -1 });
    const buffetIds = buffets.map((buffet) => buffet._id);
    const bookings = await Booking.find({ buffet: { $in: buffetIds } }).populate(bookingPopulate).sort({ createdAt: -1 });
    const reviews = await Review.find({ hotel: hotel._id }).populate("user", "name email").populate("buffet", "title").sort({ createdAt: -1 });

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayBookings = bookings.filter((booking) => new Date(booking.selectedDate).toISOString().slice(0, 10) === todayKey);
    const activeBookings = bookings.filter((booking) => !["cancelled", "expired", "no_show"].includes(booking.bookingStatus));

    const summary = {
      hotel,
      stats: {
        totalBuffets: buffets.length,
        activeBuffets: buffets.filter((buffet) => buffet.isActive).length,
        totalBookings: bookings.length,
        todayBookings: todayBookings.length,
        checkedInToday: todayBookings.filter((booking) => ["checked_in", "dining", "completed"].includes(booking.bookingStatus)).length,
        upcomingBookings: bookings.filter((booking) => new Date(booking.selectedDate) >= new Date() && !["cancelled", "completed", "expired", "no_show"].includes(booking.bookingStatus)).length,
        revenue: activeBookings.reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0),
        averageRating: hotel.averageRating || 0,
        totalReviews: reviews.length,
      },
      recentBookings: bookings.slice(0, 6),
      recentReviews: reviews.slice(0, 6),
      topBuffets: [...buffets].sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0)).slice(0, 5),
    };

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: "Failed to load hotel portal summary.", error: error.message });
  }
};

exports.getReservations = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const buffetIds = await getHotelBuffetIds(hotel._id);
    const filter = { buffet: { $in: buffetIds } };

    const rangeFilter = buildDateRangeFilter(req.query.range);
    if (rangeFilter) filter.selectedDate = rangeFilter;
    if (req.query.status && req.query.status !== "all") filter.bookingStatus = req.query.status;
    if (req.query.paymentStatus && req.query.paymentStatus !== "all") filter.paymentStatus = req.query.paymentStatus;

    let bookings = await Booking.find(filter).populate(bookingPopulate).sort({ selectedDate: 1, createdAt: -1 });
    bookings = filterBookingsForQuery(bookings, req.query.q);

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to load hotel reservations.", error: error.message });
  }
};

exports.getReservationOperations = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const buffetIds = await getHotelBuffetIds(hotel._id);
    const bookings = await Booking.find({ buffet: { $in: buffetIds } }).populate(bookingPopulate).sort({ selectedDate: 1, createdAt: -1 });
    const todayKey = new Date().toISOString().slice(0, 10);

    const operational = {
      today: bookings.filter((booking) => new Date(booking.selectedDate).toISOString().slice(0, 10) === todayKey),
      upcoming: bookings.filter((booking) => new Date(booking.selectedDate) >= new Date() && !["cancelled", "completed", "expired", "no_show"].includes(booking.bookingStatus)),
      checkedIn: bookings.filter((booking) => ["checked_in", "dining"].includes(booking.bookingStatus)),
      completed: bookings.filter((booking) => booking.bookingStatus === "completed"),
      cancelled: bookings.filter((booking) => booking.bookingStatus === "cancelled"),
      expired: bookings.filter((booking) => ["expired", "no_show"].includes(booking.bookingStatus)),
    };

    const stats = {
      total: bookings.length,
      today: operational.today.length,
      upcoming: operational.upcoming.length,
      checkedIn: operational.checkedIn.length,
      completed: operational.completed.length,
      cancelled: operational.cancelled.length,
      revenue: bookings.filter((b) => !["cancelled", "expired", "no_show"].includes(b.bookingStatus)).reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0),
    };

    res.status(200).json({ stats, operational, bookings });
  } catch (error) {
    res.status(500).json({ message: "Failed to load reservation operations.", error: error.message });
  }
};

exports.getReservationCalendar = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const buffetIds = await getHotelBuffetIds(hotel._id);
    const start = req.query.start ? new Date(req.query.start) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = req.query.end ? new Date(req.query.end) : new Date(start);
    if (!req.query.end) end.setDate(end.getDate() + 14);
    end.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      buffet: { $in: buffetIds },
      selectedDate: { $gte: start, $lte: end },
    }).populate(bookingPopulate).sort({ selectedDate: 1 });

    const days = {};
    bookings.forEach((booking) => {
      const dateKey = new Date(booking.selectedDate).toISOString().slice(0, 10);
      if (!days[dateKey]) days[dateKey] = { dateKey, reservations: 0, seats: 0, revenue: 0, byStatus: {}, bookings: [] };
      days[dateKey].reservations += 1;
      days[dateKey].seats += Number(booking.seats || 0);
      days[dateKey].revenue += Number(booking.totalAmount || 0);
      days[dateKey].byStatus[booking.bookingStatus] = (days[dateKey].byStatus[booking.bookingStatus] || 0) + 1;
      days[dateKey].bookings.push(booking);
    });

    res.status(200).json(Object.values(days));
  } catch (error) {
    res.status(500).json({ message: "Failed to load reservation calendar.", error: error.message });
  }
};

exports.getBuffets = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const filter = { hotel: hotel._id };
    if (req.query.status === "active") filter.isActive = true;
    if (req.query.status === "paused") filter.isActive = false;
    if (req.query.category && req.query.category !== "all") filter.category = req.query.category;
    if (req.query.q) filter.title = { $regex: req.query.q, $options: "i" };

    const buffets = await Buffet.find(filter).sort({ createdAt: -1 });
    res.status(200).json(buffets);
  } catch (error) {
    res.status(500).json({ message: "Failed to load hotel buffets.", error: error.message });
  }
};

exports.updateBuffetStatus = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const buffet = await Buffet.findOneAndUpdate(
      { _id: req.params.id, hotel: hotel._id },
      { isActive: Boolean(req.body.isActive) },
      { new: true }
    );
    if (!buffet) return res.status(404).json({ message: "Buffet not found for your hotel." });

    res.status(200).json({ message: "Buffet status updated.", buffet });
  } catch (error) {
    res.status(500).json({ message: "Failed to update buffet status.", error: error.message });
  }
};

exports.duplicateBuffet = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const buffet = await Buffet.findOne({ _id: req.params.id, hotel: hotel._id }).lean();
    if (!buffet) return res.status(404).json({ message: "Buffet not found for your hotel." });

    delete buffet._id;
    delete buffet.createdAt;
    delete buffet.updatedAt;
    buffet.title = `${buffet.title} Copy`;
    buffet.isActive = false;
    buffet.averageRating = 0;
    buffet.totalReviews = 0;
    buffet.likesCount = 0;
    buffet.commentsCount = 0;

    const duplicated = await Buffet.create(buffet);
    res.status(201).json({ message: "Buffet duplicated successfully.", buffet: duplicated });
  } catch (error) {
    res.status(500).json({ message: "Failed to duplicate buffet.", error: error.message });
  }
};

exports.updateBuffetDetails = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const allowed = [
      "title",
      "category",
      "buffetType",
      "description",
      "price",
      "availableSeats",
      "scheduleType",
      "availableFromDate",
      "availableToDate",
      "specialDate",
      "recurringDays",
      "timeSlots",
      "images",
      "videos",
      "thumbnail",
      "isActive",
    ];

    const update = {};
    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) update[field] = req.body[field];
    });

    if (update.price !== undefined) update.price = Number(update.price || 0);
    if (update.availableSeats !== undefined) update.availableSeats = Number(update.availableSeats || 0);
    ["availableFromDate", "availableToDate", "specialDate"].forEach((field) => {
      if (update[field] === "") update[field] = null;
    });

    const buffet = await Buffet.findOneAndUpdate(
      { _id: req.params.id, hotel: hotel._id },
      update,
      { new: true, runValidators: true }
    );

    if (!buffet) return res.status(404).json({ message: "Buffet not found for your hotel." });
    res.status(200).json({ message: "Buffet details updated.", buffet });
  } catch (error) {
    res.status(500).json({ message: "Failed to update buffet details.", error: error.message });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const filter = { hotel: hotel._id };
    if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
    if (req.query.rating && req.query.rating !== "all") filter.rating = Number(req.query.rating);

    const reviews = await Review.find(filter).populate("user", "name email").populate("buffet", "title").sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to load hotel reviews.", error: error.message });
  }
};

exports.replyToReview = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, hotel: hotel._id },
      { hotelReply: { message: req.body.reply || "", repliedAt: new Date(), repliedBy: req.user.id } },
      { new: true }
    ).populate("user", "name email").populate("buffet", "title");

    if (!review) return res.status(404).json({ message: "Review not found for your hotel." });
    res.status(200).json({ message: "Review reply saved.", review });
  } catch (error) {
    res.status(500).json({ message: "Failed to save review reply.", error: error.message });
  }
};
