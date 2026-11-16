const { hotelBookingView, hotelCancellationView } = require("../services/hotelPortalViews");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Hotel = require("../models/Hotel");
const BuffetSeatInventory = require("../models/BuffetSeatInventory");
const CancellationRequest = require("../models/CancellationRequest");
const { releaseBookingSeats, restoreInventorySeats } = require("../services/seatReleaseService");
const { recordTransaction } = require("../services/paymentTransactionService");
const { communicateBookingEvent } = require("../services/bookingCommunicationService");
const { notifyAdmins } = require("../services/notificationService");
const { calculateCancellationQuote, hoursUntilReservation, normalizeCancellationPolicy, reservationDateTime } = require("../services/cancellationPolicyService");

const contextPopulate = [
  { path: "user", select: "name email role preferences" },
  { path: "buffet", populate: { path: "hotel", populate: { path: "owner", select: "name email role preferences" } } },
];
const casePopulate = [
  { path: "booking", populate: contextPopulate },
  { path: "payment", select: "invoiceNumber paymentMode status paidAmount refundedAmount refundStatus currency" },
  { path: "hotel", select: "hotelName" },
  { path: "customer", select: "name email" },
  { path: "requestedBy", select: "name email role" },
  { path: "resolvedBy", select: "name email role" },
];
const finalStatuses = ["cancelled", "checked_in", "dining", "completed", "no_show", "expired"];
const reasonCodes = ["plans_changed", "duplicate_booking", "incorrect_details", "travel_issue", "medical", "hotel_operational", "no_show", "other"];

const cleanReason = (value, fallback) => String(value || fallback || "").trim().slice(0, 1000);
const normalizeDateKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};
const toUTCDate = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

const loadContext = async (bookingId, session = null) => {
  if (!mongoose.isObjectIdOrHexString(bookingId)) return { booking: null, payment: null, hotel: null };
  const booking = await Booking.findById(bookingId).populate(session ? contextPopulate.map((path) => ({ ...path, ordered: true })) : contextPopulate).session(session);
  const payment = booking ? await Payment.findOne({ booking: booking._id }).session(session) : null;
  return { booking, payment, hotel: booking?.buffet?.hotel || null };
};

const ensureOperatorAccess = async (req, hotel) => {
  if (req.user.role === "admin") return true;
  return req.user.role === "hotel" && String(hotel?.owner?._id || hotel?.owner) === String(req.user.id);
};

const refundState = (quote, policy, requestedByRole) => {
  if (quote.refundableAmount <= 0) return "no_refund";
  if (requestedByRole === "admin" || policy.autoApprovePolicyRefunds) return "refund_approved";
  return "refund_requested";
};

const requestPolicyRefund = async ({ payment, booking, quote, policy, actor, role, reason, cancellationType, session }) => {
  if (!payment) return "no_refund";
  if (quote.refundableAmount <= 0) {
    if (payment.status === "pending") {
      payment.status = cancellationType === "no_show" ? "failed" : "cancelled";
      payment.gatewayStatus = `${cancellationType}_cancelled`;
      await payment.save({ session });
      booking.paymentStatus = payment.status;
    }
    return "no_refund";
  }

  const status = refundState(quote, policy, role);
  payment.refundStatus = status === "refund_approved" ? "approved" : "requested";
  payment.metadata = {
    ...(payment.metadata || {}),
    refundRequest: {
      amount: quote.refundableAmount,
      reason,
      requestedAt: new Date(),
      requestedBy: actor,
      source: "cancellation_policy",
      policyBand: quote.policyBand,
      refundPercent: quote.refundPercent,
    },
  };
  await payment.save({ session });
  await recordTransaction({
    payment,
    type: "refund_requested",
    amount: quote.refundableAmount,
    actor,
    status: payment.refundStatus === "approved" ? "succeeded" : "pending",
    session,
    idempotencyKey: `cancellation-refund-request:${payment._id}`,
    note: reason,
    metadata: { source: "cancellation_policy", policyBand: quote.policyBand, refundPercent: quote.refundPercent },
  });
  booking.refundStatus = payment.refundStatus;
  return status;
};

const isOnlineHold = (booking, payment) => booking.bookingStatus === "pending" &&
  (payment?.paymentMode || booking.paymentMode) !== "pay_at_hotel" &&
  (payment?.status || booking.paymentStatus) === "pending" &&
  Boolean(payment?.expiresAt || booking.paymentExpiresAt);

