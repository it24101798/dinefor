const crypto = require("crypto");

const md5Upper = (value) => crypto.createHash("md5").update(String(value)).digest("hex").toUpperCase();
const money = (value) => Number(value || 0).toFixed(2);

const isConfigured = () => Boolean(process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET);
const isSandbox = () => String(process.env.PAYHERE_SANDBOX || "true").toLowerCase() !== "false";

const checkoutUrl = () => isSandbox()
  ? "https://sandbox.payhere.lk/pay/checkout"
  : "https://www.payhere.lk/pay/checkout";

const createCheckout = ({ payment, user }) => {
  if (!isConfigured()) {
    const error = new Error("PayHere is not configured. Add merchant credentials before enabling online payments.");
    error.code = "GATEWAY_NOT_CONFIGURED";
    throw error;
  }

  const amount = money(payment.amountDueNow);
  const currency = payment.currency || "LKR";
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const merchantSecretHash = md5Upper(process.env.PAYHERE_MERCHANT_SECRET);
  const hash = md5Upper(`${merchantId}${payment.gatewayOrderId}${amount}${currency}${merchantSecretHash}`);
  const names = String(user?.name || "DineFor Customer").trim().split(/\s+/);

  return {
    gateway: "payhere",
    redirectUrl: checkoutUrl(),
    expiresAt: payment.expiresAt,
    formFields: {
      merchant_id: merchantId,
      return_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/payment/return?order_id=${encodeURIComponent(payment.gatewayOrderId)}&payment=${payment._id}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/payment/cancel?order_id=${encodeURIComponent(payment.gatewayOrderId)}&payment=${payment._id}`,
      notify_url: `${process.env.PUBLIC_API_URL || "http://localhost:5000"}/api/payments/payhere/notify`,
      order_id: payment.gatewayOrderId,
      items: payment.metadata?.buffetTitle || "DineFor buffet reservation",
      currency,
      amount,
      first_name: names[0] || "DineFor",
      last_name: names.slice(1).join(" ") || "Customer",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "Not provided",
      city: user?.city || "Colombo",
      country: "Sri Lanka",
      custom_1: String(payment._id),
      custom_2: payment.paymentMode,
      hash,
    },
  };
};

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || "").toUpperCase());
  const b = Buffer.from(String(right || "").toUpperCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const verifyNotification = ({ payload, payment }) => {
  if (!isConfigured()) return { valid: false, reason: "PayHere is not configured." };

  const expectedMerchant = process.env.PAYHERE_MERCHANT_ID;
  const expectedAmount = money(payment.amountDueNow);
  const expectedCurrency = String(payment.currency || "LKR").toUpperCase();
  const merchantSecretHash = md5Upper(process.env.PAYHERE_MERCHANT_SECRET);
  const expectedSignature = md5Upper(
    `${payload.merchant_id}${payload.order_id}${payload.payhere_amount}${payload.payhere_currency}${payload.status_code}${merchantSecretHash}`
  );

  if (String(payload.merchant_id) !== String(expectedMerchant)) return { valid: false, reason: "Merchant mismatch." };
  if (String(payload.order_id) !== String(payment.gatewayOrderId)) return { valid: false, reason: "Order mismatch." };
  if (money(payload.payhere_amount) !== expectedAmount) return { valid: false, reason: "Amount mismatch." };
  if (String(payload.payhere_currency || "").toUpperCase() !== expectedCurrency) return { valid: false, reason: "Currency mismatch." };
  if (!safeEqual(payload.md5sig, expectedSignature)) return { valid: false, reason: "Signature mismatch." };

  return {
    valid: true,
    successful: String(payload.status_code) === "2",
    statusCode: String(payload.status_code),
    gatewayReference: String(payload.payment_id || ""),
    method: String(payload.method || ""),
    statusMessage: String(payload.status_message || ""),
  };
};

const refund = async ({ payment, amount, reason }) => {
  if (!process.env.PAYHERE_APP_ID || !process.env.PAYHERE_APP_SECRET) {
    const error = new Error("PayHere Refund API credentials are not configured.");
    error.code = "REFUND_NOT_CONFIGURED";
    throw error;
  }
  if (!payment.gatewayReference) throw new Error("The original PayHere payment reference is missing.");

  const base = isSandbox() ? "https://sandbox.payhere.lk" : "https://www.payhere.lk";
  const basic = Buffer.from(`${process.env.PAYHERE_APP_ID}:${process.env.PAYHERE_APP_SECRET}`).toString("base64");
  const tokenResponse = await fetch(`${base}/merchant/v1/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok || !token.access_token) throw new Error("PayHere refund authorization failed.");

  const refundResponse = await fetch(`${base}/merchant/v1/payment/refund`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ payment_id: payment.gatewayReference, amount: money(amount), description: reason }),
  });
  const result = await refundResponse.json();
  if (!refundResponse.ok || Number(result.status) !== 1) throw new Error(result.msg || "PayHere refund failed.");
  return { reference: String(result.data || ""), rawStatus: Number(result.status), message: result.msg || "Refund processed." };
};

module.exports = { name: "payhere", isConfigured, createCheckout, verifyNotification, refund };
