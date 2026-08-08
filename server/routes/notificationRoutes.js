const express = require("express");
const {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearReadNotifications,
} = require("../controllers/notificationController");
const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();
const allowedRoles = authorize("customer", "hotel", "admin");

router.get("/", protect, allowedRoles, getMyNotifications);
router.put("/read-all", protect, allowedRoles, markAllNotificationsRead);
router.delete("/clear-read", protect, allowedRoles, clearReadNotifications);
router.put("/:id/read", protect, allowedRoles, markNotificationRead);
router.delete("/:id", protect, allowedRoles, deleteNotification);

module.exports = router;
