const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const {
  sendAccountEmail,
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

const clientUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

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
  const rawToken = issueToken();

  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  );
  user.emailVerificationLastSentAt = new Date();
  user.emailVerificationSendCount =
    Number(user.emailVerificationSendCount || 0) + 1;

  await user.save();

  const verificationUrl =
    `${clientUrl()}/verify-email?token=${rawToken}` +
    `&email=${encodeURIComponent(user.email)}`;

  return sendAccountEmail({
    to: user.email,
    subject: "Verify your DineFor email",
    heading: "Verify your email address",
    message:
      "Confirm your email before signing in to DineFor. This protects your reservations and account.",
    actionLabel: "Verify Email",
    actionUrl: verificationUrl,
  });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const requestedRole =
      req.body.role === "hotel" ? "hotel" : "customer";

    if (!name?.trim() || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
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
      role: requestedRole,
      isApproved: requestedRole !== "hotel",
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

    const mailResult = await sendVerification(user);

    return res.status(201).json({
      message:
        "Account created. Verify your email before signing in.",
      requiresEmailVerification: true,
      email: user.email,
      previewUrl: mailResult.previewUrl,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Registration failed.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
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
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
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

    if (!payload?.email || payload.email_verified !== true) {
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

      user.googleId = user.googleId || payload.sub;
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
    const rawToken = String(req.body.token || "");

    if (!email || !rawToken) {
      return res.status(400).json({
        message: "Verification email and token are required.",
      });
    }

    const user = await User.findOne({
      email,
      emailVerificationToken: hashToken(rawToken),
      emailVerificationExpires: { $gt: new Date() },
    }).select(
      "+emailVerificationToken +emailVerificationExpires"
    );

    if (!user) {
      return res.status(400).json({
        message:
          "This verification link is invalid or expired. Request a new link.",
        code: "VERIFICATION_LINK_INVALID",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    user.emailVerifiedAt = new Date();
    await user.save();

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

const getVerificationStatus = async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email }).select(
      "email authProvider isEmailVerified emailVerificationExpires"
    );

    if (!user) {
      return res.status(200).json({
        exists: false,
        verified: false,
      });
    }

    return res.status(200).json({
      exists: true,
      verified:
        user.authProvider === "google" ||
        user.isEmailVerified === true,
      authProvider: user.authProvider,
      verificationLinkActive:
        user.emailVerificationExpires &&
        user.emailVerificationExpires > new Date(),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not check verification status.",
    });
  }
};

const resendVerification = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email }).select(
      "+emailVerificationToken +emailVerificationExpires"
    );

    if (
      !user ||
      user.authProvider === "google" ||
      user.isEmailVerified === true
    ) {
      return res.status(200).json({
        message:
          "If verification is required, a new email has been sent.",
      });
    }

    const lastSent = user.emailVerificationLastSentAt
      ? new Date(user.emailVerificationLastSentAt).getTime()
      : 0;

    const waitMs = 60 * 1000 - (Date.now() - lastSent);

    if (waitMs > 0) {
      return res.status(429).json({
        message: `Please wait ${Math.ceil(
          waitMs / 1000
        )} seconds before requesting another email.`,
        retryAfterSeconds: Math.ceil(waitMs / 1000),
      });
    }

    const mailResult = await sendVerification(user);

    return res.status(200).json({
      message:
        "Verification email sent. Check your inbox and spam folder.",
      email: user.email,
      previewUrl: mailResult.previewUrl,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not resend verification email.",
    });
  }
};

const generateOtp = () =>
  String(crypto.randomInt(100000, 1000000));

