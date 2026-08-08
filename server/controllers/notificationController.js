const User = require("../models/User");
const Booking = require("../models/Booking");
const { notifyUser } = require("../services/notificationService");

const MAX_NOTIFICATIONS = 100;

const parseSlotDateTime = (selectedDate, timeText) => {
  const date = new Date(selectedDate);
  if (Number.isNaN(date.getTime())) return null;

  const value = String(timeText || "").trim();
  let hours = 12;
  let minutes = 0;

  const twelveHour = value.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(A\.?M\.?|P\.?M\.?)$/i
  );
  const twentyFourHour = value.match(/^(\d{1,2}):(\d{2})$/);

  if (twelveHour) {
    hours = Number(twelveHour[1]);
    minutes = Number(twelveHour[2] || 0);
    const period = twelveHour[3].toUpperCase();

    if (period.startsWith("P") && hours !== 12) hours += 12;
    if (period.startsWith("A") && hours === 12) hours = 0;
  } else if (twentyFourHour) {
    hours = Number(twentyFourHour[1]);
    minutes = Number(twentyFourHour[2]);
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
};

const pushNotification = notifyUser;

const createDueBookingReminders = async (userId) => {
  const now = new Date();
  const bookings = await Booking.find({
    user: userId,
    bookingStatus: { $in: ["pending", "confirmed"] },
    selectedDate: {
      $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
  })
    .populate({
      path: "buffet",
      select: "title hotel",
      populate: {
        path: "hotel",
        select: "hotelName",
      },
    })
    .sort({ selectedDate: 1 });

  for (const booking of bookings) {
    const start = parseSlotDateTime(
      booking.selectedDate,
      booking.selectedTimeSlot?.startTime
    );

    if (!start) continue;

    const remainingMs = start.getTime() - now.getTime();
    if (remainingMs <= 0) continue;

    const bookingLink = "/my-bookings";
    const buffetName = booking.buffet?.title || "your buffet";
    const hotelName =
      booking.buffet?.hotel?.hotelName || "the hotel";

    if (
      remainingMs <= 3 * 60 * 60 * 1000 &&
      booking.notificationSent?.reminder3h !== true
    ) {
      await pushNotification({
        userId,
        title: "Your buffet starts soon",
        message: `${buffetName} at ${hotelName} begins in under 3 hours. Keep your QR confirmation ready.`,
        type: "reminder",
        link: bookingLink,
      });

      booking.notificationSent = {
        ...(booking.notificationSent?.toObject?.() ||
          booking.notificationSent ||
          {}),
        reminder3h: true,
      };
      await booking.save();
      continue;
    }

    if (
      remainingMs <= 24 * 60 * 60 * 1000 &&
      booking.notificationSent?.reminder24h !== true
    ) {
      await pushNotification({
        userId,
        title: "Upcoming buffet reservation",
        message: `${buffetName} at ${hotelName} is within the next 24 hours.`,
        type: "reminder",
        link: bookingLink,
      });

      booking.notificationSent = {
        ...(booking.notificationSent?.toObject?.() ||
          booking.notificationSent ||
          {}),
        reminder24h: true,
      };
      await booking.save();
    }
  }
};

exports.createNotification = pushNotification;

exports.getMyNotifications = async (req, res) => {
  try {
    await createDueBookingReminders(req.user.id);

    const user = await User.findById(req.user.id).select(
      "notifications preferences"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const notifications = [...(user.notifications || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      notifications,
      unreadCount: notifications.filter((item) => !item.isRead).length,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch notifications.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const notification = user.notifications.id(req.params.id);

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found.",
      });
    }

    notification.isRead = true;
    await user.save();

    return res.status(200).json({
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update notification.",
    });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.notifications.forEach((notification) => {
      notification.isRead = true;
    });

    await user.save();

    return res.status(200).json({
      message: "All notifications marked as read.",
      unreadCount: 0,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update notifications.",
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const before = user.notifications.length;
    user.notifications = user.notifications.filter(
      (notification) => String(notification._id) !== String(req.params.id)
    );

    if (before === user.notifications.length) {
      return res.status(404).json({
        message: "Notification not found.",
      });
    }

    await user.save();

    return res.status(200).json({
      message: "Notification deleted.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete notification.",
    });
  }
};

exports.clearReadNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.notifications = user.notifications.filter(
      (notification) => !notification.isRead
    );

    await user.save();

    return res.status(200).json({
      message: "Read notifications cleared.",
      notifications: user.notifications,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to clear notifications.",
    });
  }
};
