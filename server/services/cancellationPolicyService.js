const { roundMoney } = require("../utils/pricing");

const DEFAULT_CANCELLATION_POLICY = Object.freeze({
  freeCancellationHours: 24,
  lateCancellationHours: 6,
  lateRefundPercent: 50,
  lastMinuteRefundPercent: 0,
  depositRefundableWithinFreeWindow: true,
  hotelCancellationRefundPercent: 100,
  noShowRefundPercent: 0,
  allowCustomerReschedule: true,
  rescheduleCutoffHours: 12,
  maxCustomerReschedules: 1,
  noShowGraceMinutes: 30,
  autoApprovePolicyRefunds: false,
});

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const normalizeCancellationPolicy = (value = {}) => {
  const freeCancellationHours = clamp(value.freeCancellationHours, 0, 168, DEFAULT_CANCELLATION_POLICY.freeCancellationHours);
  const lateCancellationHours = Math.min(clamp(value.lateCancellationHours, 0, 72, DEFAULT_CANCELLATION_POLICY.lateCancellationHours), freeCancellationHours);
  return {
  freeCancellationHours,
  lateCancellationHours,
  lateRefundPercent: clamp(value.lateRefundPercent, 0, 100, DEFAULT_CANCELLATION_POLICY.lateRefundPercent),
  lastMinuteRefundPercent: clamp(value.lastMinuteRefundPercent, 0, 100, DEFAULT_CANCELLATION_POLICY.lastMinuteRefundPercent),
  depositRefundableWithinFreeWindow: value.depositRefundableWithinFreeWindow !== false,
  // Hotel/admin cancellations always protect the customer with a full refund of collected funds.
  hotelCancellationRefundPercent: 100,
  noShowRefundPercent: clamp(value.noShowRefundPercent, 0, 100, DEFAULT_CANCELLATION_POLICY.noShowRefundPercent),
  allowCustomerReschedule: value.allowCustomerReschedule !== false,
  rescheduleCutoffHours: clamp(value.rescheduleCutoffHours, 0, 168, DEFAULT_CANCELLATION_POLICY.rescheduleCutoffHours),
  maxCustomerReschedules: Math.round(clamp(value.maxCustomerReschedules, 0, 10, DEFAULT_CANCELLATION_POLICY.maxCustomerReschedules)),
  noShowGraceMinutes: Math.round(clamp(value.noShowGraceMinutes, 0, 240, DEFAULT_CANCELLATION_POLICY.noShowGraceMinutes)),
  autoApprovePolicyRefunds: value.autoApprovePolicyRefunds === true,
  };
};

const parseTime = (value) => {
  const text = String(value || "").trim();
  const twelve = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(A\.?M\.?|P\.?M\.?)$/i);
  const twentyFour = text.match(/^(\d{1,2})(?::(\d{2}))$/);
  let hours;
  let minutes;
  if (twelve) {
    hours = Number(twelve[1]);
    minutes = Number(twelve[2] || 0);
    const period = twelve[3].toUpperCase();
    if (period.startsWith("P") && hours !== 12) hours += 12;
    if (period.startsWith("A") && hours === 12) hours = 0;
  } else if (twentyFour) {
    hours = Number(twentyFour[1]);
    minutes = Number(twentyFour[2]);
  } else return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
};

const reservationDateTime = (dateValue, timeValue) => {
  const date = new Date(dateValue);
  const time = parseTime(timeValue);
  if (Number.isNaN(date.getTime()) || !time) return null;
  const offsetMinutes = clamp(process.env.BUSINESS_TIMEZONE_OFFSET_MINUTES, -720, 840, 330);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), time.hours, time.minutes) - offsetMinutes * 60000);
};

const hoursUntilReservation = (booking, now = new Date()) => {
  const startsAt = reservationDateTime(booking.selectedDate, booking.selectedTimeSlot?.startTime);
  return startsAt ? (startsAt.getTime() - now.getTime()) / 3600000 : Number.NEGATIVE_INFINITY;
};

const calculateCancellationQuote = ({ booking, payment, hotel, actorRole = "customer", eventType = "cancellation", now = new Date() }) => {
  const policy = normalizeCancellationPolicy(hotel?.cancellationPolicy);
  const hoursBeforeReservation = hoursUntilReservation(booking, now);
  const paidAvailable = roundMoney(Math.max(Number(payment?.paidAmount || 0) - Number(payment?.refundedAmount || 0), 0));
  let refundPercent = 0;
  let policyBand = "non_refundable";

  if (eventType === "no_show") {
    refundPercent = policy.noShowRefundPercent;
    policyBand = "no_show";
  } else if (["hotel", "admin"].includes(actorRole)) {
    refundPercent = policy.hotelCancellationRefundPercent;
    policyBand = "operator_cancellation";
  } else if (hoursBeforeReservation >= policy.freeCancellationHours) {
    refundPercent = payment?.paymentMode === "deposit" && !policy.depositRefundableWithinFreeWindow ? 0 : 100;
    policyBand = refundPercent > 0 ? "free_cancellation" : "non_refundable_deposit";
  } else if (hoursBeforeReservation >= policy.lateCancellationHours) {
    refundPercent = policy.lateRefundPercent;
    policyBand = "late_cancellation";
  } else {
    refundPercent = policy.lastMinuteRefundPercent;
    policyBand = hoursBeforeReservation >= 0 ? "last_minute" : "reservation_started";
  }

  const refundableAmount = roundMoney(paidAvailable * refundPercent / 100);
  return {
    currency: payment?.currency || "LKR",
    hoursBeforeReservation: roundMoney(hoursBeforeReservation),
    paidAvailable,
    refundPercent,
    refundableAmount,
    retainedAmount: roundMoney(paidAvailable - refundableAmount),
    policyBand,
    policy,
    canCustomerCancel: actorRole !== "customer" || hoursBeforeReservation >= 0,
  };
};

module.exports = { DEFAULT_CANCELLATION_POLICY, normalizeCancellationPolicy, reservationDateTime, hoursUntilReservation, calculateCancellationQuote };
