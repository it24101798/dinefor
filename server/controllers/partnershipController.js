const fs = require("fs");
const path = require("path");
const Hotel = require("../models/Hotel");
const HotelDocument = require("../models/HotelDocument");
const HotelPartnershipAgreement = require("../models/HotelPartnershipAgreement");
const ActivityLog = require("../models/ActivityLog");
const { createAgreement, renderAgreementPdf } = require("../services/partnershipAgreementService");
const { sendPartnershipAgreementEmail } = require("../services/emailService");

const ACTIVE_PARTNERSHIP = new Set(["active", "active_legacy"]);
const ADMIN_STATUSES = new Set([
  "under_review",
  "additional_information_required",
  "conditionally_approved",
  "agreement_pending",
  "agreement_sent",
  "agreement_viewed",
  "signed_agreement_submitted",
  "agreement_under_review",
  "active",
  "active_legacy",
  "suspended",
  "rejected",
  "terminated",
  "expired",
]);

const myHotel = (userId) => Hotel.findOne({ owner: userId });

const log = async (req, action, hotel, message, metadata = {}) => {
  try {
    await ActivityLog.create({
      actor: req.user?._id,
      actorRole: req.user?.role || "system",
      action,
      entityType: "hotel",
      entityId: hotel?._id,
      message,
      metadata,
    });
  } catch {}
};

const latestAgreementForHotel = (hotelId) =>
  HotelPartnershipAgreement.findOne({ hotel: hotelId })
    .sort({ version: -1 })
    .populate("signedDocument", "documentType originalName status reviewedAt")
    .populate("createdBy acknowledgedBy verifiedBy", "name email role");

const canHotelAccessAgreement = async (req, agreement) => {
  if (req.user.role === "admin") return true;
  const hotel = await myHotel(req.user._id);
  return Boolean(hotel && String(hotel._id) === String(agreement.hotel));
};

exports.getMyPartnership = async (req, res) => {
  const hotel = await myHotel(req.user._id).select(
    "hotelName email contactNumber status isApproved partnershipStatus application authorizedRepresentative compliance createdAt updatedAt"
  );

  if (!hotel)
    return res.status(404).json({ message: "Hotel application not found." });

  const [documents, agreement] = await Promise.all([
    HotelDocument.find({ hotel: hotel._id })
      .select("-storedName")
      .sort({ createdAt: -1 }),
    latestAgreementForHotel(hotel._id),
  ]);

  const effectiveStatus =
    hotel.partnershipStatus ||
    (hotel.status === "approved" ? "active_legacy" : "application_submitted");

  res.json({
    hotel: {
      ...hotel.toObject(),
      partnershipStatus: effectiveStatus,
      portalAccess:
        ACTIVE_PARTNERSHIP.has(effectiveStatus) || hotel.status === "approved",
    },
    documents,
    agreement,
  });
};

exports.getHotelPartnershipAdmin = async (req, res) => {
  const hotel = await Hotel.findById(req.params.hotelId).populate(
    "owner",
    "name email role"
  );

  if (!hotel) return res.status(404).json({ message: "Hotel not found." });

  const [documents, agreement] = await Promise.all([
    HotelDocument.find({ hotel: hotel._id })
      .populate("uploadedBy reviewedBy", "name email role")
      .select("-storedName")
      .sort({ createdAt: -1 }),
    latestAgreementForHotel(hotel._id),
  ]);

  res.json({ hotel, documents, agreement });
};

exports.updatePartnershipStatus = async (req, res) => {
  const { status, partnerMessage = "", internalNote = "" } = req.body || {};

  if (!ADMIN_STATUSES.has(status))
    return res.status(400).json({ message: "Invalid partnership status." });

  const hotel = await Hotel.findById(req.params.hotelId);
  if (!hotel) return res.status(404).json({ message: "Hotel not found." });

  if (status === "active") {
    const agreement = await latestAgreementForHotel(hotel._id);
    if (!agreement || agreement.status !== "verified") {
      return res.status(409).json({
        message:
          "The latest partnership agreement must be verified before the hotel can be activated.",
      });
    }
  }

  hotel.partnershipStatus = status;
  hotel.compliance = hotel.compliance || {};

  if (partnerMessage)
    hotel.compliance.partnerMessage = String(partnerMessage).slice(0, 2000);

  if (internalNote)
    hotel.compliance.internalNote = String(internalNote).slice(0, 4000);

  hotel.compliance.lastReviewedAt = new Date();

  if (status === "active" || status === "active_legacy") {
    hotel.isApproved = true;
    hotel.status = "approved";
  }

  if (["suspended", "terminated", "expired", "rejected"].includes(status)) {
    hotel.isApproved = false;
    hotel.status = status === "rejected" ? "rejected" : "suspended";
  }

  await hotel.save();

  await log(
    req,
    "partnership_status_changed",
    hotel,
    `Partnership status changed to ${status}.`,
    { partnerMessage: partnerMessage || undefined }
  );

  res.json({ message: "Partnership status updated.", hotel });
};

