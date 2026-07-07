const Review = require("../models/Review");
const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const Booking = require("../models/Booking");

const publicStatuses = ["published"];

const normalizeRating = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const rating = Number(value);
  if (Number.isNaN(rating) || rating < 1 || rating > 5) return null;
  return rating;
};

const normalizeMedia = (images = [], videos = [], media = []) => {
  const finalMedia = [];
  if (Array.isArray(media)) {
    media.slice(0, 12).forEach((item) => {
      if (typeof item === "string") finalMedia.push({ url: item, mediaType: item.match(/\.mp4|\.webm|\.mov/i) ? "video" : "image" });
      else if (item?.url) finalMedia.push({ url: item.url, mediaType: item.mediaType === "video" ? "video" : "image", caption: item.caption || "" });
    });
  }
  if (Array.isArray(images)) images.slice(0, 8).forEach((url) => url && finalMedia.push({ url, mediaType: "image" }));
  if (Array.isArray(videos)) videos.slice(0, 4).forEach((url) => url && finalMedia.push({ url, mediaType: "video" }));
  return finalMedia.slice(0, 12);
};

const buildRatingStats = (reviews) => {
  const totalReviews = reviews.length;
  const averageRating = totalReviews === 0 ? 0 : reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalReviews;
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((review) => {
    const rounded = Math.round(Number(review.rating || 0));
    if (breakdown[rounded] !== undefined) breakdown[rounded] += 1;
  });
  return { totalReviews, averageRating: Number(averageRating.toFixed(1)), breakdown };
};

const updateBuffetRating = async (buffetId) => {
  const reviews = await Review.find({ buffet: buffetId, status: { $in: publicStatuses } });
  const stats = buildRatingStats(reviews);
  await Buffet.findByIdAndUpdate(buffetId, { averageRating: stats.averageRating, totalReviews: stats.totalReviews });
  return stats;
};

const updateHotelRating = async (hotelId) => {
  const reviews = await Review.find({ hotel: hotelId, status: { $in: publicStatuses } });
  const stats = buildRatingStats(reviews);
  await Hotel.findByIdAndUpdate(hotelId, { averageRating: stats.averageRating, totalReviews: stats.totalReviews });
  return stats;
};

const reviewPopulate = [
  { path: "user", select: "name email avatarUrl" },
  { path: "hotel", select: "hotelName location city averageRating totalReviews" },
  { path: "buffet", select: "title price category thumbnail" },
  { path: "hotelReply.repliedBy", select: "name email role" },
];

exports.createReview = async (req, res) => {
  try {
    const { buffetId, rating, comment, images, videos, media, visitType, tags } = req.body;
    if (!buffetId || !rating) return res.status(400).json({ message: "Buffet ID and rating are required." });

    const numericRating = normalizeRating(rating);
    if (!numericRating) return res.status(400).json({ message: "Rating must be between 1 and 5." });

    const buffet = await Buffet.findById(buffetId).populate("hotel");
    if (!buffet) return res.status(404).json({ message: "Buffet not found." });

    const verifiedBooking = await Booking.findOne({
      user: req.user.id,
      buffet: buffetId,
      bookingStatus: { $in: ["confirmed", "checked_in", "dining", "completed"] },
    }).sort({ createdAt: -1 });

    const normalizedMedia = normalizeMedia(images, videos, media);
    const review = await Review.create({
      user: req.user.id,
      hotel: buffet.hotel._id,
      buffet: buffetId,
      booking: verifiedBooking?._id || null,
      rating: numericRating,
      foodRating: normalizeRating(req.body.foodRating),
      serviceRating: normalizeRating(req.body.serviceRating),
      ambienceRating: normalizeRating(req.body.ambienceRating),
      valueRating: normalizeRating(req.body.valueRating),
      comment: comment || "",
      visitType: visitType || "",
      tags: Array.isArray(tags) ? tags.slice(0, 10).map((tag) => String(tag).trim()).filter(Boolean) : [],
      images: normalizedMedia.filter((item) => item.mediaType === "image").map((item) => item.url).slice(0, 8),
      videos: normalizedMedia.filter((item) => item.mediaType === "video").map((item) => item.url).slice(0, 4),
      media: normalizedMedia,
      isVerifiedBooking: Boolean(verifiedBooking),
      status: "published",
    });

    await updateBuffetRating(buffetId);
    await updateHotelRating(buffet.hotel._id);

    const populatedReview = await Review.findById(review._id).populate(reviewPopulate);
    res.status(201).json({
      message: verifiedBooking ? "Verified review added successfully." : "Review added successfully.",
      review: populatedReview,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create review.", error: error.message });
  }
};

exports.getBuffetReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ buffet: req.params.buffetId, status: { $in: publicStatuses } }).populate(reviewPopulate).sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch buffet reviews.", error: error.message });
  }
};

