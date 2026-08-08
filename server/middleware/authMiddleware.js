const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  if (!req.headers.authorization?.startsWith("Bearer ")) return res.status(401).json({ message: "Not authorized, no token." });
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "Account no longer exists." });
    if (user.isActive === false) return res.status(403).json({ message: "This account is disabled.", code: "ACCOUNT_DISABLED" });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed." });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Access denied." });
  next();
};
module.exports = { protect, authorize };
