const { hotelPaymentView, hotelTransactionView } = require("../services/hotelPortalViews");
const Payment = require("../models/Payment");
const { sandboxEnabled, checkoutState } = require("../services/checkoutSandbox");
const PaymentTransaction = require("../models/PaymentTransaction");
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");
const { getGateway } = require("../services/paymentGateway");
const { recordTransaction, payloadFingerprint } = require("../services/paymentTransactionService");
const { roundMoney, getDepositRate } = require("../utils/pricing");
const { releaseBookingSeats } = require("../services/seatReleaseService");
const CancellationRequest = require("../models/CancellationRequest");
const { normalizeCancellationPolicy } = require("../services/cancellationPolicyService");
const { emitPaymentEvent } = require("../services/financeCommunicationService");
const PaymentWebhookEvent = require("../models/PaymentWebhookEvent");
const { upsertIssue } = require("../services/reconciliationAuditService");

const paymentPopulate = [
  { path: "booking", populate: { path: "buffet", select: "title hotel", populate: { path: "hotel", select: "hotelName location city" } } },
  { path: "user", select: "name email phone city role" },
  { path: "hotel", select: "hotelName location" },
];

const getDateRange = (period = "month") => {
  const now = new Date();
  const start = new Date(now);
  if (period === "today") start.setHours(0, 0, 0, 0);
  else if (period === "week") start.setDate(now.getDate() - 7);
  else if (period === "year") start.setFullYear(now.getFullYear() - 1);
  else start.setMonth(now.getMonth() - 1);
  return { start, end: now };
};

const sum = (items, field) => roundMoney(items.reduce((total, item) => total + Number(item[field] || 0), 0));
const sumEither = (items, preferred, legacy) => roundMoney(items.reduce((total, item) => total + Number(item[preferred] || item[legacy] || 0), 0));

const buildSummary = (payments) => ({
  customerTotal: sumEither(payments, "customerTotal", "amount"),
  paidAmount: sum(payments, "paidAmount"),
  gatewayFees: sum(payments, "gatewayFee"),
  dineForCommission: sumEither(payments, "dineForCommission", "commissionAmount"),
  hotelPayable: sumEither(payments, "hotelPayable", "hotelEarning"),
  refundedAmount: sum(payments, "refundedAmount"),
  netCollected: sum(payments, "netCollected"),
  pendingPayments: payments.filter((p) => p.status === "pending").length,
  refundRequests: payments.filter((p) => p.refundStatus === "requested").length,
  transactions: payments.length,
});

const paymentView = (req, payment) => req.user.role === "hotel" ? hotelPaymentView(payment) : payment;
const transactionView = (req, transactions) => req.user.role === "hotel" ? transactions.map(hotelTransactionView) : transactions;

const ensurePaymentOwner = (payment, userId) => String(payment.user?._id || payment.user) === String(userId);

exports.getPaymentOptions = async (req, res) => {
  const hotel = req.query.hotelId ? await Hotel.findById(req.query.hotelId).select("paymentPolicy cancellationPolicy application.cancellationPolicy application.refundPolicy status") : null;
  return res.json({
    currency: "LKR",
    depositRate: hotel?.paymentPolicy?.depositRate || getDepositRate(),
    paymentExpiryMinutes: hotel?.paymentPolicy?.paymentExpiryMinutes || Math.max(5, Number(process.env.PAYMENT_EXPIRY_MINUTES || 15)),
    modes: ["full_payment"],
    sandboxAvailable: hotel?.status === "approved" && sandboxEnabled(),
    cancellationPolicy: normalizeCancellationPolicy(hotel?.cancellationPolicy),
    cancellationPolicyText: hotel?.application?.cancellationPolicy || "",
    refundPolicyText: hotel?.application?.refundPolicy || "",
  });
};

exports.getMyPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id }).populate(paymentPopulate).sort({ createdAt: -1 });
    res.status(200).json(payments.map((payment) => paymentView(req, payment)));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payment history.", error: error.message });
  }
};

