const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const controller = require("../controllers/reconciliationController");

const router = express.Router();
router.use(protect, authorize("admin"));
router.get("/issues", controller.getIssues);
router.post("/audit", controller.runAudit);
router.put("/issues/:id", controller.updateIssue);
module.exports = router;
