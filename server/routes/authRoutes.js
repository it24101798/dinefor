const express = require("express");
const {
  registerUser,
  loginUser,
  googleLogin,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const codeRequests = require("express-rate-limit")({
  windowMs: 15 * 60000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many code requests. Please wait and try again." },
});

router.post("/register", codeRequests, registerUser);
router.post("/login", loginUser);
router.post("/google", googleLogin);

router.post("/verify-email", verifyEmail);
router.post("/resend-verification", codeRequests, resendVerification);

router.post("/forgot-password", codeRequests, forgotPassword);
router.post("/verify-reset-otp", verifyPasswordResetOtp);
router.post("/reset-password", resetPassword);
router.put("/change-password", protect, changePassword);

module.exports = router;
