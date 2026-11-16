const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const {
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
} = require("../services/emailService");
const { notifyUser } = require("../services/notificationService");
const { logActivity } = require("../services/activityLogService");

const normalizeEmail = (value = "") =>
  String(value).trim().toLowerCase();

const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token || "")).digest("hex");

const issueToken = () => crypto.randomBytes(32).toString("hex");

const generateOtp = () => String(crypto.randomInt(100000, 1000000));
const otpHash = (purpose, email, code) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(JSON.stringify([purpose, email, code])).digest("hex");
const validPassword = value => typeof value === "string" && value.length >= 8 &&
  Buffer.byteLength(value) <= 72 && /[a-z]/.test(value) && /[A-Z]/.test(value) &&
  /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
const invalidCode = "This code is invalid or expired. Request a new code.";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || "",
  avatarUrl: user.avatarUrl || "",
  city: user.city || "",
  isApproved: user.isApproved,
  isActive: user.isActive !== false,
  isEmailVerified: user.isEmailVerified === true,
  mustResetPassword: Boolean(user.mustResetPassword),
  authProvider: user.authProvider || "local",
  token: generateToken(user._id, user.role),
});

const sendVerification = async (user) => {
  const code = generateOtp();
  const now = new Date();
  const hash = otpHash("email", user.email, code);
  const changed = await User.updateOne({
    _id: user._id, isEmailVerified: false, isActive: { $ne: false },
    $or: [{ emailVerificationLastSentAt: null }, { emailVerificationLastSentAt: { $lte: new Date(now - 60000) } }],
  }, {
    $set: { emailVerificationToken: hash, emailVerificationExpires: new Date(+now + 600000),
      emailVerificationAttempts: 0, emailVerificationLastSentAt: now },
    $inc: { emailVerificationSendCount: 1 },
  });
  if (!changed.modifiedCount) return;
  try {
    await sendOtpEmail({ to: user.email, code, purpose: "email" });
  } catch {
    await User.updateOne({ _id: user._id, emailVerificationToken: hash }, {
      $set: { emailVerificationToken: null, emailVerificationExpires: null, emailVerificationLastSentAt: null },
    });
    return false;
  }
  return true;
};

