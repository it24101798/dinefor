const ActivityLog = require("../models/ActivityLog");

exports.getActivityLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(10, Number(req.query.limit || 50)));
    const filter = {};

    if (req.query.action) {
      filter.action = {
        $regex: String(req.query.action),
        $options: "i",
      };
    }

    if (req.query.entityType) {
      filter.entityType = String(req.query.entityType);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("actor", "name email role")
        .sort({ createdAt: -1 })
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
