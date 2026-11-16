const { hotelBookingView } = require("../services/hotelPortalViews");
const { readGuestDetails } = require("../utils/reservationDetails");
const Booking = require("../models/Booking");
const { restoreInventorySeats } = require("../services/seatReleaseService");
const User = require("../models/User");
const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const BuffetSeatInventory = require("../models/BuffetSeatInventory");
const Payment = require("../models/Payment");
const Coupon = require("../models/Coupon");
const mongoose = require("mongoose");
const { calculateTotals, calculatePaymentBreakdown } = require("../utils/pricing");
const { generateInvoiceNumber } = require("../utils/invoiceGenerator");
const { communicateBookingEvent } = require("../services/bookingCommunicationService");
const { recordTransaction } = require("../services/paymentTransactionService");
const { sandboxEnabled } = require("../services/checkoutSandbox");
const { createHash } = require("node:crypto");
const { normalizeCancellationPolicy, hoursUntilReservation, reservationDateTime } = require("../services/cancellationPolicyService");

const populateBooking = [
  { path: "user", select: "name email role" },
  { path: "buffet", populate: { path: "hotel" } },
  { path: "checkedInBy", select: "name email role" },
];

const customerBookingPopulate = {
  path: "buffet",
  select: "-__v",
  populate: { path: "hotel", select: "hotelName location city mapLocation coverImage logo cancellationPolicy application.cancellationPolicy application.refundPolicy" },
};

const normalizeDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const toUTCDate = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

const activeBookingStatuses = ["pending", "confirmed", "checked_in", "dining", "completed"];

const findSlot = (buffet, slotId) => {
  if (!buffet?.timeSlots) return null;
  return buffet.timeSlots.id(slotId) || buffet.timeSlots.find((slot) => String(slot._id) === String(slotId));
};

const getBookedSeatsForDateSlot = async ({ buffetId, dateKey, startTime, endTime, session = null }) => {
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
  ]).session(session);

  return Number(result?.[0]?.seats || 0);
};

const ensureInventory = async ({ buffet, dateKey, slot, session = null }) => {
  const slotId = String(slot._id);
  let inventory = await BuffetSeatInventory.findOne({ buffet: buffet._id, dateKey, slotId }).session(session);
  if (inventory) return inventory;

  const bookedSeats = await getBookedSeatsForDateSlot({
    buffetId: buffet._id,
    dateKey,
    startTime: slot.startTime,
    endTime: slot.endTime,
    session,
  });

  const totalSeats = Number(slot.totalSeats || 0);
  const availableSeats = Math.max(totalSeats - bookedSeats, 0);

  try {
    [inventory] = await BuffetSeatInventory.create([{
      buffet: buffet._id,
      dateKey,
      slotId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalSeats,
      availableSeats,
    }], { session });
  } catch (error) {
    if (error.code === 11000 && !session) {
      inventory = await BuffetSeatInventory.findOne({ buffet: buffet._id, dateKey, slotId });
    } else {
      throw error;
    }
  }

  return inventory;
};

// Read-only twin of ensureInventory for the public availability GET: never writes.
const peekInventory = async ({ buffet, dateKey, slot }) => {
  const slotId = String(slot._id);
  const existing = await BuffetSeatInventory.findOne({ buffet: buffet._id, dateKey, slotId });
  if (existing) return existing;

  const bookedSeats = await getBookedSeatsForDateSlot({
    buffetId: buffet._id,
    dateKey,
    startTime: slot.startTime,
    endTime: slot.endTime,
  });
  const totalSeats = Number(slot.totalSeats || 0);

  return { totalSeats, availableSeats: Math.max(totalSeats - bookedSeats, 0), isClosed: false, overrideReason: "" };
};

