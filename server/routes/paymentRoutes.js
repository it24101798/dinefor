const express = require("express");
const {
  getMyPaymentHistory,
  getPaymentByBooking,
  getInvoiceByBooking,
  getHotelFinance,
  getAdminFinance,
  markPayAtHotelPaid,
  updatePaymentStatus,
  requestRefund,
  handleRefundAction,
  exportFinanceCsv,
  payherePlaceholder,
  stripePlaceholder,
  webhookPlaceholder,
  getAllPayments,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, authorize("admin"), getAllPayments);
router.get("/history", protect, authorize("customer", "hotel", "admin"), getMyPaymentHistory);
router.get("/booking/:bookingId", protect, authorize("customer", "hotel", "admin"), getPaymentByBooking);
router.get("/invoice/:bookingId", protect, authorize("customer", "hotel", "admin"), getInvoiceByBooking);
router.get("/hotel-finance", protect, authorize("hotel", "admin"), getHotelFinance);
router.get("/admin-finance", protect, authorize("admin"), getAdminFinance);
router.get("/export/csv", protect, authorize("hotel", "admin"), exportFinanceCsv);

router.put("/:id/mark-paid", protect, authorize("hotel", "admin"), markPayAtHotelPaid);
router.put("/:id/status", protect, authorize("admin"), updatePaymentStatus);
router.put("/:id/refund-request", protect, authorize("customer", "hotel", "admin"), requestRefund);
router.put("/:id/refund-action", protect, authorize("admin"), handleRefundAction);

router.post("/payhere", protect, payherePlaceholder);
router.post("/stripe", protect, stripePlaceholder);
router.post("/webhook", webhookPlaceholder);

module.exports = router;
