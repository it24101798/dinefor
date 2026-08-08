const mongoose = require("mongoose");

const recentlyViewedSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ["hotel", "buffet"],
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recentlyViewed.itemTypeModel",
    },
    itemTypeModel: {
      type: String,
      enum: ["Hotel", "Buffet"],
      required: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, default: "" },
    type: {
      type: String,
      enum: ["booking", "review", "offer", "system", "reminder"],
      default: "system",
    },
    isRead: { type: Boolean, default: false },
    link: { type: String, default: "" },
    dedupeKey: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const savedItemHistorySchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["customer", "hotel", "admin"],
      default: "customer",
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      default: "",
      index: true,
      sparse: true,
    },

    phone: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    city: { type: String, default: "" },
    gender: {
      type: String,
      enum: ["", "female", "male", "non_binary", "prefer_not_to_say"],
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    birthday: { type: Date, default: null },
    anniversary: { type: Date, default: null },

    emergencyContact: { type: String, default: "" },
    emergencyPhone: { type: String, default: "" },

    favoriteCuisines: {
      type: [String],
      default: [],
    },
    dietaryPreferences: {
      type: [String],
      default: [],
    },
    allergies: {
      type: [String],
      default: [],
    },
    accessibilityNeeds: {
      type: [String],
      default: [],
    },

    savedBuffets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Buffet",
      },
    ],
    savedHotels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
      },
    ],
    savedBuffetHistory: {
      type: [savedItemHistorySchema],
      default: [],
    },
    savedHotelHistory: {
      type: [savedItemHistorySchema],
      default: [],
    },

    recentlyViewed: {
      type: [recentlyViewedSchema],
      default: [],
    },
    notifications: {
      type: [notificationSchema],
      default: [],
    },

    preferences: {
      language: {
        type: String,
        enum: ["en", "si", "ta"],
        default: "en",
      },
      theme: {
        type: String,
        enum: ["dark", "light", "system"],
        default: "system",
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
      offerNotifications: {
        type: Boolean,
        default: true,
      },
      bookingReminders: {
        type: Boolean,
        default: true,
      },
      city: {
        type: String,
        default: "",
      },
    },

    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    emailVerificationLastSentAt: {
      type: Date,
      default: null,
    },
    emailVerificationSendCount: {
      type: Number,
      default: 0,
    },

    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetOtpHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetOtpExpires: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    passwordResetOtpLastSentAt: {
      type: Date,
      default: null,
    },
    passwordResetOtpVerifiedAt: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetSessionHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetSessionExpires: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
    mustResetPassword: {
      type: Boolean,
      default: false,
    },
    passwordResetRequestedAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
