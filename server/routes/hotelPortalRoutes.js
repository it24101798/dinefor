const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getSummary,
  getReservations,
  getReservationOperations,
  getReservationCalendar,
  getBuffets,
  updateBuffetDetails,
  updateBuffetStatus,
  duplicateBuffet,
  getReviews,
  replyToReview,
  getPayments,
  getAnalytics,
  createBuffet,
  deleteBuffet,
  toggleBuffetFeature,
  updateBookingStatus,
  deleteBooking,
} = require("../controllers/hotelPortalController");

const router = express.Router();
router.use(protect, authorize("hotel", "admin"));

router.get("/summary", getSummary);
router.get("/reservations", getReservations);
router.get("/reservation-operations", getReservationOperations);
router.get("/reservation-calendar", getReservationCalendar);
router.get("/payments", getPayments);
router.get("/analytics", getAnalytics);
router.get("/buffets", getBuffets);
router.post("/buffets", createBuffet);
router.put("/buffets/:id", updateBuffetDetails);
router.put("/buffets/:id/status", updateBuffetStatus);
router.put("/buffets/:id/feature", toggleBuffetFeature);
router.delete("/buffets/:id", deleteBuffet);
router.post("/buffets/:id/duplicate", duplicateBuffet);
router.put("/bookings/:id/status", updateBookingStatus);
router.delete("/bookings/:id", deleteBooking);
router.get("/reviews", getReviews);
router.put("/reviews/:id/reply", replyToReview);

module.exports = router;