const getBookingValidation = (booking) => {
  const now = new Date();
  const slotStart = reservationDateTime(booking.selectedDate, booking.selectedTimeSlot?.startTime);
  const slotEnd = reservationDateTime(booking.selectedDate, booking.selectedTimeSlot?.endTime);
  if (slotStart && slotEnd && slotEnd <= slotStart) slotEnd.setUTCDate(slotEnd.getUTCDate() + 1);

  if (booking.qrUsed || booking.bookingStatus === "checked_in" || booking.bookingStatus === "completed") {
    return { canCheckIn: false, state: "used", label: "QR Already Used", reason: "This QR has already been claimed." };
  }

  if (["pending", "expired", "dining"].includes(booking.bookingStatus)) {
    return { canCheckIn: false, state: booking.bookingStatus, label: "Check-in unavailable", reason: "Only confirmed, unused bookings can be checked in." };
  }

  if (booking.bookingStatus === "cancelled") {
    return { canCheckIn: false, state: "cancelled", label: "Cancelled", reason: "This booking is cancelled." };
  }

  if (booking.bookingStatus === "no_show") {
    return { canCheckIn: false, state: "no_show", label: "No-show", reason: "This booking is already marked as no-show." };
  }

  if (!slotStart || !slotEnd || now > slotEnd) {
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

  const filter = req.user.role === "hotel_staff" ? { _id: req.user.staffHotel || null, status: "approved", isApproved: true } : { owner: req.user.id };
  const hotel = await Hotel.findOne(filter).select("_id");
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
    if (!buffet?.isActive || (buffet.status && buffet.status !== "active") || buffet.hotel?.status !== "approved") return res.status(404).json({ message: "Buffet not found." });

    const bookingDate = toUTCDate(dateKey);
    const dateError = validateBuffetDate(buffet, bookingDate);
    if (dateError) {
      return res.status(200).json({ dateKey, isAvailableDate: false, message: dateError, slots: [] });
    }

    const slots = await Promise.all(
      (buffet.timeSlots || []).map(async (slot) => {
        const inventory = await peekInventory({ buffet, dateKey, slot });
        return {
          _id: String(slot._id),
          startTime: slot.startTime,
          endTime: slot.endTime,
          totalSeats: Number(inventory.totalSeats || slot.totalSeats || 0),
          availableSeats: inventory.isClosed ? 0 : Number(inventory.availableSeats || 0),
          isClosed: Boolean(inventory.isClosed),
          isSoldOut: Boolean(inventory.isClosed) || Number(inventory.availableSeats || 0) <= 0,
        };
      })
    );

    return res.status(200).json({
      dateKey,
      isAvailableDate: slots.some((slot) => Number(slot.availableSeats) > 0),
      reservationPolicy: {
        mode: buffet.reservationMode || "auto_confirm",
        instantConfirmation: (buffet.reservationMode || "auto_confirm") === "auto_confirm",
        maxGuestsPerBooking: Number(buffet.maxGuestsPerBooking || 20),
        advanceBookingHours: Number(buffet.advanceBookingHours || 0),
        bookingWindowDays: Number(buffet.bookingWindowDays || 90),
      },
      slots,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch seat availability.", error: error.message });
  }
};

function checkSelection(buffet, selectedDate, slotId, seats) {
  if (!buffet?.isActive || (buffet.status && buffet.status !== "active")
    || !buffet.hotel || buffet.hotel.status !== "approved") return { error: "This buffet is unavailable for reservations." };
  if (typeof selectedDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
    || normalizeDateKey(selectedDate) !== selectedDate) return { error: "Select a valid dining date." };
  const seatCount = typeof seats === "number" || typeof seats === "string" ? Number(seats) : NaN;
  if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > Number(buffet.maxGuestsPerBooking || 20)) {
    return { error: "Select a guest count within the buffet limit." };
  }
  const slot = findSlot(buffet, slotId);
  if (!slot) return { error: "Select a valid session." };
  const bookingDate = toUTCDate(selectedDate);
  const scheduleError = validateBuffetDate(buffet, bookingDate);
  if (scheduleError) return { error: scheduleError };
  const starts = reservationDateTime(bookingDate, slot.startTime);
  const now = Date.now();
  if (!starts || starts.getTime() <= now || starts.getTime() - now < Number(buffet.advanceBookingHours || 0) * 3600000) {
    return { error: "This session is too soon or has already started." };
  }
  if (starts.getTime() - now > (Number(buffet.bookingWindowDays || 90) + 1) * 86400000) return { error: "Select a date within the booking window." };
  return { slot, starts, seatCount };
}

exports.quoteReservation = async (req, res) => {
  try {
    const { buffetId, selectedDate, slotId, seats } = req.body;
    if (!mongoose.isValidObjectId(buffetId) || !mongoose.isValidObjectId(slotId)) return res.status(400).json({ message: "Select a valid buffet and session." });
    const buffet = await Buffet.findById(buffetId).populate("hotel", "hotelName status city location cancellationPolicy");
    const selection = checkSelection(buffet, selectedDate, slotId, seats);
    if (selection.error) return res.status(400).json({ message: selection.error });
    const { slot, starts, seatCount } = selection;
    const stock = await peekInventory({ buffet, dateKey: selectedDate, slot });
    if (stock.isClosed || !(Number(stock.availableSeats) >= seatCount)) return res.status(409).json({ message: "Your session no longer has enough seats. Edit your selection." });
    const { subtotal, discountAmount, taxAmount, serviceCharge, grandTotal } = calculateTotals({ price: buffet.price, seats: seatCount });
    const policy = normalizeCancellationPolicy(buffet.hotel.cancellationPolicy);
    return res.json({
      buffet: { _id: buffet._id, title: buffet.title, category: buffet.category, price: buffet.price,
        thumbnail: buffet.thumbnail, images: buffet.images, hotel: { _id: buffet.hotel._id, hotelName: buffet.hotel.hotelName, city: buffet.hotel.city } },
      slot: { startTime: slot.startTime, endTime: slot.endTime },
      totals: { subtotal, discountAmount, taxAmount, serviceCharge, grandTotal },
      cancellation: { advanceCutoff: new Date(starts.getTime() - policy.freeCancellationHours * 3600000),
        lateCutoff: new Date(starts.getTime() - policy.lateCancellationHours * 3600000),
        lateRefundPercent: policy.lateRefundPercent, lastMinuteRefundPercent: policy.lastMinuteRefundPercent,
        depositRefundableWithinFreeWindow: policy.depositRefundableWithinFreeWindow },
    });
  } catch {
    return res.status(500).json({ message: "Could not prepare your reservation. Try again." });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const {
      buffetId,
      selectedDate,
      slotId,
      seats,
      paymentMode,
      couponCode = "",
      guestDetails,
      specialRequests,
      acceptedCancellationPolicy,
      expectedTotal,
    } = req.body;
    const key = req.get("Idempotency-Key");
    if (paymentMode !== "full_payment") return res.status(400).json({ message: "New reservations require full online payment." });
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key || "")) return res.status(400).json({ message: "Return to your reservation and open checkout again." });
    const bookingId = createHash("sha256").update(`${req.user.id}:${key}`).digest("hex").slice(0, 24);
    const normalizedGateway = "sandbox";

    if (!mongoose.isValidObjectId(buffetId) || !selectedDate || !mongoose.isValidObjectId(slotId) || !seats) {
      return res.status(400).json({ message: "Please select a buffet date, a valid time slot, and at least 1 seat." });
    }

    if (acceptedCancellationPolicy !== true) return res.status(400).json({ message: "Accept the cancellation policy to continue." });
    let guestData;
    try { guestData = readGuestDetails(guestDetails, specialRequests); }
    catch (error) { return res.status(400).json({ message: error.message }); }

    const normalizedCouponCode = String(couponCode || "").trim().toUpperCase();
    const requestHash = createHash("sha256").update(JSON.stringify([
      buffetId, selectedDate, slotId, Number(seats), normalizedCouponCode, expectedTotal, guestData,
    ])).digest("hex");

    function existingResponse(payment) {
      if (payment.metadata?.checkoutHash !== requestHash) return res.status(409).json({ message: "A payment hold already exists for this checkout. Open it from Payment history.", paymentId: payment._id });
      return res.status(200).json({ paymentId: payment._id });
    }
    const existing = await Payment.findOne({ booking: bookingId, user: req.user.id, gateway: normalizedGateway });
    if (existing) return existingResponse(existing);
    if (!sandboxEnabled()) return res.status(503).json({ message: "Online checkout is currently unavailable." });

    const initialBuffet = await Buffet.findById(buffetId).populate("hotel");
    const initialSelection = checkSelection(initialBuffet, selectedDate, slotId, seats);
    if (initialSelection.error) return res.status(400).json({ message: initialSelection.error });
    await ensureInventory({ buffet: initialBuffet, dateKey: selectedDate, slot: initialSelection.slot });

    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const previous = await Payment.findOne({ booking: bookingId, user: req.user.id, gateway: normalizedGateway }).session(session);
        if (previous) return { previous };
        const buffet = await Buffet.findById(buffetId).populate("hotel").session(session);
        const selection = checkSelection(buffet, selectedDate, slotId, seats);
        if (selection.error) return { status: 400, message: selection.error };
        const { slot, starts, seatCount } = selection;
        let coupon;
        if (normalizedCouponCode) {
          coupon = await Coupon.findOne({ code: normalizedCouponCode, isActive: true }).session(session);
          const now = new Date();
          if (!coupon || (coupon.startDate && now < coupon.startDate) || (coupon.endDate && now > coupon.endDate)
            || (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)) {
            return { status: 400, message: "This coupon is no longer available." };
          }
        }
        const totals = calculateTotals({ price: buffet.price, seats: seatCount, coupon });
        if (coupon && coupon.minimumSpend && totals.subtotal < coupon.minimumSpend) {
          return { status: 400, message: `Minimum spend for this coupon is LKR ${coupon.minimumSpend}.` };
        }
        if (typeof expectedTotal !== "number" || totals.grandTotal !== expectedTotal) {
          return { status: 409, message: "The price changed. Return to your reservation to review the latest total." };
        }

        const now = Date.now();
        if (starts.getTime() <= now) return { status: 400, message: "This session has already started." };
        const inventory = await BuffetSeatInventory.findOneAndUpdate({
          buffet: buffet._id, dateKey: selectedDate, slotId: String(slot._id),
          isClosed: { $ne: true }, availableSeats: { $gte: seatCount },
        }, { $inc: { availableSeats: -seatCount } }, { session });
        if (!inventory) return { status: 409, message: "This session no longer has enough seats. Edit your selection." };

        const expiryMinutes = Math.min(60, Math.max(5, Number(buffet.hotel?.paymentPolicy?.paymentExpiryMinutes || process.env.PAYMENT_EXPIRY_MINUTES) || 15));
        const expiresAt = new Date(Math.min(now + expiryMinutes * 60_000, starts.getTime()));
        const invoiceNumber = generateInvoiceNumber();
        const [booking] = await Booking.create([{
          _id: bookingId, user: req.user.id, buffet: buffetId, selectedDate: toUTCDate(selectedDate),
          selectedTimeSlot: { startTime: slot.startTime, endTime: slot.endTime }, inventorySlotId: String(slot._id), seats: seatCount,
          ...totals, totalAmount: totals.grandTotal, couponCode: normalizedCouponCode,
          bookingCode: `DF-${bookingId.toUpperCase()}`, invoiceNumber,
          bookingStatus: "pending", paymentStatus: "pending", paymentMethod: normalizedGateway,
          paymentMode, paymentExpiresAt: expiresAt, ...guestData, reservationPolicyAcceptedAt: new Date(now),
          statusTimeline: [{ status: "pending", note: "Seats held for sandbox checkout.", by: req.user.id, at: new Date(now) }],
        }], { session });
        const [payment] = await Payment.create([{
          booking: booking._id, user: req.user.id, hotel: buffet.hotel._id, amount: totals.grandTotal,
          ...totals, ...calculatePaymentBreakdown({ totals, paymentMode, gateway: normalizedGateway }),
          gateway: normalizedGateway, gatewayOrderId: invoiceNumber, gatewayStatus: "sandbox_pending",
          expiresAt, invoiceNumber, couponCode: normalizedCouponCode, status: "pending",
          metadata: {
            checkoutHash: requestHash, buffetTitle: buffet.title, hotelName: buffet.hotel.hotelName,
            dateKey: selectedDate, slotId: String(slot._id), slot: `${slot.startTime} – ${slot.endTime}`,
            postPaymentBookingStatus: buffet.reservationMode === "manual_request" ? "pending" : "confirmed",
          },
        }], { session });
        await recordTransaction({
          payment, type: "payment_created", actor: req.user.id,
          note: "Sandbox payment hold created.", idempotencyKey: `payment-created:${payment._id}`, session,
        });
        if (coupon) {
          coupon.usedCount = Number(coupon.usedCount || 0) + 1;
          await coupon.save({ session });
        }
        return { payment };
      });
      if (result.previous) return existingResponse(result.previous);
      if (result.message) return res.status(result.status).json({ message: result.message });
      return res.status(201).json({ paymentId: result.payment._id });
    } catch (error) {
      if (error.code === 11000) {
        const previous = await Payment.findOne({ booking: bookingId, user: req.user.id, gateway: normalizedGateway });
        if (previous) return existingResponse(previous);
      }
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error("Sandbox checkout failed:", error.name);
    return res.status(500).json({ message: "Could not create your payment hold. Try again from this checkout." });
  }
};