exports.getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate(paymentPopulate);
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (req.user.role === "customer" && !ensurePaymentOwner(payment, req.user.id)) return res.status(403).json({ message: "Not allowed to view this payment." });
    if (req.user.role === "hotel") {
      const hotel = await Hotel.findOne({ owner: req.user.id }).select("_id");
      if (!hotel || String(payment.hotel?._id || payment.hotel) !== String(hotel._id)) return res.status(403).json({ message: "Not allowed to view this payment." });
    }
    const transactions = await PaymentTransaction.find({ payment: payment._id }).sort({ createdAt: -1 });
    return res.json({ payment: paymentView(req, payment), transactions: transactionView(req, transactions) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch payment details.", error: error.message });
  }
};

exports.getInvoiceByBooking = async (req, res) => {
  try {
    const payment = await Payment.findOne({ booking: req.params.bookingId }).populate(paymentPopulate);
    if (!payment) return res.status(404).json({ message: "Invoice not found." });
    if (req.user.role === "customer" && !ensurePaymentOwner(payment, req.user.id)) return res.status(403).json({ message: "Not allowed to view this invoice." });
    if (req.user.role === "hotel") {
      const hotel = await Hotel.findOne({ owner: req.user.id }).select("_id");
      if (!hotel || String(payment.hotel?._id || payment.hotel) !== String(hotel._id)) return res.status(403).json({ message: "Not allowed to view this invoice." });
    }
    const transactions = await PaymentTransaction.find({ payment: payment._id, status: "succeeded" }).sort({ createdAt: 1 });
    const customerTotal = Number(payment.customerTotal || payment.amount || 0);
    const amountDueAtHotel = Number(payment.amountDueAtHotel || 0) ||
      (payment.paymentMode === "pay_at_hotel" && payment.status !== "paid" ? customerTotal : 0);
    const view = paymentView(req, payment);
    return res.json({
      documentType: payment.paidAmount > 0 ? "receipt" : "invoice",
      invoiceNumber: payment.invoiceNumber,
      issuedAt: payment.createdAt,
      paidAt: payment.paidAt,
      customer: view.user,
      hotel: view.hotel,
      buffet: view.booking?.buffet,
      booking: view.booking,
      paymentMode: payment.paymentMode,
      gateway: payment.gateway,
      paymentStatus: payment.status,
      currency: payment.currency,
      totals: {
        subtotal: payment.subtotal,
        discountAmount: payment.discountAmount,
        taxAmount: payment.taxAmount,
        serviceCharge: payment.serviceCharge,
        customerTotal,
        amountDueNow: payment.amountDueNow,
        amountDueAtHotel,
        paidAmount: payment.paidAmount,
        refundedAmount: payment.refundedAmount,
        netCollected: payment.netCollected,
      },
      transactions: transactionView(req, transactions),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to generate invoice.", error: error.message });
  }
};

exports.getHotelFinance = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.user.id });
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
    const payments = await Payment.find({ hotel: hotel._id }).populate(paymentPopulate).sort({ createdAt: -1 });
    const summary = buildSummary(payments);
    const todayStart = getDateRange("today").start;
    const weekStart = getDateRange("week").start;
    const todayPayments = payments.filter((payment) => payment.createdAt >= todayStart);
    const weekPayments = payments.filter((payment) => payment.createdAt >= weekStart);
    return res.json({ hotel: { _id: hotel._id, hotelName: hotel.hotelName }, summary: { ...summary, totalRevenue: summary.customerTotal, collectedRevenue: summary.paidAmount, todayRevenue: buildSummary(todayPayments).customerTotal, weekRevenue: buildSummary(weekPayments).customerTotal, hotelEarning: summary.hotelPayable, refunds: payments.filter((p) => ["partially_refunded", "refunded"].includes(p.status)).length }, payments: payments.map((payment) => paymentView(req, payment)) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch hotel finance.", error: error.message });
  }
};

