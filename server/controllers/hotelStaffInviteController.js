const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("node:crypto");
const Hotel = require("../models/Hotel");
const User = require("../models/User");
const StaffInvite = require("../models/HotelStaffInvite");
const ActivityLog = require("../models/ActivityLog");
const { sendMail } = require("../services/emailService");
const { clean, emailValid, err, safeEmail, hashInvitation } = require("../services/onboardingData");

async function ownedHotel(req) {
  const hotel = await Hotel.findOne({ owner: req.user.id, status: "approved", isApproved: true }).select("_id hotelName");
  if (!hotel) throw err(403, "An active hotel partnership is required to manage staff.");
  return hotel;
}
function audit(req, invite, action, session) {
  return ActivityLog.create([{
    actor: req.user?._id || invite.user, actorRole: req.user?.role || "hotel_staff",
    entityType: "hotel_staff_invite", entityId: invite._id, action, metadata: { hotelId: invite.hotel },
  }], { session });
}

async function transaction(operation) {
  const session = await mongoose.startSession();
  try { return await session.withTransaction(() => operation(session)); }
  finally { await session.endSession(); }
}

exports.list = async (req, res) => {
  const hotel = await ownedHotel(req);
  const invites = await StaffInvite.find({ hotel: hotel._id }).sort({ updatedAt: -1 }).limit(100).lean();
  return res.json(invites);
};

exports.invite = async (req, res) => {
  const hotel = await ownedHotel(req);
  const name = clean(req.body.name, 100);
  const email = safeEmail(req.body.email);
  if (!name || !emailValid(email)) throw err(400, "Enter a name and valid staff work email.");
  if (await User.exists({ email })) throw err(409, "This email already belongs to an account. Use the staff member’s separate work email.");
  const token = randomBytes(32).toString("base64url");
  const invitationHash = hashInvitation(token);
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  let invite;
  try {
    invite = await StaffInvite.findOneAndUpdate({ hotel: hotel._id, email, user: { $exists: false } },
      { $set: { name, invitationHash, invitationExpiresAt: expiresAt, status: "invited", sentAt: null } }, { upsert: true, new: true });
  } catch (error) {
    if (error.code === 11000) throw err(409, "This staff account already exists or the invitation changed.");
    throw error;
  }
  const url = new URL("/hotel-staff-invitation", process.env.CLIENT_URL || (process.env.NODE_ENV === "production" ? "https://dinefor.com" : "http://localhost:5173"));
  url.hash = new URLSearchParams({ invitation: token }).toString();
  try {
    const result = await sendMail({ to: email, subject: "Your DineFor staff invitation", text: `${hotel.hotelName} has invited you to its DineFor check-in desk. Use your private invitation within seven days.\n\n${url.href}` });
    if (!result.accepted?.length) throw new Error();
  } catch {
    await StaffInvite.updateOne({ _id: invite._id, invitationHash }, { $unset: { invitationHash: 1 }, $set: { status: "revoked" } });
    throw err(503, "The invitation email could not be sent. Please retry.");
  }
  const sent = await StaffInvite.findOneAndUpdate({ _id: invite._id, invitationHash }, { sentAt: new Date() }, { new: true });
  if (!sent) throw err(409, "The invitation changed while it was being sent.");
  await audit(req, sent, "hotel_staff_invited");
  return res.status(201).json({ message: "Staff invitation sent." });
};

exports.revoke = async (req, res) => {
  const hotel = await ownedHotel(req);
  if (!mongoose.isValidObjectId(req.params.id)) throw err(404, "Staff invitation not found.");
  await transaction(async session => {
    const invite = await StaffInvite.findOneAndUpdate({ _id: req.params.id, hotel: hotel._id }, {
      $set: { status: "revoked" }, $unset: { invitationHash: 1 },
    }, { session });
    if (!invite) throw err(404, "Staff invitation not found.");
    if (invite.user) await User.updateOne({ _id: invite.user, staffHotel: hotel._id, role: "hotel_staff" }, { isActive: false }, { session });
    await audit(req, invite, "hotel_staff_access_revoked", session);
  });
  return res.json({ message: "Staff access revoked." });
};

exports.accept = async (req, res) => {
  const token = req.get("X-Hotel-Invitation");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token || "")) throw err(401, "Open the staff invitation from your email.");
  const query = { invitationHash: hashInvitation(token), invitationExpiresAt: { $gt: new Date() }, status: "invited", sentAt: { $ne: null } };
  const current = await StaffInvite.findOne(query).select("_id");
  if (!current) throw err(401, "The staff invitation is invalid or expired.");
  const password = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
  try {
    await transaction(async session => {
      const invite = await StaffInvite.findOne({ ...query, _id: current._id }).session(session);
      if (!invite) throw err(409, "This invitation has already been used or revoked.");
      if (!await Hotel.exists({ _id: invite.hotel, status: "approved", isApproved: true }).session(session)) throw err(409, "This hotel’s partnership is inactive.");
      const [user] = await User.create([{
        name: invite.name, email: invite.email, password, authProvider: "local", isEmailVerified: true, emailVerifiedAt: new Date(),
        role: "hotel_staff", staffHotel: invite.hotel,
      }], { session });
      const result = await StaffInvite.findOneAndUpdate({ ...query, _id: invite._id }, { $set: { user: user._id, status: "active" }, $unset: { invitationHash: 1 } }, { session, new: true });
      if (!result) throw err(409, "This invitation has changed.");
      await audit(req, result, "hotel_staff_invitation_accepted", session);
    });
  } catch (error) {
    if (error.code === 11000) throw err(409, "This work email already belongs to a DineFor account.");
    throw error;
  }
  return res.json({ message: "Your staff account is ready to set up. Request a password reset code with your invited work email." });
};
