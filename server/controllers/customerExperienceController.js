const User = require("../models/User");
const Buffet = require("../models/Buffet");
const Hotel = require("../models/Hotel");
const Booking = require("../models/Booking");
const Review = require("../models/Review");

const populateBooking = [
  { path: "user", select: "name email role" },
  { path: "buffet", populate: { path: "hotel" } },
  { path: "checkedInBy", select: "name email role" },
];

const getUserOr404 = async (userId) => User.findById(userId);

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 30);
};

const getSavedAtMap = (history = []) =>
  new Map(
    history.map((entry) => [
      String(entry.item),
      entry.savedAt ? new Date(entry.savedAt).getTime() : 0,
    ])
  );

const calculateProfileCompletion = (user) => {
  const checks = [
    Boolean(user.name),
    Boolean(user.email),
    Boolean(user.phone),
    Boolean(user.avatarUrl),
    Boolean(user.city),
    Boolean(user.gender),
    Boolean(user.bio),
    Boolean(user.birthday),
    Array.isArray(user.favoriteCuisines) && user.favoriteCuisines.length > 0,
    Array.isArray(user.dietaryPreferences) && user.dietaryPreferences.length > 0,
    Array.isArray(user.accessibilityNeeds) && user.accessibilityNeeds.length > 0,
  ];

  return Math.round(
    (checks.filter(Boolean).length / checks.length) * 100
  );
};

