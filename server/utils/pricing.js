const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getCommissionRate = () => {
  const rate = Number(process.env.DINEFOR_COMMISSION_RATE || 5);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : 5;
};

const getDepositRate = () => {
  const rate = Number(process.env.DINEFOR_DEPOSIT_RATE || 20);
  return Number.isFinite(rate) && rate > 0 && rate <= 100 ? rate : 20;
};

const getGatewayFeeRate = (gateway) => {
  if (gateway === "payhere") {
    const rate = Number(process.env.PAYHERE_GATEWAY_FEE_RATE || 0);
    return Number.isFinite(rate) && rate >= 0 ? rate : 0;
  }
  return 0;
};

const calculateCouponDiscount = ({ subtotal, coupon }) => {
  if (!coupon) return 0;

  if (coupon.minimumSpend && subtotal < Number(coupon.minimumSpend)) return 0;

  let discount = 0;
  if (coupon.type === "percentage") {
    discount = subtotal * (Number(coupon.value || 0) / 100);
  } else if (coupon.type === "flat") {
    discount = Number(coupon.value || 0);
  }

  if (coupon.maximumDiscount && Number(coupon.maximumDiscount) > 0) {
    discount = Math.min(discount, Number(coupon.maximumDiscount));
  }

  return Math.min(roundMoney(discount), subtotal);
};

const calculateTotals = ({ price, seats, coupon = null }) => {
  const unitPrice = Number(price || 0);
  const guestCount = Number(seats || 0);
  const subtotal = roundMoney(unitPrice * guestCount);
  const discountAmount = calculateCouponDiscount({ subtotal, coupon });

  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const taxRate = Number(process.env.DINEFOR_TAX_RATE || 0);
  const serviceRate = Number(process.env.DINEFOR_SERVICE_CHARGE_RATE || 0);
  const taxAmount = roundMoney(taxableAmount * (taxRate / 100));
  const serviceCharge = roundMoney(taxableAmount * (serviceRate / 100));
  const grandTotal = roundMoney(taxableAmount + taxAmount + serviceCharge);

  const commissionRate = getCommissionRate();
  const commissionAmount = roundMoney(grandTotal * (commissionRate / 100));
  const hotelEarning = roundMoney(grandTotal - commissionAmount);

  return {
    subtotal,
    discountAmount,
    taxAmount,
    serviceCharge,
    grandTotal,
    commissionRate,
    commissionAmount,
    hotelEarning,
  };
};

const calculatePaymentBreakdown = ({ totals, paymentMode, gateway, depositRate }) => {
  const mode = ["pay_at_hotel", "deposit", "full_payment"].includes(paymentMode)
    ? paymentMode
    : "pay_at_hotel";
  const customerTotal = roundMoney(totals.grandTotal);
  const effectiveDepositRate = Number.isFinite(Number(depositRate)) && Number(depositRate) > 0 && Number(depositRate) <= 100
    ? Number(depositRate)
    : getDepositRate();
  const amountDueNow = mode === "deposit"
    ? roundMoney(customerTotal * (effectiveDepositRate / 100))
    : mode === "full_payment"
    ? customerTotal
    : 0;
  const amountDueAtHotel = roundMoney(customerTotal - amountDueNow);
  const gatewayFee = roundMoney(amountDueNow * (getGatewayFeeRate(gateway) / 100));
  const dineForCommission = roundMoney(totals.commissionAmount);
  const hotelPayable = roundMoney(customerTotal - dineForCommission);

  return {
    paymentMode: mode,
    customerTotal,
    amountDueNow,
    amountDueAtHotel,
    gatewayFee,
    dineForCommission,
    hotelPayable,
    refundedAmount: 0,
    netCollected: 0,
    depositRate: effectiveDepositRate,
  };
};

module.exports = {
  calculateTotals,
  calculatePaymentBreakdown,
  roundMoney,
  getCommissionRate,
  getDepositRate,
  getGatewayFeeRate,
};