exports.getAdminFinance = async (req, res) => {
  try {
    const { start } = getDateRange(req.query.period || "month");
    const query = req.query.status && req.query.status !== "all" ? { $or: [{ status: req.query.status }, { refundStatus: req.query.status }] } : {};
    const payments = await Payment.find(query).populate(paymentPopulate).sort({ createdAt: -1 });
    const periodPayments = payments.filter((payment) => payment.createdAt >= start);
    const summary = buildSummary(payments);
    const periodSummary = buildSummary(periodPayments);
    return res.json({ summary: { ...summary, period: periodSummary, totalRevenue: summary.customerTotal, periodRevenue: periodSummary.customerTotal, totalCommission: summary.dineForCommission, periodCommission: periodSummary.dineForCommission, hotelEarnings: summary.hotelPayable, collectedRevenue: summary.paidAmount, bookings: await Booking.countDocuments(), refunds: payments.filter((p) => ["partially_refunded", "refunded"].includes(p.status)).length }, payments: payments.slice(0, 200) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch admin finance.", error: error.message });
  }
};

exports.initiateGatewayPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("user", "name email phone city");
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (!ensurePaymentOwner(payment, req.user.id) && req.user.role !== "admin") return res.status(403).json({ message: "Not allowed to initiate this payment." });
    if (payment.gateway !== "payhere" || payment.paymentMode === "pay_at_hotel") return res.status(400).json({ message: "This payment does not use PayHere checkout." });
    if (payment.status !== "pending") return res.status(409).json({ message: `Payment is already ${payment.status}.` });
    if (payment.expiresAt && payment.expiresAt <= new Date()) return res.status(410).json({ message: "The payment window has expired. Please make a new reservation." });

    if (!["ready", "failed"].includes(checkoutState(payment))) return res.status(409).json({ message: "Payment is awaiting confirmation. Check its status before trying again." });
    const checkout = getGateway(payment.gateway).createCheckout({ payment, user: payment.user });
    const claimed = await Payment.findOneAndUpdate({
      _id: payment._id, status: "pending", gatewayStatus: payment.gatewayStatus,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }, { $set: { gatewayStatus: "initiated" } }, { new: true });
    if (!claimed) return res.status(409).json({ message: "Payment status changed. Check it before trying again." });
    await recordTransaction({ payment: claimed, type: "gateway_initiated", status: "succeeded", actor: req.user.id, note: "Secure gateway checkout created.", idempotencyKey: `initiate:${claimed._id}:${claimed.updatedAt.getTime()}` }).catch(() => {});
    return res.json({ checkout });
  } catch (error) {
    return res.status(error.code === "GATEWAY_NOT_CONFIGURED" ? 503 : 500).json({ message: error.message || "Payment initiation failed." });
  }
};

