const FinancialDocument = require("../models/FinancialDocument");
const CommunicationLog = require("../models/CommunicationLog");
const Hotel = require("../models/Hotel");
const SettlementBatch = require("../models/SettlementBatch");
const Payment = require("../models/Payment");
const { generatePaymentPdf, generateSettlementPdf } = require("../services/financialDocumentService");
const { sendFinancialEmail } = require("../services/financeCommunicationService");

const hotelForUser = (userId) => Hotel.findOne({ owner: userId }).select("_id owner contactEmail hotelName");

const canViewPayment = async (payment, user) => {
  if (user.role === "admin") return true;
  if (user.role === "customer") return String(payment.user?._id || payment.user) === String(user.id);
  const hotel = await hotelForUser(user.id);
  return Boolean(hotel && String(payment.hotel?._id || payment.hotel) === String(hotel._id));
};

const canViewSettlement = async (settlement, user) => {
  if (user.role === "admin") return true;
  const hotel = await hotelForUser(user.id);
  return Boolean(hotel && String(settlement.hotel?._id || settlement.hotel) === String(hotel._id));
};

exports.getPaymentPdf = async (req, res) => {
  try {
    const accessPayment = await Payment.findById(req.params.paymentId);
    if (!accessPayment) return res.status(404).json({ message: "Payment not found." });
    if (!(await canViewPayment(accessPayment, req.user))) return res.status(403).json({ message: "Not allowed to access this document." });
    const result = await generatePaymentPdf({ paymentId: req.params.paymentId, type: req.params.type, actor: req.user.id, showCustomerContact: req.user.role !== "hotel" });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${result.filename}"`, "Cache-Control": "private, no-store" });
    return res.send(result.buffer);
  } catch (error) { return res.status(error.status || 500).json({ message: error.message || "Document generation failed." }); }
};

exports.emailPaymentPdf = async (req, res) => {
  try {
    const accessPayment = await Payment.findById(req.params.paymentId);
    if (!accessPayment) return res.status(404).json({ message: "Payment not found." });
    if (!(await canViewPayment(accessPayment, req.user))) return res.status(403).json({ message: "Not allowed to send this document." });
    const result = await generatePaymentPdf({ paymentId: req.params.paymentId, type: req.params.type, actor: req.user.id });
    const to = result.payment.user?.email;
    await sendFinancialEmail({ to, recipient: result.payment.user?._id, event: `${req.params.type}_sent`, subject: `Your DineFor ${req.params.type.replace("_", " ")} ${result.record.documentNumber}`, text: `Your DineFor financial document ${result.record.documentNumber} is attached.`, html: `<p>Your DineFor financial document <strong>${result.record.documentNumber}</strong> is attached.</p>`, attachment: { filename: result.filename, content: result.buffer }, payment: result.payment._id, booking: result.payment.booking?._id || result.payment.booking, financialDocument: result.record._id });
    return res.json({ message: req.user.role === "hotel" ? "Document sent to the customer." : `Document sent to ${to}.`, documentNumber: result.record.documentNumber });
  } catch (error) { return res.status(error.code === "EMAIL_SERVICE_NOT_CONFIGURED" ? 503 : error.status || 500).json({ message: error.message || "Document email failed." }); }
};

exports.getSettlementPdf = async (req, res) => {
  try {
    const accessSettlement = await SettlementBatch.findById(req.params.settlementId);
    if (!accessSettlement) return res.status(404).json({ message: "Settlement not found." });
    if (!(await canViewSettlement(accessSettlement, req.user))) return res.status(403).json({ message: "Not allowed to access this statement." });
    const result = await generateSettlementPdf({ settlementId: req.params.settlementId, actor: req.user.id });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${result.filename}"`, "Cache-Control": "private, no-store" });
    return res.send(result.buffer);
  } catch (error) { return res.status(error.status || 500).json({ message: error.message || "Statement generation failed." }); }
};

exports.emailSettlementPdf = async (req, res) => {
  try {
    const accessSettlement = await SettlementBatch.findById(req.params.settlementId);
    if (!accessSettlement) return res.status(404).json({ message: "Settlement not found." });
    if (!(await canViewSettlement(accessSettlement, req.user))) return res.status(403).json({ message: "Not allowed to send this statement." });
    const result = await generateSettlementPdf({ settlementId: req.params.settlementId, actor: req.user.id });
    const to = result.settlement.hotel?.contactEmail;
    await sendFinancialEmail({ to, event: "settlement_statement_sent", subject: `DineFor settlement statement ${result.record.documentNumber}`, text: `The settlement statement ${result.record.documentNumber} is attached.`, html: `<p>The settlement statement <strong>${result.record.documentNumber}</strong> is attached.</p>`, attachment: { filename: result.filename, content: result.buffer }, settlement: result.settlement._id, financialDocument: result.record._id });
    return res.json({ message: `Statement sent to ${to}.`, documentNumber: result.record.documentNumber });
  } catch (error) { return res.status(error.code === "EMAIL_SERVICE_NOT_CONFIGURED" ? 503 : error.status || 500).json({ message: error.message || "Statement email failed." }); }
};

exports.getDocumentHistory = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "customer") filter.customer = req.user.id;
    if (req.user.role === "hotel") {
      const hotel = await hotelForUser(req.user.id);
      if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
      filter.hotel = hotel._id;
    }
    const documents = await FinancialDocument.find(filter).sort({ issuedAt: -1 }).limit(200);
    const ids = documents.map((item) => item._id);
    const query = CommunicationLog.find({ financialDocument: { $in: ids } });
    if (req.user.role === "hotel") {
      query.select("channel event status financialDocument createdAt");
    }
    const communications = await query.sort({ createdAt: -1 }).limit(300);
    return res.json({ documents, communications });
  } catch (error) { return res.status(500).json({ message: "Document history could not be loaded." }); }
};
