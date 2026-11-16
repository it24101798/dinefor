const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { calculatePaymentBreakdown } = require("../utils/pricing");
const { calculateSettlement } = require("../services/settlementService");

const root = path.resolve(__dirname, "../..");
const serverFiles = ["server/models/Hotel.js", "server/models/Payment.js", "server/models/PaymentTransaction.js", "server/models/SettlementBatch.js", "server/controllers/hotelController.js", "server/controllers/bookingController.js", "server/controllers/paymentController.js", "server/controllers/settlementController.js", "server/routes/settlementRoutes.js", "server/services/settlementService.js", "server/server.js"];
for (const file of serverFiles) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
  assert.strictEqual(result.status, 0, `${file} syntax failed: ${result.stderr}`);
}

const routes = fs.readFileSync(path.join(root, "server/routes/settlementRoutes.js"), "utf8");
for (const route of ["/hotel", "/admin", "/admin/preview", "/admin/:id/status"]) assert(routes.includes(route), `Missing settlement route ${route}`);

const deposit = calculatePaymentBreakdown({ totals: { grandTotal: 10000, commissionAmount: 500 }, paymentMode: "deposit", gateway: "payhere", depositRate: 25 });
assert.strictEqual(deposit.amountDueNow, 2500);
assert.strictEqual(deposit.amountDueAtHotel, 7500);

const payment = { _id: "payment-1", commissionRate: 5, gatewayFee: 60, gateway: "payhere" };
const settlement = calculateSettlement([
  { payment, type: "payment", direction: "credit", amount: 2000, metadata: { source: "gateway", gatewayFee: 60 } },
  { payment, type: "manual_collection", direction: "credit", amount: 8000, metadata: { source: "manual" } },
]);
assert.deepStrictEqual(
  { gross: settlement.grossRecognized, gateway: settlement.gatewayCollected, hotel: settlement.hotelCollected, fee: settlement.gatewayFees, commission: settlement.commissionDue, net: settlement.netAmount, direction: settlement.direction },
  { gross: 10000, gateway: 2000, hotel: 8000, fee: 60, commission: 500, net: 1440, direction: "payable_to_hotel" }
);
const hotelCash = calculateSettlement([{ payment: { _id: "payment-2", commissionRate: 5, gateway: "pay_at_hotel" }, type: "manual_collection", direction: "credit", amount: 5000, metadata: { source: "manual" } }]);
assert.strictEqual(hotelCash.direction, "receivable_from_hotel");
assert.strictEqual(hotelCash.netAmount, 250);

const parserPath = path.join(root, "client/node_modules/@babel/parser");
if (fs.existsSync(parserPath)) {
  const parser = require(parserPath);
  for (const file of ["client/src/components/hotel/HotelOperationsPanels.jsx", "client/src/components/payments/PaymentMethodSelector.jsx", "client/src/pages/BookingSummary.jsx", "client/src/pages/PaymentHistory.jsx", "client/src/components/payments/HotelFinancePanel.jsx", "client/src/components/payments/AdminFinancePanel.jsx"]) parser.parse(fs.readFileSync(path.join(root, file), "utf8"), { sourceType: "module", plugins: ["jsx"] });
}

console.log("[PASS] Release 4.6 payment policy, reconciliation, settlement calculations, routes and source syntax validated.");
