const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Hotel = require("../models/Hotel");
const Payment = require("../models/Payment");

dotenv.config();

(async () => {
  try {
    await connectDB();
    const hotelResult = await Hotel.updateMany(
      { "paymentPolicy.acceptedModes": { $exists: false } },
      { $set: { paymentPolicy: { acceptedModes: ["pay_at_hotel"], depositRate: 20, paymentExpiryMinutes: 15, settlementFrequency: "weekly", updatedAt: new Date() } } }
    );
    const paymentResult = await Payment.updateMany(
      { settlementStatus: { $exists: false } },
      { $set: { settlementStatus: "unsettled", settlement: null } }
    );
    console.log(`Release 4.6 migration complete. Hotels: ${hotelResult.modifiedCount}; payments: ${paymentResult.modifiedCount}.`);
    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
    await mongoose.connection.close().catch(() => {});
    process.exitCode = 1;
  }
})();
