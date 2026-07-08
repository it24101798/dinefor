const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");

const paymentPopulate = [
  { path: "booking", populate: [{ path: "buffet", populate: { path: "hotel" } }, { path: "user", select: "name email role" }] },
  { path: "user", select: "name email role" },
  { path: "hotel", select: "hotelName location city email contact address" },
  { path: "collectedBy", select: "name email role" },
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

const money = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const sum = (items, field = "amount") => items.reduce((total, item) => total + Number(item[field] || 0), 0);

const buildInvoicePayload = (payment) => {
  const booking = payment.booking || {};
  const buffet = booking.buffet || {};
  const hotel = payment.hotel || buffet.hotel || {};
  const guest = payment.user || booking.user || {};

  return {
    invoiceNumber: payment.invoiceNumber || booking.invoiceNumber || "",
    paymentId: payment._id,
    paymentStatus: payment.status,
    paymentMethod: payment.gateway,
    currency: payment.currency || "LKR",
    issuedAt: payment.createdAt,
    paidAt: payment.paidAt,
    collectedAt: payment.collectedAt,
    booking: {
      _id: booking._id,
      bookingCode: booking.bookingCode,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      selectedDate: booking.selectedDate,
      selectedTimeSlot: booking.selectedTimeSlot,
      seats: booking.seats,
      qrUsed: booking.qrUsed,
      checkedInAt: booking.checkedInAt,
    },
    guest: {
      name: guest.name || "Customer",
      email: guest.email || "",
    },
    hotel: {
      _id: hotel._id,
      hotelName: hotel.hotelName || "Hotel",
      location: hotel.location || hotel.city || "",
      email: hotel.email || "",
      contact: hotel.contact || "",
      address: hotel.address || "",
    },
    buffet: {
      _id: buffet._id,
      title: buffet.title || payment.metadata?.buffetTitle || "Buffet Reservation",
      category: buffet.category || "Buffet",
      buffetType: buffet.buffetType || "regular",
    },
    totals: {
      subtotal: money(payment.subtotal || booking.subtotal),
      discountAmount: money(payment.discountAmount || booking.discountAmount),
      serviceCharge: money(payment.serviceCharge || booking.serviceCharge),
      taxAmount: money(payment.taxAmount || booking.taxAmount),
      grandTotal: money(payment.amount || booking.grandTotal || booking.totalAmount),
      commissionRate: Number(payment.commissionRate || booking.commissionRate || 0),
      commissionAmount: money(payment.commissionAmount || booking.commissionAmount),
      hotelEarning: money(payment.hotelEarning || booking.hotelEarning),
    },
    refund: {
      refundStatus: payment.refundStatus,
      refundAmount: payment.refundAmount,
      refundReason: payment.refundReason,
      refundedAt: payment.refundedAt,
    },
    timeline: payment.paymentTimeline || [],
  };
};

const canAccessPayment = async (req, payment) => {
  if (req.user.role === "admin") return true;
  if (req.user.role === "customer") return String(payment.user?._id || payment.user) === String(req.user.id);
  if (req.user.role === "hotel") {
    const hotel = await Hotel.findOne({ owner: req.user.id });
    return hotel && String(payment.hotel?._id || payment.hotel) === String(hotel._id);
  }
  return false;
};

const addTimeline = (payment, status, note, userId) => {
  payment.paymentTimeline = payment.paymentTimeline || [];
  payment.paymentTimeline.push({ status, note, by: userId || null, at: new Date() });
};

exports.getMyPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id }).populate(paymentPopulate).sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payment history.", error: error.message });
  }
};

exports.getPaymentByBooking = async (req, res) => {
  try {
    const payment = await Payment.findOne({ booking: req.params.bookingId }).populate(paymentPopulate);
    if (!payment) return res.status(404).json({ message: "Payment record not found for this booking." });
    if (!(await canAccessPayment(req, payment))) return res.status(403).json({ message: "Not allowed to view this payment." });
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payment record.", error: error.message });
  }
};

exports.getInvoiceByBooking = async (req, res) => {
  try {
    const payment = await Payment.findOne({ booking: req.params.bookingId }).populate(paymentPopulate);
    if (!payment) return res.status(404).json({ message: "Invoice not found for this booking." });
    if (!(await canAccessPayment(req, payment))) return res.status(403).json({ message: "Not allowed to view this invoice." });
    res.status(200).json(buildInvoicePayload(payment));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch invoice.", error: error.message });
  }
};