exports.handlePayHereNotification = async (req, res) => {
  let webhookEvent = null;
  try {
    const fingerprint = payloadFingerprint(req.body);
    webhookEvent = await PaymentWebhookEvent.findOne({ fingerprint });
    if (webhookEvent && ["processed", "ignored"].includes(webhookEvent.processingStatus)) return res.status(200).send("OK");
    if (webhookEvent) {
      webhookEvent.attemptCount += 1;
      webhookEvent.processingStatus = "received";
      webhookEvent.lastError = "";
      await webhookEvent.save();
    } else {
      webhookEvent = await PaymentWebhookEvent.create({ fingerprint, orderId: String(req.body.order_id || ""), gatewayReference: String(req.body.payment_id || ""), statusCode: String(req.body.status_code || ""), amount: Number(req.body.payhere_amount || 0), currency: String(req.body.payhere_currency || ""), method: String(req.body.method || "") });
    }
    const payment = await Payment.findOne({ gatewayOrderId: webhookEvent.orderId, gateway: "payhere" });
    if (!payment) {
      webhookEvent.verificationStatus = "orphan";
      webhookEvent.processingStatus = "ignored";
      webhookEvent.processedAt = new Date();
      await webhookEvent.save();
      await upsertIssue({ issueKey: `orphan_webhook:${fingerprint}`, type: "orphan_webhook", severity: "high", title: "PayHere callback does not match a payment", details: { orderId: webhookEvent.orderId, amount: webhookEvent.amount, currency: webhookEvent.currency }, webhookEvent: webhookEvent._id });
      return res.status(200).send("OK");
    }
    webhookEvent.payment = payment._id;
    const verification = getGateway("payhere").verifyNotification({ payload: req.body, payment });
    if (!verification.valid) {
      await recordTransaction({ payment, type: "payment_failed", status: "failed", verified: false, note: verification.reason, idempotencyKey: `payhere-invalid:${fingerprint}`, metadata: { payloadFingerprint: fingerprint } }).catch(() => {});
      webhookEvent.verificationStatus = "invalid";
      webhookEvent.processingStatus = "ignored";
      webhookEvent.lastError = verification.reason;
      webhookEvent.processedAt = new Date();
      await webhookEvent.save();
      await upsertIssue({ issueKey: `invalid_webhook:${fingerprint}`, type: "invalid_webhook", severity: verification.reason.includes("Amount") ? "critical" : "high", payment: payment._id, hotel: payment.hotel, title: "PayHere callback verification failed", details: { reason: verification.reason }, webhookEvent: webhookEvent._id });
      return res.status(400).send("Invalid notification");
    }

    const idempotencyKey = `payhere:${verification.gatewayReference || payment.gatewayOrderId}:${verification.statusCode}`;
    if (await PaymentTransaction.findOne({ idempotencyKey })) {
      webhookEvent.verificationStatus = "verified"; webhookEvent.processingStatus = "processed"; webhookEvent.processedAt = new Date(); await webhookEvent.save();
      return res.status(200).send("OK");
    }
    if (verification.successful) {
      const nextStatus = payment.paymentMode === "deposit" ? "partially_paid" : "paid";
      payment.status = nextStatus;
      payment.gatewayStatus = "verified";
      payment.gatewayReference = verification.gatewayReference;
      payment.paidAmount = payment.amountDueNow;
      payment.netCollected = roundMoney(payment.paidAmount - payment.refundedAmount - payment.gatewayFee);
      payment.paidAt = new Date();
      payment.verifiedAt = new Date();
      await payment.save();
      const bookingStatus = payment.metadata?.postPaymentBookingStatus || "confirmed";
      await Booking.findByIdAndUpdate(payment.booking, { $set: { bookingStatus, paymentStatus: nextStatus, paidAt: payment.paidAt, paymentReference: payment._id }, $push: { statusTimeline: { status: bookingStatus, note: `${payment.paymentMode === "deposit" ? "Deposit" : "Full payment"} verified by PayHere.`, at: new Date() } } });
      await recordTransaction({ payment, type: "payment", direction: "credit", amount: payment.amountDueNow, status: "succeeded", verified: true, gatewayReference: verification.gatewayReference, idempotencyKey, note: verification.statusMessage, metadata: { source: "gateway", gatewayFee: payment.gatewayFee, method: verification.method, statusCode: verification.statusCode, payloadFingerprint: fingerprint } });
      await emitPaymentEvent({ paymentId: payment._id, event: "payment_verified", title: "Payment verified", message: `Your ${payment.paymentMode === "deposit" ? "deposit" : "payment"} of LKR ${Number(payment.amountDueNow).toFixed(2)} was verified.` }).catch(() => {});
    } else {
      // Keep the hold pending until expiresAt so the customer can retry safely.
      payment.status = "pending";
      payment.gatewayStatus = `failed_${verification.statusCode}`;
      await payment.save();
      await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: "pending" });
      await recordTransaction({ payment, type: "payment_failed", status: "failed", verified: true, gatewayReference: verification.gatewayReference, idempotencyKey, note: verification.statusMessage || `PayHere status ${verification.statusCode}`, metadata: { method: verification.method, statusCode: verification.statusCode, payloadFingerprint: fingerprint } });
      await emitPaymentEvent({ paymentId: payment._id, event: "payment_failed", title: "Payment was not completed", message: "The gateway did not complete this payment. You can safely retry before the payment window expires." }).catch(() => {});
    }
    webhookEvent.verificationStatus = "verified";
    webhookEvent.processingStatus = "processed";
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();
    return res.status(200).send("OK");
  } catch (error) {
    console.error("PayHere notification failed:", error.message);
    if (webhookEvent) {
      webhookEvent.processingStatus = "failed";
      webhookEvent.lastError = String(error.message || "Callback processing failed").slice(0, 500);
      await webhookEvent.save().catch(() => {});
      await upsertIssue({ issueKey: `callback_failure:${webhookEvent.fingerprint}`, type: "callback_failure", severity: "critical", payment: webhookEvent.payment, title: "PayHere callback processing failed", details: { error: webhookEvent.lastError, attempts: webhookEvent.attemptCount }, webhookEvent: webhookEvent._id }).catch(() => {});
    }
    return res.status(500).send("Notification processing failed");
  }
};

