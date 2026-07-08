const express = require("express");
const {
  searchDiscovery,
  getDiscoveryMeta,
  getSimilarBuffets,
  getMapBuffets,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
  trackRecentlyViewed,
  getRecentlyViewed,
} = require("../controllers/discoveryController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/search", searchDiscovery);
router.get("/meta", getDiscoveryMeta);
router.get("/map", getMapBuffets);
router.get("/similar/:buffetId", getSimilarBuffets);
router.post("/saved-searches", protect, authorize("customer", "hotel", "admin"), saveSearch);
router.get("/saved-searches", protect, authorize("customer", "hotel", "admin"), getSavedSearches);
router.delete("/saved-searches/:id", protect, authorize("customer", "hotel", "admin"), deleteSavedSearch);
router.put("/recently-viewed/:buffetId", protect, authorize("customer", "hotel", "admin"), trackRecentlyViewed);
router.get("/recently-viewed", protect, authorize("customer", "hotel", "admin"), getRecentlyViewed);

module.exports = router;
