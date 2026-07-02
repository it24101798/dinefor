const express = require("express");
const {
  getSiteSettings,
  updateSiteSettings,
} = require("../controllers/siteSettingController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getSiteSettings);
router.put("/", protect, authorize("admin"), updateSiteSettings);

module.exports = router;
