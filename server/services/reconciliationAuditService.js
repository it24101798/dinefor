const Payment = require("../models/Payment");
const PaymentTransaction = require("../models/PaymentTransaction");
const ReconciliationIssue = require("../models/ReconciliationIssue");
const { roundMoney } = require("../utils/pricing");

const upsertIssue = ({ issueKey, type, severity, payment, hotel, title, details = {}, webhookEvent = null }) => ReconciliationIssue.findOneAndUpdate(
  { issueKey },
  { $set: { type, severity, payment: payment || null, hotel: hotel || null, title, details, webhookEvent, detectedAt: new Date() }, $setOnInsert: { status: "open" } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const auditPayments = async ({ limit = 500 } = {}) => {
  const payments = await Payment.find({}).sort({ updatedAt: -1 }).limit(Math.min(Math.max(Number(limit) || 500, 1), 2000));
  let issuesFound = 0;
  for (const payment of payments) {
    const ledger = await PaymentTransaction.find({ payment: payment._id, status: "succeeded" });
    const credits = roundMoney(ledger.filter((row) => ["payment", "manual_collection"].includes(row.type) && row.direction === "credit").reduce((sum, row) => sum + Number(row.amount || 0), 0));
    const refunds = roundMoney(ledger.filter((row) => row.type === "refund" && row.direction === "debit").reduce((sum, row) => sum + Number(row.amount || 0), 0));
    const expectedPaid = roundMoney(payment.paidAmount);
    const expectedRefunded = roundMoney(payment.refundedAmount);
    const found = [];
    if (["paid", "partially_paid", "partially_refunded", "refunded"].includes(payment.status) && credits <= 0) found.push({ type: "payment_without_credit", severity: "critical", title: "Paid payment has no successful credit", actual: credits, expected: expectedPaid });
    if (credits !== expectedPaid) found.push({ type: "ledger_total_mismatch", severity: "high", title: "Payment paid amount differs from credit ledger", actual: credits, expected: expectedPaid });
    if (refunds !== expectedRefunded) found.push({ type: "refund_mismatch", severity: "high", title: "Refund total differs from debit ledger", actual: refunds, expected: expectedRefunded });
    if (payment.status === "expired" && credits > 0) found.push({ type: "expired_with_credit", severity: "critical", title: "Expired payment contains a successful credit", actual: credits, expected: 0 });
    for (const issue of found) {
      await upsertIssue({ issueKey: `${issue.type}:${payment._id}`, type: issue.type, severity: issue.severity, payment: payment._id, hotel: payment.hotel, title: issue.title, details: { actual: issue.actual, expected: issue.expected, currency: payment.currency } });
      issuesFound += 1;
    }
    const activeTypes = found.map((item) => item.type);
    await ReconciliationIssue.updateMany({ payment: payment._id, status: { $ne: "resolved" }, type: { $in: ["payment_without_credit", "ledger_total_mismatch", "refund_mismatch", "expired_with_credit"], $nin: activeTypes } }, { $set: { status: "resolved", resolvedAt: new Date(), resolutionNote: "Resolved automatically by a clean reconciliation scan." } });
  }
  return { checked: payments.length, issuesFound, ranAt: new Date().toISOString() };
};

module.exports = { auditPayments, upsertIssue };
