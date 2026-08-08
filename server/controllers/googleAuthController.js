const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const getGoogleClient = () => {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();

  if (!clientId) {
    const error = new Error(
      "Google Sign-In is not configured on the server."
    );
    error.statusCode = 503;
    throw error;
  }

  return {
    clientId,
    client: new OAuth2Client(clientId),
  };
};

const buildAuthenticatedUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || "",
  avatarUrl: user.avatarUrl || "",
  isApproved: user.isApproved,
  isActive: user.isActive !== false,
  token: generateToken(user._id, user.role),
});

const googleLogin = async (req, res) => {
  try {
    const credential = String(req.body?.credential || "").trim();

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required.",
      });
    }

    const { clientId, client } = getGoogleClient();

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      return res.status(401).json({
        message: "Google did not return a valid user identity.",
      });
    }

    if (payload.email_verified !== true) {
      return res.status(401).json({
        message: "Your Google email address is not verified.",
      });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (user && user.isActive === false) {
      return res.status(403).json({
        message:
          "This DineFor account has been disabled. Please contact support.",
      });
    }

    if (!user) {
      const generatedPassword = crypto.randomBytes(48).toString("hex");
      const hashedPassword = await bcrypt.hash(generatedPassword, 12);

      user = await User.create({
        name:
          String(payload.name || "").trim() ||
          normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password: hashedPassword,
        role: "customer",
        avatarUrl: String(payload.picture || "").trim(),
        isApproved: true,
        isActive: true,
      });
    } else {
      let changed = false;

      if (!user.avatarUrl && payload.picture) {
        user.avatarUrl = String(payload.picture);
        changed = true;
      }

      if (!user.name && payload.name) {
        user.name = String(payload.name);
        changed = true;
      }

      if (changed) {
        await user.save();
      }
    }

    return res.status(200).json({
      message: "Google Sign-In successful.",
      user: buildAuthenticatedUser(user),
    });
  } catch (error) {
    console.error("Google Sign-In error:", error);

    const statusCode =
      error.statusCode ||
      (error.message?.includes("Token used too late") ? 401 : 500);

    return res.status(statusCode).json({
      message:
        statusCode === 503
          ? error.message
          : statusCode === 401
            ? "Google credential is invalid or expired. Please try again."
            : "Google Sign-In failed. Please try again.",
    });
  }
};

module.exports = {
  googleLogin,
};