exports.getGatewayReturnStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({ gatewayOrderId: String(req.params.orderId || ""), gateway: "payhere" }).select("user hotel booking gatewayOrderId gatewayStatus status paymentMode paidAmount amountDueNow amountDueAtHotel expiresAt verifiedAt invoiceNumber currency");
    if (!payment) return res.status(404).json({ message: "Payment order not found." });
    if (req.user.role === "customer" && !ensurePaymentOwner(payment, req.user.id)) return res.status(403).json({ message: "Not allowed to view this payment." });
    if (req.user.role === "hotel") {
      const hotel = await Hotel.findOne({ owner: req.user.id }).select("_id");
      if (!hotel || String(payment.hotel) !== String(hotel._id)) return res.status(403).json({ message: "Not allowed to view this payment." });
    }
    const now = new Date();
    return res.json({
      orderId: payment.gatewayOrderId, paymentId: payment._id, bookingId: payment.booking, amount: payment.amountDueNow, paidAmount: payment.paidAmount, amountDueAtHotel: payment.amountDueAtHotel,
      state: checkoutState(payment, now), expiresAt: payment.expiresAt, serverTime: now, sandbox: false,
      status: payment.status, gatewayStatus: payment.gatewayStatus, paymentMode: payment.paymentMode, verifiedAt: payment.verifiedAt,
      invoiceNumber: payment.invoiceNumber, currency: payment.currency, serverVerified: Boolean(payment.verifiedAt),
      canRetry: payment.status === "pending" && ["ready", "failed"].includes(checkoutState(payment, now)),
    });
  } catch (error) { return res.status(500).json({ message: "Payment verification status could not be loaded." }); }
};

exports.markPayAtHotelPaid = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate(paymentPopulate);
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (payment.paymentMode !== "pay_at_hotel") return res.status(400).json({ message: "Only Pay at Hotel payments can be collected manually." });
    if (req.user.role === "hotel") {
      const hotel = await Hotel.findOne({ owner: req.user.id });
      if (!hotel || String(payment.hotel?._id || payment.hotel) !== String(hotel._id)) return res.status(403).json({ message: "Not allowed to update this payment." });
    }
    if (payment.status === "paid") return res.status(200).json({ message: "Payment was already marked as paid.", payment: paymentView(req, payment) });
    payment.status = "paid";
    payment.paidAmount = payment.customerTotal || payment.amount;
    payment.amountDueAtHotel = 0;
    payment.netCollected = roundMoney(payment.paidAmount - payment.refundedAmount);
    payment.paidAt = new Date();
    payment.verifiedAt = new Date();
    payment.gatewayStatus = "collected_at_hotel";
    await payment.save();
    await Booking.findByIdAndUpdate(payment.booking?._id || payment.booking, { paymentStatus: "paid", paidAt: payment.paidAt, paymentReference: payment._id });
    await recordTransaction({ payment, type: "manual_collection", direction: "credit", amount: payment.paidAmount, actor: req.user.id, verified: true, status: "succeeded", idempotencyKey: `hotel-collection:${payment._id}`, note: "Hotel confirmed collection.", metadata: { source: "manual" } }).catch((error) => { if (error.code !== 11000) throw error; });
    await emitPaymentEvent({ paymentId: payment._id, event: "payment_collected", title: "Payment collected", message: `The hotel confirmed collection of LKR ${Number(payment.paidAmount).toFixed(2)}.` }).catch(() => {});
    return res.json({ message: "Payment marked as paid.", payment: paymentView(req, await Payment.findById(payment._id).populate(paymentPopulate)) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update payment.", error: error.message });
  }
};

