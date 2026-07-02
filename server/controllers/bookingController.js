const Booking = require("../models/Booking");
const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const BuffetSeatInventory = require("../models/BuffetSeatInventory");
const Payment = require("../models/Payment");
const Coupon = require("../models/Coupon");
const mongoose = require("mongoose");
const { calculateTotals } = require("../utils/pricing");
const { generateInvoiceNumber } = require("../utils/invoiceGenerator");

const populateBooking = [
  { path: "user", select: "name email role" },
  { path: "buffet", populate: { path: "hotel" } },
  { path: "checkedInBy", select: "name email role" },
];

const normalizeDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const toUTCDate = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

const activeBookingStatuses = ["pending", "confirmed", "checked_in", "completed"];

const findSlot = (buffet, slotId) => {
  if (!buffet?.timeSlots) return null;
  return buffet.timeSlots.id(slotId) || buffet.timeSlots.find((slot) => String(slot._id) === String(slotId));
};

const getBookedSeatsForDateSlot = async ({ buffetId, dateKey, startTime, endTime }) => {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(`${dateKey}T23:59:59.999Z`);

  const result = await Booking.aggregate([
    {
      $match: {
        buffet: typeof buffetId === "string" ? new mongoose.Types.ObjectId(buffetId) : buffetId,
        selectedDate: { $gte: start, $lte: end },
        bookingStatus: { $in: activeBookingStatuses },
        "selectedTimeSlot.startTime": startTime,
        "selectedTimeSlot.endTime": endTime,
      },
    },
    { $group: { _id: null, seats: { $sum: "$seats" } } },
  ]);

  return Number(result?.[0]?.seats || 0);
};

const ensureInventory = async ({ buffet, dateKey, slot }) => {
  const slotId = String(slot._id);
  let inventory = await BuffetSeatInventory.findOne({ buffet: buffet._id, dateKey, slotId });
  if (inventory) return inventory;

  const bookedSeats = await getBookedSeatsForDateSlot({
    buffetId: buffet._id,
    dateKey,
    startTime: slot.startTime,
    endTime: slot.endTime,
  });

  const totalSeats = Number(slot.totalSeats || 0);
  const availableSeats = Math.max(totalSeats - bookedSeats, 0);

  try {
    inventory = await BuffetSeatInventory.create({
      buffet: buffet._id,
      dateKey,
      slotId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalSeats,
      availableSeats,
    });
  } catch (error) {
    if (error.code === 11000) {
      inventory = await BuffetSeatInventory.findOne({ buffet: buffet._id, dateKey, slotId });
    } else {
      throw error;
    }
  }

  return inventory;
};

const restoreSeatsForCancelledBooking = async (booking) => {
  const buffet = await Buffet.findById(booking.buffet?._id || booking.buffet);
  if (!buffet) return;

  const dateKey = normalizeDateKey(booking.selectedDate);
  const slot = buffet.timeSlots.find(
    (item) =>
      item.startTime === booking.selectedTimeSlot?.startTime &&
      item.endTime === booking.selectedTimeSlot?.endTime
  );

  if (!dateKey || !slot) return;

  const inventory = await ensureInventory({ buffet, dateKey, slot });
  inventory.availableSeats = Math.min(
    Number(inventory.totalSeats || 0),
    Number(inventory.availableSeats || 0) + Number(booking.seats || 0)
  );
  await inventory.save();
};

