const User = require("../models/User");
const {
  sendHotelApplicationEmail,
  sendHotelStatusEmail,
  sendAdminHotelApplicationEmail,
} = require("./emailService");
const {
  notifyUser,
  notifyAdmins,
} = require("./notificationService");

const communicateHotelApplicationSubmitted = async ({
  hotel,
  owner,
}) => {
  const admins = await User.find({
    role: "admin",
    isActive: { $ne: false },
  }).select("email");

  const jobs = [
    notifyUser({
      userId: owner?._id,
      title: "Hotel application received",
      message: `${hotel.hotelName} is now awaiting DineFor review.`,
      type: "system",
      link: "/hotel",
      dedupeKey: `hotel-application:${hotel._id}:submitted`,
    }),
    notifyAdmins({
      title: "New hotel application",
      message: `${hotel.hotelName} submitted an application.`,
      type: "system",
      link: "/admin/hotels",
      dedupeKey: `hotel-application:${hotel._id}:admin`,
    }),
  ];

  if (owner?.email) {
    jobs.push(
      sendHotelApplicationEmail({
        to: owner.email,
        name: owner.name,
        hotelName: hotel.hotelName,
        applicationNumber: hotel.application?.applicationNumber,
      })
    );
  }

  admins.forEach((admin) => {
    if (!admin.email) return;
    jobs.push(
      sendAdminHotelApplicationEmail({
        to: admin.email,
        hotelName: hotel.hotelName,
        applicationNumber: hotel.application?.applicationNumber,
        ownerEmail: owner?.email,
      })
    );
  });

  return Promise.allSettled(jobs);
};

const communicateHotelStatusChanged = async ({
  hotel,
  owner,
  status,
  note,
}) => {
  const label = String(status || "").replace(/_/g, " ");

  const jobs = [
    notifyUser({
      userId: owner?._id,
      title: "Hotel application updated",
      message: `${hotel.hotelName} is now ${label}.`,
      type: status === "approved" ? "offer" : "system",
      link: "/hotel",
      dedupeKey: `hotel-status:${hotel._id}:${status}:${hotel.application?.reviewedAt?.getTime?.() || Date.now()}`,
    }),
  ];

  if (owner?.email) {
    jobs.push(
      sendHotelStatusEmail({
        to: owner.email,
        name: owner.name,
        hotelName: hotel.hotelName,
        status,
        note,
      })
    );
  }

  return Promise.allSettled(jobs);
};

module.exports = {
  communicateHotelApplicationSubmitted,
  communicateHotelStatusChanged,
};
