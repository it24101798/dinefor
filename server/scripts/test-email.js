require("dotenv").config();
const nodemailer = require("nodemailer");

const cleanPassword = () =>
  String(process.env.SMTP_PASS || "").replace(/\s+/g, "");

const requiredVariables = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
];

async function run() {
  const missing = requiredVariables.filter(
    (name) => !String(process.env[name] || "").trim()
  );

  if (missing.length > 0) {
    console.error(
      `Missing SMTP variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const recipient =
    process.argv[2] ||
    process.env.SMTP_TEST_TO ||
    process.env.SMTP_USER;

  console.log("DineFor SMTP test");
  console.log("-----------------");
  console.log("Host:", process.env.SMTP_HOST);
  console.log("Port:", port);
  console.log("Secure:", port === 465);
  console.log("Require TLS:", port === 587);
  console.log("User:", process.env.SMTP_USER);
  console.log("Recipient:", recipient);
  console.log("Password configured:", Boolean(process.env.SMTP_PASS));
  console.log("Password length:", cleanPassword().length);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: cleanPassword(),
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: {
      minVersion: "TLSv1.2",
    },
  });

  try {
    console.log("\nChecking SMTP connection and authentication...");
    await transporter.verify();
    console.log("PASS: SMTP connection and authentication successful.");

    const result = await transporter.sendMail({
      from:
        process.env.EMAIL_FROM ||
        `DineFor <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: "DineFor SMTP configuration test",
      text:
        "DineFor email delivery is working successfully.",
      html: `
        <div style="font-family:Arial,sans-serif;padding:30px;background:#f7f4ed">
          <div style="max-width:600px;margin:auto;background:white;padding:30px;border-radius:18px">
            <h1 style="color:#173c2b;font-family:Georgia,serif">DineFor</h1>
            <h2>Email configuration successful</h2>
            <p>Your DineFor application can now send OTP codes, reservation confirmations and reminders.</p>
          </div>
        </div>
      `,
    });

    console.log("PASS: Test email sent.");
    console.log("Message ID:", result.messageId);
    console.log("Accepted:", result.accepted);
    console.log("Rejected:", result.rejected);
  } catch (error) {
    console.error("\nFAIL: SMTP test failed.");
    console.error("Message:", error.message);
    console.error("Code:", error.code || "Unknown");
    console.error("Command:", error.command || "Unknown");
    console.error("Response:", error.response || "No response");
    console.error(
      "Response code:",
      error.responseCode || "No response code"
    );

    if (error.code === "EAUTH") {
      console.error(
        "\nLikely fix: regenerate the Google App Password while signed in as the same mailbox used in SMTP_USER."
      );
    } else if (
      error.code === "ETIMEDOUT" ||
      error.code === "ESOCKET"
    ) {
      console.error(
        "\nLikely fix: test port 587 connectivity and start Node with NODE_USE_SYSTEM_CA=1."
      );
    }

    process.exit(1);
  }
}

run();
