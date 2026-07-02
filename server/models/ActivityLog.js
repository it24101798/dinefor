const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, default: "system" },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, default: "system", trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    message: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