async function consumeCode(email, code, emailVerification, updates) {
  const hashField = emailVerification ? "emailVerificationToken" : "passwordResetOtpHash";
  const expiresField = emailVerification ? "emailVerificationExpires" : "passwordResetOtpExpires";
  const attemptsField = emailVerification ? "emailVerificationAttempts" : "passwordResetOtpAttempts";
  const hash = otpHash(emailVerification ? "email" : "reset", email, code);
  const query = {
    email, isActive: { $ne: false }, authProvider: { $ne: "google" },
    ...(emailVerification ? { isEmailVerified: false } : {}),
    [expiresField]: { $gt: new Date() },
    $or: [{ [attemptsField]: { $lt: 5 } }, { [attemptsField]: { $exists: false } }],
  };
  const user = await User.findOneAndUpdate({ ...query, [hashField]: hash }, {
    $set: { ...updates, [hashField]: null, [expiresField]: null, [attemptsField]: 0 },
  });
  if (!user) {
    await User.updateOne({ ...query, [hashField]: { $nin: [hash, null] } }, { $inc: { [attemptsField]: 1 } });
  }
  return user;
}

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";

    if (typeof name !== "string" || !name.trim() || name.length > 100 || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (phone && !/^\+?[0-9 ()-]{7,24}$/.test(phone)) return res.status(400).json({ message: "Enter a valid phone number." });

    if (!validPassword(password)) {
      return res.status(400).json({
        message: "Use 8 or more characters with uppercase, lowercase, a number and a symbol. Keep it within 72 bytes.",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      if (
        existing.authProvider === "local" &&
        existing.isEmailVerified === false
      ) {
        return res.status(409).json({
          message:
            "This email is registered but not verified. Request a new verification email.",
          code: "EMAIL_VERIFICATION_REQUIRED",
          email: normalizedEmail,
        });
      }

      return res.status(409).json({
        message: "Email already registered.",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      phone,
      role: "customer",
      isApproved: true,
      isEmailVerified: false,
      authProvider: "local",
    });

    await logActivity({
      actor: user._id,
      actorRole: user.role,
      action: "account_registered",
      entityType: "user",
      entityId: user._id,
      message: `${user.email} registered a DineFor account.`,
    });

    const delivered = await sendVerification(user);

    return res.status(201).json({
      message: delivered === false ? "Account created. Email delivery failed. Request another code." : "Account created. Enter the code sent to your email.",
      requiresEmailVerification: true,
      email: user.email,
      retryAfterSeconds: delivered ? 60 : 0,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Registration failed.",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message:
          "This account is disabled. Contact DineFor support.",
        code: "ACCOUNT_DISABLED",
      });
    }

    if (user.mustResetPassword) {
      return res.status(403).json({
        message:
          "A password reset is required before you can sign in.",
        code: "PASSWORD_RESET_REQUIRED",
        email: user.email,
      });
    }

    if (
      user.authProvider === "local" &&
      user.isEmailVerified !== true
    ) {
      return res.status(403).json({
        message:
          "Verify your email before signing in. You are not logged in yet.",
        code: "EMAIL_VERIFICATION_REQUIRED",
        email: user.email,
        canResend: true,
      });
    }

    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip || "";
    await user.save();

    logActivity({
      actor: user._id,
      actorRole: user.role,
      action: "account_login",
      entityType: "user",
      entityId: user._id,
      message: `${user.email} signed in.`,
      metadata: { ip: req.ip || "" },
    });

    return res.status(200).json({
      message: "Login successful.",
      user: serializeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Login failed.",
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        message: "Google Sign-In is not configured yet.",
      });
    }

    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub || payload.email_verified !== true) {
      return res.status(401).json({
        message: "Google could not verify this email address.",
      });
    }

    const email = normalizeEmail(payload.email);
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        password: await bcrypt.hash(issueToken(), 12),
        role: "customer",
        isApproved: true,
        isEmailVerified: true,
        authProvider: "google",
        googleId: payload.sub,
        avatarUrl: payload.picture || "",
      });
    } else {
      if (user.isActive === false) {
        return res.status(403).json({
          message:
            "This account is disabled. Contact DineFor support.",
          code: "ACCOUNT_DISABLED",
        });
      }

      const trustedEmail = email.endsWith("@gmail.com") || Boolean(payload.hd);
      const subjectMatches = user.googleId === payload.sub;
      const canLinkCustomer = !user.googleId && user.role === "customer" && trustedEmail;
      if (user.mustResetPassword || (!subjectMatches && !canLinkCustomer)) {
        return res.status(403).json({ message: "Sign in with your DineFor password to access this account." });
      }
      user.googleId = payload.sub;
      user.isEmailVerified = true;
      user.authProvider =
        user.authProvider === "local"
          ? "local"
          : "google";

      if (!user.avatarUrl && payload.picture) {
        user.avatarUrl = payload.picture;
      }
    }

    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip || "";
    await user.save();

    return res.status(200).json({
      message: "Google Sign-In successful.",
      user: serializeUser(user),
    });
  } catch (error) {
    return res.status(401).json({
      message: "Google Sign-In failed. Please try again.",
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ message: "Enter the six-digit email code." });
    const user = await consumeCode(email, code, true, { isEmailVerified: true, emailVerifiedAt: new Date() });
    if (!user) return res.status(400).json({ message: invalidCode });

    Promise.allSettled([
      sendWelcomeEmail({
        to: user.email,
        name: user.name,
      }),
      notifyUser({
        userId: user._id,
        title: "Welcome to DineFor",
        message: "Your email is verified and your account is ready.",
        type: "system",
        link: "/feed",
        dedupeKey: `welcome:${user._id}`,
      }),
      logActivity({
        actor: user._id,
        actorRole: user.role,
        action: "email_verified",
        entityType: "user",
        entityId: user._id,
        message: `${user.email} verified their email address.`,
      }),
    ]).catch(() => {});

    return res.status(200).json({
      message:
        "Email verified successfully. You may now sign in.",
      verified: true,
      email: user.email,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Email verification failed.",
    });
  }
};

