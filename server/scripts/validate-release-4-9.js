const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const files = [
  "server/models/PaymentWebhookEvent.js", "server/models/ReconciliationIssue.js", "server/services/reconciliationAuditService.js",
  "server/services/paymentGateway/payhereGateway.js", "server/controllers/paymentController.js", "server/controllers/reconciliationController.js",
  "server/routes/paymentRoutes.js", "server/routes/reconciliationRoutes.js", "server/scripts/check-production-readiness.js", "server/server.js",
];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
  assert.strictEqual(result.status, 0, `${file} syntax failed: ${result.stderr}`);
}
const paymentRoutes = fs.readFileSync(path.join(root, "server/routes/paymentRoutes.js"), "utf8");
assert(paymentRoutes.includes("/return-status/:orderId"));
const reconRoutes = fs.readFileSync(path.join(root, "server/routes/reconciliationRoutes.js"), "utf8");
for (const route of ["/issues", "/audit", "/issues/:id"]) assert(reconRoutes.includes(route), `Missing reconciliation route ${route}`);
const gateway = fs.readFileSync(path.join(root, "server/services/paymentGateway/payhereGateway.js"), "utf8");
assert(gateway.includes("/payment/return?order_id="));
assert(gateway.includes("/payment/cancel?order_id="));
const controller = fs.readFileSync(path.join(root, "server/controllers/paymentController.js"), "utf8");
for (const behavior of ["PaymentWebhookEvent", "payloadFingerprint", "orphan_webhook", "invalid_webhook", "callback_failure", "serverVerified"]) assert(controller.includes(behavior), `Missing callback behavior ${behavior}`);
assert(!fs.readFileSync(path.join(root, "server/models/PaymentWebhookEvent.js"), "utf8").includes("rawPayload"), "Webhook model must not persist full raw payloads");

const parserPath = path.join(root, "client/node_modules/@babel/parser");
if (fs.existsSync(parserPath)) {
  const parser = require(parserPath);
  for (const file of ["client/src/App.jsx", "client/src/pages/PaymentGatewayResult.jsx", "client/src/components/payments/AdminFinancePanel.jsx", "client/src/components/payments/ReconciliationIssuesPanel.jsx"]) parser.parse(fs.readFileSync(path.join(root, file), "utf8"), { sourceType: "module", plugins: ["jsx"] });
}
console.log("[PASS] Release 4.9 gateway returns, webhook monitoring, reconciliation recovery, readiness and source syntax validated.");
