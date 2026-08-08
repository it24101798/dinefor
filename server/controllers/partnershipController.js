const fs = require("fs");
const path = require("path");
const Hotel = require("../models/Hotel");
const HotelDocument = require("../models/HotelDocument");
const ActivityLog = require("../models/ActivityLog");

const ACTIVE_PARTNERSHIP = new Set(["active", "active_legacy"]);
const ADMIN_STATUSES = new Set([
  "under_review", "additional_information_required", "conditionally_approved", "agreement_pending",
  "agreement_sent", "agreement_viewed", "signed_agreement_submitted", "agreement_under_review",
  "active", "active_legacy", "suspended", "rejected", "terminated", "expired",
]);

const myHotel = (userId) => Hotel.findOne({ owner: userId });
const log = async (req, action, hotel, message, metadata = {}) => {
  try { await ActivityLog.create({ actor: req.user?._id, actorRole: req.user?.role || "system", action, entityType: "hotel", entityId: hotel?._id, message, metadata }); } catch {}
};

exports.getMyPartnership = async (req, res) => {
  const hotel = await myHotel(req.user._id).select("hotelName status isApproved partnershipStatus application authorizedRepresentative compliance createdAt updatedAt");
  if (!hotel) return res.status(404).json({ message: "Hotel application not found." });
  const documents = await HotelDocument.find({ hotel: hotel._id }).select("-storedName").sort({ createdAt: -1 });
  const effectiveStatus = hotel.partnershipStatus || (hotel.status === "approved" ? "active_legacy" : "application_submitted");
  res.json({ hotel: { ...hotel.toObject(), partnershipStatus: effectiveStatus, portalAccess: ACTIVE_PARTNERSHIP.has(effectiveStatus) || hotel.status === "approved" }, documents });
};

exports.getHotelPartnershipAdmin = async (req, res) => {
  const hotel = await Hotel.findById(req.params.hotelId).populate("owner", "name email role");
  if (!hotel) return res.status(404).json({ message: "Hotel not found." });
  const documents = await HotelDocument.find({ hotel: hotel._id }).populate("uploadedBy reviewedBy", "name email role").select("-storedName").sort({ createdAt: -1 });
  res.json({ hotel, documents });
};

exports.updatePartnershipStatus = async (req, res) => {
  const { status, partnerMessage = "", internalNote = "" } = req.body || {};
  if (!ADMIN_STATUSES.has(status)) return res.status(400).json({ message: "Invalid partnership status." });
  const hotel = await Hotel.findById(req.params.hotelId);
  if (!hotel) return res.status(404).json({ message: "Hotel not found." });
  hotel.partnershipStatus = status;
  hotel.compliance = hotel.compliance || {};
  if (partnerMessage) hotel.compliance.partnerMessage = String(partnerMessage).slice(0, 2000);
  if (internalNote) hotel.compliance.internalNote = String(internalNote).slice(0, 4000);
  hotel.compliance.lastReviewedAt = new Date();
  if (status === "active" || status === "active_legacy") { hotel.isApproved = true; hotel.status = "approved"; }
  if (["suspended", "terminated", "expired", "rejected"].includes(status)) { hotel.isApproved = false; hotel.status = status === "rejected" ? "rejected" : "suspended"; }
  await hotel.save();
  await log(req, "partnership_status_changed", hotel, `Partnership status changed to ${status}.`, { partnerMessage: partnerMessage || undefined });
  res.json({ message: "Partnership status updated.", hotel });
};

exports.reviewDocument = async (req, res) => {
  const { status, reviewNote = "" } = req.body || {};
  if (!["under_review", "verified", "rejected", "expired"].includes(status)) return res.status(400).json({ message: "Invalid document review status." });
  const document = await HotelDocument.findById(req.params.documentId);
  if (!document) return res.status(404).json({ message: "Document not found." });
  document.status = status;
  document.reviewNote = String(reviewNote).slice(0, 2000);
  document.reviewedBy = req.user._id;
  document.reviewedAt = new Date();
  await document.save();
  await log(req, "hotel_document_reviewed", { _id: document.hotel }, `Hotel document ${status}.`, { documentId: document._id, documentType: document.documentType });
  res.json({ message: "Document review saved.", document: { ...document.toObject(), storedName: undefined } });
};

exports.downloadDocument = async (req, res) => {
  const document = await HotelDocument.findById(req.params.documentId);
  if (!document) return res.status(404).json({ message: "Document not found." });
  if (req.user.role !== "admin") {
    const hotel = await myHotel(req.user._id);
    if (!hotel || String(hotel._id) !== String(document.hotel)) return res.status(403).json({ message: "Access denied." });
  }
  const filePath = path.join(__dirname, "..", "private_uploads", "hotel-documents", document.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Stored document is unavailable." });
  await log(req, "hotel_document_downloaded", { _id: document.hotel }, "Protected hotel document downloaded.", { documentId: document._id });
  res.download(filePath, document.originalName);
};
