const Booking = require("../models/Booking");
const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const Review = require("../models/Review");
const Payment = require("../models/Payment");

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
    if (req.query.status === "active") filter.$or = [{ status: "active" }, { status: { $exists: false }, isActive: true }];
    if (req.query.status === "paused") filter.$or = [{ status: "paused" }, { status: { $exists: false }, isActive: false }];
    if (req.query.status === "draft") filter.status = "draft";
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
      {
        status: ["draft", "active", "paused", "expired"].includes(req.body.status)
          ? req.body.status
          : (req.body.isActive ? "active" : "paused"),
        status: ["draft", "active", "paused", "expired"].includes(req.body.status) ? req.body.status : "draft",
      isActive: req.body.status ? req.body.status === "active" : Boolean(req.body.isActive),
      },
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
    buffet.status = "draft";
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


exports.getPayments = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
    const payments = await Payment.find({ hotel: hotel._id })
      .populate("booking")
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: "Failed to load hotel payments.", error: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
    const buffetIds = await getHotelBuffetIds(hotel._id);
    const [bookings, buffets, reviews, payments] = await Promise.all([
      Booking.find({ buffet: { $in: buffetIds } }).populate("buffet", "title").sort({ createdAt: -1 }),
      Buffet.find({ hotel: hotel._id }).sort({ createdAt: -1 }),
      Review.find({ hotel: hotel._id }).sort({ createdAt: -1 }),
      Payment.find({ hotel: hotel._id }).sort({ createdAt: -1 }),
    ]);
    const validBookings = bookings.filter((b) => !["cancelled", "expired", "no_show"].includes(b.bookingStatus));
    const paidPayments = payments.filter((p) => p.status === "paid");
    const monthlyMap = {};
    validBookings.forEach((booking) => {
      const d = new Date(booking.selectedDate || booking.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, bookings: 0, seats: 0, revenue: 0 };
      monthlyMap[key].bookings += 1;
      monthlyMap[key].seats += Number(booking.seats || 0);
      monthlyMap[key].revenue += Number(booking.totalAmount || 0);
    });
    const buffetPerformance = buffets.map((buffet) => {
      const related = bookings.filter((b) => String(b.buffet?._id || b.buffet) === String(buffet._id));
      return {
        buffetId: buffet._id,
        title: buffet.title,
        bookings: related.length,
        seats: related.reduce((sum, b) => sum + Number(b.seats || 0), 0),
        revenue: related.filter((b) => !["cancelled", "expired", "no_show"].includes(b.bookingStatus)).reduce((sum, b) => sum + Number(b.totalAmount || 0), 0),
        rating: Number(buffet.averageRating || 0),
      };
    }).sort((a, b) => b.revenue - a.revenue);
    res.status(200).json({
      stats: {
        totalBookings: bookings.length,
        activeBookings: validBookings.length,
        totalSeats: validBookings.reduce((sum, b) => sum + Number(b.seats || 0), 0),
        grossRevenue: validBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0),
        collectedRevenue: paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
        totalBuffets: buffets.length,
        activeBuffets: buffets.filter((b) => b.isActive).length,
        totalReviews: reviews.length,
        averageRating: reviews.length ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length : 0,
      },
      monthlyTrend: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
      buffetPerformance,
      recentBookings: bookings.slice(0, 10),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load hotel analytics.", error: error.message });
  }
};

exports.createBuffet = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
    if (req.user.role !== "admin" && (!hotel.isApproved || hotel.status !== "approved")) {
      return res.status(403).json({ message: "Your hotel must be approved before creating buffets." });
    }
    const { title, price, timeSlots } = req.body;
    if (!title || price === undefined || !Array.isArray(timeSlots) || !timeSlots.length) {
      return res.status(400).json({ message: "Title, price and at least one time slot are required." });
    }

    const categoryAliases = {
      "high tea": "high-tea",
      "high-tea": "high-tea",
      "weekend buffet": "other",
    };
    const rawCategory = String(req.body.category || "other").trim().toLowerCase();
    const normalizedCategory = categoryAliases[rawCategory] || rawCategory.replace(/\s+/g, "-");
    const validCategories = new Set(["breakfast", "lunch", "dinner", "high-tea", "seafood", "bbq", "brunch", "other"]);

    const rawSchedule = String(req.body.scheduleType || "all_days");
    const normalizedScheduleType =
      rawSchedule === "daily" ? "all_days" :
      rawSchedule === "special" ? "one_day" :
      rawSchedule;

    const normalizedBuffetType = ["regular", "special"].includes(req.body.buffetType)
      ? req.body.buffetType
      : "special";

    const normalizedRecurringDays = Array.isArray(req.body.recurringDays)
      ? req.body.recurringDays.map((day) => String(day).charAt(0).toUpperCase() + String(day).slice(1).toLowerCase())
      : [];

    if (normalizedScheduleType === "selected_days" && normalizedRecurringDays.length === 0) {
      return res.status(400).json({ message: "Select at least one recurring day." });
    }

    if (normalizedScheduleType === "one_day" && !req.body.specialDate) {
      return res.status(400).json({ message: "Special date is required for a one-day buffet." });
    }

    if (
      req.body.availableFromDate &&
      req.body.availableToDate &&
      new Date(req.body.availableToDate) < new Date(req.body.availableFromDate)
    ) {
      return res.status(400).json({ message: "Available To date cannot be before Available From date." });
    }

    const normalizedSlots = timeSlots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalSeats: Number(slot.totalSeats),
      availableSeats: slot.availableSeats === undefined ? Number(slot.totalSeats) : Number(slot.availableSeats),
    }));
    if (normalizedSlots.some((slot) => !slot.startTime || !slot.endTime || !Number.isFinite(slot.totalSeats) || slot.totalSeats < 1)) {
      return res.status(400).json({ message: "Each time slot requires start time, end time and valid seat capacity." });
    }
    const buffet = await Buffet.create({
      ...req.body,
      hotel: hotel._id,
      title: String(title).trim(),
      price: Number(price),
      category: validCategories.has(normalizedCategory) ? normalizedCategory : "other",
      buffetType: normalizedBuffetType,
      scheduleType: ["all_days", "selected_days", "one_day", "custom"].includes(normalizedScheduleType)
        ? normalizedScheduleType
        : "all_days",
      recurringDays: normalizedRecurringDays,
      availableFromDate: req.body.availableFromDate || null,
      availableToDate: req.body.availableToDate || null,
      specialDate: normalizedScheduleType === "one_day" ? req.body.specialDate || null : null,
      timeSlots: normalizedSlots,
      thumbnail: req.body.thumbnail || req.body.images?.[0] || "",
      status: ["draft", "active", "paused", "expired"].includes(req.body.status) ? req.body.status : "draft",
      isActive: req.body.status ? req.body.status === "active" : Boolean(req.body.isActive),
    });
    res.status(201).json({ message: "Buffet created successfully.", buffet });
  } catch (error) {
    res.status(500).json({ message: "Failed to create buffet.", error: error.message });
  }
};

