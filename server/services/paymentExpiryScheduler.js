const { expirePendingPayments } = require("./paymentExpiryService");

const startPaymentExpiryScheduler = () => {
  if (String(process.env.PAYMENT_EXPIRY_SCHEDULER || "true").toLowerCase() === "false") return null;
  const intervalMs = Math.max(30, Number(process.env.PAYMENT_EXPIRY_CHECK_SECONDS || 60)) * 1000;
  const run = () => expirePendingPayments().catch((error) => console.error("Payment expiry check failed:", error.message));
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  setTimeout(run, 1000).unref?.();
  return timer;
};

module.exports = { startPaymentExpiryScheduler };
