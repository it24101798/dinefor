const mongoose = require("mongoose");
const { buildDocumentSlug } = require("../utils/seoSlug");

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

    slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },

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

    // Release 4.4 — reservation automation policy.
    // auto_confirm is the business-default: hotels define inventory once and
    // DineFor confirms normal reservations without manual hotel intervention.
    reservationMode: {
      type: String,
      enum: ["auto_confirm", "manual_request"],
      default: "auto_confirm",
      index: true,
    },

    maxGuestsPerBooking: {
      type: Number,
      default: 20,
      min: 1,
      max: 100,
    },

    advanceBookingHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 720,
    },

    bookingWindowDays: {
      type: Number,
      default: 90,
      min: 1,
      max: 365,
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

buffetSchema.pre("validate", function ensureSeoSlug(next) {
  if (!this.slug && this.title) this.slug = buildDocumentSlug(this.title, this._id);
  next();
});

// Release 4.3 discovery indexes.
buffetSchema.index({ status: 1, isActive: 1, category: 1, price: 1 });
buffetSchema.index({ hotel: 1, status: 1, createdAt: -1 });
buffetSchema.index({ averageRating: -1, totalReviews: -1 });

module.exports = mongoose.model("Buffet", buffetSchema);
