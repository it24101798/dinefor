const Booking = require("../models/Booking");
const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const Review = require("../models/Review");
const User = require("../models/User");

const safeNumber = (value) => Number(value || 0);

const monthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const buildLastMonths = (count = 6) => {
  const months = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    months.push({ key, label: d.toLocaleString("en-US", { month: "short", year: "numeric" }), bookings: 0, revenue: 0 });
  }

  return months;
};

const summarizeMonthly = (bookings) => {
  const months = buildLastMonths(6);
  const map = new Map(months.map((item) => [item.key, item]));

  bookings.forEach((booking) => {
    const key = monthKey(booking.createdAt || booking.selectedDate);
    if (!map.has(key)) return;

    const row = map.get(key);
    row.bookings += 1;
    if (booking.bookingStatus !== "cancelled") row.revenue += safeNumber(booking.totalAmount);
  });

  return months;
};

const summarizeTopBuffets = (bookings, limit = 5) => {
  const map = new Map();

  bookings.forEach((booking) => {
    const buffet = booking.buffet;
    if (!buffet || !buffet._id) return;

    const id = buffet._id.toString();
    if (!map.has(id)) {
      map.set(id, {
        id,
        title: buffet.title || "Untitled Buffet",
        hotelName: buffet.hotel?.hotelName || "Hotel",
        bookings: 0,
        seats: 0,
        revenue: 0,
      });
    }

    const row = map.get(id);
    row.bookings += 1;
    row.seats += safeNumber(booking.seats);
    if (booking.bookingStatus !== "cancelled") row.revenue += safeNumber(booking.totalAmount);
  });

  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings).slice(0, limit);
};

exports.getAdminAnalytics = async (req, res) => {
  try {
    const [hotels, buffets, bookings, reviews, users] = await Promise.all([
      Hotel.find().sort({ createdAt: -1 }),
      Buffet.find().populate("hotel", "hotelName location city"),
      Booking.find()
        .populate("user", "name email role")
        .populate({ path: "buffet", populate: { path: "hotel", select: "hotelName location city" } })
        .sort({ createdAt: -1 }),
      Review.find().populate("hotel", "hotelName").populate("buffet", "title").sort({ createdAt: -1 }),
      User.find().select("name email role createdAt"),
    ]);

    const activeBookings = bookings.filter((booking) => booking.bookingStatus !== "cancelled");
    const revenue = activeBookings.reduce((sum, booking) => sum + safeNumber(booking.totalAmount), 0);
    const seats = activeBookings.reduce((sum, booking) => sum + safeNumber(booking.seats), 0);
    const averageOrderValue = activeBookings.length ? Math.round(revenue / activeBookings.length) : 0;

    const approvedHotels = hotels.filter((hotel) => hotel.isApproved || hotel.status === "approved").length;
    const pendingHotels = hotels.filter((hotel) => !hotel.isApproved && hotel.status !== "approved").length;

    const topHotelsMap = new Map();
    activeBookings.forEach((booking) => {
      const hotel = booking.buffet?.hotel;
      if (!hotel?._id) return;
      const id = hotel._id.toString();
      if (!topHotelsMap.has(id)) {
        topHotelsMap.set(id, { id, hotelName: hotel.hotelName, bookings: 0, revenue: 0, seats: 0 });
      }
      const row = topHotelsMap.get(id);
      row.bookings += 1;
      row.revenue += safeNumber(booking.totalAmount);
      row.seats += safeNumber(booking.seats);
    });

    const recentBookings = bookings.slice(0, 8).map((booking) => ({
      id: booking._id,
      code: booking.bookingCode,
      customer: booking.user?.name || "Guest",
      buffet: booking.buffet?.title || "Buffet",
      hotel: booking.buffet?.hotel?.hotelName || "Hotel",
      status: booking.bookingStatus,
      seats: booking.seats,
      totalAmount: booking.totalAmount,
      createdAt: booking.createdAt,
    }));

    res.status(200).json({
      totals: {
        hotels: hotels.length,
        approvedHotels,
        pendingHotels,
        buffets: buffets.length,
        activeBuffets: buffets.filter((buffet) => buffet.isActive).length,
        bookings: bookings.length,
        activeBookings: activeBookings.length,
        customers: users.filter((user) => user.role === "customer").length,
        hotelUsers: users.filter((user) => user.role === "hotel").length,
        reviews: reviews.length,
        revenue,
        seats,
        averageOrderValue,
      },
      monthly: summarizeMonthly(bookings),
      topBuffets: summarizeTopBuffets(bookings, 6),
      topHotels: [...topHotelsMap.values()].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings).slice(0, 6),
      recentBookings,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load admin analytics.", error: error.message });
  }
};

exports.getHotelAnalytics = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.user.id });

    if (!hotel) {
      return res.status(404).json({ message: "Hotel profile not found." });
    }

    const buffets = await Buffet.find({ hotel: hotel._id }).sort({ createdAt: -1 });
    const buffetIds = buffets.map((buffet) => buffet._id);

    const [bookings, reviews] = await Promise.all([
      Booking.find({ buffet: { $in: buffetIds } })
        .populate("user", "name email")
        .populate({ path: "buffet", populate: { path: "hotel", select: "hotelName" } })
        .sort({ createdAt: -1 }),
      Review.find({ hotel: hotel._id }).populate("user", "name").populate("buffet", "title").sort({ createdAt: -1 }),
    ]);

    const activeBookings = bookings.filter((booking) => booking.bookingStatus !== "cancelled");
    const revenue = activeBookings.reduce((sum, booking) => sum + safeNumber(booking.totalAmount), 0);
    const seats = activeBookings.reduce((sum, booking) => sum + safeNumber(booking.seats), 0);
    const averageRating = reviews.length
      ? Number((reviews.reduce((sum, review) => sum + safeNumber(review.rating), 0) / reviews.length).toFixed(1))
      : 0;

    const upcomingBookings = bookings
      .filter((booking) => booking.bookingStatus !== "cancelled")
      .slice(0, 8)
      .map((booking) => ({
        id: booking._id,
        code: booking.bookingCode,
        customer: booking.user?.name || "Guest",
        buffet: booking.buffet?.title || "Buffet",
        date: booking.selectedDate,
        time: `${booking.selectedTimeSlot?.startTime || ""} - ${booking.selectedTimeSlot?.endTime || ""}`,
        seats: booking.seats,
        amount: booking.totalAmount,
        status: booking.bookingStatus,
      }));

    res.status(200).json({
      hotel: {
        id: hotel._id,
        hotelName: hotel.hotelName,
        status: hotel.status,
        isApproved: hotel.isApproved,
      },
      totals: {
        buffets: buffets.length,
        activeBuffets: buffets.filter((buffet) => buffet.isActive).length,
        bookings: bookings.length,
        activeBookings: activeBookings.length,
        revenue,
        seats,
        reviews: reviews.length,
        averageRating,
        averageOrderValue: activeBookings.length ? Math.round(revenue / activeBookings.length) : 0,
      },
      monthly: summarizeMonthly(bookings),
      topBuffets: summarizeTopBuffets(bookings, 5),
      upcomingBookings,
      recentReviews: reviews.slice(0, 6).map((review) => ({
        id: review._id,
        customer: review.user?.name || "Customer",
        buffet: review.buffet?.title || "Buffet",
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load hotel analytics.", error: error.message });
  }
};