const resendVerification = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ message: "Email is required." });
    const user = await User.findOne({ email, isEmailVerified: false, isActive: { $ne: false }, authProvider: { $ne: "google" } });
    if (user) await sendVerification(user);
    return res.json({ message: "If verification is needed, check your inbox or try again in one minute.", retryAfterSeconds: 60 });
  } catch {
    return res.status(500).json({ message: "Could not request an email code." });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const genericMessage =
      "If the account exists, a verification code has been sent.";

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email, isActive: { $ne: false }, authProvider: { $ne: "google" } });
    if (user) {
      const now = new Date();
      const code = generateOtp();
      const hash = otpHash("reset", email, code);
      const changed = await User.updateOne({
        _id: user._id,
        $or: [{ passwordResetOtpLastSentAt: null }, { passwordResetOtpLastSentAt: { $lte: new Date(now - 60000) } }],
      }, { $set: {
        passwordResetOtpHash: hash, passwordResetOtpExpires: new Date(+now + 600000),
        passwordResetOtpAttempts: 0, passwordResetOtpLastSentAt: now,
        passwordResetSessionHash: null, passwordResetSessionExpires: null,
      } });
      if (changed.modifiedCount) {
        try {
          await sendOtpEmail({ to: email, code });
        } catch {
          await User.updateOne({ _id: user._id, passwordResetOtpHash: hash }, {
            $set: { passwordResetOtpHash: null, passwordResetOtpExpires: null },
          });
        }
      }
    }
    return res.json({ message: genericMessage, retryAfterSeconds: 60 });
  } catch {
    return res.status(500).json({ message: "Password reset request failed." });
  }
};

const verifyPasswordResetOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();

    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        message: "Enter the six-digit verification code.",
      });
    }

    const resetSession = issueToken();
    const user = await consumeCode(email, code, false, {
      passwordResetSessionHash: hashToken(resetSession),
      passwordResetSessionExpires: new Date(Date.now() + 15 * 60000),
      passwordResetOtpVerifiedAt: new Date(),
    });
    if (!user) return res.status(400).json({ message: invalidCode });

    return res.status(200).json({
      message: "Code verified. Create your new password.",
      resetSession,
      email: user.email,
      nextStep: "create_password",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Verification failed.",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const resetSession = String(req.body.resetSession || "");
    const password = req.body.password;

    if (!validPassword(password)) {
      return res.status(400).json({ message: "Use 8 or more characters with uppercase, lowercase, a number and a symbol. Keep it within 72 bytes." });
    }

    const filter = { email, isActive: { $ne: false }, passwordResetSessionHash: hashToken(resetSession),
      passwordResetSessionExpires: { $gt: new Date() } };
    if (!/^[a-f0-9]{64}$/.test(resetSession) || !await User.exists(filter)) {
      return res.status(400).json({ message: "Your verified reset session is invalid or expired. Start again." });
    }
    const user = await User.findOneAndUpdate({ ...filter, passwordResetSessionExpires: { $gt: new Date() } }, { $set: {
      password: await bcrypt.hash(password, 12), passwordResetSessionHash: null,
      passwordResetSessionExpires: null, passwordResetOtpVerifiedAt: null,
      passwordResetToken: null, passwordResetExpires: null, mustResetPassword: false,
    } });
    if (!user) return res.status(400).json({ message: "Your verified reset session is invalid or expired. Start again." });

    Promise.allSettled([
      sendPasswordChangedEmail({
        to: user.email,
        name: user.name,
      }),
      notifyUser({
        userId: user._id,
        title: "Password changed",
        message: "Your DineFor password was changed successfully.",
        type: "system",
        link: "/account-security",
      }),
      logActivity({
        actor: user._id,
        actorRole: user.role,
        action: "password_reset_completed",
        entityType: "user",
        entityId: user._id,
        message: `${user.email} completed password recovery.`,
      }),
    ]).catch(() => {});

    return res.status(200).json({
      message:
        "Password changed successfully. Sign in with your new password.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Password reset failed.",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        message:
          "New password must contain at least 8 characters.",
      });
    }

    const user = await User.findById(req.user.id).select(
      "+password"
    );

    if (
      !user ||
      !(await bcrypt.compare(
        currentPassword || "",
        user.password
      ))
    ) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.mustResetPassword = false;
    await user.save();

    Promise.allSettled([
      sendPasswordChangedEmail({
        to: user.email,
        name: user.name,
      }),
      notifyUser({
        userId: user._id,
        title: "Password changed",
        message: "Your DineFor account password was changed.",
        type: "system",
        link: "/account-security",
      }),
      logActivity({
        actor: user._id,
        actorRole: user.role,
        action: "password_changed",
        entityType: "user",
        entityId: user._id,
        message: `${user.email} changed their password.`,
      }),
    ]).catch(() => {});

    return res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not change password.",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleLogin,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
  changePassword,
};