exports.myBookings = async (req, res) => {
  try {
    res.set("Cache-Control", "private, no-store");
    const bookings = await Booking.find({ user: req.user.id }).populate(customerBookingPopulate).sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bookings.", error: error.message });
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

    res.status(200).json(req.user.role === "admin" ? bookings : bookings.map(hotelBookingView));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hotel bookings.", error: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingStatus, paymentStatus } = req.body;
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(404).json({ message: "Booking not found." });
    const booking = await Booking.findById(req.params.id).populate({ path: "buffet", populate: { path: "hotel" } });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (!(await ensureHotelCanAccessBooking(req, booking))) return res.status(403).json({ message: "Not allowed to update this booking." });
    if (paymentStatus && paymentStatus !== booking.paymentStatus) {
      return res.status(409).json({ message: "Use the payment workflow to change a payment status." });
    }
    const transitions = { pending: ["confirmed"], checked_in: ["dining", "completed"], dining: ["completed"] };
    if (bookingStatus && bookingStatus !== booking.bookingStatus) {
      const canConfirm = booking.paymentMode === "pay_at_hotel" || ["paid", "partially_paid"].includes(booking.paymentStatus);
      if (booking.inventoryReleasedAt || !transitions[booking.bookingStatus]?.includes(bookingStatus) || (bookingStatus === "confirmed" && !canConfirm)) {
        return res.status(409).json({ message: "This reservation cannot move to that status. Use the check-in, cancellation or payment workflow where applicable." });
      }
      const now = new Date();
      const result = await Booking.updateOne({
        _id: booking._id, bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus, inventoryReleasedAt: null,
      }, {
        $set: { bookingStatus, ...(bookingStatus === "completed" ? { completedAt: now } : {}) },
        $push: { statusTimeline: { status: bookingStatus, note: `Status changed to ${bookingStatus}.`, by: req.user.id, at: now } },
      });
      if (!result.matchedCount) return res.status(409).json({ message: "This reservation changed. Refresh and try again." });
      if (bookingStatus === "completed") {
        const updated = await Booking.findById(booking._id).populate(populateBooking);
        communicateBookingEvent({ booking: updated, event: "completed" }).catch((error) => console.error("Completion notification failed:", error.name));
      }
    }
    const updated = await Booking.findById(booking._id).populate(populateBooking);
    return res.json({ message: "Booking status updated.", booking: req.user.role === "admin" ? updated : hotelBookingView(updated) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update booking." });
  }
};

exports.verifyBookingByCode = async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingCode: req.params.code }).populate(populateBooking);
    if (!booking) return res.status(404).json({ message: "Booking not found for this QR code." });

    const allowed = await ensureHotelCanAccessBooking(req, booking);
    if (!allowed) return res.status(403).json({ message: "This booking does not belong to your hotel." });

    res.status(200).json({ booking: req.user.role === "admin" ? booking : hotelBookingView(booking), validation: getBookingValidation(booking) });
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

    const now = new Date();
    const populatedBooking = await Booking.findOneAndUpdate({
      _id: booking._id, bookingStatus: "confirmed", qrUsed: { $ne: true },
    }, {
      $set: { qrUsed: true, qrUsedAt: now, checkedInAt: now, checkedInBy: req.user.id, bookingStatus: "checked_in" },
      $push: { statusTimeline: { status: "checked_in", note: "Guest checked in by hotel QR desk.", by: req.user.id, at: now } },
    }, { new: true }).populate(populateBooking);
    if (!populatedBooking) return res.status(409).json({ message: "This booking changed or was already checked in." });
    res.status(200).json({ message: "QR claimed successfully. Guest checked in.", booking: req.user.role === "admin" ? populatedBooking : hotelBookingView(populatedBooking), validation: getBookingValidation(populatedBooking) });
  } catch (error) {
    res.status(500).json({ message: "Failed to check in booking.", error: error.message });
  }
};


