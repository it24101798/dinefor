const mongoose = require("mongoose");

const cancellationRequestSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true, index: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null, index: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["customer_cancellation", "hotel_cancellation", "admin_cancellation", "no_show"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["no_refund", "refund_requested", "refund_approved", "refund_processed", "refund_rejected", "refund_failed"],
      default: "no_refund",
      index: true,
    },
    reasonCode: {
      type: String,
      enum: ["plans_changed", "duplicate_booking", "incorrect_details", "travel_issue", "medical", "hotel_operational", "no_show", "other"],
      default: "other",
    },
    reason: { type: String, default: "", maxlength: 1000 },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestedByRole: { type: String, enum: ["customer", "hotel", "admin"], required: true },
    policyBand: { type: String, default: "", maxlength: 80 },
    hoursBeforeReservation: { type: Number, default: 0 },
    refundPercent: { type: Number, default: 0, min: 0, max: 100 },
    paidAvailable: { type: Number, default: 0, min: 0 },
    refundableAmount: { type: Number, default: 0, min: 0 },
    retainedAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "LKR" },
    policySnapshot: { type: Object, default: {} },
    inventoryReleasedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: "", maxlength: 1000 },
    timeline: [{ status: String, note: String, by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

cancellationRequestSchema.index({ hotel: 1, createdAt: -1 });
cancellationRequestSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model("CancellationRequest", cancellationRequestSchema);
