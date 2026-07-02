const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getCommissionRate = () => {
  const rate = Number(process.env.DINEFOR_COMMISSION_RATE || 8);
  return Number.isFinite(rate) && rate >= 0 ? rate : 8;
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

module.exports = { calculateTotals, roundMoney, getCommissionRate };
