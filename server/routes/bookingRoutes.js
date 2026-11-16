const express = require("express");
const { availabilityLimiter, quoteLimiter, reservationWriteLimiter } = require("../middleware/reservationRateLimits");
const {
  createBooking,
  quoteReservation,
  myBookings,
  getAllBookings,
  getHotelBookings,
  updateBookingStatus,
  verifyBookingByCode,
  checkInBooking,
  getBuffetAvailability,
  modifyMyBooking,
  downloadCalendar,
} = require("../controllers/bookingController");
const { cancelCustomerReservation, rescheduleCustomerReservation } = require("../controllers/cancellationController");

const {
  getAvailabilityCalendar,
  getHotelInventory,
  updateInventoryOverride,
  resetInventoryOverride,
} = require("../controllers/inventoryController");

const { protect, authorize } = require("../middleware/authMiddleware");

const { listCustomerBookings, getCustomerBooking } = require("../controllers/customerBookingController");
const router = express.Router();

// Public/customer availability check
router.get("/availability/:buffetId", availabilityLimiter, getBuffetAvailability);
router.get("/availability/:buffetId/calendar", availabilityLimiter, getAvailabilityCalendar);

// Customer booking flow
router.post("/quote", protect, authorize("customer", "admin"), quoteLimiter, quoteReservation);
router.post("/", protect, authorize("customer", "admin"), reservationWriteLimiter, createBooking);
router.get("/customer-bookings", protect, authorize("customer", "admin"), listCustomerBookings);
router.get("/my-bookings/:id", protect, authorize("customer", "admin"), getCustomerBooking);
router.get("/my-bookings", protect, authorize("customer", "admin"), myBookings);
router.put("/my-bookings/:id/cancel", protect, authorize("customer"), reservationWriteLimiter, cancelCustomerReservation);
router.put("/my-bookings/:id/reschedule", protect, authorize("customer"), reservationWriteLimiter, rescheduleCustomerReservation);
router.put("/my-bookings/:id/modify", protect, authorize("customer", "admin"), reservationWriteLimiter, modifyMyBooking);
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
router.get("/verify/:code", protect, authorize("hotel", "admin", "hotel_staff"), verifyBookingByCode);
router.put("/:id/check-in", protect, authorize("hotel", "admin", "hotel_staff"), reservationWriteLimiter, checkInBooking);
router.put("/:id/status", protect, authorize("hotel", "admin"), reservationWriteLimiter, updateBookingStatus);

// Admin
router.get("/", protect, authorize("admin"), getAllBookings);

module.exports = router;
