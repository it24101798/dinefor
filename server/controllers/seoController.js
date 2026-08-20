const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");

const SITE_URL = (process.env.PUBLIC_SITE_URL || "https://dinefor.com").replace(/\/$/, "");
const STATIC_LANDINGS = ["best-buffets-in-colombo","best-buffets-in-galle","best-buffets-in-kandy","most-popular-buffets","top-rated-buffets","latest-buffets","best-high-tea-in-colombo","best-dinner-buffets-in-colombo","best-lunch-buffets-in-colombo","best-seafood-buffets-in-colombo"];

exports.getSeoBuffets = async (req, res) => {
  try {
    const { city, category, sort = "recommended" } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 60);
    const query = { isActive: true, $or: [{ status: "active" }, { status: { $exists: false } }] };
    if (category) query.category = category;
    if (city) query.$and = [{ $or: [{ "location.city": new RegExp(`^${escapeRegex(city)}$`, "i") }] }];
    const sortMap = {
      popular: { likesCount: -1, totalReviews: -1, averageRating: -1, createdAt: -1 },
      rating: { averageRating: -1, totalReviews: -1, createdAt: -1 },
      newest: { createdAt: -1 },
      recommended: { isFeatured: -1, averageRating: -1, totalReviews: -1, createdAt: -1 },
    };
    let items = await Buffet.find(query).populate("hotel").sort(sortMap[sort] || sortMap.recommended).limit(limit).lean();
    if (city) items = items.filter((b) => [b.location?.city, b.hotel?.city, b.hotel?.location].filter(Boolean).some((v) => String(v).toLowerCase().includes(String(city).toLowerCase())));
    res.json({ items, count: items.length, filters: { city: city || null, category: category || null, sort } });
  } catch (error) { res.status(500).json({ message: "Failed to load SEO buffet collection.", error: error.message }); }
};

exports.getRobots = (req, res) => {
  res.type("text/plain").send(["User-agent: *","Allow: /","Disallow: /admin/","Disallow: /hotel/","Disallow: /customer/","Disallow: /account-security","Disallow: /payments","",`Sitemap: ${SITE_URL}/sitemap.xml`].join("\n"));
};

exports.getSitemap = async (req, res) => {
  try {
    const [buffets, hotels] = await Promise.all([
      Buffet.find({ isActive: true, $or: [{ status: "active" }, { status: { $exists: false } }] }).select("_id updatedAt").lean(),
      Hotel.find({ isApproved: true, status: "approved" }).select("_id updatedAt").lean(),
    ]);
    const urls = ["/","/discover","/map", ...STATIC_LANDINGS.map((x) => `/${x}`), ...buffets.map((x) => `/buffets/${x._id}`), ...hotels.map((x) => `/hotels/${x._id}`)];
    const lastmod = new Date().toISOString();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `  <url><loc>${SITE_URL}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}\n</urlset>`;
    res.type("application/xml").send(xml);
  } catch (error) { res.status(500).type("text/plain").send("Unable to generate sitemap."); }
};

function escapeRegex(value = "") { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
