const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const { releaseBookingSeats } = require("./seatReleaseService");
const { recordTransaction } = require("./paymentTransactionService");
const { emitPaymentEvent } = require("./financeCommunicationService");

async function expireHold(id, now) {
  return mongoose.connection.transaction(async (session) => {
    const payment = await Payment.findOneAndUpdate(
      { _id: id, status: "pending", expiresAt: { $lte: now } },
      { $set: { status: "expired", gatewayStatus: "expired" } },
      { new: true, session }
    );
    if (!payment) return null;

    const booking = await Booking.findOneAndUpdate({ _id: payment.booking, bookingStatus: "pending" }, {
      $set: { bookingStatus: "expired", paymentStatus: "expired", expiredAt: now },
      $push: { statusTimeline: { status: "expired", note: "The online payment window expired.", at: now } },
    }, { new: true, session });
    if (!booking) {
      // A contradictory legacy state needs reconciliation before expiring its payment.
      const exists = await Booking.exists({ _id: payment.booking }).session(session);
      if (exists) throw new Error("Payment hold does not have a pending reservation.");
    }

    const release = booking && await releaseBookingSeats(booking, { session, slotId: payment.metadata?.slotId });
    await recordTransaction({
      payment, type: "expired", idempotencyKey: `expiry:${payment._id}`,
      note: "Payment hold expired.", session, verified: true, status: "succeeded",
    });
    return { released: Boolean(release?.released), sandbox: payment.gateway === "sandbox" };
  });
}

const expirePendingPayments = async ({ limit = 100 } = {}) => {
  const now = new Date();
  const candidates = await Payment.find({
    status: "pending",
    paymentMode: { $in: ["deposit", "full_payment"] },
    expiresAt: { $ne: null, $lte: now },
  }).sort({ expiresAt: 1 }).limit(limit);

  let expired = 0;
  let seatsReleased = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      const result = await expireHold(candidate._id, now);
      if (!result) continue;
      expired += 1;
      if (result.released) seatsReleased += 1;
      if (!result.sandbox) {
        await emitPaymentEvent({
          paymentId: candidate._id, event: "payment_expired", title: "Payment window expired",
          message: "Your payment window expired. Check availability to create a new reservation.",
        }).catch(() => {});
      }
    } catch (error) {
      failed += 1;
      console.error("Payment hold expiry needs reconciliation:", String(candidate._id), error.name);
    }
  }
  return { checked: candidates.length, expired, seatsReleased, failed, ranAt: now.toISOString() };
};

module.exports = { expirePendingPayments };
