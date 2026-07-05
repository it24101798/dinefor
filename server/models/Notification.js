const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", default: null, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    type: {
      type: String,
      enum: [
        "booking_confirmation",
        "booking_reminder_24h",
        "booking_reminder_3h",
        "booking_cancelled",
        "hotel_new_booking",
        "review_request",
        "admin_alert",
        "system",
      ],
      default: "system",
      index: true,
    },
    channel: { type: String, enum: ["in_app", "email", "whatsapp", "sms"], default: "in_app" },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ["queued", "sent", "read", "failed", "skipped"], default: "queued", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    scheduledFor: { type: Date, default: null, index: true },
    sentAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
