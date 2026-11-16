const Buffet = require("../models/Buffet");
const Booking = require("../models/Booking");
const DiscoveryEvent = require("../models/DiscoveryEvent");
const { availableSeats, rankingScore } = require("../services/discoveryRankingService");

const norm = (v) => String(v || "").trim();
const lower = (v) => norm(v).toLowerCase();
const toNumber = (v, fallback = null) => (v === "" || v == null || !Number.isFinite(Number(v)) ? fallback : Number(v));

function dateAvailable(buffet, dateText) {
  if (!dateText) return true;
  const date = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return true;
  const iso = date.toISOString().slice(0, 10);
  const day = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  if (buffet.buffetType === "special" && buffet.specialDate) {
    return new Date(buffet.specialDate).toISOString().slice(0, 10) === iso;
  }
  if (buffet.availableFromDate && iso < new Date(buffet.availableFromDate).toISOString().slice(0, 10)) return false;
  if (buffet.availableToDate && iso > new Date(buffet.availableToDate).toISOString().slice(0, 10)) return false;
  if (buffet.scheduleType === "selected_days" && buffet.recurringDays?.length) return buffet.recurringDays.includes(day);
  if (buffet.scheduleType === "one_day" && buffet.specialDate) return new Date(buffet.specialDate).toISOString().slice(0, 10) === iso;
  return true;
}

