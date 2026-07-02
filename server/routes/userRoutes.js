const express = require("express");
const {
  getMe,
  updateMe,
  toggleSavedBuffet,
  getSavedBuffets,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.get("/saved-buffets", protect, getSavedBuffets);
router.put("/saved-buffets/:buffetId", protect, toggleSavedBuffet);

module.exports = router;
