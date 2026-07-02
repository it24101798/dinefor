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

exports.getCustomerDashboard = async (req, res) => {
  try {
    const [user, bookings, reviews] = await Promise.all([
      User.findById(req.user.id)
        .select("-password")
        .populate({ path: "savedBuffets", populate: { path: "hotel" } })
        .populate("savedHotels")
        .populate({ path: "recentlyViewed.item" }),
      Booking.find({ user: req.user.id }).populate(populateBooking).sort({ selectedDate: 1, createdAt: -1 }),
      Review.find({ user: req.user.id }).populate("buffet", "title").populate("hotel", "hotelName location city logo").sort({ createdAt: -1 }).limit(10),
    ]);

    if (!user) return res.status(404).json({ message: "User not found." });

    const now = new Date();
    const upcomingReservations = bookings.filter((booking) =>
      ["pending", "confirmed", "checked_in"].includes(booking.bookingStatus) && new Date(booking.selectedDate) >= new Date(now.toDateString())
    );

    const pastReservations = bookings.filter((booking) =>
      ["completed", "cancelled", "no_show"].includes(booking.bookingStatus) || new Date(booking.selectedDate) < new Date(now.toDateString())
    );

    const recommendedBuffets = await Buffet.find({ isActive: true })
      .populate("hotel")
      .sort({ isFeatured: -1, averageRating: -1, totalReviews: -1, createdAt: -1 })
      .limit(8);

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
        city: user.city || "",
        preferences: user.preferences || {},
      },
      stats: {
        upcomingReservations: upcomingReservations.length,
        totalReservations: bookings.length,
        savedBuffets: user.savedBuffets?.length || 0,
        savedHotels: user.savedHotels?.length || 0,
        reviews: reviews.length,
        unreadNotifications: (user.notifications || []).filter((item) => !item.isRead).length,
      },
      upcomingReservations: upcomingReservations.slice(0, 5),
      pastReservations: pastReservations.slice(0, 8),
      savedBuffets: user.savedBuffets || [],
      savedHotels: user.savedHotels || [],
      recentlyViewed: user.recentlyViewed || [],
      notifications: (user.notifications || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20),
      reviews,
      recommendedBuffets,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch customer dashboard.", error: error.message });
  }
};

exports.toggleSavedHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel) return res.status(404).json({ message: "Hotel not found." });

    const user = await getUserOr404(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const exists = user.savedHotels.some((id) => String(id) === String(hotel._id));
    user.savedHotels = exists
      ? user.savedHotels.filter((id) => String(id) !== String(hotel._id))
      : [...user.savedHotels, hotel._id];

    await user.save();
    res.status(200).json({
      message: exists ? "Removed hotel from favorites." : "Saved hotel successfully.",
      saved: !exists,
      savedHotels: user.savedHotels,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update saved hotel.", error: error.message });
  }
};

exports.getSavedHotels = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("savedHotels");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json((user.savedHotels || []).filter((hotel) => hotel && hotel.status !== "rejected"));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch saved hotels.", error: error.message });
  }
};

exports.addRecentlyViewed = async (req, res) => {
  try {
    const { itemType, itemId } = req.body;
    if (!["hotel", "buffet"].includes(itemType) || !itemId) {
      return res.status(400).json({ message: "Valid itemType and itemId are required." });
    }

    const modelName = itemType === "hotel" ? "Hotel" : "Buffet";
    const model = itemType === "hotel" ? Hotel : Buffet;
    const item = await model.findById(itemId);
    if (!item) return res.status(404).json({ message: "Viewed item not found." });

    const user = await getUserOr404(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.recentlyViewed = (user.recentlyViewed || []).filter(
      (entry) => !(entry.itemType === itemType && String(entry.item) === String(itemId))
    );

    user.recentlyViewed.unshift({ itemType, item: itemId, itemTypeModel: modelName, viewedAt: new Date() });
    user.recentlyViewed = user.recentlyViewed.slice(0, 30);

    await user.save();
    res.status(200).json({ message: "Recently viewed updated.", recentlyViewed: user.recentlyViewed });
  } catch (error) {
    res.status(500).json({ message: "Failed to update recently viewed.", error: error.message });
  }
};

exports.getRecentlyViewed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({ path: "recentlyViewed.item" });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json(user.recentlyViewed || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch recently viewed.", error: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const user = await getUserOr404(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const notification = user.notifications.id(req.params.notificationId);
    if (!notification) return res.status(404).json({ message: "Notification not found." });

    notification.isRead = true;
    await user.save();

    res.status(200).json({ message: "Notification marked as read.", notification });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification.", error: error.message });
  }
};

exports.updateCustomerProfile = async (req, res) => {
  try {
    const allowedUpdates = ["name", "phone", "avatarUrl", "city", "preferences"];
    const updates = {};

    allowedUpdates.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json({ message: "Profile updated successfully.", user });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile.", error: error.message });
  }
};
