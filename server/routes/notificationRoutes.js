const express = require("express");
const { getMyNotifications, markNotificationRead } = require("../controllers/notificationController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, authorize("customer", "hotel", "admin"), getMyNotifications);
router.put("/:id/read", protect, authorize("customer", "hotel", "admin"), markNotificationRead);

module.exports = router;
