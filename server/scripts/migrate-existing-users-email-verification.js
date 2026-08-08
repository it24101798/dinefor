require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const migrationStartedAt = new Date();

  const result = await User.updateMany(
    {
      createdAt: { $lte: migrationStartedAt },
      $or: [
        { role: "admin" },
        { authProvider: "google" },
        { isEmailVerified: { $ne: true } },
      ],
    },
    {
      $set: {
        isEmailVerified: true,
        emailVerifiedAt: migrationStartedAt,
      },
      $unset: {
        emailVerificationToken: "",
        emailVerificationExpires: "",
      },
    }
  );

  console.log("Legacy verification migration completed.");
  console.log(`Matched: ${result.matchedCount}`);
  console.log(`Updated: ${result.modifiedCount}`);
  console.log(
    "All accounts existing at migration time are treated as verified. New local registrations still require verification."
  );

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Migration failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
