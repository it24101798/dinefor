const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Hotel = require("../models/Hotel");
const Buffet = require("../models/Buffet");

dotenv.config();

const FROM = process.env.MEDIA_URL_FROM || "http://localhost:5000/uploads/";
const TO = (process.env.PUBLIC_API_URL || "https://api.dinefor.com").replace(/\/+$/, "") + "/uploads/";

const replaceValue = (value) => {
  if (typeof value === "string") return value.startsWith(FROM) ? `${TO}${value.slice(FROM.length)}` : value;
  if (Array.isArray(value)) return value.map(replaceValue);
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) value[key] = replaceValue(value[key]);
  }
  return value;
};

async function migrateModel(Model, fields) {
  let updated = 0;
  const documents = await Model.find({});
  for (const document of documents) {
    let changed = false;
    for (const field of fields) {
      const previous = document.get(field);
      const next = replaceValue(previous);
      if (JSON.stringify(previous) !== JSON.stringify(next)) {
        document.set(field, next);
        changed = true;
      }
    }
    if (changed) {
      await document.save({ validateBeforeSave: false });
      updated += 1;
    }
  }
  return updated;
}

(async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required.");
  await mongoose.connect(process.env.MONGO_URI);
  const hotels = await migrateModel(Hotel, ["logo", "images", "galleryImages", "coverMediaUrl", "videos", "application.documents"]);
  const buffets = await migrateModel(Buffet, ["thumbnail", "images", "videos"]);
  console.log(`Media migration completed. Hotels updated: ${hotels}; buffets updated: ${buffets}.`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error("Media migration failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