exports.updateBuffet = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
    const updates = { ...req.body };
    delete updates.hotel;
    delete updates._id;
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (Array.isArray(updates.timeSlots)) {
      updates.timeSlots = updates.timeSlots.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        totalSeats: Number(slot.totalSeats),
        availableSeats: slot.availableSeats === undefined ? Number(slot.totalSeats) : Number(slot.availableSeats),
      }));
    }
    if (updates.status) {
      if (!["draft", "active", "paused", "expired"].includes(updates.status)) {
        return res.status(400).json({ message: "Invalid buffet status." });
      }
      updates.isActive = updates.status === "active";
    }
    if (Array.isArray(updates.images)) updates.images = updates.images.filter(Boolean);
    if (Array.isArray(updates.videos)) updates.videos = updates.videos.filter(Boolean);
    if (Array.isArray(updates.highlights)) updates.highlights = updates.highlights.map((item) => String(item).trim()).filter(Boolean);
    if (!updates.thumbnail && updates.images?.length) updates.thumbnail = updates.images[0];
    const buffet = await Buffet.findOneAndUpdate({ _id: req.params.id, hotel: hotel._id }, updates, { new: true, runValidators: true });
    if (!buffet) return res.status(404).json({ message: "Buffet not found for your hotel." });
    res.status(200).json({ message: "Buffet updated successfully.", buffet });
  } catch (error) {
    res.status(500).json({ message: "Failed to update buffet.", error: error.message });
  }
};

exports.deleteBuffet = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
    const buffet = await Buffet.findOne({ _id: req.params.id, hotel: hotel._id });
    if (!buffet) return res.status(404).json({ message: "Buffet not found for your hotel." });
    const activeBookings = await Booking.countDocuments({ buffet: buffet._id, bookingStatus: { $in: ["pending", "confirmed", "checked_in", "dining"] } });
    if (activeBookings > 0) return res.status(409).json({ message: "This buffet has active reservations. Pause it instead of deleting it." });
    await buffet.deleteOne();
    res.status(200).json({ message: "Buffet deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete buffet.", error: error.message });
  }
};

exports.featureBuffet = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
    const buffet = await Buffet.findOneAndUpdate(
      { _id: req.params.id, hotel: hotel._id },
      { isFeatured: Boolean(req.body.isFeatured) },
      { new: true }
    );
    if (!buffet) return res.status(404).json({ message: "Buffet not found for your hotel." });
    res.status(200).json({ message: "Buffet featured status updated.", buffet });
  } catch (error) {
    res.status(500).json({ message: "Failed to update featured status.", error: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
    const buffetIds = await getHotelBuffetIds(hotel._id);
    const allowed = ["pending", "confirmed", "checked_in", "dining", "completed", "cancelled", "no_show", "expired"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid booking status." });
    const booking = await Booking.findOne({ _id: req.params.id, buffet: { $in: buffetIds } });
    if (!booking) return res.status(404).json({ message: "Booking not found for your hotel." });
    booking.bookingStatus = req.body.status;
    if (req.body.status === "completed") booking.completedAt = new Date();
    if (req.body.status === "cancelled") { booking.cancelledAt = new Date(); booking.cancelledBy = req.user.role === "admin" ? "admin" : "hotel"; }
    booking.statusTimeline.push({ status: req.body.status, note: req.body.note || "Updated by hotel portal", by: req.user.id });
    await booking.save();
    await booking.populate(bookingPopulate);
    res.status(200).json({ message: "Booking status updated.", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to update booking status.", error: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const hotel = await getMyHotel(req);
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
    const buffetIds = await getHotelBuffetIds(hotel._id);
    const booking = await Booking.findOne({ _id: req.params.id, buffet: { $in: buffetIds } });
    if (!booking) return res.status(404).json({ message: "Booking not found for your hotel." });
    if (!["cancelled", "expired", "no_show"].includes(booking.bookingStatus)) {
      return res.status(409).json({ message: "Only cancelled, expired or no-show reservations can be deleted." });
    }
    await Payment.deleteMany({ booking: booking._id });
    await booking.deleteOne();
    res.status(200).json({ message: "Booking removed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete booking.", error: error.message });
  }
};
