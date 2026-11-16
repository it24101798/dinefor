const crypto = require("crypto");
const PaymentTransaction = require("../models/PaymentTransaction");

const payloadFingerprint = (payload) => crypto
  .createHash("sha256")
  .update(JSON.stringify(payload || {}))
  .digest("hex");

const recordTransaction = ({ payment, type, direction = "none", amount = 0, status = "succeeded", verified = false, actor = null, note = "", gatewayReference = "", idempotencyKey, metadata = {}, session }) => {
  const entry = {
    payment: payment._id,
    booking: payment.booking?._id || payment.booking,
    user: payment.user?._id || payment.user,
    hotel: payment.hotel?._id || payment.hotel,
    type,
    direction,
    amount,
    currency: payment.currency,
    gateway: payment.gateway,
    gatewayReference,
    idempotencyKey,
    verified,
    status,
    actor,
    note,
    metadata,
  };
  return session ? PaymentTransaction.create([entry], { session }).then(([transaction]) => transaction) : PaymentTransaction.create(entry);
};

module.exports = { recordTransaction, payloadFingerprint };
