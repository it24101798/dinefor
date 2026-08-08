const Booking = require("../models/Booking");
const { communicateBookingEvent } = require("./bookingCommunicationService");

const parseSlotDateTime = (dateValue, timeText) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const match = String(timeText || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
};

const inWindow = (target, now, windowMinutes = 8) =>
  target &&
  Math.abs(target.getTime() - now.getTime()) <=
    windowMinutes * 60 * 1000;

const processBookingReminders = async () => {
  const now = new Date();
  const bookings = await Booking.find({
    bookingStatus: { $in: ["confirmed", "checked_in"] },
    selectedDate: {
      $gte: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      $lte: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
  })
    .populate("user", "name email preferences")
    .populate({
      path: "buffet",
      populate: { path: "hotel", select: "hotelName" },
    });

  let processed = 0;

  for (const booking of bookings) {
    const start = parseSlotDateTime(
      booking.selectedDate,
      booking.selectedTimeSlot?.startTime
    );
    const end = parseSlotDateTime(
      booking.selectedDate,
      booking.selectedTimeSlot?.endTime
    );
    if (!start || !end) continue;

    booking.reminderFlags = booking.reminderFlags || {};

    const events = [
      {
        key: "dayBeforeSentAt",
        event: "reminder_24h",
        target: new Date(start.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        key: "hourBeforeSentAt",
        event: "reminder_1h",
        target: new Date(start.getTime() - 60 * 60 * 1000),
      },
      {
        key: "startedSentAt",
        event: "started",
        target: start,
      },
      {
        key: "completedSentAt",
        event: "completed",
        target: end,
      },
    ];

    let changed = false;

    for (const item of events) {
      if (!booking.reminderFlags[item.key] && inWindow(item.target, now)) {
        await communicateBookingEvent({
          booking,
          event: item.event,
        });
        booking.reminderFlags[item.key] = now;
        changed = true;
        processed += 1;
      }
    }

    if (
      !booking.reminderFlags.completedSentAt &&
      now > end &&
      booking.bookingStatus === "checked_in"
    ) {
      booking.bookingStatus = "completed";
      booking.completedAt = now;
      await communicateBookingEvent({
        booking,
        event: "completed",
      });
      booking.reminderFlags.completedSentAt = now;
      changed = true;
      processed += 1;
    }

    if (changed) await booking.save();
  }

  return { processed, checked: bookings.length };
};

module.exports = { processBookingReminders };
