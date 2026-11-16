const mongoose = require("mongoose");

const paymentWebhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, default: "payhere", index: true },
    fingerprint: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, default: "", index: true },
    gatewayReference: { type: String, default: "", index: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null, index: true },
    verificationStatus: { type: String, enum: ["pending", "verified", "invalid", "orphan"], default: "pending", index: true },
    processingStatus: { type: String, enum: ["received", "processed", "ignored", "failed"], default: "received", index: true },
    statusCode: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "" },
    method: { type: String, default: "" },
    attemptCount: { type: Number, default: 1 },
    lastError: { type: String, default: "", maxlength: 500 },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentWebhookEventSchema.index({ processingStatus: 1, updatedAt: -1 });
module.exports = mongoose.model("PaymentWebhookEvent", paymentWebhookEventSchema);
