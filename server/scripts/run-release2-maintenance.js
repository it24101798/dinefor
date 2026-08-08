require("dotenv").config();
const mongoose = require("mongoose");
const {
  runRelease2Maintenance,
} = require("../services/maintenanceService");

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const result = await runRelease2Maintenance();
  console.log("Release 2 maintenance completed:", result);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Release 2 maintenance failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