const parseSlotTime = (dateValue, timeText, fallbackHour = 23, fallbackMinute = 59) => {
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

const getBookingValidation = (booking) => {
  const now = new Date();
  const slotStart = parseSlotTime(booking.selectedDate, booking.selectedTimeSlot?.startTime, 0, 0);
  const slotEnd = parseSlotTime(booking.selectedDate, booking.selectedTimeSlot?.endTime, 23, 59);

  if (booking.qrUsed || booking.bookingStatus === "checked_in" || booking.bookingStatus === "completed") {
    return { canCheckIn: false, state: "used", label: "QR Already Used", reason: "This QR has already been claimed." };
  }

  if (booking.bookingStatus === "cancelled") {
    return { canCheckIn: false, state: "cancelled", label: "Cancelled", reason: "This booking is cancelled." };
  }

  if (booking.bookingStatus === "no_show") {
    return { canCheckIn: false, state: "no_show", label: "No-show", reason: "This booking is already marked as no-show." };
  }

  if (slotEnd && now > slotEnd) {
    return { canCheckIn: false, state: "expired", label: "Expired", reason: "The buffet time has already passed." };
  }

  if (slotStart) {
    const earlyWindow = new Date(slotStart.getTime() - 6 * 60 * 60 * 1000);
    if (now < earlyWindow) {
      return { canCheckIn: false, state: "too_early", label: "Too Early", reason: "This QR can be claimed only near the reservation time." };
    }
  }

  return { canCheckIn: true, state: "valid", label: "Valid QR", reason: "Ready for hotel check-in." };
};

const ensureHotelCanAccessBooking = async (req, booking) => {
  if (req.user.role === "admin") return true;

  const hotel = await Hotel.findOne({ owner: req.user.id });
  if (!hotel || String(booking.buffet?.hotel?._id) !== String(hotel._id)) return false;
  return true;
};

const validateBuffetDate = (buffet, bookingDate) => {
  const dateKey = normalizeDateKey(bookingDate);
  const requestedDay = bookingDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

  if (buffet.buffetType === "special" && buffet.specialDate) {
    const special = normalizeDateKey(buffet.specialDate);
    if (special !== dateKey) return `This special buffet is available only on ${special}.`;
  }

  if (buffet.buffetType === "regular") {
    if (buffet.availableFromDate && bookingDate < toUTCDate(normalizeDateKey(buffet.availableFromDate))) {
      return "Selected date is before this buffet starts.";
    }
    if (buffet.availableToDate && bookingDate > new Date(`${normalizeDateKey(buffet.availableToDate)}T23:59:59.999Z`)) {
      return "Selected date is after this buffet ends.";
    }
    if (buffet.scheduleType === "selected_days" && buffet.recurringDays?.length && !buffet.recurringDays.includes(requestedDay)) {
      return `This buffet is not available on ${requestedDay}.`;
    }
  }

  return "";
};

exports.getBuffetAvailability = async (req, res) => {
  try {
    const { buffetId } = req.params;
    const dateKey = normalizeDateKey(req.query.date);

    if (!dateKey) return res.status(400).json({ message: "Valid date is required." });

    const buffet = await Buffet.findById(buffetId).populate("hotel");
    if (!buffet) return res.status(404).json({ message: "Buffet not found." });

    const bookingDate = toUTCDate(dateKey);
    const dateError = validateBuffetDate(buffet, bookingDate);
    if (dateError) {
      return res.status(200).json({ dateKey, isAvailableDate: false, message: dateError, slots: [] });
    }

    const slots = await Promise.all(
      (buffet.timeSlots || []).map(async (slot) => {
        const inventory = await ensureInventory({ buffet, dateKey, slot });
        return {
          _id: String(slot._id),
          startTime: slot.startTime,
          endTime: slot.endTime,
          totalSeats: Number(inventory.totalSeats || slot.totalSeats || 0),
          availableSeats: Number(inventory.availableSeats || 0),
        };
      })
    );

    return res.status(200).json({ dateKey, isAvailableDate: true, slots });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch seat availability.", error: error.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const {
      buffetId,
      selectedDate,
      slotId,
      seats,
      notes,
      paymentMethod = "pay_at_hotel",
      couponCode = "",
    } = req.body;

    const allowedPaymentMethods = ["pay_at_hotel", "payhere", "stripe", "wallet", "card", "cash"];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method." });
    }

    if (paymentMethod !== "pay_at_hotel") {
      return res.status(400).json({
        message: "Online payment gateways are prepared but not enabled yet. Please use Pay at Hotel for this MVP version.",
      });
    }

    if (!buffetId || !selectedDate || !slotId || !seats) {
      return res.status(400).json({ message: "Please select a buffet date, a valid time slot, and at least 1 seat." });
    }

    const dateKey = normalizeDateKey(selectedDate);
    if (!dateKey) return res.status(400).json({ message: "Please select a valid booking date." });

    const bookingDate = toUTCDate(dateKey);
    const seatCount = Number(seats);
    if (!Number.isInteger(seatCount) || seatCount <= 0) return res.status(400).json({ message: "Seats must be at least 1." });

    const buffet = await Buffet.findById(buffetId).populate("hotel");
    if (!buffet) return res.status(404).json({ message: "Buffet not found." });
    if (!buffet.isActive) return res.status(400).json({ message: "This buffet is not active." });

    if (buffet.hotel?.status && buffet.hotel.status !== "approved") {
      return res.status(400).json({ message: "This hotel is not approved for public reservations yet." });
    }

    const selectedSlot = findSlot(buffet, slotId);
    if (!selectedSlot) return res.status(404).json({ message: "Selected time slot not found. Please refresh the page and select again." });

    const dateError = validateBuffetDate(buffet, bookingDate);
    if (dateError) return res.status(400).json({ message: dateError });

    let coupon = null;
    const normalizedCouponCode = String(couponCode || "").trim().toUpperCase();
    if (normalizedCouponCode) {
      coupon = await Coupon.findOne({ code: normalizedCouponCode, isActive: true });
      const now = new Date();
      if (!coupon) return res.status(400).json({ message: "Invalid or inactive coupon code." });
      if (coupon.startDate && now < coupon.startDate) return res.status(400).json({ message: "This coupon is not active yet." });
      if (coupon.endDate && now > coupon.endDate) return res.status(400).json({ message: "This coupon has expired." });
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ message: "This coupon usage limit has been reached." });
    }

    const totals = calculateTotals({ price: buffet.price, seats: seatCount, coupon });
    if (coupon && coupon.minimumSpend && totals.subtotal < coupon.minimumSpend) {
      return res.status(400).json({ message: `Minimum spend for this coupon is Rs. ${coupon.minimumSpend}.` });
    }

    await ensureInventory({ buffet, dateKey, slot: selectedSlot });

    const inventory = await BuffetSeatInventory.findOneAndUpdate(
      {
        buffet: buffet._id,
        dateKey,
        slotId: String(selectedSlot._id),
        availableSeats: { $gte: seatCount },
      },
      { $inc: { availableSeats: -seatCount } },
      { new: true }
    );

    if (!inventory) return res.status(400).json({ message: "Not enough seats available for this date and time slot." });

    try {
      const invoiceNumber = generateInvoiceNumber();
      const booking = await Booking.create({
        user: req.user.id,
        buffet: buffetId,
        selectedDate: bookingDate,
        selectedTimeSlot: { startTime: selectedSlot.startTime, endTime: selectedSlot.endTime },
        seats: seatCount,
        totalAmount: totals.grandTotal,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        serviceCharge: totals.serviceCharge,
        grandTotal: totals.grandTotal,
        commissionRate: totals.commissionRate,
        commissionAmount: totals.commissionAmount,
        hotelEarning: totals.hotelEarning,
        couponCode: normalizedCouponCode,
        bookingCode: `DF-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        invoiceNumber,
        bookingStatus: "confirmed",
        paymentStatus: paymentMethod === "pay_at_hotel" ? "pending" : "unpaid",
        paymentMethod,
        notes,
        statusTimeline: [
          { status: "confirmed", note: "Reservation created and awaiting payment collection/check-in.", by: req.user.id, at: new Date() },
        ],
      });

      await Payment.create({
        booking: booking._id,
        user: req.user.id,
        hotel: buffet.hotel?._id,
        amount: totals.grandTotal,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        serviceCharge: totals.serviceCharge,
        commissionRate: totals.commissionRate,
        commissionAmount: totals.commissionAmount,
        hotelEarning: totals.hotelEarning,
        gateway: paymentMethod,
        invoiceNumber,
        couponCode: normalizedCouponCode,
        status: paymentMethod === "pay_at_hotel" ? "pending" : "paid",
        metadata: {
          buffetTitle: buffet.title,
          hotelName: buffet.hotel?.hotelName,
          dateKey,
          slot: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
        },
      });

      if (coupon) {
        coupon.usedCount = Number(coupon.usedCount || 0) + 1;
        await coupon.save();
      }

      const populatedBooking = await Booking.findById(booking._id).populate(populateBooking);
      return res.status(201).json({
        message: "Reservation confirmed. Payment architecture, invoice, and QR are ready.",
        booking: populatedBooking,
        availability: inventory,
      });
    } catch (error) {
      await BuffetSeatInventory.findOneAndUpdate(
        { buffet: buffet._id, dateKey, slotId: String(selectedSlot._id) },
        { $inc: { availableSeats: seatCount } }
      );
      throw error;
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to create booking.", error: error.message });
  }
};

exports.myBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).populate(populateBooking).sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bookings.", error: error.message });
  }
};

exports.cancelMyBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.bookingStatus === "cancelled") return res.status(400).json({ message: "This booking is already cancelled." });
    if (booking.qrUsed || booking.bookingStatus === "checked_in" || booking.bookingStatus === "completed") {
      return res.status(400).json({ message: "Checked-in or completed bookings cannot be cancelled by the customer." });
    }
    if (booking.paymentStatus === "paid") return res.status(400).json({ message: "Paid bookings must be cancelled by the hotel or admin." });

    booking.bookingStatus = "cancelled";
    booking.cancelledBy = "customer";
    booking.cancelledAt = new Date();
    await booking.save();
    await restoreSeatsForCancelledBooking(booking);

    const populatedBooking = await Booking.findById(booking._id).populate(populateBooking);
    res.status(200).json({ message: "Booking cancelled successfully.", booking: populatedBooking });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel booking.", error: error.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate(populateBooking).sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch all bookings.", error: error.message });
  }
};

exports.getHotelBookings = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.user.id });
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const buffets = await Buffet.find({ hotel: hotel._id }).select("_id");
    const buffetIds = buffets.map((buffet) => buffet._id);
    const bookings = await Booking.find({ buffet: { $in: buffetIds } }).populate(populateBooking).sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hotel bookings.", error: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingStatus, paymentStatus } = req.body;
    const allowedBookingStatuses = ["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show"];
    const allowedPaymentStatuses = ["pending", "unpaid", "paid", "failed", "refunded", "cancelled", "expired"];

    if (bookingStatus && !allowedBookingStatuses.includes(bookingStatus)) return res.status(400).json({ message: "Invalid booking status." });
    if (paymentStatus && !allowedPaymentStatuses.includes(paymentStatus)) return res.status(400).json({ message: "Invalid payment status." });

    const booking = await Booking.findById(req.params.id).populate({ path: "buffet", populate: { path: "hotel" } });
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    const allowed = await ensureHotelCanAccessBooking(req, booking);
    if (!allowed) return res.status(403).json({ message: "Not allowed to update this booking." });

    const wasCancelled = booking.bookingStatus === "cancelled";

    if (bookingStatus && booking.bookingStatus !== bookingStatus) {
      booking.bookingStatus = bookingStatus;
      booking.statusTimeline = booking.statusTimeline || [];
      booking.statusTimeline.push({ status: bookingStatus, note: `Status changed to ${bookingStatus}.`, by: req.user.id, at: new Date() });
      if (bookingStatus === "completed") booking.completedAt = new Date();
      if (bookingStatus === "expired") booking.expiredAt = new Date();
    }
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    if (bookingStatus === "cancelled" && !wasCancelled) {
      booking.cancelledBy = req.user.role;
      booking.cancelledAt = new Date();
    }

    await booking.save();
    if (bookingStatus === "cancelled" && !wasCancelled) await restoreSeatsForCancelledBooking(booking);

    const populatedBooking = await Booking.findById(booking._id).populate(populateBooking);
    res.status(200).json({ message: "Booking updated successfully.", booking: populatedBooking });
  } catch (error) {
    res.status(500).json({ message: "Failed to update booking.", error: error.message });
  }
};

exports.verifyBookingByCode = async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingCode: req.params.code }).populate(populateBooking);
    if (!booking) return res.status(404).json({ message: "Booking not found for this QR code." });

    const allowed = await ensureHotelCanAccessBooking(req, booking);
    if (!allowed) return res.status(403).json({ message: "This booking does not belong to your hotel." });

    res.status(200).json({ booking, validation: getBookingValidation(booking) });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify booking QR.", error: error.message });
  }
};

exports.checkInBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({ path: "buffet", populate: { path: "hotel" } }).populate("user", "name email role");
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    const allowed = await ensureHotelCanAccessBooking(req, booking);
    if (!allowed) return res.status(403).json({ message: "Not allowed to check in this booking." });

    const validation = getBookingValidation(booking);
    if (!validation.canCheckIn) return res.status(400).json({ message: validation.reason, validation });

    booking.qrUsed = true;
    booking.qrUsedAt = new Date();
    booking.checkedInAt = new Date();
    booking.checkedInBy = req.user.id;
    booking.bookingStatus = "checked_in";
    booking.statusTimeline = booking.statusTimeline || [];
    booking.statusTimeline.push({ status: "checked_in", note: "Guest checked in by hotel QR desk.", by: req.user.id, at: new Date() });
    await booking.save();

    const populatedBooking = await Booking.findById(booking._id).populate(populateBooking);
    res.status(200).json({ message: "QR claimed successfully. Guest checked in.", booking: populatedBooking, validation: getBookingValidation(populatedBooking) });
  } catch (error) {
    res.status(500).json({ message: "Failed to check in booking.", error: error.message });
  }
};
