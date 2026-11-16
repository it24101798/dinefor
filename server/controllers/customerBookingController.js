const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Review = require("../models/Review");
const { normalizeCancellationPolicy, reservationDateTime } = require("../services/cancellationPolicyService");

const hotelFields = "hotelName city location mapLocation cancellationPolicy";
const bookingFields = "buffet bookingCode bookingStatus paymentStatus paymentMethod paymentMode paymentExpiresAt refundStatus seats selectedDate selectedTimeSlot totalAmount grandTotal qrUsed statusTimeline modificationCount rescheduleHistory";
const buffetProjection = { path: "buffet", select: "title category thumbnail images hotel", populate: { path: "hotel", select: hotelFields } };

function customerView(booking) {
  const { buffet, qrUsed, statusTimeline = [], modificationCount = 0, rescheduleHistory = [], ...details } = booking;
  const policy = normalizeCancellationPolicy(buffet?.hotel?.cancellationPolicy);
  const start = reservationDateTime(booking.selectedDate, booking.selectedTimeSlot?.startTime);
  const end = reservationDateTime(booking.selectedDate, booking.selectedTimeSlot?.endTime);
  if (start && end && end <= start) end.setUTCDate(end.getUTCDate() + 1);
  const held = booking.bookingStatus === "pending" && booking.paymentExpiresAt && booking.paymentMode && booking.paymentMode !== "pay_at_hotel" && booking.paymentStatus === "pending";
  const active = ["pending", "confirmed"].includes(booking.bookingStatus) && !qrUsed && !held;
  const rescheduleDeadline = start && new Date(start.getTime() - policy.rescheduleCutoffHours * 3600000);
  return {
    ...details,
    buffet: buffet ? {
      ...buffet,
      hotel: buffet.hotel && {
        _id: buffet.hotel._id, hotelName: buffet.hotel.hotelName, city: buffet.hotel.city,
        location: buffet.hotel.location, mapLocation: buffet.hotel.mapLocation,
      },
    } : null,
    statusTimeline: (statusTimeline || []).map(({ status, at }) => ({ status, at })),
    passAvailable: booking.bookingStatus === "confirmed" && !qrUsed && (!end || end > new Date()) && Boolean(booking.bookingCode),
    canCancel: active && Boolean(start && start > new Date()),
    canReschedule: active && policy.allowCustomerReschedule && Boolean(rescheduleDeadline && rescheduleDeadline > new Date())
      && Math.max(modificationCount, rescheduleHistory?.length || 0) < policy.maxCustomerReschedules,
    rescheduleDeadline,
  };
}

exports.listCustomerBookings = async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const bookings = await Booking.find({ user: req.user.id }).select(bookingFields).populate(buffetProjection).sort({ selectedDate: 1 }).lean();
  return res.json(bookings.map(customerView));
};

exports.getCustomerBooking = async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Booking not found." });
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id }).select(bookingFields).populate(buffetProjection).lean();
  if (!booking) return res.status(404).json({ message: "Booking not found." });
  const [payment, reviewed] = await Promise.all([
    Payment.findOne({ booking: booking._id, user: req.user.id }).select("gateway gatewayOrderId paidAmount amountDueAtHotel refundStatus status").lean(),
    booking.bookingStatus === "completed" ? Review.exists({ booking: booking._id, user: req.user.id }) : null,
  ]);
  return res.json({ ...customerView(booking), payment, canReview: Boolean(booking.buffet && booking.bookingStatus === "completed" && !reviewed) });
};
