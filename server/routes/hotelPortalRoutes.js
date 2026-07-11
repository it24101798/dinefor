const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const controller = require("../controllers/hotelPortalController");

const router = express.Router();
router.use(protect, authorize("hotel", "admin"));

router.get("/summary", controller.getSummary);
router.get("/reservations", controller.getReservations);
router.get("/reservation-operations", controller.getReservationOperations);
router.get("/reservation-calendar", controller.getReservationCalendar);
router.get("/buffets", controller.getBuffets);
router.post("/buffets", controller.createBuffet);
router.put("/buffets/:id", controller.updateBuffet);
router.delete("/buffets/:id", controller.deleteBuffet);
router.put("/buffets/:id/status", controller.updateBuffetStatus);
router.put("/buffets/:id/feature", controller.featureBuffet);
router.post("/buffets/:id/duplicate", controller.duplicateBuffet);
router.get("/reviews", controller.getReviews);
router.put("/reviews/:id/reply", controller.replyToReview);
router.get("/payments", controller.getPayments);
router.get("/analytics", controller.getAnalytics);
router.put("/bookings/:id/status", controller.updateBookingStatus);
router.delete("/bookings/:id", controller.deleteBooking);

module.exports = router;
