const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");

const paymentPopulate = [
  { path: "booking", populate: { path: "buffet", populate: { path: "hotel" } } },
  { path: "user", select: "name email role" },
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

exports.getMyPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id }).populate(paymentPopulate).sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payment history.", error: error.message });
  }
};

exports.getHotelFinance = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.user.id });
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const payments = await Payment.find({ hotel: hotel._id }).populate(paymentPopulate).sort({ createdAt: -1 });
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7);
    const startMonth = new Date(now); startMonth.setMonth(now.getMonth() - 1);

    const sum = (items, field = "amount") => items.reduce((total, item) => total + Number(item[field] || 0), 0);
    const completed = payments.filter((payment) => ["paid", "pending"].includes(payment.status));

    res.status(200).json({
      hotel: { _id: hotel._id, hotelName: hotel.hotelName },
      summary: {
        totalRevenue: sum(completed, "amount"),
        dineForCommission: sum(completed, "commissionAmount"),
        hotelEarning: sum(completed, "hotelEarning"),
        todayRevenue: sum(completed.filter((p) => p.createdAt >= startToday), "amount"),
        weekRevenue: sum(completed.filter((p) => p.createdAt >= startWeek), "amount"),
        monthRevenue: sum(completed.filter((p) => p.createdAt >= startMonth), "amount"),
        pendingPayments: payments.filter((p) => p.status === "pending").length,
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

    let payments = await Payment.find().populate(paymentPopulate).sort({ createdAt: -1 });
    const statusFilter = req.query.status || "all";
    if (statusFilter !== "all") payments = payments.filter((payment) => payment.status === statusFilter || payment.refundStatus === statusFilter);
    const periodPayments = payments.filter((payment) => payment.createdAt >= start);
    const activePayments = payments.filter((payment) => ["paid", "pending"].includes(payment.status));
    const periodActivePayments = periodPayments.filter((payment) => ["paid", "pending"].includes(payment.status));
    const sum = (items, field = "amount") => items.reduce((total, item) => total + Number(item[field] || 0), 0);

    const bookings = await Booking.countDocuments();

    res.status(200).json({
      summary: {
        totalRevenue: sum(activePayments, "amount"),
        periodRevenue: sum(periodActivePayments, "amount"),
        totalCommission: sum(activePayments, "commissionAmount"),
        periodCommission: sum(periodActivePayments, "commissionAmount"),
        hotelEarnings: sum(activePayments, "hotelEarning"),
        transactions: payments.length,
        bookings,
        pendingPayments: payments.filter((p) => p.status === "pending").length,
        refunds: payments.filter((p) => p.status === "refunded").length,
        refundRequests: payments.filter((p) => p.refundStatus === "requested").length,
        collectedRevenue: sum(payments.filter((p) => p.status === "paid"), "amount"),
      },
      payments: payments.slice(0, 100),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admin finance.", error: error.message });
  }
};

exports.markPayAtHotelPaid = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate(paymentPopulate);
    if (!payment) return res.status(404).json({ message: "Payment not found." });

    if (req.user.role === "hotel") {
      const hotel = await Hotel.findOne({ owner: req.user.id });
      if (!hotel || String(payment.hotel?._id || payment.hotel) !== String(hotel._id)) {
        return res.status(403).json({ message: "Not allowed to update this payment." });
      }
    }

    payment.status = "paid";
    payment.paidAt = new Date();
    await payment.save();

    await Booking.findByIdAndUpdate(payment.booking?._id || payment.booking, {
      paymentStatus: "paid",
      paidAt: payment.paidAt,
      paymentReference: payment._id,
    });

    const updatedPayment = await Payment.findById(payment._id).populate(paymentPopulate);
    res.status(200).json({ message: "Payment marked as paid.", payment: updatedPayment });
  } catch (error) {
    res.status(500).json({ message: "Failed to update payment.", error: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const allowed = ["pending", "paid", "failed", "refunded", "cancelled", "expired"];
    const { status, note } = req.body;
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid payment status." });

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found." });

    payment.status = status;
    if (status === "paid") payment.paidAt = payment.paidAt || new Date();
    payment.metadata = { ...(payment.metadata || {}), adminNote: note || "", updatedBy: req.user.id };
    await payment.save();

    await Booking.findByIdAndUpdate(payment.booking, {
      paymentStatus: status === "paid" ? "paid" : status === "refunded" ? "refunded" : "unpaid",
      paidAt: payment.paidAt || null,
      paymentReference: payment._id,
    });

    res.status(200).json({ message: "Payment status updated.", payment });
  } catch (error) {
    res.status(500).json({ message: "Failed to update payment status.", error: error.message });
  }
};

exports.handleRefundAction = async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!["approve", "reject", "process"].includes(action)) return res.status(400).json({ message: "Invalid refund action." });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found." });

    const next = action === "approve" ? "approved" : action === "reject" ? "rejected" : "processed";
    payment.refundStatus = next;
    if (action === "process") payment.status = "refunded";
    payment.metadata = { ...(payment.metadata || {}), refundNote: note || "", refundActionBy: req.user.id };
    await payment.save();
    res.status(200).json({ message: `Refund ${next}.`, payment });
  } catch (error) {
    res.status(500).json({ message: "Refund action failed.", error: error.message });
  }
};

exports.exportPaymentsCsv = async (req, res) => {
  try {
    const query = req.query.status && req.query.status !== "all" ? { status: req.query.status } : {};
    const payments = await Payment.find(query).populate(paymentPopulate).sort({ createdAt: -1 });
    const esc = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [["Invoice", "Date", "Hotel", "Customer", "Gateway", "Status", "Amount", "Commission", "Hotel Earning"]];
    payments.forEach((p) => rows.push([p.invoiceNumber, p.createdAt?.toISOString(), p.hotel?.hotelName, p.user?.name, p.gateway, p.status, p.amount, p.commissionAmount, p.hotelEarning]));
    const csv = rows.map((row) => row.map(esc).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=dinefor-payments-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: "CSV export failed.", error: error.message });
  }
};
