const express = require("express");
const {
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
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleLogin);

router.get("/verification-status", getVerificationStatus);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyPasswordResetOtp);
router.post("/reset-password", resetPassword);
router.put("/change-password", protect, changePassword);

module.exports = router;
