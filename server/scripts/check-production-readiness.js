const dotenv = require("dotenv");
dotenv.config();

const required = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL", "PUBLIC_API_URL", "PAYHERE_MERCHANT_ID", "PAYHERE_MERCHANT_SECRET", "PAYHERE_APP_ID", "PAYHERE_APP_SECRET"];
const optional = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM", "ADMIN_ALERT_EMAIL"];
const placeholders = /^(your_|change|replace|example|localhost)/i;
const missing = required.filter((key) => !String(process.env[key] || "").trim() || placeholders.test(String(process.env[key]).trim()));
const warnings = optional.filter((key) => !String(process.env[key] || "").trim());
if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") warnings.push("NODE_ENV=production");
if (String(process.env.PAYHERE_SANDBOX || "true").toLowerCase() !== "false") warnings.push("PAYHERE_SANDBOX=false");
if (String(process.env.CLIENT_URL || "").startsWith("http://")) missing.push("CLIENT_URL must use HTTPS");
if (String(process.env.PUBLIC_API_URL || "").startsWith("http://")) missing.push("PUBLIC_API_URL must use HTTPS");

console.log("DineFor production readiness (secret values are never printed)");
console.log(`Required checks: ${missing.length ? "FAIL" : "PASS"}`);
if (missing.length) console.log(`Missing/unsafe: ${missing.join(", ")}`);
if (warnings.length) console.log(`Warnings: ${warnings.join(", ")}`);
if (missing.length) process.exitCode = 1;
