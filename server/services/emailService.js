const nodemailer = require("nodemailer");

const hasSmtpConfig = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );

const createTransporter = () => {
  if (!hasSmtpConfig()) {
    const error = new Error(
      "SMTP is not configured. Check SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS."
    );
    error.code = "EMAIL_SERVICE_NOT_CONFIGURED";
    throw error;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const password = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,

    // Force IPv4 to avoid intermittent Gmail SMTP connection
    // timeouts caused by unreachable IPv6 routes on some networks.
    family: 4,

    auth: {
      user: process.env.SMTP_USER,
      pass: password,
    },

    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 45000,

    tls: {
      minVersion: "TLSv1.2",
      servername: process.env.SMTP_HOST,
    },
  });
};

const shell = ({ heading, preheader = "", body, footer = "" }) => `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${heading}</title>
</head>
<body style="margin:0;background:#f7f4ed;font-family:Arial,sans-serif;color:#173c2b">
  <div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
  <div style="padding:32px 16px">
    <div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e6e0d5;border-radius:20px;overflow:hidden">
      <div style="background:#173c2b;color:#fff;padding:22px 28px">
        <div style="font-family:Georgia,serif;font-size:28px;font-weight:700">DineFor</div>
        <div style="font-size:12px;opacity:.8;margin-top:4px">Discover. Reserve. Dine.</div>
      </div>
      <div style="padding:30px 28px">
        <h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.2;margin:0 0 16px">${heading}</h1>
        ${body}
      </div>
      <div style="padding:18px 28px;background:#faf8f3;color:#78827c;font-size:12px;line-height:1.6">
        ${footer || "This is an automated message from DineFor. Please do not share verification codes or booking QR details."}
      </div>
    </div>
  </div>
</body>
</html>`;

const sendMail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    "DineFor <no-reply@dinefor.com>";

  const result = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return {
    delivered: true,
    messageId: result.messageId,
    accepted: result.accepted || [],
    rejected: result.rejected || [],
  };
};

const sendAccountEmail = async ({
  to,
  subject,
  heading,
  message,
  actionLabel,
  actionUrl,
}) =>
  sendMail({
    to,
    subject,
    text: `${heading}\n\n${message}\n\n${actionLabel}: ${actionUrl}`,
    html: shell({
      heading,
      preheader: message,
      body: `
        <p style="line-height:1.7;color:#4f5d55">${message}</p>
        <a href="${actionUrl}" style="display:inline-block;margin-top:18px;background:#173c2b;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:700">${actionLabel}</a>`,
      footer:
        "If you did not request this action, you can safely ignore this email.",
    }),
  });

const sendOtpEmail = async ({ to, name, code, expiresMinutes = 10 }) =>
  sendMail({
    to,
    subject: "Your DineFor password reset code",
    text: `Hello ${name || "Diner"}, your DineFor password reset code is ${code}. It expires in ${expiresMinutes} minutes.`,
    html: shell({
      heading: "Password reset verification",
      preheader: "Use this one-time code to continue your password reset.",
      body: `
        <p style="line-height:1.7;color:#4f5d55">Hello ${name || "Diner"},</p>
        <p style="line-height:1.7;color:#4f5d55">Enter this one-time code in DineFor. It expires in ${expiresMinutes} minutes.</p>
        <div style="font-size:36px;letter-spacing:10px;text-align:center;font-weight:800;background:#f0f8f4;border:1px solid #b9ddcd;border-radius:16px;padding:22px;margin:24px 0;color:#173c2b">${code}</div>
        <p style="color:#78827c;font-size:13px">DineFor support will never ask you to share this code.</p>`,
    }),
  });

