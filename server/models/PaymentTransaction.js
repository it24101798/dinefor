const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
    type: {
      type: String,
      enum: ["payment_created", "gateway_initiated", "payment", "payment_failed", "refund_requested", "refund", "refund_failed", "expired", "manual_collection", "status_change"],
      required: true,
      index: true,
    },
    direction: { type: String, enum: ["debit", "credit", "none"], default: "none" },
    amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "LKR", uppercase: true },
    gateway: { type: String, default: "pay_at_hotel" },
    gatewayReference: { type: String, default: "" },
    idempotencyKey: { type: String, default: undefined, unique: true, sparse: true },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "succeeded", "failed"], default: "pending" },
    note: { type: String, default: "", maxlength: 1000 },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    metadata: { type: Object, default: {} },
    settlement: { type: mongoose.Schema.Types.ObjectId, ref: "SettlementBatch", default: null, index: true },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ hotel: 1, createdAt: -1 });
paymentTransactionSchema.index({ booking: 1, createdAt: -1 });

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
