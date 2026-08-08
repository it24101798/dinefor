const express = require("express");
const {
  getPersonalizedRecommendations,
  getTrendingBuffets,
  getSimilarBuffets,
} = require("../controllers/recommendationController");
const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/trending", getTrendingBuffets);
router.get("/similar/:buffetId", getSimilarBuffets);
router.get(
  "/personalized",
  protect,
  authorize("customer", "hotel", "admin"),
  getPersonalizedRecommendations
);

module.exports = router;
