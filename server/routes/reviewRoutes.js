const express = require("express");
const {
  createReview,
  getBuffetReviews,
  getHotelReviews,
  getReviewSummaryByBuffet,
  getReviewSummaryByHotel,
  getAllReviews,
  updateReviewStatus,
  markHelpful,
  reportReview,
  deleteReview,
  setReviewAction,
} = require("../controllers/reviewController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/admin/all", protect, authorize("admin"), getAllReviews);
router.get("/", protect, authorize("admin"), getAllReviews);
router.get("/summary/buffet/:buffetId", getReviewSummaryByBuffet);
router.get("/summary/hotel/:hotelId", getReviewSummaryByHotel);
router.post("/", protect, authorize("customer", "hotel", "admin"), createReview);
router.get("/buffet/:buffetId", getBuffetReviews);
router.get("/hotel/:hotelId", getHotelReviews);
router.put("/:id/helpful", protect, authorize("customer", "hotel", "admin"), markHelpful);
router.put("/:id/report", protect, authorize("customer", "hotel", "admin"), reportReview);
router.put("/:id/status", protect, authorize("admin"), updateReviewStatus);
router.put("/:id/:action", protect, authorize("admin"), setReviewAction);
router.delete("/:id", protect, authorize("admin"), deleteReview);

module.exports = router;
