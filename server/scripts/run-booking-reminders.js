require("dotenv").config();
const mongoose = require("mongoose");
const { processBookingReminders } = require("../services/bookingReminderService");

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const result = await processBookingReminders();
  console.log("Booking reminder run completed:", result);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Booking reminder run failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
