const express = require("express");
const {
  getReviewEligibility,
  createReview,
  getBuffetReviews,
  getHotelReviews,
  getMyReviews,
  updateOwnReview,
  deleteOwnReview,
  toggleHelpfulVote,
  reportReview,
  replyToReview,
  getHotelReviewWorkspace,
  getAllReviews,
  updateReviewModeration,
  deleteReviewAdmin,
} = require("../controllers/reviewController");
const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/buffet/:buffetId", getBuffetReviews);
router.get("/hotel/:hotelId", getHotelReviews);

router.get(
  "/eligibility/:buffetId",
  protect,
  authorize("customer", "admin"),
  getReviewEligibility
);
router.get(
  "/my",
  protect,
  authorize("customer", "admin"),
  getMyReviews
);
router.post(
  "/",
  protect,
  authorize("customer", "admin"),
  createReview
);
router.put(
  "/:id/my-review",
  protect,
  authorize("customer", "admin"),
  updateOwnReview
);
router.delete(
  "/:id/my-review",
  protect,
  authorize("customer", "admin"),
  deleteOwnReview
);
router.put(
  "/:id/helpful",
  protect,
  authorize("customer", "hotel", "admin"),
  toggleHelpfulVote
);
router.post(
  "/:id/report",
  protect,
  authorize("customer", "hotel", "admin"),
  reportReview
);

router.get(
  "/hotel-workspace/me",
  protect,
  authorize("hotel", "admin"),
  getHotelReviewWorkspace
);
router.put(
  "/:id/reply",
  protect,
  authorize("hotel", "admin"),
  replyToReview
);

router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  getAllReviews
);
router.put(
  "/:id/moderation",
  protect,
  authorize("admin"),
  updateReviewModeration
);
router.delete(
  "/:id/admin",
  protect,
  authorize("admin"),
  deleteReviewAdmin
);

/* Compatibility aliases retained for existing dashboard code. */
router.put(
  "/:id/status",
  protect,
  authorize("admin"),
  updateReviewModeration
);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteReviewAdmin
);

module.exports = router;
