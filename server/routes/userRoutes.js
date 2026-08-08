const express = require("express");

const {
  getMe,
  getMyStats,
  updateMe,
  toggleSavedBuffet,
  getSavedBuffets,
  getSavedStatus,
  getAllUsersAdmin,
  updateUserAdmin,
  requestPasswordResetAdmin,
  deleteUserAdmin,
} = require("../controllers/userController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/admin/all", protect, authorize("admin"), getAllUsersAdmin);
router.patch("/admin/:id", protect, authorize("admin"), updateUserAdmin);
router.post(
  "/admin/:id/request-password-reset",
  protect,
  authorize("admin"),
  requestPasswordResetAdmin
);
router.delete(
  "/admin/:id",
  protect,
  authorize("admin"),
  deleteUserAdmin
);

router.get("/me", protect, getMe);
router.get("/me/stats", protect, getMyStats);
router.put("/me", protect, updateMe);

router.get("/saved-status", protect, getSavedStatus);
router.get("/saved-buffets", protect, getSavedBuffets);
router.put("/saved-buffets/:buffetId", protect, toggleSavedBuffet);

module.exports = router;
