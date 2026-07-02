require("dotenv").config();
const mongoose = require("mongoose");
const Review = require("../models/Review");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const indexes = await Review.collection.indexes();
    const oldUnique = indexes.find((idx) => idx.unique && idx.key?.user === 1 && idx.key?.buffet === 1);

    if (oldUnique) {
      await Review.collection.dropIndex(oldUnique.name);
      console.log(`Dropped old unique review index: ${oldUnique.name}`);
    } else {
      console.log("No old unique review index found. Nothing to drop.");
    }
  } catch (error) {
    console.error("Index cleanup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
