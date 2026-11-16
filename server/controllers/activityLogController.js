const ActivityLog = require("../models/ActivityLog");

exports.getActivityLogs = async (req, res) => {
  try {
    const integer = (value, fallback, max) => {
      const parsed = Number(value);
      return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
    };
    const page = integer(req.query.page, 1, 10000);
    const limit = integer(req.query.limit, 25, 100);
    const filter = {};

    if (req.query.action) {
      filter.action = {
        $regex: String(req.query.action).trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    if (req.query.entityType) {
      filter.entityType = String(req.query.entityType).trim().slice(0, 50);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .select("actor actorRole action entityType entityId message createdAt")
        .populate("actor", "name role")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ActivityLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch audit logs.",
    });
  }
};
