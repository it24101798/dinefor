const express = require("express");
const {
  validateCoupon,
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
} = require("../controllers/couponController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/validate", protect, authorize("customer", "hotel", "admin"), validateCoupon);
router.get("/", protect, authorize("admin"), getCoupons);
router.post("/", protect, authorize("admin"), createCoupon);
router.put("/:id", protect, authorize("admin"), updateCoupon);
router.delete("/:id", protect, authorize("admin"), deleteCoupon);

module.exports = router;
