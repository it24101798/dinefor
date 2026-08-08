require("dotenv").config();
const mongoose = require("mongoose");
const Review = require("../models/Review");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const collection = Review.collection;
  const indexes = await collection.indexes();

  for (const index of indexes) {
    const keys = Object.keys(index.key || {});
    const isLegacyUnique =
      index.unique === true &&
      keys.includes("user") &&
      keys.includes("buffet") &&
      !keys.includes("booking");

    if (isLegacyUnique) {
      console.log(`Dropping legacy review index: ${index.name}`);
      await collection.dropIndex(index.name);
    }
  }

  const duplicateBookings = await Review.aggregate([
    {
      $match: {
        booking: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$booking",
        ids: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ]);

  if (duplicateBookings.length) {
    console.log(
      "Duplicate booking reviews detected. The unique booking index was not created."
    );
    console.log(
      duplicateBookings.map((item) => ({
        booking: item._id,
        count: item.count,
      }))
    );
  } else {
    await collection.createIndex(
      { booking: 1 },
      {
        unique: true,
        sparse: true,
        name: "booking_1_unique",
      }
    );
    console.log("Created unique booking review index.");
  }

  await mongoose.disconnect();
  console.log("Review index migration completed.");
}

run().catch(async (error) => {
  console.error("Review migration failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
