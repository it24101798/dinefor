const express = require("express");

const {
  createHotel,
  getHotels,
  getApprovedHotels,
  getMapHotels,
  getMyHotel,
  updateMyHotel,
  approveHotel,
  rejectHotel,
  suspendHotel,
  holdHotel,
  requestMoreInfoHotel,
  reopenHotel,
  getHotelById,
} = require("../controllers/hotelController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.get("/approved", getApprovedHotels);
router.get("/map", getMapHotels);

// Hotel routes
router.post("/", protect, authorize("hotel", "admin"), createHotel);
router.get("/my-hotel", protect, authorize("hotel", "admin"), getMyHotel);
router.put("/my-hotel", protect, authorize("hotel", "admin"), updateMyHotel);

// Admin routes
router.get("/", protect, authorize("admin"), getHotels);
router.put("/:id/approve", protect, authorize("admin"), approveHotel);
router.put("/:id/reject", protect, authorize("admin"), rejectHotel);
router.put("/:id/suspend", protect, authorize("admin"), suspendHotel);
router.put("/:id/hold", protect, authorize("admin"), holdHotel);
router.put("/:id/request-info", protect, authorize("admin"), requestMoreInfoHotel);
router.put("/:id/reopen", protect, authorize("admin"), reopenHotel);

// Public dynamic route must stay last
router.get("/:id", getHotelById);

module.exports = router;
