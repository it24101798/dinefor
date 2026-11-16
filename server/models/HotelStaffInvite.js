const { Schema, model } = require("mongoose");

const schema = new Schema({
  hotel: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  invitationHash: { type: String, unique: true, sparse: true, select: false },
  invitationExpiresAt: Date,
  sentAt: Date,
  status: { type: String, enum: ["invited", "active", "revoked"], required: true },
  user: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
schema.index({ hotel: 1, email: 1 }, { unique: true });

module.exports = model("HotelStaffInvite", schema);
