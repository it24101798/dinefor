const User = require("../models/User");
const Hotel = require("../models/Hotel");
const Buffet = require("../models/Buffet");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const Payment = require("../models/Payment");
const SystemSetting = require("../models/SystemSetting");
let ActivityLog;
try { ActivityLog = require("../models/ActivityLog"); } catch { ActivityLog = null; }

const populateBooking = [
  { path: "user", select: "name email role phone" },
  { path: "buffet", populate: { path: "hotel", select: "hotelName location city owner" } },
];

const moneySum = (items, field = "totalAmount") => items.reduce((sum, item) => sum + Number(item?.[field] || 0), 0);

const dateRange = (period = "month") => {
  const end = new Date();
  const start = new Date(end);
  if (period === "today") start.setHours(0, 0, 0, 0);
  else if (period === "week") start.setDate(end.getDate() - 7);
  else if (period === "year") start.setFullYear(end.getFullYear() - 1);
  else start.setMonth(end.getMonth() - 1);
  return { start, end };
};

const writeActivity = async (req, action, entityType, entityId, message, metadata = {}) => {
  try {
    if (!ActivityLog) return;
    await ActivityLog.create({
      actor: req.user?.id || null,
      actorRole: req.user?.role || "admin",
      action,
      entityType,
      entityId,
      message,
      metadata,
    });
  } catch {
    // never block admin operations because of logs
  }
};

exports.getAdminOverview = async (req, res) => {
  try {
    const period = req.query.period || "month";
    const { start } = dateRange(period);

    const [users, hotels, buffets, bookings, reviews, payments] = await Promise.all([
      User.find().select("name email role isApproved createdAt").sort({ createdAt: -1 }).limit(10),
      Hotel.find().populate("owner", "name email role").sort({ createdAt: -1 }),
      Buffet.find().populate("hotel", "hotelName location city").sort({ createdAt: -1 }),
      Booking.find().populate(populateBooking).sort({ createdAt: -1 }).limit(1000),
      Review.find().populate("user", "name email").populate("hotel", "hotelName").populate("buffet", "title").sort({ createdAt: -1 }).limit(100),
      Payment.find().sort({ createdAt: -1 }).limit(1000),
    ]);

    const activeBookings = bookings.filter((b) => !["cancelled", "expired", "no_show"].includes(b.bookingStatus));
    const periodBookings = activeBookings.filter((b) => new Date(b.createdAt) >= start);
    const activePayments = payments.filter((p) => ["paid", "pending"].includes(p.status));

    const byHotelStatus = hotels.reduce((acc, hotel) => {
      const status = hotel.status || (hotel.isApproved ? "approved" : "pending");
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const byBookingStatus = bookings.reduce((acc, booking) => {
      acc[booking.bookingStatus] = (acc[booking.bookingStatus] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      summary: {
        users: await User.countDocuments(),
        customers: await User.countDocuments({ role: "customer" }),
        hotelUsers: await User.countDocuments({ role: "hotel" }),
        admins: await User.countDocuments({ role: "admin" }),
        hotels: hotels.length,
        pendingHotels: hotels.filter((h) => (h.status || "pending") === "pending").length,
        approvedHotels: hotels.filter((h) => h.status === "approved" || h.isApproved).length,
        buffets: buffets.length,
        activeBuffets: buffets.filter((b) => b.isActive).length,
        featuredBuffets: buffets.filter((b) => b.isFeatured).length,
        bookings: bookings.length,
        periodBookings: periodBookings.length,
        grossReservationValue: moneySum(activeBookings),
        periodReservationValue: moneySum(periodBookings),
        paymentValue: moneySum(activePayments, "amount"),
        platformCommission: moneySum(activePayments, "commissionAmount"),
        reviews: await Review.countDocuments(),
        hiddenReviews: await Review.countDocuments({ status: "hidden" }),
      },
      breakdown: { hotelStatus: byHotelStatus, bookingStatus: byBookingStatus },
      recent: {
        users,
        hotels: hotels.slice(0, 8),
        buffets: buffets.slice(0, 8),
        bookings: bookings.slice(0, 8),
        reviews: reviews.slice(0, 8),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load admin overview.", error: error.message });
  }
};

exports.getAdminUsers = async (req, res) => {
  try {
    const { role = "all", q = "" } = req.query;
    const filter = {};
    if (role !== "all") filter.role = role;
    if (q.trim()) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to load users.", error: error.message });
  }
};

exports.updateUserApproval = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot change your own approval state." });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: Boolean(req.body.isApproved) },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    await writeActivity(req, "admin_user_approval_updated", "user", user._id, `User approval updated for ${user.email}.`, { isApproved: user.isApproved });
    res.status(200).json({ message: "User approval updated.", user });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user approval.", error: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["customer", "hotel", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot change your own role." });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    await writeActivity(req, "admin_user_role_updated", "user", user._id, `User role updated for ${user.email}.`, { role });
    res.status(200).json({ message: "User role updated.", user });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user role.", error: error.message });
  }
};

exports.getAdminBookings = async (req, res) => {
  try {
    const { status = "all", paymentStatus = "all", q = "" } = req.query;
    const filter = {};
    if (status !== "all") filter.bookingStatus = status;
    if (paymentStatus !== "all") filter.paymentStatus = paymentStatus;

    let bookings = await Booking.find(filter).populate(populateBooking).sort({ createdAt: -1 });
    if (q.trim()) {
      const needle = q.toLowerCase();
      bookings = bookings.filter((booking) => [
        booking.bookingCode,
        booking.invoiceNumber,
        booking.user?.name,
        booking.user?.email,
        booking.buffet?.title,
        booking.buffet?.hotel?.hotelName,
      ].filter(Boolean).join(" ").toLowerCase().includes(needle));
    }
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to load admin bookings.", error: error.message });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    if (!ActivityLog) return res.status(200).json([]);
    const logs = await ActivityLog.find().populate("actor", "name email role").sort({ createdAt: -1 }).limit(Number(req.query.limit || 100));
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to load activity logs.", error: error.message });
  }
};

exports.getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.find().populate("updatedBy", "name email role").sort({ group: 1, key: 1 });
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to load system settings.", error: error.message });
  }
};

exports.upsertSystemSetting = async (req, res) => {
  try {
    const { key, value, group = "general" } = req.body;
    if (!key) return res.status(400).json({ message: "Setting key is required." });
    const setting = await SystemSetting.findOneAndUpdate(
      { key },
      { value, group, updatedBy: req.user.id },
      { new: true, upsert: true, runValidators: true }
    );
    await writeActivity(req, "admin_system_setting_updated", "system_setting", setting._id, `System setting ${key} updated.`, { key, group });
    res.status(200).json({ message: "System setting saved.", setting });
  } catch (error) {
    res.status(500).json({ message: "Failed to save system setting.", error: error.message });
  }
};
