const dotenv = require("dotenv");
const mongoose = require("mongoose");

const Hotel = require("../models/Hotel");
const Buffet = require("../models/Buffet");
const SiteSetting = require("../models/SiteSetting");

dotenv.config();

const PUBLIC_API_URL = (
  process.env.PUBLIC_API_URL || "https://api.dinefor.com"
).replace(/\/+$/, "");

const OLD_PREFIXES = [
  "http://localhost:5000/uploads/",
  "https://localhost:5000/uploads/",
  "http://127.0.0.1:5000/uploads/",
  "https://127.0.0.1:5000/uploads/",
];

const NEW_PREFIX = `${PUBLIC_API_URL}/uploads/`;

function replaceUrl(value) {
  if (typeof value !== "string") return value;

  for (const prefix of OLD_PREFIXES) {
    if (value.startsWith(prefix)) {
      return NEW_PREFIX + value.slice(prefix.length);
    }
  }

  return value;
}

function replaceArray(values) {
  if (!Array.isArray(values)) return values;
  return values.map((value) => replaceUrl(value));
}

function replaceMediaItems(items) {
  if (!Array.isArray(items)) return items;

  return items.map((item) => ({
    ...item,
    url: replaceUrl(item?.url),
    posterUrl: replaceUrl(item?.posterUrl),
  }));
}

async function migrateHotels() {
  const hotels = await Hotel.find({}).lean();
  let updated = 0;

  for (const hotel of hotels) {
    const update = {
      logo: replaceUrl(hotel.logo),
      images: replaceArray(hotel.images),
      galleryImages: replaceArray(hotel.galleryImages),
      coverMediaUrl: replaceUrl(hotel.coverMediaUrl),
      videos: replaceArray(hotel.videos),
    };

    if (hotel.application?.documents) {
      update["application.documents"] = hotel.application.documents.map(
        (document) => ({
          ...document,
          url: replaceUrl(document?.url),
          fileUrl: replaceUrl(document?.fileUrl),
        })
      );
    }

    const changed =
      JSON.stringify(update.logo) !== JSON.stringify(hotel.logo) ||
      JSON.stringify(update.images) !== JSON.stringify(hotel.images) ||
      JSON.stringify(update.galleryImages) !==
        JSON.stringify(hotel.galleryImages) ||
      JSON.stringify(update.coverMediaUrl) !==
        JSON.stringify(hotel.coverMediaUrl) ||
      JSON.stringify(update.videos) !== JSON.stringify(hotel.videos) ||
      JSON.stringify(update["application.documents"]) !==
        JSON.stringify(hotel.application?.documents);

    if (changed) {
      await Hotel.updateOne({ _id: hotel._id }, { $set: update });
      updated += 1;
    }
  }

  return updated;
}

async function migrateBuffets() {
  const buffets = await Buffet.find({}).lean();
  let updated = 0;

  for (const buffet of buffets) {
    const update = {
      thumbnail: replaceUrl(buffet.thumbnail),
      images: replaceArray(buffet.images),
      videos: replaceArray(buffet.videos),
    };

    const changed =
      JSON.stringify(update.thumbnail) !== JSON.stringify(buffet.thumbnail) ||
      JSON.stringify(update.images) !== JSON.stringify(buffet.images) ||
      JSON.stringify(update.videos) !== JSON.stringify(buffet.videos);

    if (changed) {
      await Buffet.updateOne({ _id: buffet._id }, { $set: update });
      updated += 1;
    }
  }

  return updated;
}

async function migrateSiteSettings() {
  const settings = await SiteSetting.find({}).lean();
  let updated = 0;

  for (const setting of settings) {
    const update = {
      heroMediaUrl: replaceUrl(setting.heroMediaUrl),
      fallbackHeroImage: replaceUrl(setting.fallbackHeroImage),
      heroMediaItems: replaceMediaItems(setting.heroMediaItems),
    };

    const changed =
      JSON.stringify(update.heroMediaUrl) !==
        JSON.stringify(setting.heroMediaUrl) ||
      JSON.stringify(update.fallbackHeroImage) !==
        JSON.stringify(setting.fallbackHeroImage) ||
      JSON.stringify(update.heroMediaItems) !==
        JSON.stringify(setting.heroMediaItems);

    if (changed) {
      await SiteSetting.updateOne({ _id: setting._id }, { $set: update });
      updated += 1;
    }
  }

  return updated;
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  console.log(`Using public media base: ${NEW_PREFIX}`);

  await mongoose.connect(process.env.MONGO_URI);

  const hotelsUpdated = await migrateHotels();
  const buffetsUpdated = await migrateBuffets();
  const siteSettingsUpdated = await migrateSiteSettings();

  console.log("Media migration completed.");
  console.log(`Hotels updated: ${hotelsUpdated}`);
  console.log(`Buffets updated: ${buffetsUpdated}`);
  console.log(`Site settings updated: ${siteSettingsUpdated}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Media migration failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
