const express = require("express");

const {
  createBuffet,
  getBuffets,
  getBuffetById,
  getMyBuffets,
  deleteBuffet,
  updateBuffetMedia,
  featureBuffet,
  unfeatureBuffet,
} = require("../controllers/buffetController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Public
router.get("/", getBuffets);

// Hotel
router.get(
  "/hotel/my-buffets",
  protect,
  authorize("hotel", "admin"),
  getMyBuffets
);

router.post("/", protect, authorize("hotel", "admin"), createBuffet);
router.put("/:id/media", protect, authorize("hotel", "admin"), updateBuffetMedia);
router.delete("/:id", protect, authorize("hotel", "admin"), deleteBuffet);

// Admin featured controls
router.put("/:id/feature", protect, authorize("admin"), featureBuffet);
router.put("/:id/unfeature", protect, authorize("admin"), unfeatureBuffet);
router.put("/:id/featured", protect, authorize("admin"), (req, res) => {
  return req.body?.isFeatured ? featureBuffet(req, res) : unfeatureBuffet(req, res);
});

// Public dynamic route must stay after /hotel/my-buffets
router.get("/:id", getBuffetById);

module.exports = router;
