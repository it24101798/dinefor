const mongoose = require("mongoose");

const discoveryEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ["search", "zero_result", "impression", "buffet_view", "booking_start"],
    required: true,
    index: true,
  },
  buffet: { type: mongoose.Schema.Types.ObjectId, ref: "Buffet", default: null, index: true },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", default: null, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  query: { type: String, trim: true, maxlength: 160, default: "" },
  location: { type: String, trim: true, maxlength: 120, default: "" },
  category: { type: String, trim: true, maxlength: 80, default: "" },
  resultCount: { type: Number, min: 0, default: 0 },
  source: { type: String, trim: true, maxlength: 80, default: "discovery" },
  sessionId: { type: String, trim: true, maxlength: 120, default: "" },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

discoveryEventSchema.index({ createdAt: -1, eventType: 1 });
discoveryEventSchema.index({ buffet: 1, createdAt: -1 });

module.exports = mongoose.model("DiscoveryEvent", discoveryEventSchema);
