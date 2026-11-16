const PaymentTransaction = require("../models/PaymentTransaction");
const Payment = require("../models/Payment");

const eligibleTypes = ["payment", "manual_collection", "refund"];

const loadEligibleTransactions = ({ hotelId, periodStart, periodEnd, session }) => {
  const query = PaymentTransaction.find({
    hotel: hotelId,
    status: "succeeded",
    type: { $in: eligibleTypes },
    settlement: null,
    createdAt: { $gte: periodStart, $lte: periodEnd },
  }).populate("payment", "commissionRate gatewayFee gateway paymentMode").sort({ createdAt: 1 });
  return session ? query.session(session) : query;
};

const { calculateSettlement } = require("../utils/settlementMath");

const attachSettlement = async ({ settlement, transactions, paymentIds, session }) => {
  await PaymentTransaction.updateMany({ _id: { $in: transactions.map((item) => item._id) }, settlement: null }, { settlement: settlement._id }, { session });
  await Payment.updateMany({ _id: { $in: paymentIds } }, { settlement: settlement._id, settlementStatus: "batched" }, { session });
};

module.exports = { loadEligibleTransactions, calculateSettlement, attachSettlement };
