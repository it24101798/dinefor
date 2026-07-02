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
  },
  { timestamps: true }
);

buffetSeatInventorySchema.index(
  { buffet: 1, dateKey: 1, slotId: 1 },
  { unique: true }
);

module.exports = mongoose.model("BuffetSeatInventory", buffetSeatInventorySchema);
