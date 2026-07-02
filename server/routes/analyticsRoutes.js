const express = require("express");
const { getAdminAnalytics, getHotelAnalytics } = require("../controllers/analyticsController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/admin", protect, authorize("admin"), getAdminAnalytics);
router.get("/hotel", protect, authorize("hotel", "admin"), getHotelAnalytics);

module.exports = router;
