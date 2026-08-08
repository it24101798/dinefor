const Review = require("../models/Review");
const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const Booking = require("../models/Booking");

const REVIEWABLE_BOOKING_STATUSES = ["completed"];
const ALLOWED_REPORT_REASONS = [
  "spam",
  "abusive",
  "irrelevant",
  "privacy",
  "misleading",
  "other",
];

const normalizeMedia = (value, limit) =>
  Array.isArray(value)
    ? [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))].slice(
        0,
        limit
      )
    : [];

const normalizeRating = (value, field = "Rating") => {
  if (value === undefined || value === null || value === "") return null;

  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    const error = new Error(`${field} must be between 1 and 5.`);
    error.statusCode = 400;
    throw error;
  }

  return rating;
};

const buildRatings = (body) => ({
  food: normalizeRating(body.foodRating, "Food rating"),
  service: normalizeRating(body.serviceRating, "Service rating"),
  ambience: normalizeRating(body.ambienceRating, "Ambience rating"),
  value: normalizeRating(body.valueRating, "Value rating"),
});

const average = (numbers) => {
  const values = numbers.filter((value) => Number.isFinite(Number(value)));
  if (!values.length) return 0;
  return Number(
    (
      values.reduce((sum, value) => sum + Number(value), 0) / values.length
    ).toFixed(1)
  );
};

const updateAggregateRatings = async (buffetId, hotelId) => {
  const [buffetReviews, hotelReviews] = await Promise.all([
    Review.find({ buffet: buffetId, status: "published" }).select("rating"),
    Review.find({ hotel: hotelId, status: "published" }).select("rating"),
  ]);

  await Promise.all([
    Buffet.findByIdAndUpdate(buffetId, {
      averageRating: average(buffetReviews.map((review) => review.rating)),
      totalReviews: buffetReviews.length,
    }),
    Hotel.findByIdAndUpdate(hotelId, {
      averageRating: average(hotelReviews.map((review) => review.rating)),
      totalReviews: hotelReviews.length,
    }),
  ]);
};

const reviewPopulate = [
  {
    path: "user",
    select: "name avatarUrl",
  },
  {
    path: "hotel",
    select: "hotelName city location logo owner",
  },
  {
    path: "buffet",
    select: "title price images thumbnail",
  },
  {
    path: "booking",
    select:
      "bookingCode selectedDate selectedTimeSlot bookingStatus seats paymentStatus",
  },
  {
    path: "hotelReply.repliedBy",
    select: "name role",
  },
];

const getHotelForOwner = async (user) => {
  if (user.role === "admin") return null;
  return Hotel.findOne({ owner: user._id }).select("_id owner hotelName");
};

const createNotification = async ({
  userId,
  title,
  message,
  link = "/my-reviews",
}) => {
  const User = require("../models/User");

  await User.findByIdAndUpdate(userId, {
    $push: {
      notifications: {
        $each: [
          {
            title,
            message,
            type: "review",
            link,
            isRead: false,
            createdAt: new Date(),
          },
        ],
        $position: 0,
        $slice: 100,
      },
    },
  });
};

