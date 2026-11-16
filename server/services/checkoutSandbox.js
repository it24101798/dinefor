const mongoose = require("mongoose");

function sandboxEnabled() {
  return ["development", "test"].includes(process.env.NODE_ENV)
    && process.env.DINEFOR_CHECKOUT_SANDBOX === "true"
    && /_sandbox$/i.test(mongoose.connection.name || "");
}

function checkoutState(payment, now = new Date()) {
  if (["paid", "partially_paid"].includes(payment.status) && payment.verifiedAt) return "confirmed";
  if (payment.status === "expired") return "expired";
  if (["refunded", "partially_refunded"].includes(payment.status)) return payment.status;
  if (["failed", "cancelled"].includes(payment.status)) return "failed";
  if (payment.status !== "pending") return "confirming";
  if (payment.expiresAt && new Date(payment.expiresAt) <= now) return "expired";
  if (payment.gatewayStatus === "not_started") return "ready";
  if (["sandbox_failed", "failed_-1", "failed_-2"].includes(payment.gatewayStatus)) return "failed";
  return "confirming";
}

module.exports = { sandboxEnabled, checkoutState };
