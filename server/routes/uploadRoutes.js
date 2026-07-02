const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const cleanName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.\-_]/g, "")
      .toLowerCase();

    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${cleanName}`;
    cb(null, uniqueName);
  },
});

const allowedTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/ogg",
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only JPG, PNG, WEBP, MP4, WEBM, or OGG files are allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});

const buildFileResponse = (req, file) => {
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
  return {
    fileUrl,
    mediaType: file.mimetype.startsWith("video") ? "video" : "image",
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
  };
};

router.post("/", protect, upload.single("media"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });

  res.status(201).json({
    message: "File uploaded successfully.",
    ...buildFileResponse(req, req.file),
  });
});

router.post("/multiple", protect, upload.array("media", 8), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded." });
  }

  res.status(201).json({
    message: "Files uploaded successfully.",
    files: req.files.map((file) => buildFileResponse(req, file)),
  });
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: error.message });
  }

  if (error) {
    return res.status(400).json({ message: error.message || "Upload failed." });
  }

  next();
});

module.exports = router;
