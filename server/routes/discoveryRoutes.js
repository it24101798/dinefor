const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const discovery = require("../controllers/discoveryController");
const {
  addRecentlyViewed,
  getRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
} = require("../controllers/customerExperienceController");

const router = express.Router();

// Release 4.3 public marketplace discovery. These routes intentionally do not
// require login: discovery must create demand before account creation.
router.get("/search", discovery.search);
router.get("/facets", discovery.facets);
router.get("/trending", discovery.trending);
router.get("/suggestions", discovery.suggestions);
router.post("/events", discovery.track);

// Existing personal discovery history remains protected.
router.use(protect, authorize("customer", "hotel", "admin"));
router.get("/recently-viewed", getRecentlyViewed);
router.post("/recently-viewed", addRecentlyViewed);
router.put("/recently-viewed/:itemId", (req, res, next) => {
  req.body = { ...req.body, itemType: "buffet", itemId: req.params.itemId };
  return addRecentlyViewed(req, res, next);
});
router.delete("/recently-viewed", clearRecentlyViewed);
router.delete("/recently-viewed/:itemId", removeRecentlyViewed);

module.exports = router;
