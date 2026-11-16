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
    paymentMode: {
      type: String,
      enum: ["pay_at_hotel", "deposit", "full_payment"],
      default: "pay_at_hotel",
      index: true,
    },
    customerTotal: { type: Number, default: 0, min: 0 },
    amountDueNow: { type: Number, default: 0, min: 0 },
    amountDueAtHotel: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    gatewayFee: { type: Number, default: 0, min: 0 },
    dineForCommission: { type: Number, default: 0, min: 0 },
    hotelPayable: { type: Number, default: 0, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },
    netCollected: { type: Number, default: 0 },
    settlementStatus: { type: String, enum: ["unsettled", "batched", "settled", "disputed"], default: "unsettled", index: true },
    settlement: { type: mongoose.Schema.Types.ObjectId, ref: "SettlementBatch", default: null, index: true },
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
      default: 5,
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
      enum: ["pay_at_hotel", "payhere", "stripe", "wallet", "card", "cash", "sandbox"],
      default: "pay_at_hotel",
    },
    gatewayReference: {
      type: String,
      default: "",
    },
    gatewayOrderId: { type: String, default: "", index: true },
    gatewayStatus: { type: String, default: "not_started" },
    expiresAt: { type: Date, default: null, index: true },
    verifiedAt: { type: Date, default: null },
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
      enum: ["pending", "partially_paid", "paid", "failed", "partially_refunded", "refunded", "cancelled", "expired"],
      default: "pending",
    },
    paidAt: {
      type: Date,
      default: null,
    },
    refundStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected", "processing", "partially_processed", "processed", "failed"],
      default: "none",
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, expiresAt: 1 });
paymentSchema.index({ hotel: 1, createdAt: -1 });
paymentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
