const Buffet = require("../models/Buffet");
const User = require("../models/User");
const Booking = require("../models/Booking");

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

const buffetTokens = (buffet) => {
  const values = [
    buffet.category,
    buffet.buffetType,
    buffet.title,
    buffet.description,
    buffet.location?.city,
    buffet.hotel?.hotelName,
    ...(buffet.highlights || []),
  ];

  return values
    .flatMap((value) => normalize(value).split(/[^a-z0-9]+/))
    .filter((value) => value.length > 2);
};

const scoreBuffet = ({
  buffet,
  interests,
  savedIds,
  bookedIds,
  viewedIds,
}) => {
  let score = 0;
  const reasons = [];
  const tokens = new Set(buffetTokens(buffet));

  const matches = interests.filter((interest) =>
    [...tokens].some(
      (token) =>
        token.includes(interest) ||
        interest.includes(token)
    )
  );

  if (matches.length) {
    score += Math.min(matches.length * 15, 45);
    reasons.push(`Matches ${matches.slice(0, 2).join(", ")}`);
  }

  if (buffet.isFeatured) {
    score += 12;
    reasons.push("Featured experience");
  }

  const rating = Number(buffet.averageRating || 0);
  const reviewCount = Number(buffet.totalReviews || 0);

  score += rating * 7;
  score += Math.min(reviewCount, 100) * 0.15;

  if (rating >= 4.2) reasons.push("Highly rated");

  if (savedIds.has(String(buffet._id))) {
    score -= 18;
  }

  if (bookedIds.has(String(buffet._id))) {
    score -= 12;
  }

  if (viewedIds.has(String(buffet._id))) {
    score += 6;
    reasons.push("Based on recent browsing");
  }

  const seats = (buffet.timeSlots || []).reduce(
    (sum, slot) =>
      sum + Number(slot.availableSeats || 0),
    0
  );

  if (seats > 0) {
    score += 4;
    reasons.push("Seats available");
  }

  return {
    score: Number(score.toFixed(2)),
    reasons: [...new Set(reasons)].slice(0, 3),
  };
};

exports.getPersonalizedRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("recentlyViewed.item")
      .select(
        "favoriteCuisines dietaryPreferences allergies accessibilityNeeds savedBuffets recentlyViewed city preferences"
      );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const bookings = await Booking.find({
      user: req.user.id,
    }).select("buffet");

    const buffets = await Buffet.find({
      status: "active",
      isActive: true,
    })
      .populate("hotel", "hotelName city location averageRating")
      .limit(150);

    const interests = [
      ...(user.favoriteCuisines || []),
      ...(user.dietaryPreferences || []),
      user.city,
      user.preferences?.city,
    ]
      .map(normalize)
      .filter(Boolean);

    const savedIds = new Set(
      (user.savedBuffets || []).map(String)
    );
    const bookedIds = new Set(
      bookings.map((booking) => String(booking.buffet))
    );
    const viewedIds = new Set(
      (user.recentlyViewed || [])
        .filter((entry) => entry.itemType === "buffet")
        .map((entry) => String(entry.item?._id || entry.item))
    );

    const recommendations = buffets
      .map((buffet) => {
        const ranking = scoreBuffet({
          buffet,
          interests,
          savedIds,
          bookedIds,
          viewedIds,
        });

        return {
          ...buffet.toObject(),
          recommendationScore: ranking.score,
          recommendationReasons: ranking.reasons,
        };
      })
      .sort(
        (a, b) =>
          b.recommendationScore -
          a.recommendationScore
      )
      .slice(0, 20);

    return res.status(200).json({
      recommendations,
      personalization: {
        interests,
        hasProfileSignals: interests.length > 0,
        savedCount: savedIds.size,
        viewedCount: viewedIds.size,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create recommendations.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

exports.getTrendingBuffets = async (req, res) => {
  try {
    const buffets = await Buffet.find({
      status: "active",
      isActive: true,
    })
      .populate("hotel", "hotelName city location")
      .sort({
        isFeatured: -1,
        averageRating: -1,
        totalReviews: -1,
        likesCount: -1,
        createdAt: -1,
      })
      .limit(20);

    return res.status(200).json({
      buffets,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load trending buffets.",
    });
  }
};

exports.getSimilarBuffets = async (req, res) => {
  try {
    const source = await Buffet.findById(
      req.params.buffetId
    );

    if (!source) {
      return res.status(404).json({
        message: "Buffet not found.",
      });
    }

    const buffets = await Buffet.find({
      _id: { $ne: source._id },
      status: "active",
      isActive: true,
      $or: [
        { category: source.category },
        { buffetType: source.buffetType },
        { "location.city": source.location?.city || "" },
      ],
    })
      .populate("hotel", "hotelName city location")
      .sort({
        averageRating: -1,
        totalReviews: -1,
      })
      .limit(8);

    return res.status(200).json({
      buffets,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load similar buffets.",
    });
  }
};
