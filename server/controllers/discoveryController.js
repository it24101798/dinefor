const mongoose = require("mongoose");
const Buffet = require("../models/Buffet");
const Booking = require("../models/Booking");
const SavedSearch = require("../models/SavedSearch");
const RecentlyViewed = require("../models/RecentlyViewed");

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toNumber = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const normalizeDateKey = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};
const dayNameFromDateKey = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

const buildDiscoveryQuery = (params) => {
  const {
    q,
    city,
    province,
    category,
    buffetType,
    minPrice,
    maxPrice,
    minRating,
    featured,
    availableToday,
    date,
  } = params;

  const query = { isActive: true };
  if (buffetType) query.buffetType = buffetType;
  if (category) query.category = category;
  if (featured === "true") query.isFeatured = true;
  if (minRating) query.averageRating = { $gte: toNumber(minRating, 0) };

  const priceQuery = {};
  if (minPrice !== undefined && minPrice !== "") priceQuery.$gte = toNumber(minPrice, 0);
  if (maxPrice !== undefined && maxPrice !== "") priceQuery.$lte = toNumber(maxPrice, Number.MAX_SAFE_INTEGER);
  if (Object.keys(priceQuery).length) query.price = priceQuery;

  if (city) query["location.city"] = new RegExp(escapeRegex(city), "i");
  if (province) query["location.province"] = new RegExp(escapeRegex(province), "i");

  if (q) {
    const text = new RegExp(escapeRegex(q), "i");
    query.$or = [
      { title: text },
      { description: text },
      { category: text },
      { "location.city": text },
      { "location.address": text },
    ];
  }

  if (availableToday === "true" || date) {
    const dateKey = normalizeDateKey(date);
    const day = dayNameFromDateKey(dateKey);
    const dateObject = new Date(`${dateKey}T00:00:00.000Z`);
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { scheduleType: "all_days" },
        { scheduleType: "selected_days", recurringDays: day },
        { buffetType: "special", specialDate: { $gte: dateObject, $lt: new Date(`${dateKey}T23:59:59.999Z`) } },
        { availableFromDate: { $lte: dateObject }, availableToDate: { $gte: dateObject } },
      ],
    });
  }

  return query;
};

const getSort = (sort = "recommended") => {
  const map = {
    recommended: { isFeatured: -1, averageRating: -1, totalReviews: -1, createdAt: -1 },
    popular: { totalReviews: -1, likesCount: -1, averageRating: -1 },
    rating: { averageRating: -1, totalReviews: -1 },
    low_price: { price: 1 },
    high_price: { price: -1 },
    newest: { createdAt: -1 },
    featured: { isFeatured: -1, featuredUntil: -1 },
  };
  return map[sort] || map.recommended;
};

exports.searchDiscovery = async (req, res) => {
  try {
    const page = Math.max(toNumber(req.query.page, 1), 1);
    const limit = Math.min(Math.max(toNumber(req.query.limit, 20), 1), 60);
    const skip = (page - 1) * limit;
    const query = buildDiscoveryQuery(req.query);

    const [items, total] = await Promise.all([
      Buffet.find(query).populate("hotel").sort(getSort(req.query.sort)).skip(skip).limit(limit),
      Buffet.countDocuments(query),
    ]);

    res.status(200).json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      filters: req.query,
      buffets: items,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to search discovery feed.", error: error.message });
  }
};

exports.getDiscoveryMeta = async (req, res) => {
  try {
    const [categories, cities, priceStats] = await Promise.all([
      Buffet.distinct("category", { isActive: true }),
      Buffet.distinct("location.city", { isActive: true, "location.city": { $ne: "" } }),
      Buffet.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" }, avgPrice: { $avg: "$price" } } }]),
    ]);
    res.status(200).json({
      categories: categories.filter(Boolean).sort(),
      cities: cities.filter(Boolean).sort(),
      price: priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 },
      sortOptions: ["recommended", "popular", "rating", "low_price", "high_price", "newest", "featured"],
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch discovery metadata.", error: error.message });
  }
};

exports.getSimilarBuffets = async (req, res) => {
  try {
    const source = await Buffet.findById(req.params.buffetId).populate("hotel");
    if (!source) return res.status(404).json({ message: "Buffet not found." });
    const items = await Buffet.find({
      _id: { $ne: source._id },
      isActive: true,
      $or: [
        { category: source.category },
        { buffetType: source.buffetType },
        { "location.city": source.location?.city || "" },
        { price: { $gte: Math.max(Number(source.price || 0) - 1500, 0), $lte: Number(source.price || 0) + 1500 } },
      ],
    })
      .populate("hotel")
      .sort({ isFeatured: -1, averageRating: -1, createdAt: -1 })
      .limit(8);

    res.status(200).json({ source: source._id, buffets: items });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch similar buffets.", error: error.message });
  }
};

exports.getMapBuffets = async (req, res) => {
  try {
    const query = buildDiscoveryQuery(req.query);
    query["location.latitude"] = { $ne: null };
    query["location.longitude"] = { $ne: null };
    const buffets = await Buffet.find(query).populate("hotel").sort(getSort(req.query.sort)).limit(250);
    const markers = buffets.map((buffet) => ({
      id: buffet._id,
      title: buffet.title,
      category: buffet.category,
      price: buffet.price,
      rating: buffet.averageRating,
      hotel: buffet.hotel?.hotelName || buffet.hotel?.name || "Hotel",
      city: buffet.location?.city || "",
      latitude: buffet.location?.latitude,
      longitude: buffet.location?.longitude,
      thumbnail: buffet.thumbnail || buffet.images?.[0] || "",
    }));
    res.status(200).json({ markers });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch map buffets.", error: error.message });
  }
};

exports.saveSearch = async (req, res) => {
  try {
    const { name, filters } = req.body;
    const saved = await SavedSearch.create({ user: req.user.id, name: name || "Saved search", filters: filters || req.query || {} });
    res.status(201).json({ message: "Search saved.", savedSearch: saved });
  } catch (error) {
    res.status(500).json({ message: "Failed to save search.", error: error.message });
  }
};

exports.getSavedSearches = async (req, res) => {
  try {
    const items = await SavedSearch.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch saved searches.", error: error.message });
  }
};

exports.deleteSavedSearch = async (req, res) => {
  try {
    const item = await SavedSearch.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!item) return res.status(404).json({ message: "Saved search not found." });
    res.status(200).json({ message: "Saved search deleted." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete saved search.", error: error.message });
  }
};

exports.trackRecentlyViewed = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.buffetId)) return res.status(400).json({ message: "Invalid buffet ID." });
    const item = await RecentlyViewed.findOneAndUpdate(
      { user: req.user.id, buffet: req.params.buffetId },
      { viewedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "Recently viewed updated.", item });
  } catch (error) {
    res.status(500).json({ message: "Failed to track recently viewed.", error: error.message });
  }
};

exports.getRecentlyViewed = async (req, res) => {
  try {
    const items = await RecentlyViewed.find({ user: req.user.id }).populate({ path: "buffet", populate: { path: "hotel" } }).sort({ viewedAt: -1 }).limit(20);
    res.status(200).json(items.map((item) => item.buffet).filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch recently viewed.", error: error.message });
  }
};
