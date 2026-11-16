const { createCipheriv, createDecipheriv, createHash, randomBytes } = require("node:crypto");

const TERMS_VERSION = "partner-intake-v1";
const editableStatuses = ["draft", "changes_requested"];
const reviewStatuses = ["submitted", "resubmitted", "under_review"];
const requiredText = ["legalName", "tradingName", "registrationNumber", "province", "district", "city", "address",
  "contactName", "contactPhone", "representativeName", "representativeTitle", "representativeEmail",
  "bankHolder", "bankName", "bankBranch"];
const textFields = [...requiredText, "category", "buffetCategories"];
const consentFields = ["privacyAccepted", "photoPermission", "termsAccepted", "marketingOptIn"];
const fields = new Set([...textFields, ...consentFields, "diningCapacity", "roomCount", "pin", "bankNumber", "registration", "authority", "bank", "photo"]);
const sriLankaDistricts = {
  Central: ["Kandy", "Matale", "Nuwara Eliya"],
  Eastern: ["Ampara", "Batticaloa", "Trincomalee"],
  Northern: ["Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"],
  "North Central": ["Anuradhapura", "Polonnaruwa"],
  "North Western": ["Kurunegala", "Puttalam"],
  Sabaragamuwa: ["Kegalle", "Ratnapura"],
  Southern: ["Galle", "Hambantota", "Matara"],
  Uva: ["Badulla", "Monaragala"],
  Western: ["Colombo", "Gampaha", "Kalutara"],
};

const err = (status, message) => Object.assign(new Error(message), { status });
const clean = (value, max = 180) => typeof value === "string" ? value.trim().replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").slice(0, max) : "";
const safeEmail = value => clean(value, 254).toLowerCase();
const emailValid = value => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value);
const hashInvitation = token => createHash("sha256").update(token).digest("hex");
const digits = value => clean(value, 80).replace(/[ -]/g, "");

function key() {
  const value = process.env.HOTEL_ONBOARDING_ENCRYPTION_KEY;
  if (!/^[a-f0-9]{64}$/i.test(value || "")) throw err(503, "Private onboarding storage is currently unavailable.");
  return Buffer.from(value, "hex");
}

function encrypt(buffer, binding) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(binding));
  return { ciphertext: Buffer.concat([cipher.update(buffer), cipher.final()]), iv, tag: cipher.getAuthTag() };
}

function decrypt({ ciphertext, iv, tag }, binding) {
  const decoder = createDecipheriv("aes-256-gcm", key(), iv);
  decoder.setAAD(Buffer.from(binding));
  decoder.setAuthTag(tag);
  return Buffer.concat([decoder.update(ciphertext), decoder.final()]);
}

function verifyBankNumber(number, confirm) {
  const account = digits(number);
  if (!/^\d{6,24}$/.test(account) || account !== digits(confirm)) throw err(400, "Enter the same valid settlement account number twice.");
  return account;
}

function sealBank(number, id) {
  const payload = encrypt(Buffer.from(number), `bank:${id}`);
  return [payload.iv, payload.tag, payload.ciphertext].map(value => value.toString("base64")).join(".");
}

function openBank(envelope, id) {
  const [iv, tag, ciphertext] = envelope.split(".").map(value => Buffer.from(value, "base64"));
  return decrypt({ iv, tag, ciphertext }, `bank:${id}`).toString("utf8");
}

function applicationFrom(body) {
  const result = {};
  for (const field of textFields) result[field] = clean(body[field],field === "address" ? 350 : 180);
  for (const name of ["diningCapacity", "roomCount"]) {
    if (body[name] === null || body[name] === "" || body[name] === undefined) result[name] = null;
    else if (Number.isSafeInteger(body[name]) && body[name] >= 0 && body[name] <= 100_000) result[name] = body[name];
    else throw err(400, "Enter valid whole numbers for capacity and rooms.");
  }
  const { latitude, longitude } = body.pin || {};
  if (latitude != null || longitude != null) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 5.8 || latitude > 10.1 || longitude < 79.4 || longitude > 82) {
      throw err(400, "Set a map pin within Sri Lanka.");
    }
    result.pin = { latitude, longitude };
  }
  for (const name of consentFields) result[name] = body[name] === true;
  result.termsVersion = clean(body.termsVersion, 40);
  return result;
}

function validateSubmission(application, evidence, accountLast4) {
  const missing = requiredText.filter(field => !application[field]);
  if (missing.length || !application.buffetCategories) throw err(400, "Complete the business, location, contact, dining and settlement fields.");
  if (!sriLankaDistricts[application.province]?.includes(application.district)) throw err(400, "Choose a district in the selected province.");
  if (!emailValid(application.representativeEmail) || !/^\+?[\d ()-]{7,24}$/.test(application.contactPhone)) throw err(400, "Enter a valid representative email and contact phone number.");
  if (!application.diningCapacity || !accountLast4) throw err(400, "Enter your dining capacity and settlement account details.");
  if (!["registration", "authority", "bank", "photo"].every(kind => evidence.some(file => file.kind === kind))) throw err(400, "Upload the four requested evidence items.");
  if (!application.privacyAccepted || !application.termsAccepted || !application.photoPermission || application.termsVersion !== TERMS_VERSION) {
    throw err(400, "Review the intake terms, privacy notice and photo permission before submitting.");
  }
}

function appearance(file, kind) {
  if (!file?.buffer?.length) throw err(400, "Select a file.");
  const buffer = file.buffer;
  let mime;
  if (buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) mime = "application/pdf";
  else if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) mime = "image/png";
  else if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) mime = "image/jpeg";
  if (!mime || (kind === "photo" && !mime.startsWith("image/"))) throw err(400, "Use a PDF, JPG or PNG for evidence, or JPG/PNG for property photos.");
  return { kind, mime, size: file.size, name: clean(file.originalname.replace(/[\\/]/g, "_"), 120) || "evidence" };
}

module.exports = { TERMS_VERSION, editableStatuses, reviewStatuses, fields, sriLankaDistricts, err, clean, safeEmail, emailValid,
  hashInvitation, encrypt, decrypt, verifyBankNumber, sealBank, openBank, applicationFrom, validateSubmission, appearance };
