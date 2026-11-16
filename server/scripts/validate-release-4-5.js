const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { calculatePaymentBreakdown } = require("../utils/pricing");

const root = path.resolve(__dirname, "../..");
const serverFiles = [
  "server/models/Payment.js",
  "server/models/PaymentTransaction.js",
  "server/models/Booking.js",
  "server/controllers/paymentController.js",
  "server/controllers/bookingController.js",
  "server/routes/paymentRoutes.js",
  "server/services/paymentGateway/payhereGateway.js",
  "server/services/paymentExpiryService.js",
  "server/services/seatReleaseService.js",
];

for (const file of serverFiles) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
  assert.strictEqual(result.status, 0, `${file} syntax failed: ${result.stderr}`);
}

const routeSource = fs.readFileSync(path.join(root, "server/routes/paymentRoutes.js"), "utf8");
for (const route of ["/options", "/payhere/notify", "/:id/initiate", "/:id/refund-request", "/:id/collect-balance", "/invoice/:bookingId"]) {
  assert(routeSource.includes(route), `Missing route ${route}`);
}

process.env.DINEFOR_DEPOSIT_RATE = "20";
process.env.PAYHERE_GATEWAY_FEE_RATE = "3";
const totals = { grandTotal: 10000, commissionAmount: 500 };
const deposit = calculatePaymentBreakdown({ totals, paymentMode: "deposit", gateway: "payhere" });
assert.deepStrictEqual(
  { dueNow: deposit.amountDueNow, atHotel: deposit.amountDueAtHotel, fee: deposit.gatewayFee, commission: deposit.dineForCommission, payable: deposit.hotelPayable },
  { dueNow: 2000, atHotel: 8000, fee: 60, commission: 500, payable: 9500 }
);

process.env.PAYHERE_MERCHANT_ID = "TEST_MERCHANT";
process.env.PAYHERE_MERCHANT_SECRET = "TEST_SECRET";
const payhere = require("../services/paymentGateway/payhereGateway");
const payment = { _id: "payment-id", amountDueNow: 2000, currency: "LKR", gatewayOrderId: "DF-TEST-1", paymentMode: "deposit", metadata: {} };
const secretHash = crypto.createHash("md5").update("TEST_SECRET").digest("hex").toUpperCase();
const payload = { merchant_id: "TEST_MERCHANT", order_id: "DF-TEST-1", payhere_amount: "2000.00", payhere_currency: "LKR", status_code: "2", payment_id: "PH-1" };
payload.md5sig = crypto.createHash("md5").update(`${payload.merchant_id}${payload.order_id}${payload.payhere_amount}${payload.payhere_currency}${payload.status_code}${secretHash}`).digest("hex").toUpperCase();
assert.strictEqual(payhere.verifyNotification({ payload, payment }).valid, true, "Valid PayHere callback rejected");
assert.strictEqual(payhere.verifyNotification({ payload: { ...payload, payhere_amount: "1.00" }, payment }).valid, false, "Tampered PayHere callback accepted");

const parserPath = path.join(root, "client/node_modules/@babel/parser");
if (fs.existsSync(parserPath)) {
  const parser = require(parserPath);
  for (const file of ["client/src/pages/BookingSummary.jsx", "client/src/pages/PaymentHistory.jsx", "client/src/components/payments/PaymentMethodSelector.jsx", "client/src/components/payments/HotelFinancePanel.jsx", "client/src/components/payments/AdminFinancePanel.jsx"]) {
    parser.parse(fs.readFileSync(path.join(root, file), "utf8"), { sourceType: "module", plugins: ["jsx"] });
  }
}

console.log("[PASS] Release 4.5 payment calculations, routes, callback verification and source syntax validated.");
