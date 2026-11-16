const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { expirePendingPayments } = require("../services/paymentExpiryService");

dotenv.config();

(async () => {
  try {
    await connectDB();
    const result = await expirePendingPayments({ limit: 500 });
    console.log(JSON.stringify(result, null, 2));
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
})();
