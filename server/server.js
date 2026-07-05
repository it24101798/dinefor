const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const path = require("path");
const fs = require("fs");

dotenv.config();
connectDB();

const app = express();

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174", process.env.CLIENT_URL].filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => res.send("DineFor API is running..."));

const mount = (basePath, routePath) => {
  try {
    app.use(basePath, require(routePath));
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND" && String(error.message || "").includes(routePath.replace("./", ""))) {
      console.warn(`[DineFor] Optional route not mounted: ${basePath} (${routePath})`);
    } else {
      throw error;
    }
  }
};

mount("/api/auth", "./routes/authRoutes");
mount("/api/hotels", "./routes/hotelRoutes");
mount("/api/hotel-experience", "./routes/hotelExperienceRoutes");
mount("/api/hotel-portal", "./routes/hotelPortalRoutes");
mount("/api/buffets", "./routes/buffetRoutes");
mount("/api/bookings", "./routes/bookingRoutes");
mount("/api/booking-lifecycle", "./routes/bookingLifecycleRoutes");
mount("/api/reviews", "./routes/reviewRoutes");
mount("/api/site-settings", "./routes/siteSettingRoutes");
mount("/api/uploads", "./routes/uploadRoutes");
mount("/api/users", "./routes/userRoutes");
mount("/api/admin", "./routes/adminRoutes");
mount("/api/customer", "./routes/customerExperienceRoutes");
mount("/api/analytics", "./routes/analyticsRoutes");
mount("/api/payments", "./routes/paymentRoutes");
mount("/api/coupons", "./routes/couponRoutes");
mount("/api/notifications", "./routes/notificationRoutes");
mount("/api/discovery", "./routes/discoveryRoutes");

app.use((req, res) => res.status(404).json({ message: "API route not found.", path: req.originalUrl }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
