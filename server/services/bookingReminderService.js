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

const between = (value, start, end) =>
  value >= start && value < end;

const processBookingReminders = async () => {
  const now = new Date();
  const lookBehind = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const lookAhead = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const bookings = await Booking.find({
    bookingStatus: {
      $in: ["confirmed", "checked_in", "dining"],
    },
    selectedDate: {
      $gte: lookBehind,
      $lte: lookAhead,
    },
  })
    .populate("user", "name email role preferences")
    .populate({
      path: "buffet",
      populate: {
        path: "hotel",
        select: "hotelName owner",
        populate: { path: "owner", select: "name email preferences" },
      },
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

    if (!start || !end || end <= start) continue;

    booking.reminderFlags = booking.reminderFlags || {};
    let changed = false;

    const dayBefore = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const hourBefore = new Date(start.getTime() - 60 * 60 * 1000);

    // A delayed scheduler should not completely miss a reminder, but it also
    // should not send a "24-hour" reminder when the one-hour reminder is due.
    if (
      !booking.reminderFlags.dayBeforeSentAt &&
      between(now, dayBefore, hourBefore)
    ) {
      await communicateBookingEvent({
        booking,
        event: "reminder_24h",
      });
      booking.reminderFlags.dayBeforeSentAt = now;
      changed = true;
      processed += 1;
    }

    if (
      !booking.reminderFlags.hourBeforeSentAt &&
      between(now, hourBefore, start)
    ) {
      await communicateBookingEvent({
        booking,
        event: "reminder_1h",
      });
      booking.reminderFlags.hourBeforeSentAt = now;
      changed = true;
      processed += 1;
    }

    if (
      !booking.reminderFlags.startedSentAt &&
      between(now, start, end)
    ) {
      await communicateBookingEvent({
        booking,
        event: "started",
      });
      booking.reminderFlags.startedSentAt = now;

      if (["confirmed", "checked_in"].includes(booking.bookingStatus)) {
        booking.bookingStatus = "dining";
        booking.statusTimeline.push({
          status: "dining",
          note: "Buffet service window started automatically.",
          at: now,
        });
      }

      changed = true;
      processed += 1;
    }

    if (!booking.reminderFlags.completedSentAt && now >= end) {
      await communicateBookingEvent({
        booking,
        event: "completed",
      });
      booking.reminderFlags.completedSentAt = now;

      if (["checked_in", "dining"].includes(booking.bookingStatus)) {
        booking.bookingStatus = "completed";
        booking.completedAt = now;
        booking.statusTimeline.push({
          status: "completed",
          note: "Buffet service window completed.",
          at: now,
        });
      }

      changed = true;
      processed += 1;
    }

    if (changed) await booking.save();
  }

  return { processed, checked: bookings.length };
};

module.exports = { processBookingReminders, parseSlotDateTime };