exports.getReviewEligibility = async (req, res) => {
  try {
    const bookings = await Booking.find({
      user: req.user.id,
      buffet: req.params.buffetId,
      bookingStatus: { $in: REVIEWABLE_BOOKING_STATUSES },
    })
      .sort({ selectedDate: -1 })
      .select(
        "bookingCode selectedDate selectedTimeSlot bookingStatus seats"
      );

    const reviewedBookingIds = await Review.find({
      user: req.user.id,
      booking: { $in: bookings.map((booking) => booking._id) },
    }).distinct("booking");

    const reviewed = new Set(reviewedBookingIds.map(String));
    const eligibleBookings = bookings.filter(
      (booking) => !reviewed.has(String(booking._id))
    );

    return res.status(200).json({
      eligible: eligibleBookings.length > 0,
      bookings: eligibleBookings,
      message: eligibleBookings.length
        ? "A completed reservation is available for review."
        : "Only completed reservations that have not been reviewed are eligible.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to check review eligibility.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

exports.createReview = async (req, res) => {
  try {
    const {
      buffetId,
      bookingId,
      title,
      rating,
      comment,
      images,
      videos,
    } = req.body;

    if (!buffetId || !bookingId) {
      return res.status(400).json({
        message: "Buffet and completed booking are required.",
      });
    }

    const numericRating = normalizeRating(rating);
    const cleanComment = String(comment || "").trim();

    if (cleanComment.length < 10) {
      return res.status(400).json({
        message: "Please write at least 10 characters about your experience.",
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      user: req.user.id,
      buffet: buffetId,
      bookingStatus: { $in: REVIEWABLE_BOOKING_STATUSES },
    });

    if (!booking) {
      return res.status(403).json({
        message:
          "You can review this buffet only after a completed reservation.",
      });
    }

    const existing = await Review.findOne({ booking: booking._id });
    if (existing) {
      return res.status(409).json({
        message: "This completed reservation has already been reviewed.",
      });
    }

    const buffet = await Buffet.findById(buffetId).populate(
      "hotel",
      "_id hotelName"
    );

    if (!buffet?.hotel) {
      return res.status(404).json({ message: "Buffet or hotel not found." });
    }

    const review = await Review.create({
      user: req.user.id,
      hotel: buffet.hotel._id,
      buffet: buffet._id,
      booking: booking._id,
      title: String(title || "").trim(),
      rating: numericRating,
      ratings: buildRatings(req.body),
      comment: cleanComment,
      images: normalizeMedia(images, 8),
      videos: normalizeMedia(videos, 2),
      isVerifiedBooking: true,
      status: "published",
    });

    await updateAggregateRatings(buffet._id, buffet.hotel._id);

    const populated = await Review.findById(review._id).populate(
      reviewPopulate
    );

    return res.status(201).json({
      message: "Verified review published successfully.",
      review: populated,
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.code === 11000 ? 409 : 500);

    return res.status(statusCode).json({
      message:
        error.code === 11000
          ? "This completed reservation has already been reviewed."
          : error.message || "Failed to create review.",
    });
  }
};

exports.getBuffetReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      buffet: req.params.buffetId,
      status: "published",
    })
      .populate(reviewPopulate)
      .sort({ isFeatured: -1, createdAt: -1 });

    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter(
        (review) => Math.round(Number(review.rating)) === star
      ).length,
    }));

    return res.status(200).json({
      reviews,
      analytics: {
        totalReviews: reviews.length,
        averageRating: average(reviews.map((review) => review.rating)),
        distribution,
        categoryAverages: {
          food: average(reviews.map((review) => review.ratings?.food)),
          service: average(reviews.map((review) => review.ratings?.service)),
          ambience: average(reviews.map((review) => review.ratings?.ambience)),
          value: average(reviews.map((review) => review.ratings?.value)),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch buffet reviews.",
    });
  }
};

exports.getHotelReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      hotel: req.params.hotelId,
      status: "published",
    })
      .populate(reviewPopulate)
      .sort({ isFeatured: -1, createdAt: -1 });

    return res.status(200).json({
      reviews,
      analytics: {
        totalReviews: reviews.length,
        averageRating: average(reviews.map((review) => review.rating)),
        distribution: [5, 4, 3, 2, 1].map((star) => ({
          star,
          count: reviews.filter(
            (review) => Math.round(Number(review.rating)) === star
          ).length,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch hotel reviews.",
    });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id })
      .populate(reviewPopulate)
      .sort({ createdAt: -1 });

    const helpfulReceived = reviews.reduce(
      (sum, review) => sum + (review.helpfulVotes?.length || 0),
      0
    );

    return res.status(200).json({
      reviews,
      analytics: {
        totalReviews: reviews.length,
        helpfulReceived,
        averageRatingGiven: average(
          reviews.map((review) => review.rating)
        ),
        photosShared: reviews.reduce(
          (sum, review) => sum + (review.images?.length || 0),
          0
        ),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch your reviews.",
    });
  }
};

exports.updateOwnReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!review) {
      return res.status(404).json({
        message: "Review not found or you cannot edit it.",
      });
    }

    if (req.body.rating !== undefined) {
      review.rating = normalizeRating(req.body.rating);
    }

    if (req.body.title !== undefined) {
      review.title = String(req.body.title || "").trim();
    }

    if (req.body.comment !== undefined) {
      const comment = String(req.body.comment || "").trim();
      if (comment.length < 10) {
        return res.status(400).json({
          message: "Review text must contain at least 10 characters.",
        });
      }
      review.comment = comment;
    }

    review.ratings = {
      food:
        req.body.foodRating !== undefined
          ? normalizeRating(req.body.foodRating, "Food rating")
          : review.ratings?.food,
      service:
        req.body.serviceRating !== undefined
          ? normalizeRating(req.body.serviceRating, "Service rating")
          : review.ratings?.service,
      ambience:
        req.body.ambienceRating !== undefined
          ? normalizeRating(req.body.ambienceRating, "Ambience rating")
          : review.ratings?.ambience,
      value:
        req.body.valueRating !== undefined
          ? normalizeRating(req.body.valueRating, "Value rating")
          : review.ratings?.value,
    };

    if (req.body.images !== undefined) {
      review.images = normalizeMedia(req.body.images, 8);
    }
    if (req.body.videos !== undefined) {
      review.videos = normalizeMedia(req.body.videos, 2);
    }

    await review.save();
    await updateAggregateRatings(review.buffet, review.hotel);

    const populated = await Review.findById(review._id).populate(
      reviewPopulate
    );

    return res.status(200).json({
      message: "Review updated successfully.",
      review: populated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to update review.",
    });
  }
};

