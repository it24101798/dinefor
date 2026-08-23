const mongoose = require("mongoose");

function slugify(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 90);
}

function buildDocumentSlug(label, id) {
  const base = slugify(label) || "dinefor";
  const suffix = String(id || "").slice(-6).toLowerCase();
  return suffix ? `${base}-${suffix}` : base;
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

async function findByIdentifier(Model, identifier, query = {}) {
  if (isObjectId(identifier)) return Model.findOne({ _id: identifier, ...query });
  return Model.findOne({ slug: String(identifier || "").toLowerCase(), ...query });
}

module.exports = { slugify, buildDocumentSlug, isObjectId, findByIdentifier };