exports.modifyMyBooking = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(404).json({ message: "Booking not found." });
    const bookingId = await mongoose.connection.transaction(async (session) => {
      const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id }).populate({ path: "buffet", populate: { path: "hotel" } }).session(session);
      if (!booking) throw Object.assign(new Error("Booking not found."), { statusCode: 404 });
      if (!["pending", "confirmed"].includes(booking.bookingStatus) || booking.qrUsed) throw Object.assign(new Error("This booking can no longer be modified."), { statusCode: 400 });
      if (booking.paymentMode !== "pay_at_hotel" || ["paid", "partially_paid"].includes(booking.paymentStatus)) throw Object.assign(new Error("Online-paid or deposit bookings require hotel assistance for modifications."), { statusCode: 400 });
      const policy = normalizeCancellationPolicy(booking.buffet?.hotel?.cancellationPolicy);
      if (!policy.allowCustomerReschedule) throw Object.assign(new Error("This hotel does not allow customer self-service rescheduling."), { statusCode: 409 });
      if (hoursUntilReservation(booking) < policy.rescheduleCutoffHours) throw Object.assign(new Error(`Online changes close ${policy.rescheduleCutoffHours} hours before arrival.`), { statusCode: 409 });
      if (Number(booking.modificationCount || 0) >= policy.maxCustomerReschedules) throw Object.assign(new Error(`This booking has reached the ${policy.maxCustomerReschedules}-change limit.`), { statusCode: 409 });
      const buffet = booking.buffet;
      if (!buffet) throw Object.assign(new Error("The buffet is no longer available."), { statusCode: 409 });
      const requestedDate = req.body.selectedDate ? normalizeDateKey(req.body.selectedDate) : normalizeDateKey(booking.selectedDate);
      const requestedSlot = req.body.slotId ? findSlot(buffet, req.body.slotId) : buffet.timeSlots.find(slot => slot.startTime === booking.selectedTimeSlot.startTime && slot.endTime === booking.selectedTimeSlot.endTime);
      const requestedSeats = req.body.seats !== undefined ? Number(req.body.seats) : Number(booking.seats);
      if (!requestedDate || !requestedSlot || !Number.isInteger(requestedSeats) || requestedSeats < 1) throw Object.assign(new Error("A valid date, time slot and guest count are required."), { statusCode: 400 });
      if (requestedSeats > Math.max(1, Number(buffet.maxGuestsPerBooking || 20))) throw Object.assign(new Error(`Online reservations are limited to ${buffet.maxGuestsPerBooking || 20} guests.`), { statusCode: 400 });
      const selection = checkSelection(buffet, requestedDate, requestedSlot._id, requestedSeats);
      if (selection.error) throw Object.assign(new Error(selection.error), { statusCode: 400 });
      const oldDateKey = normalizeDateKey(booking.selectedDate);
      const oldSlot = buffet.timeSlots.find(slot => slot.startTime === booking.selectedTimeSlot.startTime && slot.endTime === booking.selectedTimeSlot.endTime);
      const sameInventory = oldDateKey === requestedDate && String(booking.inventorySlotId || oldSlot?._id) === String(requestedSlot._id);
      await ensureInventory({ buffet, dateKey: requestedDate, slot: requestedSlot, session });
      const extraNeeded = sameInventory ? requestedSeats - Number(booking.seats) : requestedSeats;
      if (extraNeeded > 0) {
        const inventory = await BuffetSeatInventory.findOneAndUpdate({
          buffet: buffet._id, dateKey: requestedDate, slotId: String(requestedSlot._id),
          isClosed: { $ne: true }, availableSeats: { $gte: extraNeeded },
        }, { $inc: { availableSeats: -extraNeeded } }, { session });
        if (!inventory) throw Object.assign(new Error("There are no longer enough seats in the selected session."), { statusCode: 409 });
      }
      if (!sameInventory || extraNeeded < 0) {
        await restoreInventorySeats(booking, { session, slotId: sameInventory ? String(requestedSlot._id) : undefined,
          seats: sameInventory ? -extraNeeded : booking.seats });
      }
      booking.selectedDate = toUTCDate(requestedDate);
      booking.inventorySlotId = String(requestedSlot._id);
      booking.selectedTimeSlot = { startTime: requestedSlot.startTime, endTime: requestedSlot.endTime };
      booking.seats = requestedSeats;
      const coupon = booking.couponCode ? await Coupon.findOne({ code: booking.couponCode, isActive: true }).session(session) : null;
      const totals = calculateTotals({ price: buffet.price, seats: requestedSeats, coupon });
      booking.totalAmount = totals.grandTotal;
      booking.subtotal = totals.subtotal;
      booking.discountAmount = totals.discountAmount;
      booking.taxAmount = totals.taxAmount;
      booking.serviceCharge = totals.serviceCharge;
      booking.grandTotal = totals.grandTotal;
      booking.commissionRate = totals.commissionRate;
      booking.commissionAmount = totals.commissionAmount;
      booking.hotelEarning = totals.hotelEarning;
      if (req.body.notes !== undefined) booking.notes = String(req.body.notes || "").slice(0, 1000);
      if (req.body.specialRequests) booking.specialRequests = { ...booking.specialRequests?.toObject?.(), ...req.body.specialRequests };
      booking.modificationCount = Number(booking.modificationCount || 0) + 1;
      booking.lastModifiedAt = new Date();
      booking.statusTimeline.push({ status: booking.bookingStatus, note: "Customer modified reservation details.", by: req.user.id, at: new Date() });
      await booking.save({ session });
      const paymentBreakdown = calculatePaymentBreakdown({ totals, paymentMode: "pay_at_hotel", gateway: "pay_at_hotel" });
      await Payment.findOneAndUpdate({ booking: booking._id, status: "pending" }, { $set: { amount: totals.grandTotal, ...paymentBreakdown, subtotal: totals.subtotal, discountAmount: totals.discountAmount, taxAmount: totals.taxAmount, serviceCharge: totals.serviceCharge, commissionRate: totals.commissionRate, commissionAmount: totals.commissionAmount, hotelEarning: totals.hotelEarning, "metadata.buffetTitle": buffet.title, "metadata.hotelName": buffet.hotel?.hotelName, "metadata.dateKey": requestedDate, "metadata.slotId": String(requestedSlot._id), "metadata.slot": `${requestedSlot.startTime} - ${requestedSlot.endTime}` } }, { session });
      return booking._id;
    });
    await User.findByIdAndUpdate(req.user.id, { $push: { notifications: { $each: [{ title: "Reservation updated", message: "Your reservation was updated.", type: "booking", link: "/my-bookings" }], $position: 0, $slice: 50 } } }).catch(() => {});
    res.json({ message: "Booking updated successfully.", booking: await Booking.findById(bookingId).populate(customerBookingPopulate) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Availability changed. Refresh and try again." });
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Failed to modify booking." });
  }
};

