const express = require("express");
const {
  getHotelExperience,
  getHotelGallery,
  getHotelBuffets,
  getSimilarHotels,
} = require("../controllers/hotelExperienceController");

const router = express.Router();

router.get("/:id/experience", getHotelExperience);
router.get("/:id/gallery", getHotelGallery);
router.get("/:id/buffets", getHotelBuffets);
router.get("/:id/similar", getSimilarHotels);

module.exports = router;
