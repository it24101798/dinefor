const PDFDocument = require("pdfkit");
const FinancialDocument = require("../models/FinancialDocument");
const Payment = require("../models/Payment");
const SettlementBatch = require("../models/SettlementBatch");

const money = (value, currency = "LKR") => `${currency} ${Number(value || 0).toFixed(2)}`;
const date = (value) => value ? new Date(value).toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" }) : "-";
const cleanNumber = (value) => String(value || "UNASSIGNED").replace(/[^A-Za-z0-9-]/g, "").toUpperCase();

const paymentNumber = (payment, type) => {
  const prefixes = { invoice: "DF-INV", receipt: "DF-RCT", credit_note: "DF-CN" };
  return `${prefixes[type]}-${cleanNumber(payment.invoiceNumber || payment._id)}`;
};

const loadPayment = (id) => Payment.findById(id)
  .populate({ path: "booking", populate: { path: "buffet", select: "title date startTime endTime" } })
  .populate("user", "name email phone")
  .populate("hotel", "hotelName location address contactEmail contactPhone application.businessRegistrationNumber application.taxNumber owner");

const assertPaymentDocumentAllowed = (payment, type) => {
  if (!payment) throw Object.assign(new Error("Payment not found."), { status: 404 });
  if (!["invoice", "receipt", "credit_note"].includes(type)) throw Object.assign(new Error("Unsupported financial document type."), { status: 400 });
  if (type === "receipt" && Number(payment.paidAmount || 0) <= 0) throw Object.assign(new Error("A receipt is available only after a payment is collected."), { status: 409 });
  if (type === "credit_note" && Number(payment.refundedAmount || 0) <= 0) throw Object.assign(new Error("A credit note is available only after a refund is processed."), { status: 409 });
};

const paymentTotals = (payment) => ({
  subtotal: Number(payment.subtotal || 0),
  discountAmount: Number(payment.discountAmount || 0),
  taxAmount: Number(payment.taxAmount || 0),
  serviceCharge: Number(payment.serviceCharge || 0),
  customerTotal: Number(payment.customerTotal || payment.amount || 0),
  amountDueNow: Number(payment.amountDueNow || 0),
  amountDueAtHotel: Number(payment.amountDueAtHotel || 0),
  paidAmount: Number(payment.paidAmount || 0),
  refundedAmount: Number(payment.refundedAmount || 0),
  netCollected: Number(payment.netCollected || 0),
});

const ensurePaymentDocument = async ({ payment, type, actor = null }) => {
  assertPaymentDocumentAllowed(payment, type);
  return FinancialDocument.findOneAndUpdate(
    { payment: payment._id, type },
    {
      $set: { booking: payment.booking?._id || payment.booking, hotel: payment.hotel?._id || payment.hotel, customer: payment.user?._id || payment.user, currency: payment.currency, totals: paymentTotals(payment), status: "issued" },
      $setOnInsert: { documentNumber: paymentNumber(payment, type), issuedAt: new Date(), createdBy: actor },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const ensureSettlementDocument = async ({ settlement, actor = null }) => FinancialDocument.findOneAndUpdate(
  { settlement: settlement._id, type: "settlement_statement" },
  {
    $set: { hotel: settlement.hotel?._id || settlement.hotel, currency: settlement.currency, totals: { grossRecognized: settlement.grossRecognized, gatewayCollected: settlement.gatewayCollected, hotelCollected: settlement.hotelCollected, refundedAmount: settlement.refundedAmount, gatewayFees: settlement.gatewayFees, commissionDue: settlement.commissionDue, netAmount: settlement.netAmount }, status: "issued" },
    $setOnInsert: { documentNumber: `DF-STMT-${cleanNumber(settlement.settlementCode || settlement._id)}`, issuedAt: new Date(), createdBy: actor },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const pdfBuffer = (render) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: "A4", margin: 46, info: { Title: "DineFor Financial Document", Author: "DineFor" } });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => resolve(Buffer.concat(chunks)));
  doc.on("error", reject);
  render(doc);
  doc.end();
});

const heading = (doc, title, number, issuedAt) => {
  doc.rect(0, 0, 595, 110).fill("#173c2b");
  doc.fillColor("#ffffff").fontSize(25).text("DineFor", 46, 34);
  doc.fontSize(9).text("Discover. Reserve. Dine.", 46, 66);
  doc.fontSize(17).text(title, 355, 34, { align: "right", width: 194 });
  doc.fontSize(9).text(number, 355, 61, { align: "right", width: 194 });
  doc.fillColor("#173c2b").fontSize(9).text(`Issued ${date(issuedAt)}`, 46, 126);
};

const line = (doc, label, value, bold = false) => {
  const y = doc.y;
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor("#34473d").fontSize(10).text(label, 300, y, { width: 145 });
  doc.text(value, 445, y, { width: 104, align: "right" });
  doc.moveDown(0.65);
};