exports.getCustomerDashboard = async (req, res) => {
  try {
    const [user, bookings, reviews] = await Promise.all([
      User.findById(req.user.id)
        .select("-password")
        .populate({
          path: "savedBuffets",
          populate: { path: "hotel" },
        })
        .populate("savedHotels")
        .populate({ path: "recentlyViewed.item" }),
      Booking.find({ user: req.user.id })
        .populate(populateBooking)
        .sort({ selectedDate: 1, createdAt: -1 }),
      Review.find({ user: req.user.id })
        .populate("buffet", "title")
        .populate(
          "hotel",
          "hotelName location city logo"
        )
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const today = new Date(new Date().toDateString());

    const upcomingReservations = bookings.filter(
      (booking) =>
        ["pending", "confirmed", "checked_in"].includes(
          booking.bookingStatus
        ) &&
        new Date(booking.selectedDate) >= today
    );

    const pastReservations = bookings.filter(
      (booking) =>
        ["completed", "cancelled", "no_show"].includes(
          booking.bookingStatus
        ) ||
        new Date(booking.selectedDate) < today
    );

    const recommendedBuffets = await Buffet.find({
      isActive: true,
    })
      .populate("hotel")
      .sort({
        isFeatured: -1,
        averageRating: -1,
        totalReviews: -1,
        createdAt: -1,
      })
      .limit(8);

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
        city: user.city || "",
        gender: user.gender || "",
        favoriteCuisines: user.favoriteCuisines || [],
        dietaryPreferences: user.dietaryPreferences || [],
        allergies: user.allergies || [],
        accessibilityNeeds: user.accessibilityNeeds || [],
        preferences: user.preferences || {},
        profileCompletion: calculateProfileCompletion(user),
      },
      stats: {
        upcomingReservations: upcomingReservations.length,
        totalReservations: bookings.length,
        savedBuffets: user.savedBuffets?.length || 0,
        savedHotels: user.savedHotels?.length || 0,
        reviews: reviews.length,
        unreadNotifications: (user.notifications || []).filter(
          (item) => !item.isRead
        ).length,
      },
      upcomingReservations: upcomingReservations.slice(0, 5),
      pastReservations: pastReservations.slice(0, 8),
      savedBuffets: user.savedBuffets || [],
      savedHotels: user.savedHotels || [],
      recentlyViewed: user.recentlyViewed || [],
      notifications: (user.notifications || [])
        .sort(
          (a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        )
        .slice(0, 20),
      reviews,
      recommendedBuffets,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch customer dashboard.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.toggleSavedHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId).select("_id");

    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found." });
    }

    const user = await getUserOr404(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const hotelId = String(hotel._id);
    const exists = user.savedHotels.some(
      (id) => String(id) === hotelId
    );

    if (exists) {
      user.savedHotels = user.savedHotels.filter(
        (id) => String(id) !== hotelId
      );
      user.savedHotelHistory = (user.savedHotelHistory || []).filter(
        (entry) => String(entry.item) !== hotelId
      );
    } else {
      user.savedHotels.push(hotel._id);
      user.savedHotelHistory = [
        ...(user.savedHotelHistory || []).filter(
          (entry) => String(entry.item) !== hotelId
        ),
        { item: hotel._id, savedAt: new Date() },
      ];
    }

    await user.save();

    return res.status(200).json({
      message: exists
        ? "Removed hotel from favorites."
        : "Saved hotel successfully.",
      saved: !exists,
      savedHotels: user.savedHotels,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update saved hotel.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getSavedHotels = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("savedHotels")
      .select("savedHotels savedHotelHistory");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const savedAtMap = getSavedAtMap(user.savedHotelHistory);

    const hotels = (user.savedHotels || [])
      .filter(
        (hotel) =>
          hotel &&
          !["rejected", "suspended"].includes(hotel.status)
      )
      .map((hotel) => ({
        ...hotel.toObject(),
        savedAt:
          savedAtMap.get(String(hotel._id)) ||
          hotel.createdAt,
      }))
      .sort(
        (a, b) =>
          new Date(b.savedAt || 0).getTime() -
          new Date(a.savedAt || 0).getTime()
      );

    return res.status(200).json(hotels);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch saved hotels.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.addRecentlyViewed = async (req, res) => {
  try {
    const { itemType, itemId } = req.body;

    if (!["hotel", "buffet"].includes(itemType) || !itemId) {
      return res.status(400).json({
        message: "Valid itemType and itemId are required.",
      });
    }

    const modelName =
      itemType === "hotel" ? "Hotel" : "Buffet";
    const model =
      itemType === "hotel" ? Hotel : Buffet;

    const item = await model.findById(itemId).select("_id");

    if (!item) {
      return res.status(404).json({
        message: "Viewed item not found.",
      });
    }

    const user = await getUserOr404(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.recentlyViewed = (user.recentlyViewed || []).filter(
      (entry) =>
        !(
          entry.itemType === itemType &&
          String(entry.item) === String(itemId)
        )
    );

    user.recentlyViewed.unshift({
      itemType,
      item: itemId,
      itemTypeModel: modelName,
      viewedAt: new Date(),
    });

    user.recentlyViewed = user.recentlyViewed.slice(0, 30);
    await user.save();

    return res.status(200).json({
      message: "Recently viewed updated.",
      recentlyViewed: user.recentlyViewed,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update recently viewed.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getRecentlyViewed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: "recentlyViewed.item",
        populate: {
          path: "hotel",
          strictPopulate: false,
        },
      })
      .select("recentlyViewed");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const items = (user.recentlyViewed || [])
      .filter((entry) => entry.item)
      .sort(
        (a, b) =>
          new Date(b.viewedAt) - new Date(a.viewedAt)
      );

    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch recently viewed.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.removeRecentlyViewed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const before = user.recentlyViewed?.length || 0;

    user.recentlyViewed = (user.recentlyViewed || []).filter(
      (entry) =>
        String(entry._id) !== String(req.params.itemId) &&
        String(entry.item) !== String(req.params.itemId)
    );

    await user.save();

    return res.status(200).json({
      message:
        before === user.recentlyViewed.length
          ? "Recently viewed item not found."
          : "Recently viewed item removed.",
      recentlyViewed: user.recentlyViewed,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to remove recently viewed item.",
    });
  }
};

exports.clearRecentlyViewed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.recentlyViewed = [];
    await user.save();

    return res.status(200).json({
      message: "Recently viewed history cleared.",
      recentlyViewed: [],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to clear recently viewed history.",
    });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const user = await getUserOr404(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const notification = user.notifications.id(
      req.params.notificationId
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found.",
      });
    }

    notification.isRead = true;
    await user.save();

    return res.status(200).json({
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update notification.",
    });
  }
};

exports.updateCustomerProfile = async (req, res) => {
  try {
    const allowedUpdates = [
      "name",
      "phone",
      "avatarUrl",
      "city",
      "gender",
      "bio",
      "birthday",
      "anniversary",
      "emergencyContact",
      "emergencyPhone",
      "favoriteCuisines",
      "dietaryPreferences",
      "allergies",
      "accessibilityNeeds",
    ];

    const updates = {};

    allowedUpdates.forEach((key) => {
      if (req.body[key] === undefined) return;

      if (
        [
          "favoriteCuisines",
          "dietaryPreferences",
          "allergies",
          "accessibilityNeeds",
        ].includes(key)
      ) {
        updates[key] = normalizeStringArray(req.body[key]);
      } else {
        updates[key] = req.body[key];
      }
    });

    if (
      req.body.preferences &&
      typeof req.body.preferences === "object"
    ) {
      const keys = [
        "language",
        "theme",
        "emailNotifications",
        "smsNotifications",
        "offerNotifications",
        "bookingReminders",
        "city",
      ];

      keys.forEach((key) => {
        if (req.body.preferences[key] !== undefined) {
          updates[`preferences.${key}`] =
            req.body.preferences[key];
        }
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        ...user.toObject(),
        profileCompletion: calculateProfileCompletion(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update profile.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
