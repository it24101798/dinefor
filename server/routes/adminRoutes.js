const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAdminOverview,
  getAdminUsers,
  updateUserApproval,
  updateUserRole,
  getAdminBookings,
  getActivityLogs,
  getSystemSettings,
  upsertSystemSetting,
} = require("../controllers/adminController");

const router = express.Router();
router.use(protect, authorize("admin"));

router.get("/overview", getAdminOverview);
router.get("/users", getAdminUsers);
router.put("/users/:id/approval", updateUserApproval);
router.put("/users/:id/role", updateUserRole);
router.get("/bookings", getAdminBookings);
router.get("/activity", getActivityLogs);
router.get("/settings", getSystemSettings);
router.put("/settings", upsertSystemSetting);

module.exports = router;
