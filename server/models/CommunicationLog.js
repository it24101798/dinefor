const mongoose = require("mongoose");

const communicationLogSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ["email", "in_app"], required: true, index: true },
    event: { type: String, required: true, trim: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    recipientEmail: { type: String, default: "", lowercase: true, trim: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    settlement: { type: mongoose.Schema.Types.ObjectId, ref: "SettlementBatch", default: null },
    financialDocument: { type: mongoose.Schema.Types.ObjectId, ref: "FinancialDocument", default: null },
    status: { type: String, enum: ["sent", "failed", "skipped"], required: true, index: true },
    providerMessageId: { type: String, default: "" },
    errorCode: { type: String, default: "" },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

communicationLogSchema.index({ recipient: 1, createdAt: -1 });
communicationLogSchema.index({ payment: 1, createdAt: -1 });

module.exports = mongoose.model("CommunicationLog", communicationLogSchema);
