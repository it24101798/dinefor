const { roundMoney } = require("./pricing");

const calculateSettlement = (transactions) => {
  let gatewayCollected = 0;
  let hotelCollected = 0;
  let refundedAmount = 0;
  let gatewayFees = 0;
  let commissionDue = 0;
  const paymentIds = new Set();
  const feePaymentIds = new Set();

  transactions.forEach((transaction) => {
    const amount = Number(transaction.amount || 0);
    const rate = Number(transaction.payment?.commissionRate || 0);
    paymentIds.add(String(transaction.payment?._id || transaction.payment));
    if (transaction.type === "payment" && transaction.direction === "credit") {
      gatewayCollected += amount;
      const paymentId = String(transaction.payment?._id || transaction.payment);
      if (!feePaymentIds.has(paymentId)) {
        gatewayFees += Number(transaction.metadata?.gatewayFee ?? transaction.payment?.gatewayFee ?? 0);
        feePaymentIds.add(paymentId);
      }
      commissionDue += amount * rate / 100;
    } else if (transaction.type === "manual_collection" && transaction.direction === "credit") {
      hotelCollected += amount;
      commissionDue += amount * rate / 100;
    } else if (transaction.type === "refund" && transaction.direction === "debit") {
      refundedAmount += amount;
      if (transaction.metadata?.source === "manual" || (!transaction.metadata?.source && transaction.payment?.gateway === "pay_at_hotel")) hotelCollected -= amount;
      else gatewayCollected -= amount;
      commissionDue -= amount * rate / 100;
    }
  });

  gatewayCollected = roundMoney(gatewayCollected);
  hotelCollected = roundMoney(hotelCollected);
  gatewayFees = roundMoney(gatewayFees);
  commissionDue = roundMoney(commissionDue);
  refundedAmount = roundMoney(refundedAmount);
  const grossRecognized = roundMoney(gatewayCollected + hotelCollected);
  // Gateway costs are borne by DineFor; never reduce the hotel share.
  // Negative commission reverses commission on refunds in later periods.
  const signedNet = roundMoney(gatewayCollected - commissionDue);
  return {
    paymentIds: [...paymentIds],
    paymentCount: paymentIds.size,
    grossRecognized,
    gatewayCollected,
    hotelCollected,
    refundedAmount,
    gatewayFees,
    commissionDue,
    netAmount: Math.abs(signedNet),
    direction: signedNet > 0 ? "payable_to_hotel" : signedNet < 0 ? "receivable_from_hotel" : "balanced",
  };
};

module.exports = { calculateSettlement };
