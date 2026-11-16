const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const PaymentWebhookEvent = require("../models/PaymentWebhookEvent");
const ReconciliationIssue = require("../models/ReconciliationIssue");

dotenv.config();
(async () => {
  try {
    await connectDB();
    await PaymentWebhookEvent.syncIndexes();
    await ReconciliationIssue.syncIndexes();
    console.log("Release 4.9 webhook monitoring and reconciliation indexes are ready.");
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { await mongoose.connection.close().catch(() => {}); }
})();
