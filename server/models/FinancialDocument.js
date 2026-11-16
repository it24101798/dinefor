const mongoose = require("mongoose");

const financialDocumentSchema = new mongoose.Schema(
  {
    documentNumber: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["invoice", "receipt", "credit_note", "settlement_statement"], required: true, index: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    settlement: { type: mongoose.Schema.Types.ObjectId, ref: "SettlementBatch", default: null, index: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    currency: { type: String, default: "LKR" },
    totals: { type: Object, default: {} },
    status: { type: String, enum: ["issued", "void"], default: "issued" },
    issuedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

financialDocumentSchema.index({ payment: 1, type: 1 }, { unique: true, partialFilterExpression: { payment: { $type: "objectId" } } });
financialDocumentSchema.index({ settlement: 1, type: 1 }, { unique: true, partialFilterExpression: { settlement: { $type: "objectId" } } });

module.exports = mongoose.model("FinancialDocument", financialDocumentSchema);
