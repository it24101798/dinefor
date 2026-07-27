const dotenv = require("dotenv");
const mongoose = require("mongoose");

const Hotel = require("../models/Hotel");
const Buffet = require("../models/Buffet");
const SiteSetting = require("../models/SiteSetting");

dotenv.config();

const PUBLIC_API_URL = (
  process.env.PUBLIC_API_URL || "https://api.dinefor.com"
).replace(/\/+$/, "");

const OLD_UPLOAD_PREFIXES = [
  "http://localhost:5000/uploads/",
  "https://localhost:5000/uploads/",
  "http://127.0.0.1:5000/uploads/",
  "https://127.0.0.1:5000/uploads/",
];

const NEW_UPLOAD_PREFIX = `${PUBLIC_API_URL}/uploads/`;

function replaceMediaUrl(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();

    for (const prefix of OLD_UPLOAD_PREFIXES) {
      if (trimmed.startsWith(prefix)) {
        return `${NEW_UPLOAD_PREFIX}${trimmed.slice(prefix.length)}`;
      }
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map(replaceMediaUrl);
  }

  if (value && typeof value === "object") {
    const updated = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      updated[key] = replaceMediaUrl(nestedValue);
    }

    return updated;
  }

  return value;
}

async function migrateModel(Model, fields) {
  const documents = await Model.find({});
  let updatedCount = 0;

  for (const document of documents) {
    let changed = false;

    for (const field of fields) {
      const previousValue = document.get(field);
      const nextValue = replaceMediaUrl(previousValue);

      if (JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
        document.set(field, nextValue);
        changed = true;
      }
    }

    if (changed) {
      await document.save({ validateBeforeSave: false });
      updatedCount += 1;
    }
  }

  return updatedCount;
}

async function runMigration() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required.");
  }

  console.log(`Using public media base: ${NEW_UPLOAD_PREFIX}`);

  await mongoose.connect(process.env.MONGO_URI);

  const hotelsUpdated = await migrateModel(Hotel, [
    "logo",
    "images",
    "galleryImages",
    "coverMediaUrl",
    "videos",
    "application.documents",
  ]);

  const buffetsUpdated = await migrateModel(Buffet, [
    "thumbnail",
    "images",
    "videos",
  ]);

  const siteSettingsUpdated = await migrateModel(SiteSetting, [
    "heroMediaUrl",
    "fallbackHeroImage",
    "heroMediaItems",
  ]);

  console.log("Media migration completed.");
  console.log(`Hotels updated: ${hotelsUpdated}`);
  console.log(`Buffets updated: ${buffetsUpdated}`);
  console.log(`Site settings updated: ${siteSettingsUpdated}`);

  await mongoose.disconnect();
}

runMigration().catch(async (error) => {
  console.error("Media migration failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});