function customerChangeBooking(booking) {
  if (!booking) return null;
  const { _id, bookingCode, bookingStatus, paymentStatus, selectedDate, selectedTimeSlot, seats, refundStatus } = booking;
  return { _id, bookingCode, bookingStatus, paymentStatus, selectedDate, selectedTimeSlot, seats, refundStatus };
}

const rejectChange = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const applyCancellation = async ({ req, type, eventType = "cancellation" }) => {
  const { bookingId, cancellationId, quote, reason } = await mongoose.connection.transaction(async (session) => {
    const { booking, payment, hotel } = await loadContext(req.params.id, session);
    const isCustomer = req.user.role === "customer";
    if (!booking || (isCustomer && String(booking.user?._id) !== String(req.user.id))) {
      throw rejectChange(404, "Booking not found.");
    }
    if (!isCustomer && !(await ensureOperatorAccess(req, hotel))) {
      throw rejectChange(403, "This booking does not belong to your hotel.");
    }
    if (!hotel) throw rejectChange(409, "This reservation no longer has a hotel profile.");
    if (type === "no_show") {
      const policy = normalizeCancellationPolicy(hotel.cancellationPolicy);
      const start = reservationDateTime(booking.selectedDate, booking.selectedTimeSlot?.startTime);
      if (!start || Date.now() < start.getTime() + policy.noShowGraceMinutes * 60_000) {
        throw rejectChange(409, `No-show can be recorded only ${policy.noShowGraceMinutes} minutes after the reservation starts.`);
      }
    }
    if (finalStatuses.includes(booking.bookingStatus)) {
      const error = new Error(`A ${booking.bookingStatus} reservation cannot be cancelled.`);
      error.statusCode = 409;
      throw error;
    }
    if (await CancellationRequest.exists({ booking: booking._id }).session(session)) {
      const error = new Error("A cancellation or no-show case already exists for this reservation.");
      error.statusCode = 409;
      throw error;
    }

    const role = req.user.role;
    if (role === "customer" && isOnlineHold(booking, payment)) {
      throw Object.assign(new Error("Check the payment status before changing this reservation."), { statusCode: 409 });
    }
    const quote = calculateCancellationQuote({ booking, payment, hotel, actorRole: role, eventType });
    if (role === "customer" && !quote.canCustomerCancel) {
      const error = new Error("The reservation has already started and can no longer be cancelled online.");
      error.statusCode = 409;
      throw error;
    }
    if (role === "customer" && req.body.expectedRefundAmount !== undefined
      && (req.body.expectedRefundAmount !== quote.refundableAmount || req.body.expectedRefundPercent !== quote.refundPercent)) {
      throw Object.assign(new Error("The refund quote changed. Review the latest quote and confirm again."), { statusCode: 409 });
    }
    const reason = cleanReason(req.body.reason, type === "no_show" ? "Guest did not arrive within the hotel grace period." : "Reservation cancelled.");
    const requestedReasonCode = type === "no_show" ? "no_show" : String(req.body.reasonCode || (role === "hotel" ? "hotel_operational" : "other"));
    const reasonCode = reasonCodes.includes(requestedReasonCode) ? requestedReasonCode : "other";
    const policy = quote.policy;
    const status = await requestPolicyRefund({ payment, booking, quote, policy, actor: req.user.id, role, reason, cancellationType: type, session });

    booking.bookingStatus = type === "no_show" ? "no_show" : "cancelled";
    booking.cancellationReason = reason;
    if (type === "no_show") {
      booking.noShowMarkedAt = new Date();
      booking.noShowMarkedBy = req.user.id;
    } else {
      booking.cancelledBy = role;
      booking.cancelledAt = new Date();
    }
    booking.statusTimeline = booking.statusTimeline || [];
    booking.statusTimeline.push({ status: booking.bookingStatus, note: `${reason} Refund outcome: ${quote.refundPercent}% (${quote.currency} ${quote.refundableAmount.toFixed(2)}).`, by: req.user.id, at: new Date() });
    await booking.save({ session });

    let inventoryReleasedAt = null;
    if (type !== "no_show") {
      const released = await releaseBookingSeats(booking, { session, slotId: payment?.metadata?.slotId });
      inventoryReleasedAt = released.releasedAt || booking.inventoryReleasedAt || null;
    }

    const [cancellationCase] = await CancellationRequest.create([{
      booking: booking._id,
      payment: payment?._id || null,
      hotel: hotel._id,
      customer: booking.user._id,
      type,
      status,
      reasonCode,
      reason,
      requestedBy: req.user.id,
      requestedByRole: role,
      policyBand: quote.policyBand,
      hoursBeforeReservation: quote.hoursBeforeReservation,
      refundPercent: quote.refundPercent,
      paidAvailable: quote.paidAvailable,
      refundableAmount: quote.refundableAmount,
      retainedAmount: quote.retainedAmount,
      currency: quote.currency,
      policySnapshot: policy,
      inventoryReleasedAt,
      timeline: [{ status, note: `Reservation marked ${booking.bookingStatus}.`, by: req.user.id, at: new Date() }],
    }], { session });
    booking.cancellationRequest = cancellationCase._id;
    await booking.save({ session });
    return { bookingId: booking._id, cancellationId: cancellationCase._id, quote, reason };
  });

  const populated = await Booking.findById(bookingId).populate(contextPopulate);
  communicateBookingEvent({ booking: populated, event: type === "no_show" ? "no_show" : "cancelled", customIntro: reason }).catch((error) => console.error("Cancellation communication failed:", error.message));
  if (quote.refundableAmount > 0) {
    notifyAdmins({ title: "Cancellation refund review", message: `${populated?.bookingCode || bookingId} requires review of ${quote.currency} ${quote.refundableAmount.toFixed(2)}.`, type: "payment", link: "/admin/finance", dedupeKey: `cancellation-refund:${bookingId}` }).catch(() => {});
  }
  return { booking: populated, cancellation: await CancellationRequest.findById(cancellationId).populate(casePopulate), quote };
};

