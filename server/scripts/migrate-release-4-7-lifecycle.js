const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Hotel = require("../models/Hotel");
const Booking = require("../models/Booking");
const { DEFAULT_CANCELLATION_POLICY } = require("../services/cancellationPolicyService");

dotenv.config();

(async () => {
  try {
    await connectDB();
    const now = new Date();
    const hotelResult = await Hotel.updateMany(
      { "cancellationPolicy.freeCancellationHours": { $exists: false } },
      { $set: { cancellationPolicy: { ...DEFAULT_CANCELLATION_POLICY, updatedAt: now } } }
    );
    const bookingResult = await Booking.updateMany(
      { cancellationReason: { $exists: false } },
      { $set: { cancellationReason: "", cancellationRequest: null, noShowMarkedAt: null, noShowMarkedBy: null, rescheduleHistory: [] } }
    );
    console.log(`Release 4.7 migration complete. Hotels: ${hotelResult.modifiedCount}; bookings: ${bookingResult.modifiedCount}.`);
    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
    await mongoose.connection.close().catch(() => {});
    process.exitCode = 1;
  }
})();