async function bookingStats(buffetIds) {
  if (!buffetIds.length) return new Map();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await Booking.aggregate([
    { $match: { buffet: { $in: buffetIds }, bookingStatus: { $in: ["confirmed", "checked_in", "dining", "completed"] } } },
    { $group: {
      _id: "$buffet",
      completed: { $sum: 1 },
      recent: { $sum: { $cond: [{ $gte: ["$createdAt", since] }, 1, 0] } },
      guests: { $sum: "$seats" },
    } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

function publicEligible(buffet) {
  return buffet.hotel?.isApproved === true && buffet.hotel.status === "approved";
}

const normalizedWords = value => lower(value).replace(/[-_]+/g, " ").replace(/\s+/g, " ");
const publicBuffetFields = "hotel title slug description category buffetType price location thumbnail images highlights isFeatured averageRating totalReviews createdAt isActive status availableFromDate availableToDate specialDate scheduleType recurringDays timeSlots maxGuestsPerBooking";

async function loadEligibleBuffets() {
  const rows = await Buffet.find({ isActive: { $ne: false }, status: "active" })
    .select(publicBuffetFields)
    .sort({ _id: 1 })
    .populate("hotel", "hotelName slug location address city district province isApproved status averageRating totalReviews coverMediaUrl galleryImages amenities mapLocation featured")
    .lean();
  return rows.filter(publicEligible);
}

function matches(buffet, q) {
  const query = lower(q.query);
  const location = lower(q.location);
  const category = normalizedWords(q.category || q.meal);
  const buffetType = lower(q.buffetType);
  const minPrice = toNumber(q.minPrice);
  const maxPrice = toNumber(q.maxPrice);
  const minRating = toNumber(q.minRating || q.rating);
  const guests = Math.max(1, toNumber(q.guests, 1));
  const text = normalizedWords([buffet.title, buffet.description, buffet.category, buffet.buffetType, buffet.hotel?.hotelName, buffet.location?.city, buffet.location?.address, buffet.hotel?.location, buffet.hotel?.city, buffet.hotel?.address, buffet.hotel?.district, buffet.hotel?.province].join(" "));
  const locationText = lower([buffet.location?.city, buffet.location?.address, buffet.hotel?.location, buffet.hotel?.city, buffet.hotel?.address, buffet.hotel?.district, buffet.hotel?.province].join(" "));
  if (query && !text.includes(normalizedWords(query))) return false;
  if (location && !locationText.includes(location)) return false;
  if (category && normalizedWords(buffet.category) !== category
      && !normalizedWords(buffet.title).includes(category)) return false;
  const dietary = norm(q.diet).split(",").filter(Boolean);
  const amenities = norm(q.amenities).split(",").filter(Boolean);
  const highlights = (buffet.highlights || []).map(normalizedWords);
  const hotelAmenities = (buffet.hotel.amenities || []).map(normalizedWords);
  if (!dietary.every(value => highlights.includes(normalizedWords(value)))) return false;
  if (!amenities.every(value => hotelAmenities.includes(normalizedWords(value)))) return false;
  if (buffetType && buffetType !== "all" && lower(buffet.buffetType) !== buffetType) return false;
  if (minPrice != null && Number(buffet.price || 0) < minPrice) return false;
  if (maxPrice != null && Number(buffet.price || 0) > maxPrice) return false;
  if (minRating != null && Number(buffet.averageRating || buffet.hotel?.averageRating || 0) < minRating) return false;
  if (q.guests && guests > Number(buffet.maxGuestsPerBooking || 20)) return false;
  if ((q.availableOnly === "true" || q.availableOnly === true) && availableSeats(buffet) < guests) return false;
  if (!dateAvailable(buffet, q.date)) return false;
  return true;
}

function sortRows(rows, sort) {
  switch (sort) {
    case "popular": return rows.sort((a, b) => b.discoverySignals.recentBookings - a.discoverySignals.recentBookings || b.discoveryScore - a.discoveryScore);
    case "rating": return rows.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
    case "reviews": return rows.sort((a, b) => Number(b.totalReviews || 0) - Number(a.totalReviews || 0));
    case "price-low": case "lowest": return rows.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    case "price-high": case "highest": return rows.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    case "newest": return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case "availability": case "seats": return rows.sort((a, b) => b.discoverySignals.availableSeats - a.discoverySignals.availableSeats);
    default: return rows.sort((a, b) => b.discoveryScore - a.discoveryScore);
  }
}

async function buildResults(query) {
  const all = await loadEligibleBuffets();
  const filtered = all.filter((b) => matches(b, query));
  const stats = await bookingStats(filtered.map((b) => b._id));
  return sortRows(filtered.map((buffet) => {
    const stat = stats.get(String(buffet._id)) || {};
    return {
      ...buffet,
      discoveryScore: rankingScore(buffet, stat, query.query),
      discoverySignals: {
        availableSeats: availableSeats(buffet),
        completedBookings: Number(stat.completed || 0),
        recentBookings: Number(stat.recent || 0),
        bookedGuests: Number(stat.guests || 0),
      },
    };
  }), query.sort || query.sortBy || "recommended");
}

exports.search = async (req, res, next) => {
  try {
    const rows = await buildResults(req.query);
    const page = Math.max(1, Math.trunc(toNumber(req.query.page, 1)));
    const limit = Math.min(100, Math.max(1, Math.trunc(toNumber(req.query.limit, 24))));
    if (req.query.view === "map") {
      const grouped = new Map();
      for (const buffet of rows) {
        const hotel = buffet.hotel;
        const { latitude, longitude } = hotel.mapLocation || {};
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
          || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || (!latitude && !longitude)) continue;
        const id = String(hotel._id);
        const entry = grouped.get(id) || { hotel, buffet, count: 0 };
        entry.count += 1;
        if (buffet.price < entry.buffet.price) entry.buffet = buffet;
        grouped.set(id, entry);
      }
      return res.json({ data: [...grouped.values()] });
    }
    const start = (page - 1) * limit;
    const locations = Object.create(null);
    const categories = Object.create(null);
    rows.forEach((b) => {
      const loc = norm(b.location?.city || b.hotel?.city || b.hotel?.location);
      if (loc) locations[loc] = (locations[loc] || 0) + 1;
      const cat = norm(b.category);
      if (cat) categories[cat] = (categories[cat] || 0) + 1;
    });
    const prices = rows.map((b) => Number(b.price || 0)).filter(Number.isFinite);
    res.json({
      success: true,
      data: rows.slice(start, start + limit),
      buffets: rows.slice(start, start + limit),
      pagination: { page, limit, total: rows.length, pages: Math.max(1, Math.ceil(rows.length / limit)) },
      facets: { locations, categories, minPrice: prices.length ? Math.min(...prices) : 0, maxPrice: prices.length ? Math.max(...prices) : 0 },
    });
    if (req.query.query || req.query.location || req.query.category || req.query.meal) {
      DiscoveryEvent.create({ eventType: rows.length ? "search" : "zero_result", query: norm(req.query.query), location: norm(req.query.location), category: norm(req.query.category || req.query.meal), resultCount: rows.length, source: norm(req.query.source) || "discovery" }).catch(() => {});
    }
  } catch (e) { next(e); }
};

exports.facets = async (req, res, next) => {
  try {
    const rows = await buildResults({});
    const count = (getter) => rows.reduce((acc, row) => { const key = norm(getter(row)); if (key) acc[key] = (acc[key] || 0) + 1; return acc; }, {});
    const prices = rows.map((b) => Number(b.price || 0));
    res.json({ success: true, total: rows.length, locations: count((b) => b.location?.city || b.hotel?.city || b.hotel?.location), categories: count((b) => b.category), buffetTypes: count((b) => b.buffetType), price: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 } });
  } catch (e) { next(e); }
};

exports.trending = async (req, res, next) => {
  try {
    const rows = await buildResults({ sort: "popular" });
    res.json({ success: true, data: rows.slice(0, Math.min(20, Math.max(1, toNumber(req.query.limit, 12)))) });
  } catch (e) { next(e); }
};

exports.suggestions = async (req, res, next) => {
  try {
    const q = lower(req.query.q);
    const rows = await loadEligibleBuffets();
    const set = new Set();
    rows.forEach((b) => [b.title, b.hotel?.hotelName, b.location?.city || b.hotel?.city, b.category].filter(Boolean).forEach((v) => { if (!q || lower(v).includes(q)) set.add(String(v)); }));
    res.json({ success: true, data: [...set].slice(0, 10) });
  } catch (e) { next(e); }
};

exports.track = async (req, res, next) => {
  try {
    const allowed = ["search", "zero_result", "impression", "buffet_view", "booking_start"];
    if (!allowed.includes(req.body.eventType)) return res.status(400).json({ message: "Unsupported discovery event." });
    const event = await DiscoveryEvent.create({
      eventType: req.body.eventType,
      buffet: req.body.buffet || null,
      hotel: req.body.hotel || null,
      user: req.user?._id || null,
      query: norm(req.body.query), location: norm(req.body.location), category: norm(req.body.category),
      resultCount: Math.max(0, toNumber(req.body.resultCount, 0)), source: norm(req.body.source) || "discovery",
      sessionId: norm(req.body.sessionId), metadata: req.body.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {},
    });
    res.status(201).json({ success: true, id: event._id });
  } catch (e) { next(e); }
};