const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const genericMessage =
      "If the account exists, a verification code has been sent.";

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email }).select(
      "+passwordResetOtpHash +passwordResetOtpExpires +passwordResetOtpAttempts"
    );

    if (!user) {
      return res.status(200).json({ message: genericMessage });
    }

    if (user.authProvider === "google") {
      return res.status(200).json({
        message:
          "This account uses Google Sign-In. Continue with Google instead of resetting a DineFor password.",
        code: "GOOGLE_ACCOUNT",
      });
    }

    const lastSent = user.passwordResetOtpLastSentAt
      ? new Date(user.passwordResetOtpLastSentAt).getTime()
      : 0;
    const waitMs = 60 * 1000 - (Date.now() - lastSent);

    if (waitMs > 0) {
      return res.status(429).json({
        message: `Please wait ${Math.ceil(
          waitMs / 1000
        )} seconds before requesting another code.`,
        retryAfterSeconds: Math.ceil(waitMs / 1000),
      });
    }

    const code = generateOtp();
    user.passwordResetOtpHash = hashToken(code);
    user.passwordResetOtpExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );
    user.passwordResetOtpAttempts = 0;
    user.passwordResetOtpLastSentAt = new Date();
    user.passwordResetOtpVerifiedAt = null;
    user.passwordResetSessionHash = null;
    user.passwordResetSessionExpires = null;
    await user.save();

    const { sendOtpEmail } = require("../services/emailService");

    try {
      await sendOtpEmail({
        to: user.email,
        name: user.name,
        code,
        expiresMinutes: 10,
      });
    } catch (emailError) {
      user.passwordResetOtpHash = null;
      user.passwordResetOtpExpires = null;
      user.passwordResetOtpAttempts = 0;
      user.passwordResetOtpLastSentAt = null;
      await user.save();

      console.error("PASSWORD RESET EMAIL ERROR");
      console.error("Message:", emailError.message);
      console.error("Code:", emailError.code);
      console.error("Command:", emailError.command);
      console.error("Response:", emailError.response);
      console.error("Response code:", emailError.responseCode);

      return res.status(503).json({
        message:
          process.env.NODE_ENV === "development"
            ? `Email delivery failed: ${emailError.message}`
            : "We could not send the verification code. Please try again shortly.",
        code: "EMAIL_DELIVERY_FAILED",
      });
    }

    return res.status(200).json({
      message: genericMessage,
      email: user.email,
      nextStep: "verify_otp",
    });
  } catch (error) {
    console.error("PASSWORD RESET REQUEST ERROR");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Stack:", error.stack);

    return res.status(500).json({
      message:
        process.env.NODE_ENV === "development"
          ? `Password reset request failed: ${error.message}`
          : "Password reset request failed.",
      code: "PASSWORD_RESET_REQUEST_FAILED",
    });
  }
};

const verifyPasswordResetOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").replace(/\D/g, "");

    if (!email || code.length !== 6) {
      return res.status(400).json({
        message: "Enter the six-digit verification code.",
      });
    }

    const user = await User.findOne({ email }).select(
      "+passwordResetOtpHash +passwordResetOtpExpires +passwordResetOtpAttempts +passwordResetSessionHash +passwordResetSessionExpires"
    );

    if (
      !user ||
      !user.passwordResetOtpHash ||
      !user.passwordResetOtpExpires ||
      user.passwordResetOtpExpires <= new Date()
    ) {
      return res.status(400).json({
        message:
          "This verification code is invalid or expired. Request a new code.",
      });
    }

    if (Number(user.passwordResetOtpAttempts || 0) >= 5) {
      user.passwordResetOtpHash = null;
      user.passwordResetOtpExpires = null;
      await user.save();
      return res.status(429).json({
        message:
          "Too many incorrect attempts. Request a new verification code.",
      });
    }

    if (hashToken(code) !== user.passwordResetOtpHash) {
      user.passwordResetOtpAttempts =
        Number(user.passwordResetOtpAttempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        message: "Incorrect verification code.",
        remainingAttempts: Math.max(
          0,
          5 - user.passwordResetOtpAttempts
        ),
      });
    }

    const resetSession = issueToken();
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpires = null;
    user.passwordResetOtpAttempts = 0;
    user.passwordResetOtpVerifiedAt = new Date();
    user.passwordResetSessionHash = hashToken(resetSession);
    user.passwordResetSessionExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );
    await user.save();

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
    const password = String(req.body.password || "");

    const strongPassword =
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password);

    if (!strongPassword) {
      return res.status(400).json({
        message:
          "Password must contain at least 8 characters, uppercase, lowercase, number and special character.",
      });
    }

    const user = await User.findOne({
      email,
      passwordResetSessionHash: hashToken(resetSession),
      passwordResetSessionExpires: { $gt: new Date() },
    }).select(
      "+password +passwordResetSessionHash +passwordResetSessionExpires"
    );

    if (!user) {
      return res.status(400).json({
        message:
          "Your verified reset session is invalid or expired. Start again.",
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetSessionHash = null;
    user.passwordResetSessionExpires = null;
    user.passwordResetOtpVerifiedAt = null;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
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
  getVerificationStatus,
  resendVerification,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
  changePassword,
};
