const User = require("../models/User");
const Buffet = require("../models/Buffet");
const Booking = require("../models/Booking");

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 30);
};

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

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
};

const safeUser = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || "",
  avatarUrl: user.avatarUrl || "",
  city: user.city || "",
  gender: user.gender || "",
  bio: user.bio || "",
  birthday: user.birthday || null,
  anniversary: user.anniversary || null,
  emergencyContact: user.emergencyContact || "",
  emergencyPhone: user.emergencyPhone || "",
  favoriteCuisines: user.favoriteCuisines || [],
  dietaryPreferences: user.dietaryPreferences || [],
  allergies: user.allergies || [],
  accessibilityNeeds: user.accessibilityNeeds || [],
  preferences: user.preferences || {},
  isApproved: user.isApproved,
  isActive: user.isActive !== false,
  isEmailVerified: user.isEmailVerified !== false,
  authProvider: user.authProvider || "local",
  lastLoginAt: user.lastLoginAt || null,
  createdAt: user.createdAt,
  savedBuffets: user.savedBuffets || [],
  savedHotels: user.savedHotels || [],
  profileCompletion: calculateProfileCompletion(user),
});

const getSavedAtMap = (history = []) =>
  new Map(
    history.map((entry) => [
      String(entry.item),
      entry.savedAt ? new Date(entry.savedAt).getTime() : 0,
    ])
  );

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json(safeUser(user));
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch profile.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getMyStats = async (req, res) => {
  try {
    const [user, bookings] = await Promise.all([
      User.findById(req.user.id).select(
        "createdAt savedBuffets savedHotels favoriteCuisines"
      ),
      Booking.find({ user: req.user.id }).select(
        "bookingStatus paymentStatus totalAmount grandTotal"
      ),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const completedBookings = bookings.filter(
      (booking) => booking.bookingStatus === "completed"
    );

    const totalSpent = bookings
      .filter((booking) => booking.paymentStatus === "paid")
      .reduce(
        (sum, booking) =>
          sum + Number(booking.grandTotal || booking.totalAmount || 0),
        0
      );

    return res.status(200).json({
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      totalSpent,
      savedBuffets: user.savedBuffets?.length || 0,
      savedHotels: user.savedHotels?.length || 0,
      favoriteCuisineCount: user.favoriteCuisines?.length || 0,
      memberSince: user.createdAt,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch profile statistics.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const allowed = [
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

    allowed.forEach((key) => {
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

    if (req.body.preferences && typeof req.body.preferences === "object") {
      const preferenceKeys = [
        "language",
        "theme",
        "emailNotifications",
        "smsNotifications",
        "offerNotifications",
        "bookingReminders",
        "city",
      ];

      preferenceKeys.forEach((key) => {
        if (req.body.preferences[key] !== undefined) {
          updates[`preferences.${key}`] = req.body.preferences[key];
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
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update profile.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.toggleSavedBuffet = async (req, res) => {
  try {
    const buffet = await Buffet.findById(req.params.buffetId).select("_id");

    if (!buffet) {
      return res.status(404).json({ message: "Buffet not found." });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const buffetId = String(buffet._id);
    const exists = user.savedBuffets.some(
      (id) => String(id) === buffetId
    );

    if (exists) {
      user.savedBuffets = user.savedBuffets.filter(
        (id) => String(id) !== buffetId
      );
      user.savedBuffetHistory = (user.savedBuffetHistory || []).filter(
        (entry) => String(entry.item) !== buffetId
      );
    } else {
      user.savedBuffets.push(buffet._id);
      user.savedBuffetHistory = [
        ...(user.savedBuffetHistory || []).filter(
          (entry) => String(entry.item) !== buffetId
        ),
        { item: buffet._id, savedAt: new Date() },
      ];
    }

    await user.save();

    return res.status(200).json({
      message: exists
        ? "Removed from saved buffets."
        : "Saved buffet successfully.",
      saved: !exists,
      savedBuffets: user.savedBuffets,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update saved buffet.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getSavedBuffets = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: "savedBuffets",
        populate: { path: "hotel" },
      })
      .select("savedBuffets savedBuffetHistory");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const savedAtMap = getSavedAtMap(user.savedBuffetHistory);

    const savedBuffets = (user.savedBuffets || [])
      .filter((buffet) => buffet && buffet.isActive !== false)
      .map((buffet) => ({
        ...buffet.toObject(),
        savedAt: savedAtMap.get(String(buffet._id)) || buffet.createdAt,
      }))
      .sort(
        (a, b) =>
          new Date(b.savedAt || 0).getTime() -
          new Date(a.savedAt || 0).getTime()
      );

    return res.status(200).json(savedBuffets);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch saved buffets.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getSavedStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "savedBuffets savedHotels"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      savedBuffetIds: (user.savedBuffets || []).map(String),
      savedHotelIds: (user.savedHotels || []).map(String),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch saved-item status.",
    });
  }
};

exports.getAllUsersAdmin = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users." });
  }
};

exports.updateUserAdmin = async (req, res) => {
  try {
    const allowed = [
      "name",
      "email",
      "phone",
      "city",
      "role",
      "isApproved",
      "isActive",
    ];

    const updates = {};

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (updates.email) {
      updates.email = String(updates.email).trim().toLowerCase();
    }

    if (
      String(req.params.id) === String(req.user.id) &&
      updates.isActive === false
    ) {
      return res.status(400).json({
        message: "You cannot disable your own admin account.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "User updated successfully.",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update user.",
      error: error.message,
    });
  }
};

exports.requestPasswordResetAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.mustResetPassword = true;
    user.passwordResetRequestedAt = new Date();
    await user.save();

    return res.status(200).json({
      message: "Account marked for password reset.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to request password reset.",
    });
  }
};

exports.deleteUserAdmin = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({
        message: "You cannot delete your own admin account.",
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "User deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete user.",
    });
  }
};
