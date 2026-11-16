const CommunicationLog = require("../models/CommunicationLog");
const { sendMail, hasSmtpConfig } = require("./emailService");
const { notifyUser } = require("./notificationService");

const maskEmail = (email) => {
  const [name = "", domain = ""] = String(email || "").split("@");
  return domain ? `${name.slice(0, 2)}***@${domain}` : "";
};

const log = (data) => CommunicationLog.create(data).catch((error) => {
  console.error("Finance communication log failed:", error.message);
  return null;
});

const sendFinancialEmail = async ({ to, recipient, event, subject, text, html, attachment, payment, booking, settlement, financialDocument }) => {
  const base = { channel: "email", event, recipient: recipient || null, recipientEmail: maskEmail(to), payment: payment || null, booking: booking || null, settlement: settlement || null, financialDocument: financialDocument || null };
  if (!to || !hasSmtpConfig()) {
    await log({ ...base, status: "skipped", errorCode: !to ? "NO_RECIPIENT" : "SMTP_NOT_CONFIGURED" });
    return { delivered: false, skipped: true };
  }
  try {
    const result = await sendMail({ to, subject, text, html, attachments: attachment ? [{ filename: attachment.filename, content: attachment.content, contentType: "application/pdf" }] : [] });
    await log({ ...base, status: "sent", providerMessageId: result.messageId || "" });
    return result;
  } catch (error) {
    await log({ ...base, status: "failed", errorCode: String(error.code || "EMAIL_FAILED").slice(0, 80) });
    throw error;
  }
};

const recordInApp = async ({ recipient, event, title, message, link, payment, booking, settlement }) => {
  if (!recipient) return null;
  try {
    await notifyUser(recipient, { title, message, link, type: event.includes("refund") ? "refund" : event.includes("settlement") ? "settlement" : "payment", dedupeKey: `${event}:${payment || settlement || booking || Date.now()}` });
    return log({ channel: "in_app", event, recipient, payment: payment || null, booking: booking || null, settlement: settlement || null, status: "sent" });
  } catch (error) {
    return log({ channel: "in_app", event, recipient, payment: payment || null, booking: booking || null, settlement: settlement || null, status: "failed", errorCode: String(error.code || "NOTIFICATION_FAILED").slice(0, 80) });
  }
};

const emitPaymentEvent = async ({ paymentId, event, title, message }) => {
  const Payment = require("../models/Payment");
  const payment = await Payment.findById(paymentId).populate("user", "name email");
  if (!payment?.user) return null;
  const link = "/payments";
  await recordInApp({ recipient: payment.user._id, event, title, message, link, payment: payment._id, booking: payment.booking });
  return sendFinancialEmail({
    to: payment.user.email,
    recipient: payment.user._id,
    event,
    subject: title,
    text: `${message}\n\nView your payment history: ${(process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "")}${link}`,
    html: `<p>${message}</p><p><a href="${(process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "")}${link}">View payment history</a></p>`,
    payment: payment._id,
    booking: payment.booking,
  });
};

module.exports = { sendFinancialEmail, recordInApp, emitPaymentEvent };
