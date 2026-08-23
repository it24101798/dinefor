const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const { DESTINATIONS, CATEGORIES, PRICE_COLLECTIONS, destinationRoutes } = require("../config/seoCatalog");

const SITE_URL = (process.env.PUBLIC_SITE_URL || "https://dinefor.com").replace(/\/$/, "");
const STATIC_LANDINGS = [
  "best-buffets-in-colombo", "best-buffets-in-galle", "best-buffets-in-kandy",
  "most-popular-buffets", "top-rated-buffets", "latest-buffets",
  "best-high-tea-in-colombo", "best-dinner-buffets-in-colombo",
  "best-lunch-buffets-in-colombo", "best-seafood-buffets-in-colombo",
  ...PRICE_COLLECTIONS.map((item) => item.slug),
];

const activeBuffetQuery = () => ({
  isActive: true,
  $or: [{ status: "active" }, { status: { $exists: false } }],
});

exports.getSeoCatalog = (req, res) => {
  res.json({ destinations: DESTINATIONS, categories: CATEGORIES, priceCollections: PRICE_COLLECTIONS });
};

exports.getSeoBuffets = async (req, res) => {
  try {
    const { city, category, sort = "recommended", day } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 60);
    const minPrice = finiteNumber(req.query.minPrice);
    const maxPrice = finiteNumber(req.query.maxPrice);
    const minRating = finiteNumber(req.query.minRating);
    const query = activeBuffetQuery();
    const and = [];

    if (category) and.push({ category: String(category).toLowerCase() });
    if (minPrice !== null || maxPrice !== null) {
      const price = {};
      if (minPrice !== null) price.$gte = minPrice;
      if (maxPrice !== null) price.$lte = maxPrice;
      and.push({ price });
    }
    if (minRating !== null) and.push({ averageRating: { $gte: minRating } });
    if (day) and.push({ recurringDays: new RegExp(`^${escapeRegex(day)}$`, "i") });

    if (city) {
      const cityRegex = new RegExp(escapeRegex(city), "i");
      const matchingHotels = await Hotel.find({
        isApproved: true,
        status: "approved",
        $or: [{ city: cityRegex }, { location: cityRegex }, { district: cityRegex }],
      }).select("_id").lean();
      const hotelIds = matchingHotels.map((hotel) => hotel._id);
      and.push({
        $or: [
          { "location.city": cityRegex },
          { "location.address": cityRegex },
          { hotel: { $in: hotelIds } },
        ],
      });
    }

    if (and.length) query.$and = and;

    const sortMap = {
      popular: { likesCount: -1, totalReviews: -1, averageRating: -1, createdAt: -1 },
      rating: { averageRating: -1, totalReviews: -1, createdAt: -1 },
      newest: { createdAt: -1 },
      price_asc: { price: 1, averageRating: -1 },
      price_desc: { price: -1, averageRating: -1 },
      recommended: { isFeatured: -1, averageRating: -1, totalReviews: -1, createdAt: -1 },
    };

    const items = await Buffet.find(query)
      .populate("hotel")
      .sort(sortMap[sort] || sortMap.recommended)
      .limit(limit)
      .lean();

    res.json({
      items,
      count: items.length,
      filters: { city: city || null, category: category || null, sort, minPrice, maxPrice, minRating, day: day || null },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load SEO buffet collection.", error: error.message });
  }
};

exports.getRobots = (req, res) => {
  res.type("text/plain").send([
    "User-agent: *", "Allow: /", "Disallow: /admin/", "Disallow: /hotel/", "Disallow: /customer/",
    "Disallow: /account-security", "Disallow: /payments", "", `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join("\n"));
};

exports.getSitemap = async (req, res) => {
  try {
    const [buffets, hotels] = await Promise.all([
      Buffet.find(activeBuffetQuery()).select("_id slug updatedAt").lean(),
      Hotel.find({ isApproved: true, status: "approved" }).select("_id slug updatedAt").lean(),
    ]);

    const staticPaths = ["/", "/discover", "/map", ...STATIC_LANDINGS.map((x) => `/${x}`), ...destinationRoutes];
    const dynamicPaths = [
      ...buffets.map((item) => `/buffets/${item.slug || item._id}`),
      ...hotels.map((item) => `/hotels/${item.slug || item._id}`),
    ];
    const urls = [...new Set([...staticPaths, ...dynamicPaths])];
    const lastmod = new Date().toISOString();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `  <url><loc>${SITE_URL}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}\n</urlset>`;
    res.type("application/xml").send(xml);
  } catch (error) {
    res.status(500).type("text/plain").send("Unable to generate sitemap.");
  }
};

function finiteNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function escapeRegex(value = "") { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