exports.getCancellationQuote = async (req, res) => {
  try {
    const context = await loadContext(req.params.id);
    if (!context.booking) return res.status(404).json({ message: "Booking not found." });
    if (req.user.role === "customer" && String(context.booking.user?._id) !== String(req.user.id)) return res.status(403).json({ message: "Not allowed to quote this booking." });
    if (req.user.role === "hotel" && !(await ensureOperatorAccess(req, context.hotel))) return res.status(403).json({ message: "Not allowed to quote this booking." });
    const quote = calculateCancellationQuote({ ...context, actorRole: req.user.role });
    const startsAt = reservationDateTime(context.booking.selectedDate, context.booking.selectedTimeSlot?.startTime);
    if (req.user.role === "customer" && (finalStatuses.includes(context.booking.bookingStatus) || isOnlineHold(context.booking, context.payment))) quote.canCustomerCancel = false;
    return res.json({
      bookingId: context.booking._id, bookingCode: context.booking.bookingCode, quote, startsAt,
      advanceCutoff: startsAt && new Date(startsAt.getTime() - quote.policy.freeCancellationHours * 3600000),
      lateCutoff: startsAt && new Date(startsAt.getTime() - quote.policy.lateCancellationHours * 3600000),
      policyText: context.hotel?.application?.cancellationPolicy || "",
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to calculate cancellation quote.", error: error.message });
  }
};

exports.cancelCustomerReservation = async (req, res) => {
  try {
    const result = await applyCancellation({ req, type: "customer_cancellation" });
    const cancellation = result.cancellation && {
      _id: result.cancellation._id, status: result.cancellation.status, refundableAmount: result.cancellation.refundableAmount,
    };
    return res.json({
      message: result.quote.refundableAmount > 0 ? "Reservation cancelled and the policy-based refund was submitted for review." : "Reservation cancelled. No payment refund is due under the applicable policy.",
      booking: customerChangeBooking(result.booking), cancellation, quote: result.quote,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Failed to cancel reservation." });
  }
};

exports.cancelByOperator = async (req, res) => {
  try {
    const type = req.user.role === "admin" ? "admin_cancellation" : "hotel_cancellation";
    const result = await applyCancellation({ req, type });
    return res.json({ message: "Reservation cancelled and any eligible refund was recorded for processing.", ...(req.user.role === "hotel" ? { ...result, booking: hotelBookingView(result.booking), cancellation: hotelCancellationView(result.cancellation) } : result) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Failed to cancel reservation." });
  }
};

exports.markNoShow = async (req, res) => {
  try {
    const result = await applyCancellation({ req, type: "no_show", eventType: "no_show" });
    return res.json({ message: "Reservation marked as no-show under the hotel policy.", ...(req.user.role === "hotel" ? { ...result, booking: hotelBookingView(result.booking), cancellation: hotelCancellationView(result.cancellation) } : result) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Failed to record no-show." });
  }
};

const validateRequestedDate = (buffet, dateKey) => {
  const date = toUTCDate(dateKey);
  const day = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  if (buffet.buffetType === "special" && buffet.specialDate && normalizeDateKey(buffet.specialDate) !== dateKey) return "This special buffet is not available on that date.";
  if (buffet.availableFromDate && date < toUTCDate(normalizeDateKey(buffet.availableFromDate))) return "Selected date is before this buffet starts.";
  if (buffet.availableToDate && date > new Date(`${normalizeDateKey(buffet.availableToDate)}T23:59:59.999Z`)) return "Selected date is after this buffet ends.";
  if (buffet.scheduleType === "selected_days" && buffet.recurringDays?.length && !buffet.recurringDays.includes(day)) return `This buffet is not available on ${day}.`;
  return "";
};

const ensureTargetInventory = async ({ buffet, dateKey, slot, session }) => {
  let inventory = await BuffetSeatInventory.findOne({ buffet: buffet._id, dateKey, slotId: String(slot._id) }).session(session);
  if (inventory) return inventory;
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(`${dateKey}T23:59:59.999Z`);
  const booked = await Booking.aggregate([
    { $match: { buffet: new mongoose.Types.ObjectId(String(buffet._id)), selectedDate: { $gte: start, $lte: end }, bookingStatus: { $in: ["pending", "confirmed", "checked_in", "dining", "completed"] }, "selectedTimeSlot.startTime": slot.startTime, "selectedTimeSlot.endTime": slot.endTime } },
    { $group: { _id: null, seats: { $sum: "$seats" } } },
  ]).session(session);
  [inventory] = await BuffetSeatInventory.create([{
    buffet: buffet._id, dateKey, slotId: String(slot._id), startTime: slot.startTime, endTime: slot.endTime,
    totalSeats: Number(slot.totalSeats || 0), availableSeats: Math.max(Number(slot.totalSeats || 0) - Number(booked[0]?.seats || 0), 0),
  }], { session });
  return inventory;
};

exports.rescheduleCustomerReservation = async (req, res) => {
  try {
    const result = await mongoose.connection.transaction(async (session) => {
      const context = await loadContext(req.params.id, session);
      const { booking, payment, hotel } = context;
      if (!booking || String(booking.user?._id) !== String(req.user.id)) throw rejectChange(404, "Booking not found.");
      if (!['pending', 'confirmed'].includes(booking.bookingStatus) || booking.qrUsed) throw rejectChange(409, "This booking can no longer be rescheduled.");
      if (isOnlineHold(booking, payment)) throw rejectChange(409, "Check the payment status before changing this reservation.");
      if (!booking.buffet?.isActive || (booking.buffet.status && booking.buffet.status !== "active") || hotel?.status !== "approved") {
        throw rejectChange(409, "This buffet is no longer taking reservations.");
      }
      const policy = normalizeCancellationPolicy(hotel.cancellationPolicy);
      if (!policy.allowCustomerReschedule) throw rejectChange(409, "This hotel does not allow customer self-service rescheduling.");
      if (hoursUntilReservation(booking) < policy.rescheduleCutoffHours) throw rejectChange(409, `Online rescheduling closes ${policy.rescheduleCutoffHours} hours before arrival.`);
      if (Math.max(Number(booking.rescheduleHistory?.length || 0), Number(booking.modificationCount || 0)) >= policy.maxCustomerReschedules) throw rejectChange(409, `This booking has reached the ${policy.maxCustomerReschedules}-reschedule limit.`);

      const dateKey = typeof req.body.selectedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.selectedDate)
        && normalizeDateKey(req.body.selectedDate) === req.body.selectedDate ? req.body.selectedDate : "";
      const slot = booking.buffet?.timeSlots?.id?.(req.body.slotId) || booking.buffet?.timeSlots?.find((item) => String(item._id) === String(req.body.slotId));
      if (!dateKey || !slot) throw rejectChange(400, "Select a valid new date and time slot.");
      const dateError = validateRequestedDate(booking.buffet, dateKey);
      if (dateError) throw rejectChange(400, dateError);
      const latestBookable = new Date();
      latestBookable.setDate(latestBookable.getDate() + Math.max(1, Number(booking.buffet.bookingWindowDays || 90)));
      if (toUTCDate(dateKey) > latestBookable) throw rejectChange(400, `This buffet accepts reservations only ${booking.buffet.bookingWindowDays || 90} days ahead.`);
      const targetStart = reservationDateTime(toUTCDate(dateKey), slot.startTime);
      if (!targetStart || targetStart <= new Date()) throw rejectChange(400, "The new reservation time must be in the future.");
      const oldDateKey = normalizeDateKey(booking.selectedDate);
      const previousSlotId = booking.inventorySlotId || payment?.metadata?.slotId;
      const sameTime = !previousSlotId && booking.selectedTimeSlot?.startTime === slot.startTime && booking.selectedTimeSlot?.endTime === slot.endTime;
      if (oldDateKey === dateKey && (sameTime || String(previousSlotId) === String(slot._id))) throw rejectChange(400, "Choose a different date or time slot.");

      await ensureTargetInventory({ buffet: booking.buffet, dateKey, slot, session });
      const reservedTarget = await BuffetSeatInventory.findOneAndUpdate({ buffet: booking.buffet._id, dateKey, slotId: String(slot._id), isClosed: { $ne: true }, availableSeats: { $gte: booking.seats } }, { $inc: { availableSeats: -Number(booking.seats) } }, { new: true, session });
      if (!reservedTarget) throw rejectChange(409, "The selected time no longer has enough seats.");
      await restoreInventorySeats(booking, { session, slotId: previousSlotId });

      const previousDate = booking.selectedDate;
      const previousTimeSlot = { ...(booking.selectedTimeSlot.toObject?.() || booking.selectedTimeSlot) };
      booking.selectedDate = toUTCDate(dateKey);
      booking.inventorySlotId = String(slot._id);
      booking.selectedTimeSlot = { startTime: slot.startTime, endTime: slot.endTime };
      booking.modificationCount = Number(booking.modificationCount || 0) + 1;
      booking.lastModifiedAt = new Date();
      booking.reminderFlags = { dayBeforeSentAt: null, hourBeforeSentAt: null, startedSentAt: null, completedSentAt: null };
      booking.notificationSent = { ...(booking.notificationSent?.toObject?.() || booking.notificationSent || {}), reminder24h: false, reminder3h: false };
      booking.rescheduleHistory.push({ previousDate, previousTimeSlot, nextDate: booking.selectedDate, nextTimeSlot: booking.selectedTimeSlot, by: req.user.id, reason: cleanReason(req.body.reason, "Customer rescheduled reservation.").slice(0, 500), at: new Date() });
      booking.statusTimeline.push({ status: booking.bookingStatus, note: `Reservation rescheduled from ${oldDateKey} ${previousTimeSlot.startTime} to ${dateKey} ${slot.startTime}.`, by: req.user.id, at: new Date() });
      await booking.save({ session });

      if (payment) {
        payment.metadata = { ...(payment.metadata || {}), dateKey, slotId: String(slot._id), slot: `${slot.startTime} - ${slot.endTime}`, lastRescheduledAt: new Date() };
        await payment.save({ session });
      }
      return { bookingId: booking._id, policy };
    });
    const populated = await Booking.findById(result.bookingId).populate(contextPopulate);
    communicateBookingEvent({ booking: populated, event: "rescheduled" }).catch((error) => console.error("Reschedule communication failed:", error.message));
    return res.json({ message: "Reservation rescheduled successfully. Your payment and booking code remain linked.", booking: customerChangeBooking(populated), policy: result.policy });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Availability changed. Refresh and try again." });
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Failed to reschedule reservation." });
  }
};

exports.getHotelCancellationCases = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.user.id }).select("_id hotelName");
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
    const cases = await CancellationRequest.find({ hotel: hotel._id }).populate(casePopulate).sort({ createdAt: -1 }).limit(200);
    return res.json(cases.map(hotelCancellationView));
  } catch (error) { return res.status(500).json({ message: "Failed to load cancellation cases.", error: error.message }); }
};

exports.getAdminCancellationCases = async (_req, res) => {
  try { return res.json(await CancellationRequest.find().populate(casePopulate).sort({ createdAt: -1 }).limit(300)); }
  catch (error) { return res.status(500).json({ message: "Failed to load cancellation cases.", error: error.message }); }
};
