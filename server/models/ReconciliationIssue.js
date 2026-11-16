const mongoose = require("mongoose");

const reconciliationIssueSchema = new mongoose.Schema(
  {
    issueKey: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["orphan_webhook", "invalid_webhook", "amount_mismatch", "payment_without_credit", "ledger_total_mismatch", "refund_mismatch", "refund_failure", "expired_with_credit", "callback_failure"], required: true, index: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
    status: { type: String, enum: ["open", "acknowledged", "resolved"], default: "open", index: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null, index: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", default: null, index: true },
    webhookEvent: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentWebhookEvent", default: null },
    title: { type: String, required: true },
    details: { type: Object, default: {} },
    detectedAt: { type: Date, default: Date.now },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    acknowledgedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: "", maxlength: 1000 },
  },
  { timestamps: true }
);

reconciliationIssueSchema.index({ status: 1, severity: 1, createdAt: -1 });
module.exports = mongoose.model("ReconciliationIssue", reconciliationIssueSchema);
