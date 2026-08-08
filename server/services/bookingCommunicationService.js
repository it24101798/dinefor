const Hotel = require("../models/Hotel");
const User = require("../models/User");
const {
  sendBookingEmail,
  sendHotelBookingEmail,
} = require("./emailService");
const {
  notifyUser,
} = require("./notificationService");
const { logActivity } = require("./activityLogService");

const eventTemplates = {
  confirmed: {
    title: "Reservation confirmed",
    heading: "Your reservation is confirmed",
    intro:
      "Your buffet reservation has been confirmed. Keep your booking code ready for hotel check-in.",
    type: "booking",
    link: "/my-bookings",
  },
  reminder_24h: {
    title: "Buffet tomorrow",
    heading: "Your buffet is tomorrow",
    intro:
      "This is your 24-hour reminder. Review your reservation details before travelling.",
    type: "reminder",
    link: "/my-bookings",
  },
  reminder_1h: {
    title: "Buffet starts in one hour",
    heading: "Your buffet starts soon",
    intro:
      "Your buffet starts in approximately one hour. Please arrive with your booking code or QR confirmation.",
    type: "reminder",
    link: "/my-bookings",
  },
  started: {
    title: "Your buffet has started",
    heading: "Your buffet is now open",
    intro:
      "Your reserved buffet time has started. Present your DineFor confirmation at the hotel.",
    type: "reminder",
    link: "/my-bookings",
  },
  completed: {
    title: "How was your buffet?",
    heading: "Thank you for dining with DineFor",
    intro:
      "Your buffet time has ended. Share a verified review to help other diners and the hotel.",
    type: "review",
    link: "/my-reviews",
  },
  cancelled: {
    title: "Reservation cancelled",
    heading: "Your reservation was cancelled",
    intro:
      "Your DineFor reservation was cancelled. Review your booking page for the latest status.",
    type: "booking",
    link: "/my-bookings",
  },
  payment_paid: {
    title: "Payment confirmed",
    heading: "Your payment was successful",
    intro:
      "Your payment has been confirmed. Your reservation and payment information are available in DineFor.",
    type: "booking",
    link: "/payments",
  },
};

const communicateBookingEvent = async ({
  booking,
  event,
  customIntro = "",
}) => {
  const template = eventTemplates[event];
  if (!template || !booking) return;

  const user = booking.user;
  const buffet = booking.buffet;
  const hotel =
    buffet?.hotel?._id
      ? buffet.hotel
      : buffet?.hotel
        ? await Hotel.findById(buffet.hotel).populate("owner", "name email")
        : null;

  if (!user?._id || !user?.email) return;

  const customerJobs = [
    notifyUser({
      userId: user._id,
      title: template.title,
      message: `${buffet?.title || "Your buffet"} at ${
        hotel?.hotelName || "the hotel"
      }.`,
      type: template.type,
      link: template.link,
      dedupeKey: `booking:${booking._id}:${event}`,
    }),
  ];

  const shouldEmail =
    user.preferences?.emailNotifications !== false &&
    !(
      event.includes("reminder") &&
      user.preferences?.bookingReminders === false
    );

  if (shouldEmail) {
    customerJobs.push(
      sendBookingEmail({
        to: user.email,
        customerName: user.name,
        subject: `${template.title} | DineFor`,
        heading: template.heading,
        intro: customIntro || template.intro,
        booking,
        hotelName: hotel?.hotelName,
        buffetTitle: buffet?.title,
      })
    );
  }

  if (["confirmed", "cancelled"].includes(event) && hotel?.owner) {
    const owner =
      hotel.owner?._id
        ? hotel.owner
        : await User.findById(hotel.owner).select(
            "name email preferences"
          );

    if (owner?._id) {
      customerJobs.push(
        notifyUser({
          userId: owner._id,
          title:
            event === "confirmed"
              ? "New reservation"
              : "Reservation cancelled",
          message: `${buffet?.title || "Buffet"} — ${
            booking.bookingCode
          }.`,
          type: "booking",
          link: "/hotel/reservations",
          dedupeKey: `hotel-booking:${booking._id}:${event}`,
        })
      );

      if (
        owner.email &&
        owner.preferences?.emailNotifications !== false
      ) {
        customerJobs.push(
          sendHotelBookingEmail({
            to: owner.email,
            hotelName: hotel.hotelName,
            booking,
            customerName: user.name,
            buffetTitle: buffet?.title,
            event,
          })
        );
      }
    }
  }

  customerJobs.push(
    logActivity({
      actor: user._id,
      actorRole: user.role || "customer",
      action: `booking_${event}`,
      entityType: "booking",
      entityId: booking._id,
      message: `Booking ${booking.bookingCode} event: ${event}.`,
    })
  );

  return Promise.allSettled(customerJobs);
};

module.exports = {
  communicateBookingEvent,
};
