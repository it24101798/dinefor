const Review = require("../models/Review");
const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const Booking = require("../models/Booking");

const buildRatingStats = (reviews) => {
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews === 0
      ? 0
      : reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
        totalReviews;

  return {
    totalReviews,
    averageRating: Number(averageRating.toFixed(1)),
  };
};

const updateBuffetRating = async (buffetId) => {
  const reviews = await Review.find({ buffet: buffetId, status: "published" });
  const stats = buildRatingStats(reviews);

  await Buffet.findByIdAndUpdate(buffetId, {
    averageRating: stats.averageRating,
    totalReviews: stats.totalReviews,
  });
};

const updateHotelRating = async (hotelId) => {
  const reviews = await Review.find({ hotel: hotelId, status: "published" });
  const stats = buildRatingStats(reviews);

  await Hotel.findByIdAndUpdate(hotelId, {
    averageRating: stats.averageRating,
    totalReviews: stats.totalReviews,
  });
};

exports.createReview = async (req, res) => {
  try {
    const { buffetId, rating, comment, images, videos } = req.body;

    if (!buffetId || !rating) {
      return res.status(400).json({ message: "Buffet ID and rating are required." });
    }

    const numericRating = Number(rating);
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const buffet = await Buffet.findById(buffetId).populate("hotel");

    if (!buffet) {
      return res.status(404).json({ message: "Buffet not found." });
    }

    const verifiedBooking = await Booking.findOne({
      user: req.user.id,
      buffet: buffetId,
      bookingStatus: { $in: ["confirmed", "completed"] },
    }).sort({ createdAt: -1 });

    const review = await Review.create({
      user: req.user.id,
      hotel: buffet.hotel._id,
      buffet: buffetId,
      booking: verifiedBooking?._id || null,
      rating: numericRating,
      comment: comment || "",
      images: Array.isArray(images) ? images.slice(0, 8) : [],
      videos: Array.isArray(videos) ? videos.slice(0, 4) : [],
      isVerifiedBooking: Boolean(verifiedBooking),
      status: "published",
    });

    await updateBuffetRating(buffetId);
    await updateHotelRating(buffet.hotel._id);

    const populatedReview = await Review.findById(review._id)
      .populate("user", "name email")
      .populate("buffet", "title");

    res.status(201).json({
      message: verifiedBooking
        ? "Verified review added successfully."
        : "Review added successfully.",
      review: populatedReview,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create review.",
      error: error.message,
    });
  }
};

exports.getBuffetReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      buffet: req.params.buffetId,
      status: "published",
    })
      .populate("user", "name email")
      .populate("buffet", "title")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch buffet reviews.",
      error: error.message,
    });
  }
};

exports.getHotelReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      hotel: req.params.hotelId,
      status: "published",
    })
      .populate("user", "name email")
      .populate("buffet", "title")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch hotel reviews.",
      error: error.message,
    });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "name email")
      .populate("hotel", "hotelName location")
      .populate("buffet", "title price")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch reviews.",
      error: error.message,
    });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["published", "hidden"].includes(status)) {
      return res.status(400).json({ message: "Invalid review status." });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    await updateBuffetRating(review.buffet);
    await updateHotelRating(review.hotel);

    res.status(200).json({ message: "Review status updated.", review });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update review status.",
      error: error.message,
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    const buffetId = review.buffet;
    const hotelId = review.hotel;

    await review.deleteOne();
    await updateBuffetRating(buffetId);
    await updateHotelRating(hotelId);

    res.status(200).json({ message: "Review deleted successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete review.",
      error: error.message,
    });
  }
};
