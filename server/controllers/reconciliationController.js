const ReconciliationIssue = require("../models/ReconciliationIssue");
const PaymentWebhookEvent = require("../models/PaymentWebhookEvent");
const { auditPayments } = require("../services/reconciliationAuditService");

exports.getIssues = async (req, res) => {
  try {
    const query = {};
    if (req.query.status && req.query.status !== "all") query.status = req.query.status;
    if (req.query.severity && req.query.severity !== "all") query.severity = req.query.severity;
    const [issues, counts, recentWebhooks] = await Promise.all([
      ReconciliationIssue.find(query).populate("payment", "invoiceNumber status paidAmount refundedAmount currency").populate("hotel", "hotelName").sort({ createdAt: -1 }).limit(300),
      ReconciliationIssue.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      PaymentWebhookEvent.find({}).select("provider orderId gatewayReference verificationStatus processingStatus statusCode amount currency attemptCount lastError createdAt").sort({ createdAt: -1 }).limit(50),
    ]);
    return res.json({ issues, counts: Object.fromEntries(counts.map((row) => [row._id, row.count])), recentWebhooks });
  } catch (error) { return res.status(500).json({ message: "Reconciliation issues could not be loaded." }); }
};

exports.runAudit = async (req, res) => {
  try { return res.json({ message: "Reconciliation audit completed.", ...(await auditPayments({ limit: req.body.limit })) }); }
  catch (error) { return res.status(500).json({ message: "Reconciliation audit failed.", error: error.message }); }
};

exports.updateIssue = async (req, res) => {
  try {
    const status = req.body.status;
    if (!["acknowledged", "resolved"].includes(status)) return res.status(400).json({ message: "Issue can only be acknowledged or resolved." });
    const update = status === "acknowledged"
      ? { status, acknowledgedBy: req.user.id, acknowledgedAt: new Date() }
      : { status, resolvedBy: req.user.id, resolvedAt: new Date(), resolutionNote: String(req.body.note || "Resolved after manual verification.").slice(0, 1000) };
    const issue = await ReconciliationIssue.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!issue) return res.status(404).json({ message: "Reconciliation issue not found." });
    return res.json({ message: `Issue ${status}.`, issue });
  } catch (error) { return res.status(500).json({ message: "Issue update failed." }); }
};
