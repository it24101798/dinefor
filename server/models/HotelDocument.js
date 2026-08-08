const mongoose = require("mongoose");

const hotelDocumentSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    documentType: {
      type: String,
      enum: ["business_registration", "authorized_representative_id", "bank_proof", "hotel_license", "tax_document", "signed_agreement", "other"],
      required: true,
      index: true,
    },
    label: { type: String, default: "" },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    status: { type: String, enum: ["submitted", "under_review", "verified", "rejected", "expired"], default: "submitted", index: true },
    reviewNote: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

hotelDocumentSchema.index({ hotel: 1, createdAt: -1 });
module.exports = mongoose.model("HotelDocument", hotelDocumentSchema);
