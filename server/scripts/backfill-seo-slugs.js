require("dotenv").config();
const mongoose = require("mongoose");
const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const { buildDocumentSlug } = require("../utils/seoSlug");

async function run() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured.");
  await mongoose.connect(process.env.MONGO_URI);

  const hotels = await Hotel.find({ $or: [{ slug: { $exists: false } }, { slug: "" }] });
  for (const hotel of hotels) {
    hotel.slug = buildDocumentSlug(hotel.hotelName, hotel._id);
    await hotel.save();
  }

  const buffets = await Buffet.find({ $or: [{ slug: { $exists: false } }, { slug: "" }] });
  for (const buffet of buffets) {
    buffet.slug = buildDocumentSlug(buffet.title, buffet._id);
    await buffet.save();
  }

  console.log(`SEO slug backfill complete. Hotels: ${hotels.length}, Buffets: ${buffets.length}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("SEO slug backfill failed:", error);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