exports.collectDepositBalance = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate(paymentPopulate);
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (payment.paymentMode !== "deposit" || payment.status !== "partially_paid" || Number(payment.amountDueAtHotel || 0) <= 0) {
      return res.status(400).json({ message: "This payment has no deposit balance ready for hotel collection." });
    }
    if (req.user.role === "hotel") {
      const hotel = await Hotel.findOne({ owner: req.user.id }).select("_id");
      if (!hotel || String(payment.hotel?._id || payment.hotel) !== String(hotel._id)) return res.status(403).json({ message: "Not allowed to collect this balance." });
    }
    const balance = roundMoney(payment.amountDueAtHotel);
    payment.paidAmount = roundMoney(payment.paidAmount + balance);
    payment.amountDueAtHotel = 0;
    payment.status = "paid";
    payment.netCollected = roundMoney(payment.paidAmount - payment.refundedAmount - payment.gatewayFee);
    await payment.save();
    await Booking.findByIdAndUpdate(payment.booking?._id || payment.booking, { paymentStatus: "paid", paymentReference: payment._id });
    await recordTransaction({ payment, type: "manual_collection", direction: "credit", amount: balance, actor: req.user.id, verified: true, status: "succeeded", idempotencyKey: `deposit-balance:${payment._id}`, note: "Hotel confirmed collection of the deposit balance.", metadata: { source: "manual" } }).catch((error) => { if (error.code !== 11000) throw error; });
    await emitPaymentEvent({ paymentId: payment._id, event: "deposit_balance_collected", title: "Deposit balance collected", message: `The hotel confirmed collection of the remaining LKR ${Number(balance).toFixed(2)}.` }).catch(() => {});
    return res.json({ message: "Deposit balance marked as collected.", payment: paymentView(req, await Payment.findById(payment._id).populate(paymentPopulate)) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to collect deposit balance.", error: error.message });
  }
};

exports.requestRefund = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (!ensurePaymentOwner(payment, req.user.id) && req.user.role !== "admin") return res.status(403).json({ message: "Not allowed to request this refund." });
    const refundable = roundMoney(payment.paidAmount - payment.refundedAmount);
    const amount = roundMoney(req.body.amount || refundable);
    if (refundable <= 0 || amount <= 0 || amount > refundable) return res.status(400).json({ message: `Refund amount must be between Rs. 0.01 and Rs. ${refundable.toFixed(2)}.` });
    payment.refundStatus = "requested";
    payment.metadata = { ...(payment.metadata || {}), refundRequest: { amount, reason: String(req.body.reason || "Customer requested refund review.").slice(0, 500), requestedAt: new Date(), requestedBy: req.user.id } };
    await payment.save();
    await recordTransaction({ payment, type: "refund_requested", amount, actor: req.user.id, status: "pending", note: payment.metadata.refundRequest.reason });
    return res.json({ message: "Refund request submitted for review.", payment });
  } catch (error) {
    return res.status(500).json({ message: "Refund request failed.", error: error.message });
  }
};

