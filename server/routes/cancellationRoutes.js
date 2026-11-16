const express = require("express");
const { reservationWriteLimiter } = require("../middleware/reservationRateLimits");
const { protect, authorize } = require("../middleware/authMiddleware");
const { getCancellationQuote, cancelByOperator, markNoShow, getHotelCancellationCases, getAdminCancellationCases } = require("../controllers/cancellationController");

const router = express.Router();

router.get("/bookings/:id/quote", protect, authorize("customer", "hotel", "admin"), getCancellationQuote);
router.post("/bookings/:id/operator-cancel", protect, authorize("hotel", "admin"), reservationWriteLimiter, cancelByOperator);
router.post("/bookings/:id/no-show", protect, authorize("hotel", "admin"), reservationWriteLimiter, markNoShow);
router.get("/hotel", protect, authorize("hotel"), getHotelCancellationCases);
router.get("/admin", protect, authorize("admin"), getAdminCancellationCases);

module.exports = router;
