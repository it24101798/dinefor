const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const { roundMoney } = require("../utils/pricing");

dotenv.config();

(async () => {
  try {
    await connectDB();
    const payments = await Payment.find({ $or: [{ customerTotal: { $exists: false } }, { customerTotal: 0 }] });
    let migrated = 0;
    for (const payment of payments) {
      const customerTotal = roundMoney(payment.amount);
      const legacyPaid = payment.status === "paid" ? customerTotal : 0;
      payment.paymentMode = "pay_at_hotel";
      payment.customerTotal = customerTotal;
      payment.amountDueNow = 0;
      payment.amountDueAtHotel = payment.status === "paid" ? 0 : customerTotal;
      payment.paidAmount = legacyPaid;
      payment.gatewayFee = 0;
      payment.dineForCommission = roundMoney(payment.commissionAmount);
      payment.hotelPayable = roundMoney(payment.hotelEarning);
      payment.refundedAmount = roundMoney(payment.status === "refunded" ? customerTotal : 0);
      payment.netCollected = roundMoney(legacyPaid - payment.refundedAmount);
      payment.gatewayOrderId = payment.invoiceNumber;
      payment.gatewayStatus = payment.status === "paid" ? "legacy_paid" : "pay_at_hotel";
      // eslint-disable-next-line no-await-in-loop
      await payment.save();
      // eslint-disable-next-line no-await-in-loop
      await Booking.findByIdAndUpdate(payment.booking, { paymentMode: "pay_at_hotel", paymentExpiresAt: null });
      migrated += 1;
    }
    console.log(`Release 4.5 payment migration complete. Updated ${migrated} record(s).`);
    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
    await mongoose.connection.close().catch(() => {});
    process.exitCode = 1;
  }
})();
