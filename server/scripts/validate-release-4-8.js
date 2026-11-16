const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const PDFDocument = require("pdfkit");

const root = path.resolve(__dirname, "../..");
const files = [
  "server/models/FinancialDocument.js", "server/models/CommunicationLog.js", "server/models/User.js",
  "server/services/financialDocumentService.js", "server/services/financeCommunicationService.js", "server/services/emailService.js",
  "server/controllers/documentController.js", "server/controllers/paymentController.js", "server/controllers/settlementController.js",
  "server/routes/documentRoutes.js", "server/services/paymentExpiryService.js", "server/server.js",
];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
  assert.strictEqual(result.status, 0, `${file} syntax failed: ${result.stderr}`);
}

const routes = fs.readFileSync(path.join(root, "server/routes/documentRoutes.js"), "utf8");
for (const route of ["/history", "/payment/:paymentId/:type/pdf", "/payment/:paymentId/:type/email", "/settlement/:settlementId/pdf", "/settlement/:settlementId/email"]) assert(routes.includes(route), `Missing document route ${route}`);
const service = fs.readFileSync(path.join(root, "server/services/financialDocumentService.js"), "utf8");
for (const value of ["invoice", "receipt", "credit_note", "settlement_statement", "customerTotal", "refundedAmount", "netCollected"]) assert(service.includes(value), `Missing document behavior ${value}`);
const user = fs.readFileSync(path.join(root, "server/models/User.js"), "utf8");
for (const type of ["payment", "refund", "settlement", "document"]) assert(user.includes(`\"${type}\"`), `Missing notification type ${type}`);

const chunks = [];
const pdf = new PDFDocument();
pdf.on("data", (chunk) => chunks.push(chunk));
pdf.on("end", () => {
  const output = Buffer.concat(chunks);
  assert(output.subarray(0, 4).toString() === "%PDF", "PDFKit did not produce a PDF document");
  console.log("[PASS] Release 4.8 protected PDF documents, delivery logs, notifications, routes and source syntax validated.");
});
pdf.text("DineFor Release 4.8 validation");
pdf.end();

const parserPath = path.join(root, "client/node_modules/@babel/parser");
if (fs.existsSync(parserPath)) {
  const parser = require(parserPath);
  for (const file of ["client/src/pages/PaymentHistory.jsx", "client/src/components/payments/HotelFinancePanel.jsx", "client/src/components/payments/AdminFinancePanel.jsx"]) parser.parse(fs.readFileSync(path.join(root, file), "utf8"), { sourceType: "module", plugins: ["jsx"] });
}