exports.downloadCalendar = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Booking not found." });
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id })
    .populate({ path: "buffet", select: "title hotel", populate: { path: "hotel", select: "hotelName location" } });
  if (!booking) return res.status(404).json({ message: "Booking not found." });
  if (!["confirmed", "checked_in", "dining"].includes(booking.bookingStatus)) return res.status(409).json({ message: "A confirmed reservation is required to add it to your calendar." });
  const start = reservationDateTime(booking.selectedDate, booking.selectedTimeSlot?.startTime);
  const end = reservationDateTime(booking.selectedDate, booking.selectedTimeSlot?.endTime);
  if (!start || !end) return res.status(409).json({ message: "The booking time is unavailable." });
  if (end <= start) end.setUTCDate(end.getUTCDate() + 1);
  const stamp = date => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const escape = value => String(value || "").replace(/\\/g, "\\\\").replace(/\r\n|[\r\n]/g, "\\n").replace(/[;,]/g, "\\$&");
  const hotel = booking.buffet?.hotel;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DineFor//Reservations//EN", "BEGIN:VEVENT",
    `UID:${booking._id}@dinefor.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(booking.buffet?.title || "DineFor reservation")}`,
    `LOCATION:${escape([hotel?.hotelName, hotel?.location].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${escape(`Booking ${booking.bookingCode}, ${booking.seats} guest(s)`)}`,
    "END:VEVENT", "END:VCALENDAR", "",
  ];
  return res.set({
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `attachment; filename="dinefor-${booking._id}.ics"`,
    "Cache-Control": "private, no-store",
  }).send(lines.join("\r\n"));
};
