const mongoose = require("mongoose");

const termsSchema = new mongoose.Schema(
  {
    platformCommissionRate: { type: Number, required: true, default: 5 },
    currency: { type: String, required: true, default: "LKR" },
    settlementCycle: { type: String, required: true, default: "Monthly" },
    settlementWindowDays: { type: Number, required: true, default: 7 },
    cancellationPolicy: { type: String, default: "" },
    refundPolicy: { type: String, default: "" },
    hotelResponsibilities: { type: String, default: "" },
    dineForResponsibilities: { type: String, default: "" },
    contentPermission: { type: String, default: "" },
    dataProtection: { type: String, default: "" },
    terminationTerms: { type: String, default: "" },
  },
  { _id: false }
);

const hotelPartnershipAgreementSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    agreementNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    version: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: [
        "draft",
        "sent",
        "viewed",
        "acknowledged",
        "signed_submitted",
        "verified",
        "superseded",
        "terminated",
      ],
      default: "draft",
      index: true,
    },
    legalSnapshot: {
      hotelName: { type: String, required: true },
      legalBusinessName: { type: String, default: "" },
      businessRegistrationNumber: { type: String, default: "" },
      taxNumber: { type: String, default: "" },
      representativeName: { type: String, default: "" },
      representativeDesignation: { type: String, default: "" },
      representativeEmail: { type: String, default: "" },
      representativePhone: { type: String, default: "" },
    },
    terms: { type: termsSchema, required: true },
    termsHash: { type: String, required: true, index: true },
    effectiveDate: { type: Date, default: null },
    reviewDate: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sentAt: { type: Date, default: null },
    viewedAt: { type: Date, default: null },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    signedDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HotelDocument",
      default: null,
    },
    verifiedAt: { type: Date, default: null },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

hotelPartnershipAgreementSchema.index({ hotel: 1, version: -1 });

module.exports = mongoose.model(
  "HotelPartnershipAgreement",
  hotelPartnershipAgreementSchema
);
