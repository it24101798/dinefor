const express = require("express");
const {
  getBookingTimeline,
  transitionBooking,
  expireOpenBookings,
  queueBookingReminders,
} = require("../controllers/bookingLifecycleController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:id/timeline", protect, authorize("customer", "hotel", "admin"), getBookingTimeline);
router.put("/:id/transition", protect, authorize("customer", "hotel", "admin"), transitionBooking);
router.put("/expire-open", protect, authorize("hotel", "admin"), expireOpenBookings);
router.post("/queue-reminders", protect, authorize("hotel", "admin"), queueBookingReminders);

module.exports = router;
