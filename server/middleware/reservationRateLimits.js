const rateLimit = require("express-rate-limit");

const createLimiter = (limit, keyGenerator) => rateLimit({
  windowMs: 5 * 60_000,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  ...(keyGenerator ? { keyGenerator } : {}),
  message: { code: "RESERVATION_RATE_LIMIT", message: "Too many requests. Wait a few minutes and try again." },
});

const accountKey = (req) => String(req.user.id);

module.exports = {
  availabilityLimiter: createLimiter(180),
  quoteLimiter: createLimiter(90, accountKey),
  reservationWriteLimiter: createLimiter(35, accountKey),
};
