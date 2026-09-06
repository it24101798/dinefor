const mongoose = require("mongoose");

const buffetSeatInventorySchema = new mongoose.Schema(
  {
    buffet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buffet",
      required: true,
      index: true,
    },

    dateKey: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },

    slotId: {
      type: String,
      required: true,
      index: true,
    },

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

    // A hotel normally does not need to touch daily inventory. These fields
    // exist for exceptions such as private events, maintenance or a revised
    // capacity for one date/slot.
    isClosed: {
      type: Boolean,
      default: false,
      index: true,
    },

    overrideReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    overrideUpdatedAt: {
      type: Date,
      default: null,
    },

    overrideUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

buffetSeatInventorySchema.index(
  { buffet: 1, dateKey: 1, slotId: 1 },
  { unique: true }
);

module.exports = mongoose.model("BuffetSeatInventory", buffetSeatInventorySchema);
