const User = require("../models/User");

const runRelease2Maintenance = async () => {
  const now = new Date();
  const notificationCutoff = new Date(
    now.getTime() - 120 * 24 * 60 * 60 * 1000
  );

  const users = await User.find({
    $or: [
      { passwordResetOtpExpires: { $lt: now } },
      { passwordResetSessionExpires: { $lt: now } },
      { "notifications.0": { $exists: true } },
    ],
  }).select(
    "+passwordResetOtpHash +passwordResetOtpExpires +passwordResetOtpAttempts +passwordResetSessionHash +passwordResetSessionExpires notifications"
  );

  let cleanedUsers = 0;
  let removedNotifications = 0;

  for (const user of users) {
    let changed = false;

    if (
      user.passwordResetOtpExpires &&
      user.passwordResetOtpExpires < now
    ) {
      user.passwordResetOtpHash = null;
      user.passwordResetOtpExpires = null;
      user.passwordResetOtpAttempts = 0;
      changed = true;
    }

    if (
      user.passwordResetSessionExpires &&
      user.passwordResetSessionExpires < now
    ) {
      user.passwordResetSessionHash = null;
      user.passwordResetSessionExpires = null;
      user.passwordResetOtpVerifiedAt = null;
      changed = true;
    }

    const before = user.notifications?.length || 0;
    user.notifications = (user.notifications || []).filter(
      (notification) =>
        !(
          notification.isRead &&
          notification.createdAt &&
          notification.createdAt < notificationCutoff
        )
    );

    removedNotifications +=
      before - (user.notifications?.length || 0);

    if ((user.notifications?.length || 0) !== before) changed = true;

    if (changed) {
      await user.save();
      cleanedUsers += 1;
    }
  }

  return {
    cleanedUsers,
    removedNotifications,
  };
};

module.exports = {
  runRelease2Maintenance,
};
