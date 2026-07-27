const SiteSetting = require("../models/SiteSetting");

const normalizeItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .filter((item) => item && ["image", "video"].includes(item.type) && typeof item.url === "string" && item.url.trim())
    .map((item, index) => ({
      _id: item._id,
      type: item.type,
      url: item.url.trim(),
      posterUrl: typeof item.posterUrl === "string" ? item.posterUrl.trim() : "",
      alt: typeof item.alt === "string" && item.alt.trim() ? item.alt.trim() : "DineFor hotel buffet experience",
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index,
      isActive: item.isActive !== false,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

exports.getSiteSettings = async (req, res) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) settings = await SiteSetting.create({});
    return res.status(200).json(settings);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch site settings.", error: error.message });
  }
};

exports.updateSiteSettings = async (req, res) => {
  try {
    const allowed = [
      "heroTitle", "heroSubtitle", "heroMediaType", "heroMediaUrl", "heroAutoplay",
      "heroSlideDuration", "videoMuted", "fallbackHeroImage", "themeMode",
      "featuredSectionTitle", "popularSectionTitle",
    ];
    const update = {};
    allowed.forEach((key) => { if (req.body[key] !== undefined) update[key] = req.body[key]; });
    if (req.body.heroMediaItems !== undefined) update.heroMediaItems = normalizeItems(req.body.heroMediaItems);
    if (update.heroSlideDuration !== undefined) {
      update.heroSlideDuration = Math.min(30000, Math.max(2500, Number(update.heroSlideDuration) || 6000));
    }

    let settings = await SiteSetting.findOne();
    if (!settings) settings = await SiteSetting.create(update);
    else settings = await SiteSetting.findByIdAndUpdate(settings._id, update, { new: true, runValidators: true });

    return res.status(200).json({ message: "Site settings updated successfully.", settings });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update site settings.", error: error.message });
  }
};
