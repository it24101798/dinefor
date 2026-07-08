const Booking = require("../models/Booking");
const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const Notification = require("../models/Notification");
const BuffetSeatInventory = require("../models/BuffetSeatInventory");

const ACTIVE_STATUSES = ["pending", "pending_payment", "confirmed", "reminder_sent", "checked_in", "dining"];
const CLOSED_STATUSES = ["completed", "cancelled", "cancelled_by_customer", "cancelled_by_hotel", "expired", "no_show"];

const normalizeDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const parseSlotDateTime = (dateValue, timeText, fallbackHour = 23, fallbackMinute = 59) => {
  const base = new Date(dateValue);
  if (Number.isNaN(base.getTime())) return null;
  const time = String(timeText || "").trim();
  let hours = fallbackHour;
  let minutes = fallbackMinute;
  const match12 = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(A\.?M\.?|P\.?M\.?)$/i);
  const match24 = time.match(/^(\d{1,2})(?::(\d{2}))$/);
  if (match12) {
    hours = Number(match12[1]);
    minutes = Number(match12[2] || 0);
    const period = match12[3].toUpperCase();
    if (period.startsWith("P") && hours !== 12) hours += 12;
    if (period.startsWith("A") && hours === 12) hours = 0;
  } else if (match24) {
    hours = Number(match24[1]);
    minutes = Number(match24[2] || 0);
  }
  base.setHours(hours, minutes, 0, 0);
  return base;
};

const restoreSeats = async (booking) => {
  const buffet = await Buffet.findById(booking.buffet?._id || booking.buffet);
  if (!buffet) return;

  const dateKey = normalizeDateKey(booking.selectedDate);
  const slot = buffet.timeSlots.find(
    (item) => item.startTime === booking.selectedTimeSlot?.startTime && item.endTime === booking.selectedTimeSlot?.endTime
  );
  if (!dateKey || !slot) return;

  const inventory = await BuffetSeatInventory.findOne({ buffet: buffet._id, dateKey, slotId: String(slot._id) });
  if (!inventory) return;

  inventory.availableSeats = Math.min(Number(inventory.totalSeats || 0), Number(inventory.availableSeats || 0) + Number(booking.seats || 0));
  await inventory.save();
};

const canAccessBooking = async (req, booking) => {
  if (req.user.role === "admin") return true;
  if (req.user.role === "customer") return String(booking.user?._id || booking.user) === String(req.user.id);
  const hotel = await Hotel.findOne({ owner: req.user.id }).select("_id");
  return hotel && String(booking.buffet?.hotel?._id || booking.buffet?.hotel) === String(hotel._id);
};

const pushTimeline = (booking, status, note, userId) => {
  booking.statusTimeline = booking.statusTimeline || [];
  booking.statusTimeline.push({ status, note, by: userId || null, at: new Date() });
};

exports.getBookingTimeline = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email role")
      .populate({ path: "buffet", populate: { path: "hotel" } });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (!(await canAccessBooking(req, booking))) return res.status(403).json({ message: "Not allowed to view this booking." });

    const timeline = (booking.statusTimeline || []).sort((a, b) => new Date(a.at) - new Date(b.at));
    res.status(200).json({ bookingId: booking._id, bookingCode: booking.bookingCode, currentStatus: booking.bookingStatus, timeline });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch booking timeline.", error: error.message });
  }
};