exports.reviewDocument = async (req, res) => {
  const { status, reviewNote = "" } = req.body || {};

  if (!["under_review", "verified", "rejected", "expired"].includes(status))
    return res.status(400).json({ message: "Invalid document review status." });

  const document = await HotelDocument.findById(req.params.documentId);
  if (!document) return res.status(404).json({ message: "Document not found." });

  document.status = status;
  document.reviewNote = String(reviewNote).slice(0, 2000);
  document.reviewedBy = req.user._id;
  document.reviewedAt = new Date();
  await document.save();

  if (document.documentType === "signed_agreement" && status === "verified") {
    const agreement = await HotelPartnershipAgreement.findOne({
      hotel: document.hotel,
    }).sort({ version: -1 });

    if (agreement && agreement.status === "signed_submitted") {
      agreement.signedDocument = document._id;
      agreement.status = "verified";
      agreement.verifiedAt = new Date();
      agreement.verifiedBy = req.user._id;
      await agreement.save();

      await Hotel.findByIdAndUpdate(document.hotel, {
        partnershipStatus: "agreement_under_review",
      });
    }
  }

  await log(
    req,
    "hotel_document_reviewed",
    { _id: document.hotel },
    `Hotel document ${status}.`,
    {
      documentId: document._id,
      documentType: document.documentType,
    }
  );

  res.json({
    message: "Document review saved.",
    document: { ...document.toObject(), storedName: undefined },
  });
};

exports.downloadDocument = async (req, res) => {
  const document = await HotelDocument.findById(req.params.documentId);
  if (!document) return res.status(404).json({ message: "Document not found." });

  if (req.user.role !== "admin") {
    const hotel = await myHotel(req.user._id);
    if (!hotel || String(hotel._id) !== String(document.hotel))
      return res.status(403).json({ message: "Access denied." });
  }

  const filePath = path.join(
    __dirname,
    "..",
    "private_uploads",
    "hotel-documents",
    document.storedName
  );

  if (!fs.existsSync(filePath))
    return res.status(404).json({ message: "Stored document is unavailable." });

  await log(
    req,
    "hotel_document_downloaded",
    { _id: document.hotel },
    "Protected hotel document downloaded.",
    { documentId: document._id }
  );

  res.download(filePath, document.originalName);
};

exports.createAgreement = async (req, res) => {
  const hotel = await Hotel.findById(req.params.hotelId).populate(
    "owner",
    "name email role"
  );

  if (!hotel) return res.status(404).json({ message: "Hotel not found." });

  const agreement = await createAgreement({
    hotel,
    adminUserId: req.user._id,
    overrides: req.body || {},
  });

  hotel.partnershipStatus = "agreement_pending";
  await hotel.save();

  await log(
    req,
    "partnership_agreement_created",
    hotel,
    `Agreement ${agreement.agreementNumber} created.`,
    { agreementId: agreement._id, version: agreement.version }
  );

  res.status(201).json({
    message: "Partnership agreement created.",
    agreement,
  });
};

exports.sendAgreement = async (req, res) => {
  const hotel = await Hotel.findById(req.params.hotelId).populate(
    "owner",
    "name email role"
  );

  if (!hotel) return res.status(404).json({ message: "Hotel not found." });

  const agreement = await latestAgreementForHotel(hotel._id);
  if (!agreement)
    return res.status(404).json({ message: "Create an agreement first." });

  if (agreement.status === "superseded")
    return res.status(409).json({ message: "This agreement was superseded." });

  agreement.status = "sent";
  agreement.sentAt = new Date();
  await agreement.save();

  hotel.partnershipStatus = "agreement_sent";
  await hotel.save();

  const recipient =
    hotel.owner?.email ||
    hotel.authorizedRepresentative?.email ||
    hotel.application?.managerEmail ||
    hotel.email;

  if (recipient) {
    await sendPartnershipAgreementEmail({
      to: recipient,
      name: hotel.owner?.name || hotel.authorizedRepresentative?.name,
      hotelName: hotel.hotelName,
      agreementNumber: agreement.agreementNumber,
      version: agreement.version,
    }).catch((error) =>
      console.error("Partnership agreement email error:", error.message)
    );
  }

  await log(
    req,
    "partnership_agreement_sent",
    hotel,
    `Agreement ${agreement.agreementNumber} sent to hotel.`,
    { agreementId: agreement._id }
  );

  res.json({ message: "Agreement sent to hotel.", agreement });
};

