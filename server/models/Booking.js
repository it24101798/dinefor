const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    buffet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buffet",
      required: true,
    },

    selectedDate: {
      type: Date,
      required: true,
    },

    selectedTimeSlot: {
      startTime: {
        type: String,
        required: true,
      },
      endTime: {
        type: String,
        required: true,
      },
    },

    seats: {
      type: Number,
      required: true,
      min: 1,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    subtotal: {
      type: Number,
      default: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
    },

    serviceCharge: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
    },

    commissionRate: {
      type: Number,
      default: 8,
    },

    commissionAmount: {
      type: Number,
      default: 0,
    },

    hotelEarning: {
      type: Number,
      default: 0,
    },

    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "checked_in", "dining", "completed", "cancelled", "no_show", "expired"],
      default: "confirmed",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "unpaid", "paid", "failed", "refunded", "cancelled", "expired"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["pay_at_hotel", "payhere", "stripe", "wallet", "card", "cash"],
      default: "pay_at_hotel",
    },

    paymentReference: {
      type: String,
      trim: true,
      default: "",
    },

    invoiceNumber: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    refundStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected", "processed"],
      default: "none",
    },

    refundAmount: {
      type: Number,
      default: 0,
    },

    notes: {
      type: String,
      trim: true,
    },

    specialRequests: {
      occasion: { type: String, enum: ["", "birthday", "anniversary", "business", "other"], default: "" },
      seating: { type: String, enum: ["", "indoor", "outdoor", "window", "quiet", "accessible"], default: "" },
      highChair: { type: Boolean, default: false },
      wheelchairAccess: { type: Boolean, default: false },
      dietaryNotes: { type: String, trim: true, maxlength: 500, default: "" },
      additionalNotes: { type: String, trim: true, maxlength: 500, default: "" },
    },

    modificationCount: { type: Number, default: 0 },
    lastModifiedAt: { type: Date, default: null },

    cancelledBy: {
      type: String,
      enum: ["customer", "hotel", "admin", null],
      default: null,
    },

    cancelledAt: {
      type: Date,
    },

    qrUsed: {
      type: Boolean,
      default: false,
    },

    qrUsedAt: {
      type: Date,
    },

    checkedInAt: {
      type: Date,
    },

    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    completedAt: {
      type: Date,
      default: null,
    },

    expiredAt: {
      type: Date,
      default: null,
    },

    notificationSent: {
      confirmation: { type: Boolean, default: false },
      reminder24h: { type: Boolean, default: false },
      reminder3h: { type: Boolean, default: false },
      reviewRequest: { type: Boolean, default: false },
    },

    reminderFlags: {
      dayBeforeSentAt: { type: Date, default: null },
      hourBeforeSentAt: { type: Date, default: null },
      startedSentAt: { type: Date, default: null },
      completedSentAt: { type: Date, default: null },
    },

    statusTimeline: [
      {
        status: String,
        note: String,
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        at: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    bookingCode: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