exports.getHotelReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ hotel: req.params.hotelId, status: { $in: publicStatuses } }).populate(reviewPopulate).sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hotel reviews.", error: error.message });
  }
};

exports.getReviewSummaryByBuffet = async (req, res) => {
  try {
    const reviews = await Review.find({ buffet: req.params.buffetId, status: { $in: publicStatuses } });
    res.status(200).json(buildRatingStats(reviews));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch buffet review summary.", error: error.message });
  }
};

exports.getReviewSummaryByHotel = async (req, res) => {
  try {
    const reviews = await Review.find({ hotel: req.params.hotelId, status: { $in: publicStatuses } });
    res.status(200).json(buildRatingStats(reviews));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hotel review summary.", error: error.message });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const { status = "all", rating = "all", q = "" } = req.query;
    const filter = {};
    if (status !== "all") filter.status = status;
    if (rating !== "all") filter.rating = Number(rating);
    let reviews = await Review.find(filter).populate(reviewPopulate).sort({ createdAt: -1 });
    if (q.trim()) {
      const needle = q.toLowerCase();
      reviews = reviews.filter((review) => [review.comment, review.user?.name, review.user?.email, review.hotel?.hotelName, review.buffet?.title]
        .filter(Boolean).join(" ").toLowerCase().includes(needle));
    }
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews.", error: error.message });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["published", "hidden", "flagged", "pending"].includes(status)) return res.status(400).json({ message: "Invalid review status." });
    const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate(reviewPopulate);
    if (!review) return res.status(404).json({ message: "Review not found." });
    await updateBuffetRating(review.buffet?._id || review.buffet);
    await updateHotelRating(review.hotel?._id || review.hotel);
    res.status(200).json({ message: "Review status updated.", review });
  } catch (error) {
    res.status(500).json({ message: "Failed to update review status.", error: error.message });
  }
};

exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found." });
    const userId = String(req.user.id);
    const already = review.helpfulBy.some((id) => String(id) === userId);
    review.helpfulBy = already ? review.helpfulBy.filter((id) => String(id) !== userId) : [...review.helpfulBy, req.user.id];
    review.helpfulCount = review.helpfulBy.length;
    await review.save();
    const populatedReview = await Review.findById(review._id).populate(reviewPopulate);
    res.status(200).json({ message: already ? "Helpful removed." : "Marked as helpful.", review: populatedReview });
  } catch (error) {
    res.status(500).json({ message: "Failed to update helpful status.", error: error.message });
  }
};

exports.reportReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found." });
    review.reports.push({ by: req.user.id, reason: req.body.reason || "Reported by user." });
    if (review.reports.length >= 3 && review.status === "published") review.status = "flagged";
    await review.save();
    res.status(200).json({ message: "Review report submitted." });
  } catch (error) {
    res.status(500).json({ message: "Failed to report review.", error: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found." });
    const buffetId = review.buffet;
    const hotelId = review.hotel;
    await review.deleteOne();
    await updateBuffetRating(buffetId);
    await updateHotelRating(hotelId);
    res.status(200).json({ message: "Review deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete review.", error: error.message });
  }
};

exports.setReviewAction = async (req, res) => {
  try {
    const action = req.params.action;
    const statusMap = {
      approve: "published",
      approved: "published",
      publish: "published",
      published: "published",
      hide: "hidden",
      hidden: "hidden",
      reject: "hidden",
      rejected: "hidden",
      flag: "flagged",
      flagged: "flagged",
      pending: "pending",
    };
    const status = statusMap[action];
    if (!status) return res.status(400).json({ message: "Invalid review action." });
    req.body.status = status;
    return exports.updateReviewStatus(req, res);
  } catch (error) {
    res.status(500).json({ message: "Failed to update review.", error: error.message });
  }
};
