const express = require("express");
const {
  createReview,
  getBuffetReviews,
  getHotelReviews,
  getAllReviews,
  updateReviewStatus,
  deleteReview,
} = require("../controllers/reviewController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/admin/all", protect, authorize("admin"), getAllReviews);
router.post("/", protect, authorize("customer", "hotel", "admin"), createReview);
router.get("/buffet/:buffetId", getBuffetReviews);
router.get("/hotel/:hotelId", getHotelReviews);
router.put("/:id/status", protect, authorize("admin"), updateReviewStatus);
router.delete("/:id", protect, authorize("admin"), deleteReview);

module.exports = router;
