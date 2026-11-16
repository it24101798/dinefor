const express = require("express");
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const { protect, authorize } = require("../middleware/authMiddleware");
const staff = require("../controllers/hotelStaffInviteController");
const c = require("../controllers/hotelOnboardingController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 8, fieldSize: 1000 } }).single("file");
const limiter = (limit, windowMs) => rateLimit({ limit, windowMs, standardHeaders: "draft-7", legacyHeaders: false, message: { message: "Too many requests. Please try again later." } });

router.use((req, res, next) => { res.set("Cache-Control", "private, no-store"); next(); });
router.post("/enquiries", limiter(10, 60 * 60_000), c.enquiry);
router.use("/application", limiter(120, 15 * 60_000), c.requireInvitation);
router.get("/application", c.getApplication);
router.put("/application", c.saveApplication);
router.post("/application/evidence/:kind", limiter(25, 15 * 60_000), upload, c.uploadEvidence);
router.get("/application/evidence/:evidenceId", c.downloadEvidence);
router.get("/bank", protect, authorize("hotel"), c.getBank);
router.post("/bank", protect, authorize("hotel"), limiter(10, 60 * 60_000), upload, c.requestBankChange);
router.get("/staff", protect, authorize("hotel"), staff.list);
router.post("/staff", protect, authorize("hotel"), limiter(15, 60 * 60_000), staff.invite);
router.post("/staff/:id/revoke", protect, authorize("hotel"), staff.revoke);
router.post("/staff-accept", limiter(30, 15 * 60_000), staff.accept);
router.use("/admin", protect, authorize("admin"));
router.get("/admin/leads", c.listLeads);
router.post("/admin/leads", c.createLead);
router.get("/admin/leads/:id", c.getLead);
router.patch("/admin/leads/:id", c.updateLead);
router.post("/admin/leads/:id/invite", c.sendInvite);
router.post("/admin/leads/:id/revoke", c.revokeInvite);
router.post("/admin/leads/:id/review", c.review);
router.post("/admin/leads/:id/provision", c.provision);
router.post("/admin/leads/:id/setup", c.sendSetup);
router.get("/admin/leads/:id/evidence/:evidenceId", c.downloadEvidence);
router.get("/admin/leads/:id/account/:target", c.revealAccount);
router.post("/admin/leads/:id/bank-review", c.reviewBankChange);
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) return res.status(400).json({ message: "Upload one file up to 5 MB." });
  const status = error.status && Number.isInteger(error.status) ? error.status : 500;
  if (status === 500) console.error("Hotel onboarding request failed:", error.name);
  return res.status(status).json({ message: status === 500 ? "The onboarding request could not be completed." : error.message });
});

module.exports = router;