exports.downloadAgreementPdf = async (req, res) => {
  const agreement = await HotelPartnershipAgreement.findById(
    req.params.agreementId
  );

  if (!agreement)
    return res.status(404).json({ message: "Agreement not found." });

  if (!(await canHotelAccessAgreement(req, agreement)))
    return res.status(403).json({ message: "Access denied." });

  if (req.user.role !== "admin" && agreement.status === "sent") {
    agreement.status = "viewed";
    agreement.viewedAt = agreement.viewedAt || new Date();
    await agreement.save();

    await Hotel.findByIdAndUpdate(agreement.hotel, {
      partnershipStatus: "agreement_viewed",
    });
  }

  return renderAgreementPdf(agreement, res);
};

exports.markAgreementViewed = async (req, res) => {
  const agreement = await HotelPartnershipAgreement.findById(
    req.params.agreementId
  );

  if (!agreement)
    return res.status(404).json({ message: "Agreement not found." });

  if (!(await canHotelAccessAgreement(req, agreement)))
    return res.status(403).json({ message: "Access denied." });

  if (["sent", "viewed"].includes(agreement.status)) {
    agreement.status = "viewed";
    agreement.viewedAt = agreement.viewedAt || new Date();
    await agreement.save();

    await Hotel.findByIdAndUpdate(agreement.hotel, {
      partnershipStatus: "agreement_viewed",
    });
  }

  res.json({ message: "Agreement marked as viewed.", agreement });
};

exports.acknowledgeAgreement = async (req, res) => {
  if (req.user.role !== "hotel")
    return res.status(403).json({ message: "Only the hotel can acknowledge." });

  const agreement = await HotelPartnershipAgreement.findById(
    req.params.agreementId
  );

  if (!agreement)
    return res.status(404).json({ message: "Agreement not found." });

  if (!(await canHotelAccessAgreement(req, agreement)))
    return res.status(403).json({ message: "Access denied." });

  if (!["sent", "viewed", "acknowledged"].includes(agreement.status))
    return res.status(409).json({
      message: "This agreement is not available for acknowledgement.",
    });

  const accepted = Boolean(req.body?.accepted);
  if (!accepted)
    return res.status(400).json({
      message: "You must confirm that you reviewed the agreement.",
    });

  agreement.status = "acknowledged";
  agreement.viewedAt = agreement.viewedAt || new Date();
  agreement.acknowledgedAt = new Date();
  agreement.acknowledgedBy = req.user._id;
  await agreement.save();

  await log(
    req,
    "partnership_agreement_acknowledged",
    { _id: agreement.hotel },
    `Agreement ${agreement.agreementNumber} acknowledged.`,
    { agreementId: agreement._id }
  );

  res.json({
    message:
      "Agreement acknowledged. Download, sign and upload the signed agreement.",
    agreement,
  });
};

exports.verifyAgreement = async (req, res) => {
  const hotel = await Hotel.findById(req.params.hotelId);
  if (!hotel) return res.status(404).json({ message: "Hotel not found." });

  const agreement = await latestAgreementForHotel(hotel._id);
  if (!agreement)
    return res.status(404).json({ message: "Agreement not found." });

  const signedDocument = await HotelDocument.findOne({
    hotel: hotel._id,
    documentType: "signed_agreement",
    status: "verified",
  }).sort({ createdAt: -1 });

  if (!signedDocument)
    return res.status(409).json({
      message:
        "Verify the hotel's signed agreement document before verifying the agreement.",
    });

  agreement.status = "verified";
  agreement.signedDocument = signedDocument._id;
  agreement.verifiedAt = new Date();
  agreement.verifiedBy = req.user._id;
  agreement.effectiveDate = agreement.effectiveDate || new Date();
  await agreement.save();

  hotel.partnershipStatus = "agreement_under_review";
  await hotel.save();

  await log(
    req,
    "partnership_agreement_verified",
    hotel,
    `Agreement ${agreement.agreementNumber} verified.`,
    { agreementId: agreement._id, documentId: signedDocument._id }
  );

  res.json({
    message:
      "Agreement verified. The hotel can now be activated through the partnership decision.",
    agreement,
  });
};