const generatePaymentPdf = async ({ paymentId, type, actor = null, showCustomerContact = true }) => {
  const payment = await loadPayment(paymentId);
  assertPaymentDocumentAllowed(payment, type);
  const record = await ensurePaymentDocument({ payment, type, actor });
  const totals = paymentTotals(payment);
  const titles = { invoice: "INVOICE", receipt: "PAYMENT RECEIPT", credit_note: "REFUND CREDIT NOTE" };
  const buffer = await pdfBuffer((doc) => {
    heading(doc, titles[type], record.documentNumber, record.issuedAt);
    doc.moveDown(3.4);
    doc.font("Helvetica-Bold").fontSize(11).text("CUSTOMER");
    doc.font("Helvetica").fontSize(10).text(payment.user?.name || "Customer").text(showCustomerContact ? payment.user?.email || "" : "").text(showCustomerContact ? payment.user?.phone || "" : "");
    doc.moveUp(3);
    doc.font("Helvetica-Bold").text("HOTEL", 310);
    doc.font("Helvetica").text(payment.hotel?.hotelName || "Hotel", 310).text(payment.hotel?.address || payment.hotel?.location || "", 310).text(`Tax ID: ${payment.hotel?.application?.taxNumber || "Not provided"}`, 310);
    doc.moveDown(2);
    doc.moveTo(46, doc.y).lineTo(549, doc.y).strokeColor("#d6ddd8").stroke();
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Reservation details");
    doc.font("Helvetica").text(`${payment.booking?.buffet?.title || payment.metadata?.buffetTitle || "Buffet reservation"}`);
    doc.text(`Booking: ${payment.booking?.bookingCode || payment.booking?._id || "-"}`);
    doc.text(`Payment mode: ${String(payment.paymentMode).replaceAll("_", " ")} | Status: ${payment.status}`);
    doc.moveDown();
    line(doc, "Subtotal", money(totals.subtotal, payment.currency));
    line(doc, "Discount", `- ${money(totals.discountAmount, payment.currency)}`);
    line(doc, "Tax", money(totals.taxAmount, payment.currency));
    line(doc, "Service charge", money(totals.serviceCharge, payment.currency));
    line(doc, "Customer total", money(totals.customerTotal, payment.currency), true);
    line(doc, "Paid", money(totals.paidAmount, payment.currency));
    if (type === "credit_note" || totals.refundedAmount > 0) line(doc, "Refunded", money(totals.refundedAmount, payment.currency), true);
    line(doc, "Net collected", money(totals.netCollected, payment.currency));
    doc.moveDown(2).font("Helvetica").fontSize(8).fillColor("#6d786f").text("This system-generated document is part of DineFor's financial record. Payment confirmation is based on server-verified collection records.");
  });
  return { record, buffer, filename: `${record.documentNumber}.pdf`, payment };
};

const generateSettlementPdf = async ({ settlementId, actor = null }) => {
  const settlement = await SettlementBatch.findById(settlementId).populate("hotel", "hotelName location address contactEmail application.businessRegistrationNumber application.taxNumber owner");
  if (!settlement) throw Object.assign(new Error("Settlement not found."), { status: 404 });
  const record = await ensureSettlementDocument({ settlement, actor });
  const buffer = await pdfBuffer((doc) => {
    heading(doc, "SETTLEMENT STATEMENT", record.documentNumber, record.issuedAt);
    doc.moveDown(3.4).font("Helvetica-Bold").fontSize(13).text(settlement.hotel?.hotelName || "Hotel partner");
    doc.font("Helvetica").fontSize(10).text(settlement.hotel?.address || settlement.hotel?.location || "");
    doc.text(`Period: ${date(settlement.periodStart)} to ${date(settlement.periodEnd)}`);
    doc.text(`Settlement status: ${settlement.status} | Direction: ${String(settlement.direction).replaceAll("_", " ")}`);
    doc.moveDown(1.5);
    line(doc, "Gross recognized", money(settlement.grossRecognized, settlement.currency));
    line(doc, "Gateway collected", money(settlement.gatewayCollected, settlement.currency));
    line(doc, "Hotel collected", money(settlement.hotelCollected, settlement.currency));
    line(doc, "Refunded", money(settlement.refundedAmount, settlement.currency));
    line(doc, "Gateway fees", money(settlement.gatewayFees, settlement.currency));
    line(doc, "DineFor commission", money(settlement.commissionDue, settlement.currency));
    line(doc, "Net settlement", money(settlement.netAmount, settlement.currency), true);
    doc.moveDown().fontSize(9).text(`Payout reference: ${settlement.payoutReference || "Pending"}`);
    doc.moveDown(2).fontSize(8).fillColor("#6d786f").text("Generated from DineFor's immutable payment transaction ledger. Report discrepancies to DineFor before acknowledging settlement.");
  });
  return { record, buffer, filename: `${record.documentNumber}.pdf`, settlement };
};

module.exports = { generatePaymentPdf, generateSettlementPdf, loadPayment, assertPaymentDocumentAllowed };
