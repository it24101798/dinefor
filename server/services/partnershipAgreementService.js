const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const HotelPartnershipAgreement = require("../models/HotelPartnershipAgreement");

const canonicalize = (value) =>
  JSON.stringify(value, Object.keys(value).sort());

const hashTerms = ({ legalSnapshot, terms, version }) =>
  crypto
    .createHash("sha256")
    .update(canonicalize({ legalSnapshot, terms, version }))
    .digest("hex");

const buildAgreementNumber = (hotelId, version) => {
  const suffix = String(hotelId).slice(-6).toUpperCase();
  return `DF-AGR-${new Date().getFullYear()}-${suffix}-V${version}`;
};

const buildLegalSnapshot = (hotel) => ({
  hotelName: hotel.hotelName,
  legalBusinessName: hotel.application?.legalBusinessName || hotel.hotelName,
  businessRegistrationNumber:
    hotel.application?.businessRegistrationNumber || "",
  taxNumber: hotel.application?.taxNumber || "",
  representativeName:
    hotel.authorizedRepresentative?.name ||
    hotel.application?.managerName ||
    "",
  representativeDesignation:
    hotel.authorizedRepresentative?.designation || "Authorized Representative",
  representativeEmail:
    hotel.authorizedRepresentative?.email ||
    hotel.application?.managerEmail ||
    hotel.email ||
    "",
  representativePhone:
    hotel.authorizedRepresentative?.phone ||
    hotel.application?.managerPhone ||
    hotel.contactNumber ||
    "",
});

const buildDefaultTerms = (hotel, overrides = {}) => ({
  platformCommissionRate: Number(
    overrides.platformCommissionRate ?? process.env.DINEFOR_COMMISSION_RATE ?? 5
  ),
  currency: String(overrides.currency || "LKR"),
  settlementCycle: String(overrides.settlementCycle || "Monthly"),
  settlementWindowDays: Number(overrides.settlementWindowDays ?? 7),
  cancellationPolicy: String(
    overrides.cancellationPolicy ||
      hotel.application?.cancellationPolicy ||
      "The hotel must honor confirmed reservations and apply the cancellation terms displayed to the customer at the time of reservation."
  ),
  refundPolicy: String(
    overrides.refundPolicy ||
      hotel.application?.refundPolicy ||
      "Approved customer refunds must be processed according to the payment and refund policy active at the time of booking."
  ),
  hotelResponsibilities: String(
    overrides.hotelResponsibilities ||
      "Maintain accurate buffet information, pricing, availability, capacity, service times, customer safety, lawful operations and timely reservation handling."
  ),
  dineForResponsibilities: String(
    overrides.dineForResponsibilities ||
      "Operate the discovery and reservation platform, communicate reservation events, maintain booking records and provide reasonable partner support."
  ),
  contentPermission: String(
    overrides.contentPermission ||
      "The hotel grants DineFor permission to display hotel and buffet information, trademarks and media supplied by the hotel for marketplace promotion."
  ),
  dataProtection: String(
    overrides.dataProtection ||
      "Both parties must use customer information only for legitimate reservation, service, support and legal purposes and apply appropriate security controls."
  ),
  terminationTerms: String(
    overrides.terminationTerms ||
      "Either party may terminate or suspend the partnership according to the agreement, applicable law, material breach, fraud, safety risk or repeated service failure."
  ),
});

const createAgreement = async ({ hotel, adminUserId, overrides = {} }) => {
  const previous = await HotelPartnershipAgreement.findOne({
    hotel: hotel._id,
  }).sort({ version: -1 });

  const version = Number(previous?.version || 0) + 1;
  const legalSnapshot = buildLegalSnapshot(hotel);
  const terms = buildDefaultTerms(hotel, overrides);
  const termsHash = hashTerms({ legalSnapshot, terms, version });

  if (previous && !["verified", "terminated", "superseded"].includes(previous.status)) {
    previous.status = "superseded";
    await previous.save();
  }

  const agreement = await HotelPartnershipAgreement.create({
    hotel: hotel._id,
    agreementNumber: buildAgreementNumber(hotel._id, version),
    version,
    legalSnapshot,
    terms,
    termsHash,
    effectiveDate: overrides.effectiveDate || null,
    reviewDate: overrides.reviewDate || null,
    expiresAt: overrides.expiresAt || null,
    createdBy: adminUserId,
    adminNote: String(overrides.adminNote || "").slice(0, 4000),
  });

  return agreement;
};

const renderAgreementPdf = (agreement, res) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 54,
    info: {
      Title: `DineFor Partnership Agreement ${agreement.agreementNumber}`,
      Author: "DineFor",
      Subject: "Hotel Partnership Agreement",
    },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${agreement.agreementNumber}.pdf"`
  );

  doc.pipe(res);

  doc.font("Helvetica-Bold").fontSize(24).fillColor("#173c2b").text("DineFor");
  doc.moveDown(0.2);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#66736b")
    .text("Hotel Partnership Agreement");
  doc.moveDown(1.4);

  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor("#173c2b")
    .text(agreement.agreementNumber);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#66736b")
    .text(`Version ${agreement.version} · Status ${agreement.status}`);
  doc.moveDown();

  const legal = agreement.legalSnapshot || {};
  const terms = agreement.terms || {};

  const row = (label, value) => {
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#173c2b").text(label);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#27342d")
      .text(String(value || "-"));
    doc.moveDown(0.55);
  };

  row("Hotel", legal.hotelName);
  row("Legal business name", legal.legalBusinessName);
  row("Business registration", legal.businessRegistrationNumber);
  row("Tax number", legal.taxNumber);
  row(
    "Authorized representative",
    [legal.representativeName, legal.representativeDesignation]
      .filter(Boolean)
      .join(" — ")
  );
  row("Representative email", legal.representativeEmail);

  doc.moveDown(0.4);
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor("#173c2b")
    .text("Commercial Terms");
  doc.moveDown(0.5);
  row("Platform commission", `${terms.platformCommissionRate}%`);
  row("Currency", terms.currency);
  row(
    "Settlement",
    `${terms.settlementCycle} · within ${terms.settlementWindowDays} day(s) after reconciliation`
  );

  const section = (heading, text) => {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#173c2b").text(heading);
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor("#27342d")
      .text(String(text || "-"), { align: "justify" });
  };

  section("Cancellation obligations", terms.cancellationPolicy);
  section("Refund obligations", terms.refundPolicy);
  section("Hotel responsibilities", terms.hotelResponsibilities);
  section("DineFor responsibilities", terms.dineForResponsibilities);
  section("Content and media permission", terms.contentPermission);
  section("Customer data protection", terms.dataProtection);
  section("Suspension and termination", terms.terminationTerms);

  doc.moveDown();
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#66736b")
    .text(`Terms fingerprint: ${agreement.termsHash}`);
  doc.text(
    "This document is generated from the immutable commercial terms snapshot stored for this agreement version."
  );

  doc.end();
};

module.exports = {
  createAgreement,
  renderAgreementPdf,
  hashTerms,
};
