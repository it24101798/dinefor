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
  { _id: false }
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
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["customer", "hotel", "admin"],
      default: "customer",
    },

    phone: {
      type: String,
      default: "",
    },

    avatarUrl: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
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

    recentlyViewed: {
      type: [recentlyViewedSchema],
      default: [],
    },

    notifications: {
      type: [notificationSchema],
      default: [],
    },

    preferences: {
      language: { type: String, default: "en" },
      theme: { type: String, enum: ["dark", "light", "system"], default: "dark" },
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      city: { type: String, default: "" },
    },

    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
