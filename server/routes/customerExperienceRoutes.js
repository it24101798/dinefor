const express = require("express");
const {
  getCustomerDashboard,
  toggleSavedHotel,
  getSavedHotels,
  addRecentlyViewed,
  getRecentlyViewed,
  markNotificationRead,
  updateCustomerProfile,
} = require("../controllers/customerExperienceController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard", protect, authorize("customer", "hotel", "admin"), getCustomerDashboard);
router.put("/profile", protect, authorize("customer", "hotel", "admin"), updateCustomerProfile);
router.get("/saved-hotels", protect, authorize("customer", "hotel", "admin"), getSavedHotels);
router.put("/saved-hotels/:hotelId", protect, authorize("customer", "hotel", "admin"), toggleSavedHotel);
router.get("/recently-viewed", protect, authorize("customer", "hotel", "admin"), getRecentlyViewed);
router.post("/recently-viewed", protect, authorize("customer", "hotel", "admin"), addRecentlyViewed);
router.put("/notifications/:notificationId/read", protect, authorize("customer", "hotel", "admin"), markNotificationRead);

module.exports = router;
