const express = require("express");
const {
  getMe,
  updateMe,
  toggleSavedBuffet,
  getSavedBuffets,
  getAllUsersAdmin,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/admin/all", protect, authorize("admin"), getAllUsersAdmin);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.get("/saved-buffets", protect, getSavedBuffets);
router.put("/saved-buffets/:buffetId", protect, toggleSavedBuffet);

module.exports = router;
