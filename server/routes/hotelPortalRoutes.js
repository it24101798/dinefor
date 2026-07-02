const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getSummary,
  getReservations,
  getReservationOperations,
  getReservationCalendar,
  getBuffets,
  updateBuffetStatus,
  duplicateBuffet,
  getReviews,
  replyToReview,
} = require("../controllers/hotelPortalController");

const router = express.Router();
router.use(protect, authorize("hotel", "admin"));

router.get("/summary", getSummary);
router.get("/reservations", getReservations);
router.get("/reservation-operations", getReservationOperations);
router.get("/reservation-calendar", getReservationCalendar);
router.get("/buffets", getBuffets);
router.put("/buffets/:id/status", updateBuffetStatus);
router.post("/buffets/:id/duplicate", duplicateBuffet);
router.get("/reviews", getReviews);
router.put("/reviews/:id/reply", replyToReview);

module.exports = router;
