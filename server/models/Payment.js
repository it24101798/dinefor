const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
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
    currency: {
      type: String,
      default: "LKR",
      uppercase: true,
    },
    gateway: {
      type: String,
      enum: ["pay_at_hotel", "payhere", "stripe", "wallet", "card", "cash"],
      default: "pay_at_hotel",
    },
    gatewayReference: {
      type: String,
      default: "",
    },
    invoiceNumber: {
      type: String,
      default: "",
      index: true,
    },
    couponCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "cancelled", "expired"],
      default: "pending",
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    collectedAt: {
      type: Date,
      default: null,
    },
    settlementStatus: {
      type: String,
      enum: ["not_ready", "pending", "settled", "held", "cancelled"],
      default: "not_ready",
      index: true,
    },
    settlementAt: {
      type: Date,
      default: null,
    },
    refundStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected", "processed"],
      default: "none",
      index: true,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundReason: {
      type: String,
      trim: true,
      default: "",
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    paymentTimeline: [
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
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

paymentSchema.index({ hotel: 1, status: 1, createdAt: -1 });
paymentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
