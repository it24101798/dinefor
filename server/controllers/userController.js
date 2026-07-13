const User = require("../models/User");
const Buffet = require("../models/Buffet");

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || "",
  avatarUrl: user.avatarUrl || "",
  city: user.city || "",
  isApproved: user.isApproved,
  savedBuffets: user.savedBuffets || [],
});

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json(safeUser(user));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile.", error: error.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const allowedUpdates = ["name", "phone", "avatarUrl", "city"];
    const updates = {};
    allowedUpdates.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json({ message: "Profile updated successfully.", user: safeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile.", error: error.message });
  }
};

exports.toggleSavedBuffet = async (req, res) => {
  try {
    const buffet = await Buffet.findById(req.params.buffetId);
    if (!buffet) return res.status(404).json({ message: "Buffet not found." });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const exists = user.savedBuffets.some((id) => String(id) === String(buffet._id));

    if (exists) {
      user.savedBuffets = user.savedBuffets.filter((id) => String(id) !== String(buffet._id));
    } else {
      user.savedBuffets.push(buffet._id);
    }

    await user.save();

    res.status(200).json({
      message: exists ? "Removed from saved buffets." : "Saved buffet successfully.",
      saved: !exists,
      savedBuffets: user.savedBuffets,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update saved buffet.", error: error.message });
  }
};

exports.getSavedBuffets = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "savedBuffets",
      populate: { path: "hotel" },
    });

    if (!user) return res.status(404).json({ message: "User not found." });

    const activeSaved = (user.savedBuffets || []).filter((buffet) => buffet && buffet.isActive !== false);
    res.status(200).json(activeSaved);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch saved buffets.", error: error.message });
  }
};

exports.getAllUsersAdmin = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users.", error: error.message });
  }
};
