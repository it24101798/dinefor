const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const FinancialDocument = require("../models/FinancialDocument");
const CommunicationLog = require("../models/CommunicationLog");

dotenv.config();
(async () => {
  try {
    await connectDB();
    await FinancialDocument.syncIndexes();
    await CommunicationLog.syncIndexes();
    console.log("Release 4.8 document and communication indexes are ready. Documents are issued lazily on first download/email.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally { await mongoose.connection.close().catch(() => {}); }
})();
