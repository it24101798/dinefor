const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const { sandboxEnabled, checkoutState } = require("../services/checkoutSandbox");
const { recordTransaction } = require("../services/paymentTransactionService");

function ownerQuery(req) {
  return { _id: req.params.id, user: req.user.id, gateway: "sandbox" };
}

function statusPayload(payment, booking) {
  const now = new Date();
  return {
    paymentId: payment._id,
    bookingId: booking._id,
    bookingStatus: booking.bookingStatus,
    orderId: payment.gatewayOrderId,
    state: checkoutState(payment, now),
    amount: payment.amountDueNow,
    expiresAt: payment.expiresAt,
    serverTime: now,
    sandbox: true,
    attempt: payment.metadata?.sandboxAttempt || 1,
    reservation: {
      buffet: booking.buffet,
      selectedDate: booking.selectedDate,
      slot: booking.selectedTimeSlot,
      seats: booking.seats,
    },
  };
}

async function getSnapshot(query) {
  const payment = await Payment.findOne(query);
  if (!payment) return null;
  const booking = await Booking.findById(payment.booking)
    .select("bookingStatus buffet selectedDate selectedTimeSlot seats")
    .populate({ path: "buffet", select: "title category thumbnail images hotel", populate: { path: "hotel", select: "hotelName city" } });
  return booking ? statusPayload(payment, booking) : null;
}

async function getCheckout(req, res) {
  if (!sandboxEnabled()) return res.status(404).json({ message: "Test checkout is unavailable." });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Test payment not found." });
  const snapshot = await getSnapshot(ownerQuery(req));
  if (!snapshot) return res.status(404).json({ message: "Test payment not found." });
  return res.json(snapshot);
}

async function changeCheckout(req, res) {
  if (!sandboxEnabled()) return res.status(404).json({ message: "Test checkout is unavailable." });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Test payment not found." });
  const { action, attempt } = req.body;
  if (!["success", "fail", "retry"].includes(action) || !Number.isInteger(attempt)) {
    return res.status(400).json({ message: "Choose a valid test payment action." });
  }
  const query = ownerQuery(req);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne(query).session(session);
      if (!payment) return;
      const now = new Date();
      const state = checkoutState(payment, now);
      const currentAttempt = payment.metadata?.sandboxAttempt || 1;
      if (attempt !== currentAttempt || (action === "retry" ? state !== "failed" : state !== "confirming")) return;
      const booking = await Booking.findOne({ _id: payment.booking, bookingStatus: "pending" }).session(session);
      if (!booking) return;

      if (action === "retry") {
        payment.gatewayStatus = "sandbox_pending";
        payment.set("metadata", { ...payment.metadata, sandboxAttempt: currentAttempt + 1 });
      } else if (action === "fail") {
        payment.gatewayStatus = "sandbox_failed";
      } else {
        payment.status = "paid";
        payment.gatewayStatus = "sandbox_verified";
        payment.verifiedAt = now;
        payment.paidAt = now;
        payment.paidAmount = payment.amountDueNow;
        payment.netCollected = payment.paidAmount;
        booking.bookingStatus = payment.metadata?.postPaymentBookingStatus === "pending" ? "pending" : "confirmed";
        booking.paymentStatus = "paid";
        booking.paidAt = now;
        booking.paymentReference = payment._id;
        booking.statusTimeline.push({ status: booking.bookingStatus, note: "Sandbox payment simulated successfully.", at: now });
        await booking.save({ session });
      }
      await payment.save({ session });
      await recordTransaction({
        payment, actor: req.user.id, session,
        type: action === "success" ? "payment" : action === "fail" ? "payment_failed" : "gateway_initiated",
        direction: action === "success" ? "credit" : "none",
        amount: action === "success" ? payment.amountDueNow : 0,
        status: action === "fail" ? "failed" : "succeeded",
        verified: action === "success",
        idempotencyKey: `sandbox:${payment._id}:${currentAttempt}:${action}`,
        note: `Sandbox simulation: ${action}.`,
      });
    });
  } finally {
    await session.endSession();
  }
  return getCheckout(req, res);
}

module.exports = { getCheckout, changeCheckout };
