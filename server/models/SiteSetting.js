const mongoose = require("mongoose");

const siteSettingSchema = new mongoose.Schema(
  {
    heroTitle: {
      type: String,
      default: "Discover Sri Lanka's Best Buffets",
    },

    heroSubtitle: {
      type: String,
      default:
        "Reserve premium hotel buffet experiences, special dining events, and luxury food offers in one place.",
    },

    heroMediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },

    heroMediaUrl: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1555244162-803834f70033",
    },

    videoMuted: {
      type: Boolean,
      default: true,
    },

    themeMode: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },

    featuredSectionTitle: {
      type: String,
      default: "Featured Buffet Experiences",
    },

    popularSectionTitle: {
      type: String,
      default: "Popular Hotels & Dining Spots",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteSetting", siteSettingSchema);
