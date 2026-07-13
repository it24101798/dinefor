const mongoose = require("mongoose");

const timeSlotSchema = new mongoose.Schema(
  {
    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    totalSeats: {
      type: Number,
      required: true,
      min: 0,
    },

    availableSeats: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const buffetSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    buffetType: {
      type: String,
      enum: ["regular", "special"],
      default: "regular",
    },

    scheduleType: {
      type: String,
      enum: ["all_days", "selected_days", "one_day", "custom"],
      default: "one_day",
    },

    category: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "high-tea", "seafood", "bbq", "brunch", "other"],
      default: "other",
    },

    description: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    thumbnail: {
      type: String,
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

    location: {
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },

    recurringDays: {
      type: [String],
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      default: [],
    },

    availableFromDate: {
      type: Date,
      default: null,
    },

    availableToDate: {
      type: Date,
      default: null,
    },

    specialDate: {
      type: Date,
      default: null,
    },

    timeSlots: {
      type: [timeSlotSchema],
      default: [],
    },


    status: {
      type: String,
      enum: ["draft", "active", "paused", "expired"],
      default: "draft",
      index: true,
    },

    highlights: {
      type: [String],
      default: [],
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    featuredUntil: {
      type: Date,
      default: null,
    },

    likesCount: {
      type: Number,
      default: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
    },

    averageRating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Buffet", buffetSchema);
