const ActivityLog = require("../models/ActivityLog");

const sanitizeMetadata = (metadata = {}) => {
  const blocked = new Set([
    "password",
    "currentPassword",
    "newPassword",
    "token",
    "credential",
    "otp",
    "code",
    "resetSession",
    "SMTP_PASS",
    "JWT_SECRET",
  ]);

  return Object.fromEntries(
    Object.entries(metadata || {}).filter(([key]) => !blocked.has(key))
  );
};

const logActivity = async ({
  actor = null,
  actorRole = "system",
  action,
  entityType = "system",
  entityId = null,
  message = "",
  metadata = {},
}) => {
  try {
    return await ActivityLog.create({
      actor,
      actorRole,
      action,
      entityType,
      entityId,
      message,
      metadata: sanitizeMetadata(metadata),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Activity log write failed:", error.message);
    }
    return null;
  }
};

module.exports = { logActivity };
