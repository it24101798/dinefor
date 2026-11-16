const PDFDocument = require("pdfkit");

function renderOfferLetter(agreement, res) {
  const doc = new PDFDocument({
    size: "A4", margin: 52, autoFirstPage: false,
    info: { Title: `DineFor offer letter ${agreement.agreementNumber}`, Author: "DineFor" },
  });
  const legal = agreement.legalSnapshot;
  const terms = agreement.terms;
  const brand = "#075253";
  const ink = "#183b40";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${agreement.agreementNumber}.pdf"`);
  res.setHeader("Cache-Control", "private, no-store");
  doc.pipe(res);

  function page(number, title) {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, 9).fill(brand);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(brand)
      .text(`DINEFOR.COM  /  PARTNER OFFER LETTER  /  ${number} OF 4`, 52, 55);
    doc.moveDown(1.5).fontSize(26).fillColor(ink).text(title);
    doc.moveDown(.55).font("Helvetica").fontSize(10).fillColor(brand)
      .text(`${agreement.agreementNumber}  |  Version ${agreement.version}`);
    doc.moveDown(1.2);
  }

  function row(label, value) {
    doc.font("Helvetica-Bold").fontSize(11).fillColor(brand).text(label);
    doc.moveDown(.2).font("Helvetica").fontSize(11).fillColor(ink).text(String(value || "—"), { lineGap: 3 });
    doc.moveDown(.8);
  }

  page(1, "Partnership offer");
  row("Trading name", legal.hotelName);
  row("Registered business name", legal.legalBusinessName);
  row("Business registration", legal.businessRegistrationNumber);
  row("Authorised representative", `${legal.representativeName} · ${legal.representativeDesignation}`);
  row("Representative work email", legal.representativeEmail);
  row("Purpose", "Make the hotel’s buffet experiences available for discovery and reservation through DineFor.");
  row("Activation", "DineFor verifies the signed offer letter before activating the partnership.");

  page(2, "Commercial terms");
  row("DineFor commission", `${terms.platformCommissionRate}%`);
  row("Settlement currency", terms.currency);
  row("Settlement cycle", terms.settlementCycle);
  row("Cancellation obligations", terms.cancellationPolicy);
  row("Refund obligations", terms.refundPolicy);

  page(3, "Operating responsibilities");
  row("Hotel responsibilities", terms.hotelResponsibilities);
  row("DineFor responsibilities", terms.dineForResponsibilities);
  row("Content and media permission", terms.contentPermission);
  row("Customer data protection", terms.dataProtection);
  row("Suspension and termination", terms.terminationTerms);

  page(4, "Acceptance and signature");
  const date = value => new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Asia/Colombo" }).format(new Date(value));
  row("Return the signed copy", agreement.signedDueAt ? `Please return through the partner portal by ${date(agreement.signedDueAt)} (Sri Lanka time).` : "Please return through the partner portal within 14 days of issue.");
  row("Hotel representative", legal.representativeName);
  row("Signature and date", "\n_____________________________________\n");
  row("DineFor representative", "\n_____________________________________\n");
  row("Signature and date", "\n_____________________________________\n");
  row("Terms fingerprint", agreement.termsHash);
  doc.end();
}

module.exports = { renderOfferLetter };
