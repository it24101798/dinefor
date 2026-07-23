const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

/*
|--------------------------------------------------------------------------
| Reverse proxy support
|--------------------------------------------------------------------------
| Required later when DineFor runs behind Nginx or Cloudflare.
*/
app.set("trust proxy", 1);

/*
|--------------------------------------------------------------------------
| Upload directory
|--------------------------------------------------------------------------
*/
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/*
|--------------------------------------------------------------------------
| Allowed frontend origins
|--------------------------------------------------------------------------
*/
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://dinefor.com",
  "https://www.dinefor.com",
  process.env.CLIENT_URL,
].filter(Boolean);

/*
|--------------------------------------------------------------------------
| Security headers
|--------------------------------------------------------------------------
| crossOriginResourcePolicy is configured as cross-origin because the
| frontend and uploaded images may be served from different subdomains.
*/
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no browser origin, such as Postman or server calls.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked request from: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/*
|--------------------------------------------------------------------------
| Compression and body parsers
|--------------------------------------------------------------------------
*/
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/*
|--------------------------------------------------------------------------
| Logging
|--------------------------------------------------------------------------
*/
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/*
|--------------------------------------------------------------------------
| Static uploads
|--------------------------------------------------------------------------
*/
app.use(
  "/uploads",
  express.static(uploadsDir, {
    maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
    etag: true,
  })
);

/*
|--------------------------------------------------------------------------
| General API rate limiter
|--------------------------------------------------------------------------
| Allows 300 API requests per IP every 15 minutes.
*/
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

/*
|--------------------------------------------------------------------------
| Stricter authentication rate limiter
|--------------------------------------------------------------------------
| Protects login and registration routes from repeated attempts.
*/
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});

app.use("/api/auth", authLimiter);

/*
|--------------------------------------------------------------------------
| Health routes
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
  res.status(200).send("DineFor API is running...");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "DineFor API",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| API routes
|--------------------------------------------------------------------------
*/
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/hotels", require("./routes/hotelRoutes"));
app.use(
  "/api/hotel-experience",
  require("./routes/hotelExperienceRoutes")
);
app.use("/api/hotel-portal", require("./routes/hotelPortalRoutes"));
app.use("/api/discovery", require("./routes/discoveryRoutes"));
app.use("/api/buffets", require("./routes/buffetRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/site-settings", require("./routes/siteSettingRoutes"));
app.use("/api/uploads", require("./routes/uploadRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/customer", require("./routes/customerExperienceRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));

/*
|--------------------------------------------------------------------------
| 404 handler
|--------------------------------------------------------------------------
*/
app.use((req, res) => {
  res.status(404).json({
    message: "API route not found.",
    path: req.originalUrl,
  });
});

/*
|--------------------------------------------------------------------------
| Global error handler
|--------------------------------------------------------------------------
*/
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (error.message?.startsWith("CORS blocked request")) {
    return res.status(403).json({
      message: "This website is not allowed to access the DineFor API.",
    });
  }

  return res.status(error.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected server error occurred."
        : error.message || "An unexpected server error occurred.",
  });
});

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});