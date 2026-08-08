const mongoose = require("mongoose");

const ratingBreakdownSchema = new mongoose.Schema(
  {
    food: { type: Number, min: 1, max: 5, default: null },
    service: { type: Number, min: 1, max: 5, default: null },
    ambience: { type: Number, min: 1, max: 5, default: null },
    value: { type: Number, min: 1, max: 5, default: null },
  },
  { _id: false }
);

const reviewReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "spam",
        "abusive",
        "irrelevant",
        "privacy",
        "misleading",
        "other",
      ],
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

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
      required: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    ratings: {
      type: ratingBreakdownSchema,
      default: () => ({}),
    },
    comment: {
      type: String,
      trim: true,
      minlength: 10,
      maxlength: 2000,
      required: true,
    },

    images: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 8;
        },
        message: "A review can contain up to 8 photos.",
      },
    },
    videos: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 2;
        },
        message: "A review can contain up to 2 videos.",
      },
    },

    status: {
      type: String,
      enum: ["published", "hidden", "pending", "rejected"],
      default: "published",
      index: true,
    },
    moderationNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isVerifiedBooking: {
      type: Boolean,
      default: true,
    },

    helpfulVotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reports: {
      type: [reviewReportSchema],
      default: [],
    },

    hotelReply: {
      message: {
        type: String,
        trim: true,
        maxlength: 1200,
        default: "",
      },
      repliedAt: {
        type: Date,
        default: null,
      },
      repliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  { timestamps: true }
);

reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ buffet: 1, status: 1, createdAt: -1 });
reviewSchema.index({ hotel: 1, status: 1, createdAt: -1 });
reviewSchema.index({ isFeatured: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
