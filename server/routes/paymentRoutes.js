const express = require("express");
const { reservationWriteLimiter } = require("../middleware/reservationRateLimits");
const {
  getMyPaymentHistory,
  getPaymentDetails,
  getInvoiceByBooking,
  getHotelFinance,
  getAdminFinance,
  markPayAtHotelPaid,
  updatePaymentStatus,
  handleRefundAction,
  exportPaymentsCsv,
  initiateGatewayPayment,
  handlePayHereNotification,
  requestRefund,
  getPaymentOptions,
  collectDepositBalance,
  getGatewayReturnStatus,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const { getCheckout, changeCheckout } = require("../controllers/checkoutSandboxController");
const router = express.Router();

router.get("/checkout/:id", protect, authorize("customer", "admin"), getCheckout);
router.post("/checkout/:id", protect, authorize("customer", "admin"), reservationWriteLimiter, changeCheckout);
router.get("/history", protect, authorize("customer", "hotel", "admin"), getMyPaymentHistory);
router.get("/options", protect, authorize("customer", "admin"), getPaymentOptions);
router.get("/hotel-finance", protect, authorize("hotel", "admin"), getHotelFinance);
router.get("/admin-finance", protect, authorize("admin"), getAdminFinance);
router.get("/export/csv", protect, authorize("hotel", "admin"), exportPaymentsCsv);
router.post("/payhere/notify", handlePayHereNotification);
router.get("/return-status/:orderId", protect, authorize("customer", "hotel", "admin"), getGatewayReturnStatus);
router.get("/invoice/:bookingId", protect, authorize("customer", "hotel", "admin"), getInvoiceByBooking);
router.post("/:id/initiate", protect, authorize("customer", "admin"), reservationWriteLimiter, initiateGatewayPayment);
router.put("/:id/refund-request", protect, authorize("customer", "admin"), reservationWriteLimiter, requestRefund);
router.get("/:id", protect, authorize("customer", "hotel", "admin"), getPaymentDetails);
router.put("/:id/status", protect, authorize("admin"), updatePaymentStatus);
router.put("/:id/refund-action", protect, authorize("admin"), handleRefundAction);
router.put("/:id/mark-paid", protect, authorize("hotel", "admin"), reservationWriteLimiter, markPayAtHotelPaid);
router.put("/:id/collect-balance", protect, authorize("hotel", "admin"), reservationWriteLimiter, collectDepositBalance);

module.exports = router;
