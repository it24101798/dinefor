const Coupon = require("../models/Coupon");
const { calculateTotals } = require("../utils/pricing");

const validateCouponData = async ({ code, subtotal }) => {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return { valid: false, message: "Coupon code is required." };

  const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true });
  if (!coupon) return { valid: false, message: "Invalid or inactive coupon code." };

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) return { valid: false, message: "This coupon is not active yet." };
  if (coupon.endDate && now > coupon.endDate) return { valid: false, message: "This coupon has expired." };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { valid: false, message: "This coupon usage limit has been reached." };
  if (coupon.minimumSpend && Number(subtotal || 0) < coupon.minimumSpend) {
    return { valid: false, message: `Minimum spend for this coupon is Rs. ${coupon.minimumSpend}.` };
  }

  return { valid: true, coupon };
};

exports.validateCoupon = async (req, res) => {
  try {
    const { code, price, seats } = req.body;
    const subtotal = Number(price || 0) * Number(seats || 1);
    const result = await validateCouponData({ code, subtotal });

    if (!result.valid) return res.status(400).json({ message: result.message });

    const totals = calculateTotals({ price, seats, coupon: result.coupon });

    res.status(200).json({
      message: "Coupon applied successfully.",
      coupon: {
        code: result.coupon.code,
        type: result.coupon.type,
        value: result.coupon.value,
        title: result.coupon.title,
      },
      totals,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to validate coupon.", error: error.message });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ message: "Coupon created successfully.", coupon });
  } catch (error) {
    res.status(500).json({ message: "Failed to create coupon.", error: error.message });
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch coupons.", error: error.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });
    res.status(200).json({ message: "Coupon updated successfully.", coupon });
  } catch (error) {
    res.status(500).json({ message: "Failed to update coupon.", error: error.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });
    res.status(200).json({ message: "Coupon deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete coupon.", error: error.message });
  }
};
