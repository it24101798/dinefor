const mongoose = require("mongoose");

const recentlyViewedSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buffet: { type: mongoose.Schema.Types.ObjectId, ref: "Buffet", required: true, index: true },
    viewedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

recentlyViewedSchema.index({ user: 1, buffet: 1 }, { unique: true });

module.exports = mongoose.model("RecentlyViewed", recentlyViewedSchema);