exports.transitionBooking = async (req, res) => {
  try {
    const { status, paymentStatus, note = "" } = req.body;
    const allowedStatuses = [
      "pending",
      "pending_payment",
      "confirmed",
      "reminder_sent",
      "checked_in",
      "dining",
      "completed",
      "cancelled",
      "cancelled_by_customer",
      "cancelled_by_hotel",
      "refund_pending",
      "refund_completed",
      "expired",
      "no_show",
    ];
    const allowedPayments = ["pending", "unpaid", "paid", "failed", "refunded", "cancelled", "expired"];
    if (status && !allowedStatuses.includes(status)) return res.status(400).json({ message: "Invalid booking status." });
    if (paymentStatus && !allowedPayments.includes(paymentStatus)) return res.status(400).json({ message: "Invalid payment status." });

    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email role")
      .populate({ path: "buffet", populate: { path: "hotel" } });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (!(await canAccessBooking(req, booking))) return res.status(403).json({ message: "Not allowed to update this booking." });

    const previousStatus = booking.bookingStatus;
    if (status && previousStatus !== status) {
      if (req.user.role === "customer" && !["cancelled", "cancelled_by_customer"].includes(status)) {
        return res.status(403).json({ message: "Customers can only cancel their own booking." });
      }
      booking.bookingStatus = status;
      pushTimeline(booking, status, note || `Status changed from ${previousStatus} to ${status}.`, req.user.id);
      if (status === "checked_in") {
        booking.qrUsed = true;
        booking.qrUsedAt = booking.qrUsedAt || new Date();
        booking.checkedInAt = booking.checkedInAt || new Date();
        booking.checkedInBy = req.user.id;
      }
      if (status === "completed") booking.completedAt = new Date();
      if (status === "expired") booking.expiredAt = new Date();
      if (["cancelled", "cancelled_by_customer", "cancelled_by_hotel"].includes(status)) {
        booking.cancelledBy = status === "cancelled_by_customer" ? "customer" : status === "cancelled_by_hotel" ? "hotel" : req.user.role;
        booking.cancelledAt = new Date();
      }
    }
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    await booking.save();

    if (status && CLOSED_STATUSES.includes(status) && !CLOSED_STATUSES.includes(previousStatus)) await restoreSeats(booking);

    res.status(200).json({ message: "Booking lifecycle updated.", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to update booking lifecycle.", error: error.message });
  }
};

exports.expireOpenBookings = async (req, res) => {
  try {
    const now = new Date();
    const candidates = await Booking.find({ bookingStatus: { $in: ACTIVE_STATUSES } })
      .populate("user", "name email")
      .populate({ path: "buffet", populate: { path: "hotel" } })
      .limit(500);

    const expired = [];
    for (const booking of candidates) {
      const slotEnd = parseSlotDateTime(booking.selectedDate, booking.selectedTimeSlot?.endTime, 23, 59);
      if (!slotEnd || now <= slotEnd) continue;
      const oldStatus = booking.bookingStatus;
      booking.bookingStatus = booking.qrUsed ? "completed" : "expired";
      booking.expiredAt = booking.bookingStatus === "expired" ? now : booking.expiredAt;
      if (booking.bookingStatus === "completed") booking.completedAt = booking.completedAt || now;
      pushTimeline(booking, booking.bookingStatus, `Automatically closed after buffet slot ended. Previous status: ${oldStatus}.`, null);
      await booking.save();
      if (booking.bookingStatus === "expired") await restoreSeats(booking);
      expired.push({ id: booking._id, bookingCode: booking.bookingCode, status: booking.bookingStatus });
    }

    res.status(200).json({ message: "Open bookings checked successfully.", checked: candidates.length, updated: expired.length, bookings: expired });
  } catch (error) {
    res.status(500).json({ message: "Failed to expire open bookings.", error: error.message });
  }
};

exports.queueBookingReminders = async (req, res) => {
  try {
    const now = new Date();
    const next24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const next3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const bookings = await Booking.find({ bookingStatus: { $in: ["confirmed", "reminder_sent"] } })
      .populate("user", "name email")
      .populate({ path: "buffet", populate: { path: "hotel" } })
      .limit(500);

    let queued24h = 0;
    let queued3h = 0;

    for (const booking of bookings) {
      const slotStart = parseSlotDateTime(booking.selectedDate, booking.selectedTimeSlot?.startTime, 0, 0);
      if (!slotStart || slotStart < now) continue;
      const notificationSent = booking.notificationSent || {};

      if (!notificationSent.reminder24h && slotStart <= next24) {
        await Notification.create({
          recipient: booking.user?._id || booking.user,
          hotel: booking.buffet?.hotel?._id || booking.buffet?.hotel || null,
          booking: booking._id,
          type: "booking_reminder_24h",
          channel: "in_app",
          title: "Reservation reminder",
          message: `Your DineFor reservation ${booking.bookingCode} is coming up soon.`,
          status: "sent",
          sentAt: now,
        });
        booking.notificationSent.reminder24h = true;
        queued24h += 1;
      }
      if (!notificationSent.reminder3h && slotStart <= next3) {
        await Notification.create({
          recipient: booking.user?._id || booking.user,
          hotel: booking.buffet?.hotel?._id || booking.buffet?.hotel || null,
          booking: booking._id,
          type: "booking_reminder_3h",
          channel: "in_app",
          title: "Buffet starts soon",
          message: `Your reservation ${booking.bookingCode} starts within a few hours.`,
          status: "sent",
          sentAt: now,
        });
        booking.notificationSent.reminder3h = true;
        booking.bookingStatus = "reminder_sent";
        pushTimeline(booking, "reminder_sent", "Automatic reminder queued/sent.", null);
        queued3h += 1;
      }
      await booking.save();
    }

    res.status(200).json({ message: "Booking reminders processed.", checked: bookings.length, queued24h, queued3h });
  } catch (error) {
    res.status(500).json({ message: "Failed to process booking reminders.", error: error.message });
  }
};
