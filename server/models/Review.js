const mongoose = require("mongoose");

const mediaItemSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    caption: { type: String, trim: true, maxlength: 240, default: "" },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    buffet: { type: mongoose.Schema.Types.ObjectId, ref: "Buffet", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },

    rating: { type: Number, required: true, min: 1, max: 5 },
    foodRating: { type: Number, min: 1, max: 5, default: null },
    serviceRating: { type: Number, min: 1, max: 5, default: null },
    ambienceRating: { type: Number, min: 1, max: 5, default: null },
    valueRating: { type: Number, min: 1, max: 5, default: null },

    comment: { type: String, trim: true, maxlength: 1200, default: "" },
    visitType: { type: String, enum: ["family", "couple", "friends", "business", "solo", "other", ""], default: "" },
    tags: { type: [String], default: [] },

    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    media: { type: [mediaItemSchema], default: [] },

    status: {
      type: String,
      enum: ["published", "hidden", "flagged", "pending"],
      default: "published",
      index: true,
    },

    isVerifiedBooking: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
    helpfulBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    reports: [
      {
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        reason: { type: String, trim: true, maxlength: 300, default: "" },
        at: { type: Date, default: Date.now },
      },
    ],

    hotelReply: {
      message: { type: String, trim: true, maxlength: 1200, default: "" },
      repliedAt: { type: Date, default: null },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, buffet: 1, createdAt: -1 });
reviewSchema.index({ buffet: 1, status: 1, createdAt: -1 });
reviewSchema.index({ hotel: 1, status: 1, createdAt: -1 });
reviewSchema.index({ rating: 1, status: 1 });

module.exports = mongoose.model("Review", reviewSchema);
