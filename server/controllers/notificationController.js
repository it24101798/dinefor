const Notification = require("../models/Notification");
const Hotel = require("../models/Hotel");

const buildScope = async (req) => {
  if (req.user.role === "admin") return {};
  if (req.user.role === "hotel") {
    const hotel = await Hotel.findOne({ owner: req.user.id }).select("_id");
    return hotel ? { $or: [{ recipient: req.user.id }, { hotel: hotel._id }] } : { recipient: req.user.id };
  }
  return { recipient: req.user.id };
};

exports.getMyNotifications = async (req, res) => {
  try {
    const scope = await buildScope(req);
    const { status, type, limit = 50 } = req.query;
    const query = { ...scope };
    if (status) query.status = status;
    if (type) query.type = type;

    const notifications = await Notification.find(query)
      .populate("booking")
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 100));

    const unreadCount = await Notification.countDocuments({ ...scope, status: { $in: ["queued", "sent"] } });
    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications.", error: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const scope = await buildScope(req);
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...scope },
      { status: "read", readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    res.status(200).json({ message: "Notification marked as read.", notification });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification.", error: error.message });
  }
};

exports.createSystemNotification = async (payload) => {
  return Notification.create(payload);
};
