const mongoose = require("mongoose");
const { Schema } = mongoose;
const evidenceSchema = new Schema({
  kind: { type: String, required: true, enum: ["registration", "authority", "bank", "photo"] },
  name: { type: String, required: true },
  mime: { type: String, required: true },
  size: { type: Number, required: true },
}, { timestamps: true });

const onboardingSchema = new Schema({
  hotelName: { type: String, required: true },
  contactName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, unique: true },
  phone: String,
  leadNotes: String,
  followUpAt: Date,
  invitationHash: { type: String, unique: true, sparse: true, select: false },
  invitationExpiresAt: Date,
  invitationSentAt: Date,
  invitationRevokedAt: Date,
  status: { type: String, enum: ["lead", "draft", "submitted", "under_review", "changes_requested", "resubmitted", "approved", "rejected"], default: "lead" },
  application: { type: Schema.Types.Mixed, default: () => ({}) },
  revision: { type: Number, default: 0 },
  evidence: { type: [evidenceSchema], default: [] },
  accountLast4: String,
  encryptedAccount: { type: String, select: false },
  corrections: { type: Map, of: String },
  reviewNote: String,
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
  user: { type: Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
  hotel: { type: Schema.Types.ObjectId, ref: "Hotel", unique: true, sparse: true },
  provisionedAt: Date,
  bankChange: {
    holder: String, bank: String, branch: String, last4: String, evidence: evidenceSchema,
    encryptedAccount: { type: String, select: false },
    requestedAt: Date, reviewedAt: Date,
    status: { type: String, enum: ["pending", "approved", "rejected"] },
  },
  verifiedBankEvidence: evidenceSchema,
}, { timestamps: true });
onboardingSchema.index({ status: 1, createdAt: -1 });

const evidenceDataSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, required: true },
  application: { type: Schema.Types.ObjectId, ref: "HotelOnboarding", required: true, index: true },
  ciphertext: { type: Buffer, required: true, select: false },
  iv: { type: Buffer, required: true, select: false },
  tag: { type: Buffer, required: true, select: false },
}, { timestamps: true });
module.exports = {
  HotelOnboarding: mongoose.model("HotelOnboarding", onboardingSchema),
  HotelOnboardingEvidence: mongoose.model("HotelOnboardingEvidence", evidenceDataSchema),
};
