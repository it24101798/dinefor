const express = require("express");

const router = express.Router();

router.post("/subscribe", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) return res.status(400).json({ message: "Please enter a valid email address." });

  // Temporary safe endpoint for UI stability. Later this can be connected to a Newsletter model or email provider.
  return res.status(200).json({
    message: "Thank you for subscribing to DineFor updates.",
    subscribed: true,
    email,
  });
});

module.exports = router;
