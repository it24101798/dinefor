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

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("DineFor API is running...");
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/hotels", require("./routes/hotelRoutes"));
app.use("/api/hotel-experience", require("./routes/hotelExperienceRoutes"));
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

app.use((req, res) => {
  res.status(404).json({ message: "API route not found." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