exports.getHotelFinance = async (req, res) => {
  try {
    const hotel = req.user.role === "admin" && req.query.hotelId
      ? await Hotel.findById(req.query.hotelId)
      : await Hotel.findOne({ owner: req.user.id });
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const payments = await Payment.find({ hotel: hotel._id }).populate(paymentPopulate).sort({ createdAt: -1 });
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7);
    const startMonth = new Date(now); startMonth.setMonth(now.getMonth() - 1);

    const active = payments.filter((payment) => ["paid", "pending"].includes(payment.status));
    const paid = payments.filter((payment) => payment.status === "paid");

    res.status(200).json({
      hotel: { _id: hotel._id, hotelName: hotel.hotelName },
      summary: {
        totalRevenue: sum(active, "amount"),
        collectedRevenue: sum(paid, "amount"),
        dineForCommission: sum(active, "commissionAmount"),
        hotelEarning: sum(active, "hotelEarning"),
        todayRevenue: sum(active.filter((p) => p.createdAt >= startToday), "amount"),
        weekRevenue: sum(active.filter((p) => p.createdAt >= startWeek), "amount"),
        monthRevenue: sum(active.filter((p) => p.createdAt >= startMonth), "amount"),
        pendingPayments: payments.filter((p) => p.status === "pending").length,
        paidPayments: paid.length,
        refundRequests: payments.filter((p) => p.refundStatus === "requested").length,
        refundedPayments: payments.filter((p) => p.status === "refunded").length,
        transactions: payments.length,
      },
      payments,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hotel finance.", error: error.message });
  }
};

exports.getAdminFinance = async (req, res) => {
  try {
    const period = req.query.period || "month";
    const { start } = getDateRange(period);
    const filter = {};
    if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
    if (req.query.gateway && req.query.gateway !== "all") filter.gateway = req.query.gateway;

    const payments = await Payment.find(filter).populate(paymentPopulate).sort({ createdAt: -1 });
    const periodPayments = payments.filter((payment) => payment.createdAt >= start);
    const activePayments = payments.filter((payment) => ["paid", "pending"].includes(payment.status));
    const periodActivePayments = periodPayments.filter((payment) => ["paid", "pending"].includes(payment.status));
    const bookings = await Booking.countDocuments();

    res.status(200).json({
      summary: {
        totalRevenue: sum(activePayments, "amount"),
        periodRevenue: sum(periodActivePayments, "amount"),
        totalCommission: sum(activePayments, "commissionAmount"),
        periodCommission: sum(periodActivePayments, "commissionAmount"),
        hotelEarnings: sum(activePayments, "hotelEarning"),
        collectedRevenue: sum(payments.filter((p) => p.status === "paid"), "amount"),
        transactions: payments.length,
        bookings,
        pendingPayments: payments.filter((p) => p.status === "pending").length,
        paidPayments: payments.filter((p) => p.status === "paid").length,
        refundRequests: payments.filter((p) => p.refundStatus === "requested").length,
        refunds: payments.filter((p) => p.status === "refunded").length,
      },
      payments: payments.slice(0, 150),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admin finance.", error: error.message });
  }
};

exports.markPayAtHotelPaid = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate(paymentPopulate);
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (!(await canAccessPayment(req, payment))) return res.status(403).json({ message: "Not allowed to update this payment." });
    if (payment.status === "paid") return res.status(400).json({ message: "This payment is already marked as paid." });
    if (!["pay_at_hotel", "cash"].includes(payment.gateway)) return res.status(400).json({ message: "Only pay-at-hotel/cash payments can be manually collected." });

    payment.status = "paid";
    payment.paidAt = new Date();
    payment.collectedAt = payment.paidAt;
    payment.collectedBy = req.user.id;
    payment.settlementStatus = "pending";
    addTimeline(payment, "paid", "Payment collected at hotel.", req.user.id);
    await payment.save();

    await Booking.findByIdAndUpdate(payment.booking?._id || payment.booking, {
      paymentStatus: "paid",
      paidAt: payment.paidAt,
      paymentReference: payment._id,
      $push: { statusTimeline: { status: "payment_paid", note: "Payment collected at hotel.", by: req.user.id, at: new Date() } },
    });

    const updatedPayment = await Payment.findById(payment._id).populate(paymentPopulate);
    res.status(200).json({ message: "Payment marked as paid.", payment: updatedPayment });
  } catch (error) {
    res.status(500).json({ message: "Failed to update payment.", error: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status, note = "" } = req.body;
    const allowed = ["pending", "paid", "failed", "refunded", "cancelled", "expired"];
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid payment status." });

    const payment = await Payment.findById(req.params.id).populate(paymentPopulate);
    if (!payment) return res.status(404).json({ message: "Payment not found." });

    payment.status = status;
    if (status === "paid" && !payment.paidAt) payment.paidAt = new Date();
    if (["cancelled", "expired"].includes(status)) payment.settlementStatus = "cancelled";
    if (status === "refunded") {
      payment.refundStatus = "processed";
      payment.refundedAt = new Date();
      payment.refundAmount = payment.refundAmount || payment.amount;
    }
    addTimeline(payment, status, note || `Payment status changed to ${status}.`, req.user.id);
    await payment.save();

    const bookingPatch = { paymentStatus: status };
    if (status === "paid") bookingPatch.paidAt = payment.paidAt;
    if (status === "refunded") {
      bookingPatch.refundStatus = "processed";
      bookingPatch.refundAmount = payment.refundAmount;
    }
    await Booking.findByIdAndUpdate(payment.booking?._id || payment.booking, bookingPatch);

    const updatedPayment = await Payment.findById(payment._id).populate(paymentPopulate);
    res.status(200).json({ message: "Payment status updated.", payment: updatedPayment });
  } catch (error) {
    res.status(500).json({ message: "Failed to update payment status.", error: error.message });
  }
};

exports.requestRefund = async (req, res) => {
  try {
    const { reason = "", amount } = req.body;
    const payment = await Payment.findById(req.params.id).populate(paymentPopulate);
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (!(await canAccessPayment(req, payment))) return res.status(403).json({ message: "Not allowed to request refund for this payment." });
    if (!["paid", "pending"].includes(payment.status)) return res.status(400).json({ message: "Refund can be requested only for paid or pending payments." });

    payment.refundStatus = "requested";
    payment.refundReason = reason || "Refund requested by user.";
    payment.refundAmount = Math.min(Number(amount || payment.amount || 0), Number(payment.amount || 0));
    addTimeline(payment, "refund_requested", payment.refundReason, req.user.id);
    await payment.save();

    await Booking.findByIdAndUpdate(payment.booking?._id || payment.booking, {
      refundStatus: "requested",
      refundAmount: payment.refundAmount,
      $push: { statusTimeline: { status: "refund_requested", note: payment.refundReason, by: req.user.id, at: new Date() } },
    });

    const updatedPayment = await Payment.findById(payment._id).populate(paymentPopulate);
    res.status(200).json({ message: "Refund request recorded for admin review.", payment: updatedPayment });
  } catch (error) {
    res.status(500).json({ message: "Failed to request refund.", error: error.message });
  }
};

exports.handleRefundAction = async (req, res) => {
  try {
    const { action, note = "" } = req.body;
    const allowed = ["approve", "reject", "process"];
    if (!allowed.includes(action)) return res.status(400).json({ message: "Invalid refund action." });

    const payment = await Payment.findById(req.params.id).populate(paymentPopulate);
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (payment.refundStatus === "none") return res.status(400).json({ message: "No refund request exists for this payment." });

    if (action === "approve") payment.refundStatus = "approved";
    if (action === "reject") payment.refundStatus = "rejected";
    if (action === "process") {
      payment.refundStatus = "processed";
      payment.status = "refunded";
      payment.refundedAt = new Date();
      payment.refundAmount = payment.refundAmount || payment.amount;
      payment.settlementStatus = "cancelled";
    }

    addTimeline(payment, `refund_${action}`, note || `Refund ${action} action completed.`, req.user.id);
    await payment.save();

    await Booking.findByIdAndUpdate(payment.booking?._id || payment.booking, {
      refundStatus: payment.refundStatus,
      refundAmount: payment.refundAmount,
      paymentStatus: payment.status,
      $push: { statusTimeline: { status: `refund_${action}`, note: note || `Refund ${action}.`, by: req.user.id, at: new Date() } },
    });

    const updatedPayment = await Payment.findById(payment._id).populate(paymentPopulate);
    res.status(200).json({ message: `Refund ${action} completed.`, payment: updatedPayment });
  } catch (error) {
    res.status(500).json({ message: "Failed to process refund action.", error: error.message });
  }
};

exports.exportFinanceCsv = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "hotel") {
      const hotel = await Hotel.findOne({ owner: req.user.id });
      if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });
      filter.hotel = hotel._id;
    }
    if (req.query.status && req.query.status !== "all") filter.status = req.query.status;

    const payments = await Payment.find(filter).populate(paymentPopulate).sort({ createdAt: -1 });
    const rows = [["Invoice", "Hotel", "Customer", "Gateway", "Status", "Refund Status", "Subtotal", "Discount", "Service", "Tax", "Total", "Commission", "Hotel Earning", "Created"]];
    payments.forEach((payment) => {
      rows.push([
        payment.invoiceNumber || "",
        payment.hotel?.hotelName || "",
        payment.user?.name || "",
        payment.gateway || "",
        payment.status || "",
        payment.refundStatus || "",
        payment.subtotal || 0,
        payment.discountAmount || 0,
        payment.serviceCharge || 0,
        payment.taxAmount || 0,
        payment.amount || 0,
        payment.commissionAmount || 0,
        payment.hotelEarning || 0,
        payment.createdAt?.toISOString() || "",
      ]);
    });

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=dinefor-finance-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: "Failed to export finance CSV.", error: error.message });
  }
};

// Gateway placeholders prepared for production integration.
exports.payherePlaceholder = (req, res) => res.status(501).json({ message: "PayHere integration is prepared but not enabled yet." });
exports.stripePlaceholder = (req, res) => res.status(501).json({ message: "Stripe integration is prepared but not enabled yet." });
exports.webhookPlaceholder = (req, res) => res.status(501).json({ message: "Payment webhook endpoint prepared for future gateway integration." });

exports.getAllPayments = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required." });
    const filter = {};
    if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
    if (req.query.gateway && req.query.gateway !== "all") filter.gateway = req.query.gateway;
    const payments = await Payment.find(filter).populate(paymentPopulate).sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payments.", error: error.message });
  }
};
