const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Hotel = require("../models/Hotel");
const HotelDocument = require("../models/HotelDocument");
const ActivityLog = require("../models/ActivityLog");
const { protect, authorize } = require("../middleware/authMiddleware");
const controller = require("../controllers/partnershipController");

const router = express.Router();
const privateDir = path.join(__dirname, "..", "private_uploads", "hotel-documents");
fs.mkdirSync(privateDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, privateDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${extension}`);
  },
});
const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const upload = multer({ storage, limits: { fileSize: 12 * 1024 * 1024 }, fileFilter: (_req, file, cb) => allowed.has(file.mimetype) ? cb(null, true) : cb(new Error("Only PDF, JPG, PNG or WEBP documents are allowed.")) });

router.get("/my", protect, authorize("hotel", "admin"), controller.getMyPartnership);
router.post("/documents", protect, authorize("hotel"), upload.single("document"), async (req, res, next) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.user._id });
    if (!hotel) { if (req.file) fs.unlink(req.file.path, () => {}); return res.status(404).json({ message: "Hotel application not found." }); }
    if (!req.file) return res.status(400).json({ message: "Document file is required." });
    const allowedTypes = ["business_registration", "authorized_representative_id", "bank_proof", "hotel_license", "tax_document", "signed_agreement", "other"];
    const documentType = allowedTypes.includes(req.body.documentType) ? req.body.documentType : "other";
    const document = await HotelDocument.create({ hotel: hotel._id, uploadedBy: req.user._id, documentType, label: String(req.body.label || "").slice(0, 120), originalName: path.basename(req.file.originalname), storedName: req.file.filename, mimeType: req.file.mimetype, size: req.file.size });
    await ActivityLog.create({ actor: req.user._id, actorRole: req.user.role, action: "hotel_document_uploaded", entityType: "hotel", entityId: hotel._id, message: `${documentType} submitted for compliance review.`, metadata: { documentId: document._id } }).catch(() => {});
    res.status(201).json({ message: "Document submitted securely.", document: { ...document.toObject(), storedName: undefined } });
  } catch (error) { next(error); }
});
router.get("/documents/:documentId/download", protect, authorize("hotel", "admin"), controller.downloadDocument);
router.get("/admin/:hotelId", protect, authorize("admin"), controller.getHotelPartnershipAdmin);
router.patch("/admin/:hotelId/status", protect, authorize("admin"), controller.updatePartnershipStatus);
router.patch("/admin/documents/:documentId", protect, authorize("admin"), controller.reviewDocument);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ message: error.message });
  if (error) return res.status(400).json({ message: error.message || "Document upload failed." });
  next();
});
module.exports = router;
