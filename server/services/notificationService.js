const User = require("../models/User");

const MAX_NOTIFICATIONS = 100;

const notifyUser = async ({
  userId,
  title,
  message,
  type = "system",
  link = "",
  dedupeKey = "",
}) => {
  if (!userId || !title) return null;

  const user = await User.findById(userId).select("notifications");
  if (!user) return null;

  if (dedupeKey) {
    const alreadyExists = (user.notifications || []).some(
      (item) =>
        String(item.dedupeKey || "") === String(dedupeKey)
    );
    if (alreadyExists) return null;
  }

  user.notifications.unshift({
    title,
    message: message || "",
    type,
    link,
    dedupeKey,
    isRead: false,
    createdAt: new Date(),
  });

  if (user.notifications.length > MAX_NOTIFICATIONS) {
    user.notifications = user.notifications.slice(0, MAX_NOTIFICATIONS);
  }

  await user.save();
  return user.notifications[0];
};

const notifyAdmins = async (payload) => {
  const admins = await User.find({
    role: "admin",
    isActive: { $ne: false },
  }).select("_id");

  return Promise.allSettled(
    admins.map((admin) =>
      notifyUser({
        ...payload,
        userId: admin._id,
      })
    )
  );
};

module.exports = {
  notifyUser,
  notifyAdmins,
  MAX_NOTIFICATIONS,
};
