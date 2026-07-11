const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  addRecentlyViewed,
  getRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
} = require("../controllers/customerExperienceController");

const router = express.Router();
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
