const mongoose = require("mongoose");

const settlementBatchSchema = new mongoose.Schema(
  {
    settlementCode: { type: String, required: true, unique: true, index: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "PaymentTransaction" }],
    paymentCount: { type: Number, default: 0 },
    currency: { type: String, default: "LKR" },
    grossRecognized: { type: Number, default: 0 },
    gatewayCollected: { type: Number, default: 0 },
    hotelCollected: { type: Number, default: 0 },
    refundedAmount: { type: Number, default: 0 },
    gatewayFees: { type: Number, default: 0 },
    commissionDue: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    direction: { type: String, enum: ["payable_to_hotel", "receivable_from_hotel", "balanced"], default: "balanced" },
    status: { type: String, enum: ["draft", "approved", "processing", "paid", "received", "reconciled", "cancelled", "disputed"], default: "draft", index: true },
    bankSnapshot: { bankName: String, branch: String, accountHolderName: String, accountLast4: String },
    payoutReference: { type: String, default: "" },
    note: { type: String, default: "", maxlength: 1000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    submittedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

settlementBatchSchema.index({ hotel: 1, periodEnd: -1 });

module.exports = mongoose.model("SettlementBatch", settlementBatchSchema);