exports.deleteOwnReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!review) {
      return res.status(404).json({
        message: "Review not found or you cannot delete it.",
      });
    }

    const { buffet, hotel } = review;
    await review.deleteOne();
    await updateAggregateRatings(buffet, hotel);

    return res.status(200).json({
      message: "Review deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete review.",
    });
  }
};

exports.toggleHelpfulVote = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      status: "published",
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    const userId = String(req.user.id);
    const voted = review.helpfulVotes.some(
      (id) => String(id) === userId
    );

    review.helpfulVotes = voted
      ? review.helpfulVotes.filter((id) => String(id) !== userId)
      : [...review.helpfulVotes, req.user.id];

    await review.save();

    return res.status(200).json({
      helpful: !voted,
      helpfulCount: review.helpfulVotes.length,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update helpful vote.",
    });
  }
};

exports.reportReview = async (req, res) => {
  try {
    const reason = String(req.body.reason || "").trim();
    const details = String(req.body.details || "").trim();

    if (!ALLOWED_REPORT_REASONS.includes(reason)) {
      return res.status(400).json({
        message: "Select a valid report reason.",
      });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      status: "published",
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    const alreadyReported = review.reports.some(
      (report) => String(report.user) === String(req.user.id)
    );

    if (alreadyReported) {
      return res.status(409).json({
        message: "You already reported this review.",
      });
    }

    review.reports.push({
      user: req.user.id,
      reason,
      details,
    });

    if (review.reports.length >= 3) {
      review.status = "pending";
      review.moderationNote =
        "Automatically moved to moderation after multiple reports.";
    }

    await review.save();

    return res.status(200).json({
      message: "Thank you. The review was submitted for moderation.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to report review.",
    });
  }
};

exports.replyToReview = async (req, res) => {
  try {
    const message = String(req.body.message || req.body.reply || "").trim();

    if (!message) {
      return res.status(400).json({
        message: "Reply message is required.",
      });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    if (req.user.role !== "admin") {
      const hotel = await getHotelForOwner(req.user);

      if (!hotel || String(hotel._id) !== String(review.hotel)) {
        return res.status(403).json({
          message: "You can reply only to reviews for your hotel.",
        });
      }
    }

    review.hotelReply = {
      message,
      repliedAt: new Date(),
      repliedBy: req.user.id,
    };

    await review.save();

    await createNotification({
      userId: review.user,
      title: "Hotel replied to your review",
      message: "A hotel partner responded to feedback you shared on DineFor.",
      link: "/my-reviews",
    });

    const populated = await Review.findById(review._id).populate(
      reviewPopulate
    );

    return res.status(200).json({
      message: "Reply saved successfully.",
      review: populated,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to save hotel reply.",
    });
  }
};

exports.getHotelReviewWorkspace = async (req, res) => {
  try {
    const hotel =
      req.user.role === "admin"
        ? req.query.hotelId
          ? await Hotel.findById(req.query.hotelId)
          : null
        : await getHotelForOwner(req.user);

    if (!hotel && req.user.role !== "admin") {
      return res.status(404).json({
        message: "Hotel profile not found.",
      });
    }

    const query = {};
    if (hotel) query.hotel = hotel._id;
    if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    }
    if (req.query.rating && req.query.rating !== "all") {
      query.rating = Number(req.query.rating);
    }

    const reviews = await Review.find(query)
      .populate(reviewPopulate)
      .sort({ createdAt: -1 });

    const published = reviews.filter(
      (review) => review.status === "published"
    );

    const replies = published.filter(
      (review) => Boolean(review.hotelReply?.message)
    ).length;

    return res.status(200).json({
      reviews,
      analytics: {
        totalReviews: reviews.length,
        publishedReviews: published.length,
        averageRating: average(
          published.map((review) => review.rating)
        ),
        responseRate: published.length
          ? Math.round((replies / published.length) * 100)
          : 0,
        pendingReports: reviews.reduce(
          (sum, review) => sum + (review.reports?.length || 0),
          0
        ),
        distribution: [5, 4, 3, 2, 1].map((star) => ({
          star,
          count: published.filter(
            (review) => Math.round(review.rating) === star
          ).length,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load hotel reviews.",
    });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const query = {};

    if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    }
    if (req.query.reported === "true") {
      query["reports.0"] = { $exists: true };
    }

    const reviews = await Review.find(query)
      .populate(reviewPopulate)
      .sort({
        "reports.0": -1,
        createdAt: -1,
      });

    return res.status(200).json({
      reviews,
      analytics: {
        totalReviews: reviews.length,
        published: reviews.filter(
          (review) => review.status === "published"
        ).length,
        pending: reviews.filter(
          (review) => review.status === "pending"
        ).length,
        reported: reviews.filter(
          (review) => review.reports?.length
        ).length,
        featured: reviews.filter(
          (review) => review.isFeatured
        ).length,
        averageRating: average(
          reviews
            .filter((review) => review.status === "published")
            .map((review) => review.rating)
        ),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch reviews.",
    });
  }
};

exports.updateReviewModeration = async (req, res) => {
  try {
    const allowedStatuses = [
      "published",
      "hidden",
      "pending",
      "rejected",
    ];

    const updates = {};

    if (req.body.status !== undefined) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({
          message: "Invalid review status.",
        });
      }
      updates.status = req.body.status;
    }

    if (req.body.isFeatured !== undefined) {
      updates.isFeatured = Boolean(req.body.isFeatured);
    }

    if (req.body.moderationNote !== undefined) {
      updates.moderationNote = String(
        req.body.moderationNote || ""
      ).trim();
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    await updateAggregateRatings(review.buffet, review.hotel);

    return res.status(200).json({
      message: "Review moderation updated.",
      review,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update review moderation.",
    });
  }
};

exports.deleteReviewAdmin = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    const { buffet, hotel } = review;
    await review.deleteOne();
    await updateAggregateRatings(buffet, hotel);

    return res.status(200).json({
      message: "Review permanently deleted.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete review.",
    });
  }
};
