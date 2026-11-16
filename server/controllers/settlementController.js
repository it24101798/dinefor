const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");
const ActivityLog = require("../models/ActivityLog");
const { settlementActions, completionStatuses } = require("../utils/settlementLifecycle");
const SettlementBatch = require("../models/SettlementBatch");
const PaymentTransaction = require("../models/PaymentTransaction");
const Payment = require("../models/Payment");
const Hotel = require("../models/Hotel");
const { loadEligibleTransactions, calculateSettlement, attachSettlement } = require("../services/settlementService");
const { sendFinancialEmail, recordInApp } = require("../services/financeCommunicationService");

const populate = [
  { path: "hotel", select: "hotelName application.financeContactName application.bankName application.accountHolderName" },
  { path: "createdBy", select: "name email" },
  { path: "approvedBy", select: "name email" },
  { path: "completedBy", select: "name email" },
];

const code = () => `DF-STL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID()}`;
const parseDate = (value, fallback) => {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
};
const bankSnapshot = (hotel) => {
  const account = String(hotel.application?.accountNumber || "");
  return { bankName: hotel.application?.bankName || "", branch: hotel.application?.bankBranch || "", accountHolderName: hotel.application?.accountHolderName || "", accountLast4: account.slice(-4) };
};

exports.getHotelSettlements = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.user.id }).select("_id hotelName");
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
    const settlements = await SettlementBatch.find({ hotel: hotel._id }).populate(populate).sort({ createdAt: -1 });
    return res.json({ hotel, settlements });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load hotel settlements.", error: error.message });
  }
};

exports.getAdminSettlements = async (req, res) => {
  try {
    const query = req.query.status && req.query.status !== "all" ? { status: req.query.status } : {};
    const settlements = await SettlementBatch.find(query).populate(populate).sort({ createdAt: -1 }).limit(200);
    return res.json(settlements.map((batch) => ({ ...batch.toObject(), availableActions: settlementActions(batch) })));
  } catch (error) {
    return res.status(500).json({ message: "Failed to load settlements.", error: error.message });
  }
};

exports.previewSettlement = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.body.hotelId).select("hotelName application paymentPolicy");
    if (!hotel) return res.status(404).json({ message: "Hotel not found." });
    const periodEnd = parseDate(req.body.periodEnd, new Date());
    const periodStart = parseDate(req.body.periodStart, new Date("2020-01-01T00:00:00.000Z"));
    const transactions = await loadEligibleTransactions({ hotelId: hotel._id, periodStart, periodEnd });
    return res.json({ hotel: { _id: hotel._id, hotelName: hotel.hotelName }, bankSnapshot: bankSnapshot(hotel), periodStart, periodEnd, transactionCount: transactions.length, ...calculateSettlement(transactions) });
  } catch (error) {
    return res.status(500).json({ message: "Settlement preview failed.", error: error.message });
  }
};

const reject = (status, message) => Object.assign(new Error(message), { status });

async function logSettlement(req, settlement, action, session, priorStatus) {
  await ActivityLog.create([{
    actor: req.user.id,
    actorRole: req.user.role,
    action,
    entityType: "settlement",
    entityId: settlement._id,
    message: `Settlement ${settlement.settlementCode}: ${settlement.status}.`,
    metadata: { priorStatus, status: settlement.status, direction: settlement.direction },
  }], { session });
}

exports.createSettlement = async (req, res) => {
  try {
    const periodEnd = parseDate(req.body.periodEnd, new Date());
    const periodStart = parseDate(req.body.periodStart, new Date("2020-01-01T00:00:00.000Z"));
    if (periodStart >= periodEnd) throw reject(400, "Settlement start must be before its end.");
    const settlement = await mongoose.connection.transaction(async (session) => {
      const hotel = await Hotel.findById(req.body.hotelId).session(session);
      if (!hotel) throw reject(404, "Hotel not found.");
      const transactions = await loadEligibleTransactions({ hotelId: hotel._id, periodStart, periodEnd, session });
      if (!transactions.length) throw reject(409, "No unsettled collection or refund transactions were found for this period.");
      const { paymentIds, ...totals } = calculateSettlement(transactions);
      const [draft] = await SettlementBatch.create([{
        settlementCode: code(),
        hotel: hotel._id,
        periodStart,
        periodEnd,
        transactions: transactions.map((item) => item._id),
        ...totals,
        bankSnapshot: bankSnapshot(hotel),
        note: String(req.body.note || "").slice(0, 1000),
        createdBy: req.user.id,
      }], { session });
      await attachSettlement({ settlement: draft, transactions, paymentIds, session });
      await logSettlement(req, draft, "settlement_prepared", session);
      return draft;
    });
    return res.status(201).json({ message: "Settlement draft created.", settlement });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.status ? error.message : "Failed to create settlement." });
  }
};

exports.updateSettlementStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const settlement = await mongoose.connection.transaction(async (session) => {
      const batch = await SettlementBatch.findById(req.params.id).session(session);
      if (!batch) throw reject(404, "Settlement not found.");
      const priorStatus = batch.status;
      if (!settlementActions(batch).includes(status)) throw reject(409, "This action is unavailable for the current settlement state.");
      const reference = String(req.body.payoutReference ?? "").trim();
      if (reference.length > 200) throw reject(400, "The transfer reference must be 200 characters or fewer.");
      const requiresReference = status === "processing" || status === "paid" || status === "received";
      if (requiresReference && !reference && (status === "processing" || !batch.payoutReference)) {
        throw reject(400, "A bank or payment reference is required.");
      }

      const now = new Date();
      batch.status = status;
      batch.note = String(req.body.note ?? batch.note ?? "").slice(0, 1000);
      if (status === "approved") {
        batch.approvedAt = now;
        batch.approvedBy = req.user.id;
      }
      if (status === "processing") {
        batch.payoutReference = reference;
        batch.submittedAt = now;
        batch.submittedBy = req.user.id;
      }
      if (completionStatuses.has(status)) {
        if (requiresReference && reference) batch.payoutReference = reference;
        batch.completedAt = now;
        batch.completedBy = req.user.id;
      }
      await batch.save({ session });

      const filter = { settlement: batch._id };
      if (status === "cancelled") {
        await PaymentTransaction.updateMany(filter, { $set: { settlement: null, settledAt: null } }, { session });
        await Payment.updateMany(filter, { $set: { settlement: null, settlementStatus: "unsettled" } }, { session });
      } else if (completionStatuses.has(status)) {
        await PaymentTransaction.updateMany(filter, { $set: { settledAt: now } }, { session });
        await Payment.updateMany(filter, { $set: { settlementStatus: "settled" } }, { session });
      }
      await logSettlement(req, batch, `settlement_${status}`, session, priorStatus);
      return batch;
    });

    const hotelContact = await Hotel.findById(settlement.hotel).select("owner contactEmail hotelName").catch(() => null);
    const label = status === "processing" ? "submitted externally" : status;
    const message = `Settlement ${settlement.settlementCode}: ${label}. Net amount: ${settlement.currency} ${Number(settlement.netAmount || 0).toFixed(2)}.`;
    if (hotelContact) {
      await Promise.allSettled([
        recordInApp({ recipient: hotelContact.owner, event: `settlement_${status}`, title: "Settlement status updated", message, link: "/hotel/finance", settlement: settlement._id }),
        sendFinancialEmail({ to: hotelContact.contactEmail, recipient: hotelContact.owner, event: `settlement_${status}`, subject: "DineFor settlement status updated", text: message, settlement: settlement._id }),
      ]);
    }
    return res.json({ message, settlement });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.status ? error.message : "Failed to update settlement." });
  }
};
