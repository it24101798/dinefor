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
  modifyMyBooking,
  downloadCalendar,
} = require("../controllers/bookingController");

const {
  getAvailabilityCalendar,
  getHotelInventory,
  updateInventoryOverride,
  resetInventoryOverride,
} = require("../controllers/inventoryController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Public/customer availability check
router.get("/availability/:buffetId", getBuffetAvailability);
router.get("/availability/:buffetId/calendar", getAvailabilityCalendar);

// Customer booking flow
router.post("/", protect, authorize("customer", "admin"), createBooking);
router.get("/my-bookings", protect, authorize("customer", "admin"), myBookings);
router.put("/my-bookings/:id/cancel", protect, authorize("customer", "admin"), cancelMyBooking);
router.put("/my-bookings/:id/modify", protect, authorize("customer", "admin"), modifyMyBooking);
router.get("/my-bookings/:id/calendar", protect, authorize("customer", "admin"), downloadCalendar);

// Hotel/admin inventory exceptions — normal inventory remains automatic.
router.get("/inventory/:buffetId", protect, authorize("hotel", "admin"), getHotelInventory);
router.put(
  "/inventory/:buffetId/:dateKey/:slotId",
  protect,
  authorize("hotel", "admin"),
  updateInventoryOverride
);
router.delete(
  "/inventory/:buffetId/:dateKey/:slotId",
  protect,
  authorize("hotel", "admin"),
  resetInventoryOverride
);

// Hotel/admin booking operations
router.get("/hotel-bookings", protect, authorize("hotel", "admin"), getHotelBookings);
router.get("/verify/:code", protect, authorize("hotel", "admin"), verifyBookingByCode);
router.put("/:id/check-in", protect, authorize("hotel", "admin"), checkInBooking);
router.put("/:id/status", protect, authorize("hotel", "admin"), updateBookingStatus);

// Admin
router.get("/", protect, authorize("admin"), getAllBookings);

module.exports = router;
