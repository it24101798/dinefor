const express = require("express");
const {
  getMyPaymentHistory,
  getHotelFinance,
  getAdminFinance,
  markPayAtHotelPaid,
  updatePaymentStatus,
  handleRefundAction,
  exportPaymentsCsv,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/history", protect, authorize("customer", "hotel", "admin"), getMyPaymentHistory);
router.get("/hotel-finance", protect, authorize("hotel", "admin"), getHotelFinance);
router.get("/admin-finance", protect, authorize("admin"), getAdminFinance);
router.get("/export/csv", protect, authorize("admin"), exportPaymentsCsv);
router.put("/:id/status", protect, authorize("admin"), updatePaymentStatus);
router.put("/:id/refund-action", protect, authorize("admin"), handleRefundAction);
router.put("/:id/mark-paid", protect, authorize("hotel", "admin"), markPayAtHotelPaid);

// Gateway placeholders prepared for Bundle 22/production integration.
router.post("/payhere", protect, (req, res) => res.status(501).json({ message: "PayHere integration is prepared but not enabled yet." }));
router.post("/stripe", protect, (req, res) => res.status(501).json({ message: "Stripe integration is prepared but not enabled yet." }));
router.post("/webhook", (req, res) => res.status(501).json({ message: "Payment webhook endpoint prepared for future gateway integration." }));
router.post("/refund", protect, authorize("admin"), (req, res) => res.status(501).json({ message: "Refund workflow is prepared for future payment gateway integration." }));

module.exports = router;