const formatMoney = (value) =>
  `LKR ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const sendBookingEmail = async ({
  to,
  customerName,
  subject,
  heading,
  intro,
  booking,
  hotelName,
  buffetTitle,
}) => {
  const date = booking?.selectedDate
    ? new Date(booking.selectedDate).toLocaleDateString("en-LK", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";
  const slot = `${booking?.selectedTimeSlot?.startTime || "-"} – ${
    booking?.selectedTimeSlot?.endTime || "-"
  }`;

  return sendMail({
    to,
    subject,
    text: `${heading}\n${intro}\nBooking: ${booking?.bookingCode}\nHotel: ${hotelName}\nBuffet: ${buffetTitle}\nDate: ${date}\nTime: ${slot}`,
    html: shell({
      heading,
      preheader: intro,
      body: `
        <p style="line-height:1.7;color:#4f5d55">Hello ${customerName || "Diner"},</p>
        <p style="line-height:1.7;color:#4f5d55">${intro}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:18px">
          ${[
            ["Booking code", booking?.bookingCode || "-"],
            ["Hotel", hotelName || "-"],
            ["Buffet", buffetTitle || "-"],
            ["Date", date],
            ["Time", slot],
            ["Guests", booking?.seats || "-"],
            ["Reservation status", booking?.bookingStatus || "-"],
            ["Payment status", booking?.paymentStatus || "-"],
            ["Total", formatMoney(booking?.grandTotal || booking?.totalAmount)],
          ]
            .map(
              ([label, value]) =>
                `<tr><td style="padding:10px;border-bottom:1px solid #eee;color:#78827c">${label}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${value}</td></tr>`
            )
            .join("")}
        </table>
        <a href="${(process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "")}/my-bookings" style="display:inline-block;margin-top:22px;background:#173c2b;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:700">View Reservation</a>`,
    }),
  });
};


const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const actionButton = (label, url) =>
  url
    ? `<a href="${url}" style="display:inline-block;margin-top:20px;background:#173c2b;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:700">${escapeHtml(label)}</a>`
    : "";

const sendBrandedEmail = async ({
  to,
  subject,
  heading,
  intro = "",
  rows = [],
  actionLabel = "",
  actionUrl = "",
  footer = "",
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const textRows = safeRows
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

  return sendMail({
    to,
    subject,
    text: `${heading}\n\n${intro}\n\n${textRows}${
      actionUrl ? `\n\n${actionLabel}: ${actionUrl}` : ""
    }`,
    html: shell({
      heading: escapeHtml(heading),
      preheader: escapeHtml(intro),
      body: `
        <p style="line-height:1.7;color:#4f5d55">${escapeHtml(intro)}</p>
        ${
          safeRows.length
            ? `<table style="width:100%;border-collapse:collapse;margin-top:18px">${safeRows
                .map(
                  ([label, value]) =>
                    `<tr><td style="padding:10px;border-bottom:1px solid #eee;color:#78827c">${escapeHtml(
                      label
                    )}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${escapeHtml(
                      value ?? "-"
                    )}</td></tr>`
                )
                .join("")}</table>`
            : ""
        }
        ${actionButton(actionLabel, actionUrl)}
      `,
      footer,
    }),
  });
};

const sendWelcomeEmail = ({ to, name }) =>
  sendBrandedEmail({
    to,
    subject: "Welcome to DineFor",
    heading: "Welcome to DineFor",
    intro: `Hello ${name || "Diner"}, your email is verified and your DineFor account is ready.`,
    rows: [
      ["Account", to],
      ["Status", "Verified"],
    ],
    actionLabel: "Discover Buffets",
    actionUrl: `${(process.env.CLIENT_URL || "http://localhost:5173").replace(
      /\/+$/,
      ""
    )}/feed`,
  });

const sendPasswordChangedEmail = ({ to, name }) =>
  sendBrandedEmail({
    to,
    subject: "Your DineFor password was changed",
    heading: "Password changed successfully",
    intro: `Hello ${name || "Diner"}, the password for your DineFor account was changed.`,
    rows: [["Account", to], ["Time", new Date().toLocaleString("en-LK")]],
    actionLabel: "Open Account Security",
    actionUrl: `${(process.env.CLIENT_URL || "http://localhost:5173").replace(
      /\/+$/,
      ""
    )}/account-security`,
    footer:
      "If you did not make this change, contact DineFor support immediately.",
  });

const sendHotelApplicationEmail = ({
  to,
  name,
  hotelName,
  applicationNumber,
}) =>
  sendBrandedEmail({
    to,
    subject: "DineFor hotel application received",
    heading: "Application received",
    intro: `Hello ${name || "Hotel Partner"}, DineFor has received your hotel application and it is now awaiting review.`,
    rows: [
      ["Hotel", hotelName],
      ["Application number", applicationNumber],
      ["Status", "Pending review"],
    ],
    actionLabel: "View Hotel Portal",
    actionUrl: `${(process.env.CLIENT_URL || "http://localhost:5173").replace(
      /\/+$/,
      ""
    )}/hotel`,
  });

const sendHotelStatusEmail = ({
  to,
  name,
  hotelName,
  status,
  note = "",
}) => {
  const labels = {
    approved: {
      subject: "Your DineFor hotel application was approved",
      heading: "Welcome to DineFor Partner",
      intro:
        "Your hotel application has been approved. You can now manage your profile, buffets and reservations.",
    },
    rejected: {
      subject: "Update on your DineFor hotel application",
      heading: "Application update",
      intro:
        "Your hotel application was not approved in its current form. Review the admin note before making any next changes.",
    },
    need_more_info: {
      subject: "More information required for your DineFor application",
      heading: "Additional information required",
      intro:
        "The DineFor team needs additional information before your hotel application can be completed.",
    },
    suspended: {
      subject: "Your DineFor hotel account was suspended",
      heading: "Hotel account suspended",
      intro:
        "Your hotel account has been suspended. Review the admin note and contact DineFor support if required.",
    },
    hold: {
      subject: "Your DineFor hotel application is on hold",
      heading: "Application placed on hold",
      intro:
        "Your hotel application is temporarily on hold while the DineFor team completes its review.",
    },
    pending: {
      subject: "Your DineFor hotel application is under review",
      heading: "Application reopened",
      intro:
        "Your hotel application is back under review.",
    },
  };

  const template = labels[status] || labels.pending;

  return sendBrandedEmail({
    to,
    subject: template.subject,
    heading: template.heading,
    intro: `Hello ${name || "Hotel Partner"}, ${template.intro}`,
    rows: [
      ["Hotel", hotelName],
      ["Status", String(status || "").replace(/_/g, " ")],
      ["Admin note", note || "No additional note"],
    ],
    actionLabel: "Open Hotel Portal",
    actionUrl: `${(process.env.CLIENT_URL || "http://localhost:5173").replace(
      /\/+$/,
      ""
    )}/hotel`,
  });
};

const sendAdminHotelApplicationEmail = ({
  to,
  hotelName,
  applicationNumber,
  ownerEmail,
}) =>
  sendBrandedEmail({
    to,
    subject: `New hotel application: ${hotelName}`,
    heading: "New hotel application",
    intro:
      "A new hotel partner application was submitted and requires admin review.",
    rows: [
      ["Hotel", hotelName],
      ["Application number", applicationNumber],
      ["Applicant email", ownerEmail || "-"],
    ],
    actionLabel: "Review Application",
    actionUrl: `${(process.env.CLIENT_URL || "http://localhost:5173").replace(
      /\/+$/,
      ""
    )}/admin/hotels`,
  });

const sendHotelBookingEmail = ({
  to,
  hotelName,
  booking,
  customerName,
  buffetTitle,
  event = "confirmed",
}) => {
  const titles = {
    confirmed: "New DineFor reservation",
    cancelled: "DineFor reservation cancelled",
  };

  const heading =
    event === "cancelled"
      ? "Reservation cancelled"
      : "New reservation received";

  return sendBrandedEmail({
    to,
    subject: `${titles[event] || titles.confirmed} | ${hotelName}`,
    heading,
    intro:
      event === "cancelled"
        ? "A customer reservation for your hotel was cancelled."
        : "A customer has reserved a buffet at your hotel.",
    rows: [
      ["Booking code", booking?.bookingCode || "-"],
      ["Customer", customerName || "-"],
      ["Buffet", buffetTitle || "-"],
      [
        "Date",
        booking?.selectedDate
          ? new Date(booking.selectedDate).toLocaleDateString("en-LK")
          : "-",
      ],
      [
        "Time",
        `${booking?.selectedTimeSlot?.startTime || "-"} – ${
          booking?.selectedTimeSlot?.endTime || "-"
        }`,
      ],
      ["Guests", booking?.seats || "-"],
      ["Status", booking?.bookingStatus || "-"],
    ],
    actionLabel: "Open Reservations",
    actionUrl: `${(process.env.CLIENT_URL || "http://localhost:5173").replace(
      /\/+$/,
      ""
    )}/hotel/reservations`,
  });
};

module.exports = {
  sendAccountEmail,
  sendOtpEmail,
  sendBookingEmail,
  sendMail,
  hasSmtpConfig,
  sendBrandedEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendHotelApplicationEmail,
  sendHotelStatusEmail,
  sendAdminHotelApplicationEmail,
  sendHotelBookingEmail,
};
