const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const { getHotelSettlements, getAdminSettlements, previewSettlement, createSettlement, updateSettlementStatus } = require("../controllers/settlementController");

const router = express.Router();
router.get("/hotel", protect, authorize("hotel", "admin"), getHotelSettlements);
router.get("/admin", protect, authorize("admin"), getAdminSettlements);
router.post("/admin/preview", protect, authorize("admin"), previewSettlement);
router.post("/admin", protect, authorize("admin"), createSettlement);
router.put("/admin/:id/status", protect, authorize("admin"), updateSettlementStatus);

module.exports = router;