exports.handleRefundAction = async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!["approve", "reject", "process"].includes(action)) return res.status(400).json({ message: "Invalid refund action." });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    const refundable = roundMoney(payment.paidAmount - payment.refundedAmount);
    const requested = Number(payment.metadata?.refundRequest?.amount || refundable);
    const amount = roundMoney(req.body.amount || requested);
    if (amount <= 0 || amount > refundable) return res.status(400).json({ message: `Refund amount must not exceed Rs. ${refundable.toFixed(2)}.` });
    if (action === "approve" || action === "reject") {
      payment.refundStatus = action === "approve" ? "approved" : "rejected";
      payment.metadata = { ...(payment.metadata || {}), refundDecision: { action, note: String(note || "").slice(0, 500), by: req.user.id, at: new Date() } };
      await payment.save();
      await emitPaymentEvent({ paymentId: payment._id, event: `refund_${action}d`, title: action === "approve" ? "Refund approved" : "Refund request declined", message: action === "approve" ? `Your refund of LKR ${amount.toFixed(2)} was approved for processing.` : "Your refund request was reviewed and declined. Please contact support if you need help." }).catch(() => {});
      await CancellationRequest.findOneAndUpdate(
        { payment: payment._id },
        { $set: { status: action === "approve" ? "refund_approved" : "refund_rejected", resolvedBy: req.user.id, resolvedAt: new Date(), resolutionNote: String(note || "").slice(0, 1000) }, $push: { timeline: { status: action === "approve" ? "refund_approved" : "refund_rejected", note: String(note || `Refund ${action}.`).slice(0, 1000), by: req.user.id, at: new Date() } } }
      );
      return res.json({ message: `Refund ${payment.refundStatus}.`, payment });
    }
    if (!["approved", "requested"].includes(payment.refundStatus)) return res.status(409).json({ message: "Refund must be requested or approved before processing." });

    payment.refundStatus = "processing";
    await payment.save();
    try {
      const ledger = await PaymentTransaction.find({ payment: payment._id, status: "succeeded", type: { $in: ["payment", "manual_collection", "refund"] } });
      const gatewayCredits = ledger.filter((item) => item.type === "payment" && item.direction === "credit").reduce((total, item) => total + Number(item.amount || 0), 0);
      const manualCredits = ledger.filter((item) => item.type === "manual_collection" && item.direction === "credit").reduce((total, item) => total + Number(item.amount || 0), 0);
      const gatewayRefunds = ledger.filter((item) => item.type === "refund" && (item.metadata?.source === "gateway" || (!item.metadata?.source && payment.gateway === "payhere"))).reduce((total, item) => total + Number(item.amount || 0), 0);
      const manualRefunds = ledger.filter((item) => item.type === "refund" && (item.metadata?.source === "manual" || (!item.metadata?.source && payment.gateway === "pay_at_hotel"))).reduce((total, item) => total + Number(item.amount || 0), 0);
      const gatewayPart = roundMoney(Math.min(amount, Math.max(gatewayCredits - gatewayRefunds, 0)));
      const manualPart = roundMoney(amount - gatewayPart);
      if (manualPart > Math.max(manualCredits - manualRefunds, 0)) throw new Error("Refund source reconciliation failed: the manual collection balance is insufficient.");
      const reason = note || payment.metadata?.refundRequest?.reason || "DineFor approved refund";
      if (gatewayPart > 0) {
        const gatewayResult = await getGateway(payment.gateway).refund({ payment, amount: gatewayPart, reason });
        await recordTransaction({ payment, type: "refund", direction: "debit", amount: gatewayPart, actor: req.user.id, status: "succeeded", verified: true, gatewayReference: gatewayResult.reference, idempotencyKey: `refund:${payment._id}:gateway:${gatewayResult.reference}`, note: gatewayResult.message, metadata: { source: "gateway" } });
      }
      if (manualPart > 0) {
        const manualReference = `MANUAL-${Date.now()}`;
        await recordTransaction({ payment, type: "refund", direction: "debit", amount: manualPart, actor: req.user.id, status: "succeeded", verified: true, gatewayReference: manualReference, idempotencyKey: `refund:${payment._id}:manual:${manualReference}`, note: "Hotel/manual refund recorded by admin.", metadata: { source: "manual" } });
      }
      payment.refundedAmount = roundMoney(payment.refundedAmount + amount);
      payment.netCollected = roundMoney(payment.paidAmount - payment.refundedAmount - payment.gatewayFee);
      const fullyRefunded = payment.refundedAmount >= payment.paidAmount;
      payment.status = fullyRefunded ? "refunded" : "partially_refunded";
      payment.refundStatus = fullyRefunded ? "processed" : "partially_processed";
      await payment.save();
      await emitPaymentEvent({ paymentId: payment._id, event: "refund_processed", title: "Refund processed", message: `A refund of LKR ${amount.toFixed(2)} was processed. Your credit note is available in Payment History.` }).catch(() => {});
      await require("../models/ReconciliationIssue").updateOne({ issueKey: `refund_failure:${payment._id}` }, { $set: { status: "resolved", resolvedAt: new Date(), resolvedBy: req.user.id, resolutionNote: "Refund retry completed successfully." } }).catch(() => {});
      await CancellationRequest.findOneAndUpdate(
        { payment: payment._id },
        { $set: { status: "refund_processed", resolvedBy: req.user.id, resolvedAt: new Date(), resolutionNote: String(reason).slice(0, 1000) }, $push: { timeline: { status: "refund_processed", note: `${fullyRefunded ? "Full" : "Partial"} refund processed.`, by: req.user.id, at: new Date() } } }
      );
      const booking = await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: payment.status, refundStatus: payment.refundStatus, refundAmount: payment.refundedAmount }, { new: true });
      if (fullyRefunded && booking && ["pending", "confirmed"].includes(booking.bookingStatus) && !booking.qrUsed) {
        booking.bookingStatus = "cancelled";
        booking.cancelledBy = "admin";
        booking.cancelledAt = new Date();
        booking.statusTimeline.push({ status: "cancelled", note: "Booking cancelled after full refund.", by: req.user.id, at: new Date() });
        await booking.save();
        await releaseBookingSeats(booking);
      }
      return res.json({ message: `${fullyRefunded ? "Full" : "Partial"} refund processed.`, payment });
    } catch (error) {
      payment.refundStatus = "failed";
      await payment.save();
      await CancellationRequest.findOneAndUpdate(
        { payment: payment._id },
        { $set: { status: "refund_failed", resolutionNote: String(error.message || "Refund processing failed.").slice(0, 1000) }, $push: { timeline: { status: "refund_failed", note: String(error.message || "Refund processing failed.").slice(0, 1000), by: req.user.id, at: new Date() } } }
      );
      await recordTransaction({ payment, type: "refund_failed", direction: "debit", amount, actor: req.user.id, status: "failed", note: error.message });
      await upsertIssue({ issueKey: `refund_failure:${payment._id}`, type: "refund_failure", severity: "critical", payment: payment._id, hotel: payment.hotel, title: "Refund processing requires recovery", details: { amount, error: String(error.message || "Refund failed").slice(0, 300) } }).catch(() => {});
      return res.status(502).json({ message: error.message || "Gateway refund failed." });
    }
  } catch (error) {
    return res.status(500).json({ message: "Refund action failed.", error: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const allowed = ["pending", "failed", "cancelled", "expired"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid payment status." });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    payment.status = req.body.status;
    payment.metadata = { ...(payment.metadata || {}), adminNote: String(req.body.note || "").slice(0, 500), updatedBy: req.user.id };
    await payment.save();
    await recordTransaction({ payment, type: "status_change", actor: req.user.id, status: "succeeded", note: `Admin set status to ${payment.status}.` });
    return res.json({ message: "Payment status updated.", payment });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update payment status.", error: error.message });
  }
};

exports.exportPaymentsCsv = async (req, res) => {
  try {
    const query = req.query.status && req.query.status !== "all" ? { status: req.query.status } : {};
    if (req.user.role === "hotel") {
      const hotel = await Hotel.findOne({ owner: req.user.id }).select("_id");
      if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
      query.hotel = hotel._id;
    }
    const payments = await Payment.find(query).populate(paymentPopulate).sort({ createdAt: -1 });
    const esc = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [["Invoice", "Date", "Hotel", "Customer", "Mode", "Gateway", "Status", "Subtotal", "Discount", "Tax", "Service charge", "Customer total", "Paid", "Gateway fee", "DineFor commission", "Hotel payable", "Refunded", "Net collected"]];
    payments.forEach((p) => rows.push([p.invoiceNumber, p.createdAt?.toISOString(), p.hotel?.hotelName, p.user?.name, p.paymentMode, p.gateway, p.status, p.subtotal, p.discountAmount, p.taxAmount, p.serviceCharge, p.customerTotal, p.paidAmount, p.gatewayFee, p.dineForCommission, p.hotelPayable, p.refundedAmount, p.netCollected]));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=dinefor-payments-${Date.now()}.csv`);
    return res.send(rows.map((row) => row.map(esc).join(",")).join("\n"));
  } catch (error) {
    return res.status(500).json({ message: "CSV export failed.", error: error.message });
  }
};
