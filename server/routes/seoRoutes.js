const express = require("express");
const { getSeoBuffets, getSeoCatalog, getRobots, getSitemap } = require("../controllers/seoController");
const router = express.Router();
router.get("/catalog", getSeoCatalog);
router.get("/buffets", getSeoBuffets);
router.get("/robots.txt", getRobots);
router.get("/sitemap.xml", getSitemap);
module.exports = router;
