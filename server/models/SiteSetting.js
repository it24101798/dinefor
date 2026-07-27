const mongoose = require("mongoose");

const heroMediaItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image", "video"], required: true },
    url: { type: String, required: true, trim: true },
    posterUrl: { type: String, default: "", trim: true },
    alt: { type: String, default: "DineFor hotel buffet experience", trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const siteSettingSchema = new mongoose.Schema(
  {
    heroTitle: { type: String, default: "Discover Sri Lanka's Best Buffets" },
    heroSubtitle: {
      type: String,
      default: "Reserve premium hotel buffet experiences, special dining events, and luxury food offers in one place.",
    },
    heroMediaType: {
      type: String,
      enum: ["image", "video", "carousel", "mixed"],
      default: "image",
    },
    heroMediaUrl: {
      type: String,
      default: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1600&fit=crop",
    },
    heroMediaItems: { type: [heroMediaItemSchema], default: [] },
    heroAutoplay: { type: Boolean, default: true },
    heroSlideDuration: { type: Number, min: 2500, max: 30000, default: 6000 },
    videoMuted: { type: Boolean, default: true },
    fallbackHeroImage: {
      type: String,
      default: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1600&fit=crop",
    },
    themeMode: { type: String, enum: ["dark", "light"], default: "dark" },
    featuredSectionTitle: { type: String, default: "Featured Buffet Experiences" },
    popularSectionTitle: { type: String, default: "Popular Hotels & Dining Spots" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteSetting", siteSettingSchema);
