const express = require("express");
const {
  createBooking,
  myBookings,
  cancelMyBooking,
  getAllBookings,
  getHotelBookings,
  updateBookingStatus,
  verifyBookingByCode,
  checkInBooking,
  getBuffetAvailability,
  expireOpenBookings,
} = require("../controllers/bookingController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Public/customer availability check
router.get("/availability/:buffetId", getBuffetAvailability);

// Customer booking flow
router.post("/", protect, authorize("customer", "admin"), createBooking);
router.get("/my-bookings", protect, authorize("customer", "admin"), myBookings);
router.put("/my-bookings/:id/cancel", protect, authorize("customer", "admin"), cancelMyBooking);

// Hotel/admin booking operations
router.put("/expire-open", protect, authorize("hotel", "admin"), expireOpenBookings);
router.get("/hotel-bookings", protect, authorize("hotel", "admin"), getHotelBookings);
router.get("/verify/:code", protect, authorize("hotel", "admin"), verifyBookingByCode);
router.put("/:id/check-in", protect, authorize("hotel", "admin"), checkInBooking);
router.put("/:id/status", protect, authorize("hotel", "admin"), updateBookingStatus);

// Admin
router.get("/", protect, authorize("admin"), getAllBookings);

module.exports = router;
