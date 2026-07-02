const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },

    buffet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buffet",
      required: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    videos: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["published", "hidden"],
      default: "published",
    },

    isVerifiedBooking: {
      type: Boolean,
      default: false,
    },


    hotelReply: {
      message: { type: String, trim: true, maxlength: 1200, default: "" },
      repliedAt: { type: Date, default: null },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
  },
  { timestamps: true }
);

// Multiple reviews by the same guest are allowed because guests can return after different visits.
reviewSchema.index({ user: 1, buffet: 1, createdAt: -1 });
reviewSchema.index({ buffet: 1, status: 1, createdAt: -1 });
reviewSchema.index({ hotel: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
