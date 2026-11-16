const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const controller = require("../controllers/documentController");

const router = express.Router();
router.use(protect, authorize("customer", "hotel", "admin"));
router.get("/history", controller.getDocumentHistory);
router.get("/payment/:paymentId/:type/pdf", controller.getPaymentPdf);
router.post("/payment/:paymentId/:type/email", controller.emailPaymentPdf);
router.get("/settlement/:settlementId/pdf", authorize("hotel", "admin"), controller.getSettlementPdf);
router.post("/settlement/:settlementId/email", authorize("hotel", "admin"), controller.emailSettlementPdf);

module.exports = router;
