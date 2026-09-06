const Buffet = require("../models/Buffet");
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");
const BuffetSeatInventory = require("../models/BuffetSeatInventory");
const mongoose = require("mongoose");

const ACTIVE_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "dining",
  "completed",
];

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, Number(value) || min));

const normalizeDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const toUTCDate = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

const dayName = (dateKey) =>
  toUTCDate(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });

const findSlot = (buffet, slotId) =>
  buffet?.timeSlots?.id?.(slotId) ||
  buffet?.timeSlots?.find((slot) => String(slot._id) === String(slotId)) ||
  null;

const validateDate = (buffet, dateKey) => {
  if (!dateKey) return "A valid date is required.";

  const date = toUTCDate(dateKey);
  const todayKey = new Date().toISOString().slice(0, 10);
  const today = toUTCDate(todayKey);

  if (date < today) return "Past dates are not bookable.";

  const bookingWindowDays = Math.max(
    1,
    Number(buffet.bookingWindowDays || 90)
  );
  const latest = new Date(today);
  latest.setUTCDate(latest.getUTCDate() + bookingWindowDays);

  if (date > latest) {
    return `Reservations are currently open up to ${bookingWindowDays} days ahead.`;
  }

  if (buffet.buffetType === "special" && buffet.specialDate) {
    if (normalizeDateKey(buffet.specialDate) !== dateKey) {
      return `This special buffet is available only on ${normalizeDateKey(
        buffet.specialDate
      )}.`;
    }
  }

  if (buffet.availableFromDate) {
    const from = toUTCDate(normalizeDateKey(buffet.availableFromDate));
    if (date < from) return "This buffet has not started yet.";
  }

  if (buffet.availableToDate) {
    const to = toUTCDate(normalizeDateKey(buffet.availableToDate));
    if (date > to) return "This buffet is no longer available on this date.";
  }

  if (
    buffet.scheduleType === "selected_days" &&
    Array.isArray(buffet.recurringDays) &&
    buffet.recurringDays.length &&
    !buffet.recurringDays.includes(dayName(dateKey))
  ) {
    return `This buffet is not available on ${dayName(dateKey)}.`;
  }

  return "";
};

const getBookedSeats = async ({ buffetId, dateKey, slot }) => {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(`${dateKey}T23:59:59.999Z`);

  const result = await Booking.aggregate([
    {
      $match: {
        buffet:
          typeof buffetId === "string"
            ? new mongoose.Types.ObjectId(buffetId)
            : buffetId,
        selectedDate: { $gte: start, $lte: end },
        bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
        "selectedTimeSlot.startTime": slot.startTime,
        "selectedTimeSlot.endTime": slot.endTime,
      },
    },
    { $group: { _id: null, seats: { $sum: "$seats" } } },
  ]);

  return Number(result?.[0]?.seats || 0);
};

const ensureInventory = async ({ buffet, dateKey, slot }) => {
  const slotId = String(slot._id);

  let inventory = await BuffetSeatInventory.findOne({
    buffet: buffet._id,
    dateKey,
    slotId,
  });

  if (inventory) return inventory;

  const bookedSeats = await getBookedSeats({
    buffetId: buffet._id,
    dateKey,
    slot,
  });

  const totalSeats = Number(slot.totalSeats || 0);

  try {
    inventory = await BuffetSeatInventory.create({
      buffet: buffet._id,
      dateKey,
      slotId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalSeats,
      availableSeats: Math.max(totalSeats - bookedSeats, 0),
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    inventory = await BuffetSeatInventory.findOne({
      buffet: buffet._id,
      dateKey,
      slotId,
    });
  }

  return inventory;
};

const buildSlot = (inventory, slot) => ({
  _id: String(slot._id),
  startTime: slot.startTime,
  endTime: slot.endTime,
  totalSeats: Number(inventory.totalSeats || slot.totalSeats || 0),
  availableSeats: inventory.isClosed
    ? 0
    : Number(inventory.availableSeats || 0),
  isClosed: Boolean(inventory.isClosed),
  isSoldOut:
    Boolean(inventory.isClosed) || Number(inventory.availableSeats || 0) <= 0,
  overrideReason: inventory.overrideReason || "",
});

const getDateAvailability = async ({ buffet, dateKey }) => {
  const dateError = validateDate(buffet, dateKey);

  if (dateError) {
    return {
      dateKey,
      day: dateKey ? dayName(dateKey) : "",
      isAvailableDate: false,
      message: dateError,
      totalAvailableSeats: 0,
      slots: [],
    };
  }

  const slots = await Promise.all(
    (buffet.timeSlots || []).map(async (slot) => {
      const inventory = await ensureInventory({ buffet, dateKey, slot });
      return buildSlot(inventory, slot);
    })
  );

  const totalAvailableSeats = slots.reduce(
    (total, slot) => total + Number(slot.availableSeats || 0),
    0
  );

  return {
    dateKey,
    day: dayName(dateKey),
    isAvailableDate: slots.length > 0 && totalAvailableSeats > 0,
    message:
      slots.length === 0
        ? "No time slots are configured for this buffet."
        : totalAvailableSeats <= 0
        ? "This buffet is sold out or closed for this date."
        : "",
    totalAvailableSeats,
    slots,
  };
};

const ensureHotelOwnership = async (req, buffet) => {
  if (req.user.role === "admin") return true;

  const hotel = await Hotel.findOne({ owner: req.user.id }).select("_id");
  return hotel && String(hotel._id) === String(buffet.hotel);
};

exports.getAvailabilityCalendar = async (req, res) => {
  try {
    const buffet = await Buffet.findById(req.params.buffetId).populate(
      "hotel",
      "hotelName status isApproved"
    );

    if (!buffet) {
      return res.status(404).json({ message: "Buffet not found." });
    }

    if (!buffet.isActive || buffet.status !== "active") {
      return res.status(400).json({
        message: "This buffet is not currently open for reservations.",
      });
    }

    const requestedStart =
      normalizeDateKey(req.query.from) ||
      new Date().toISOString().slice(0, 10);

    const days = clamp(req.query.days || 14, 1, 31);
    const guests = clamp(req.query.guests || 1, 1, 100);

    const dates = [];

    for (let offset = 0; offset < days; offset += 1) {
      const current = toUTCDate(requestedStart);
      current.setUTCDate(current.getUTCDate() + offset);
      const dateKey = current.toISOString().slice(0, 10);

      // eslint-disable-next-line no-await-in-loop
      const availability = await getDateAvailability({ buffet, dateKey });

      dates.push({
        ...availability,
        canFitGuests:
          availability.slots.some(
            (slot) => Number(slot.availableSeats || 0) >= guests
          ),
      });
    }

    return res.json({
      buffetId: String(buffet._id),
      reservationPolicy: {
        mode: buffet.reservationMode || "auto_confirm",
        instantConfirmation:
          (buffet.reservationMode || "auto_confirm") === "auto_confirm",
        maxGuestsPerBooking: Number(buffet.maxGuestsPerBooking || 20),
        advanceBookingHours: Number(buffet.advanceBookingHours || 0),
        bookingWindowDays: Number(buffet.bookingWindowDays || 90),
      },
      from: requestedStart,
      days,
      guests,
      dates,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load the availability calendar.",
      error: error.message,
    });
  }
};

exports.getHotelInventory = async (req, res) => {
  try {
    const buffet = await Buffet.findById(req.params.buffetId);
    if (!buffet) return res.status(404).json({ message: "Buffet not found." });

    const allowed = await ensureHotelOwnership(req, buffet);
    if (!allowed) {
      return res.status(403).json({
        message: "You cannot manage inventory for this buffet.",
      });
    }

    const from =
      normalizeDateKey(req.query.from) ||
      new Date().toISOString().slice(0, 10);
    const days = clamp(req.query.days || 14, 1, 31);

    const dates = [];

    for (let offset = 0; offset < days; offset += 1) {
      const current = toUTCDate(from);
      current.setUTCDate(current.getUTCDate() + offset);
      const dateKey = current.toISOString().slice(0, 10);
      // eslint-disable-next-line no-await-in-loop
      dates.push(await getDateAvailability({ buffet, dateKey }));
    }

    return res.json({
      buffet: {
        _id: buffet._id,
        title: buffet.title,
        reservationMode: buffet.reservationMode || "auto_confirm",
      },
      from,
      days,
      dates,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load hotel inventory.",
      error: error.message,
    });
  }
};

exports.updateInventoryOverride = async (req, res) => {
  try {
    const { buffetId, dateKey, slotId } = req.params;
    const normalizedDate = normalizeDateKey(dateKey);

    if (!normalizedDate) {
      return res.status(400).json({ message: "Valid inventory date required." });
    }

    const buffet = await Buffet.findById(buffetId);
    if (!buffet) return res.status(404).json({ message: "Buffet not found." });

    const allowed = await ensureHotelOwnership(req, buffet);
    if (!allowed) {
      return res.status(403).json({
        message: "You cannot manage inventory for this buffet.",
      });
    }

    const slot = findSlot(buffet, slotId);
    if (!slot) {
      return res.status(404).json({ message: "Time slot not found." });
    }

    const inventory = await ensureInventory({
      buffet,
      dateKey: normalizedDate,
      slot,
    });

    const currentlyReserved = Math.max(
      0,
      Number(inventory.totalSeats || 0) - Number(inventory.availableSeats || 0)
    );

    if (req.body.totalSeats !== undefined) {
      const requestedTotal = Number(req.body.totalSeats);

      if (!Number.isInteger(requestedTotal) || requestedTotal < currentlyReserved) {
        return res.status(400).json({
          message: `Capacity cannot be lower than the ${currentlyReserved} already reserved guest(s).`,
        });
      }

      inventory.totalSeats = requestedTotal;
      inventory.availableSeats = Math.max(
        requestedTotal - currentlyReserved,
        0
      );
    }

    if (req.body.isClosed !== undefined) {
      inventory.isClosed = Boolean(req.body.isClosed);
    }

    if (req.body.overrideReason !== undefined) {
      inventory.overrideReason = String(req.body.overrideReason || "")
        .trim()
        .slice(0, 300);
    }

    inventory.overrideUpdatedAt = new Date();
    inventory.overrideUpdatedBy = req.user.id;

    await inventory.save();

    return res.json({
      message: inventory.isClosed
        ? "This buffet slot is closed for the selected date."
        : "Inventory exception updated successfully.",
      inventory: buildSlot(inventory, slot),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update inventory.",
      error: error.message,
    });
  }
};

exports.resetInventoryOverride = async (req, res) => {
  try {
    const { buffetId, dateKey, slotId } = req.params;
    const normalizedDate = normalizeDateKey(dateKey);

    const buffet = await Buffet.findById(buffetId);
    if (!buffet) return res.status(404).json({ message: "Buffet not found." });

    const allowed = await ensureHotelOwnership(req, buffet);
    if (!allowed) {
      return res.status(403).json({
        message: "You cannot manage inventory for this buffet.",
      });
    }

    const slot = findSlot(buffet, slotId);
    if (!slot) return res.status(404).json({ message: "Time slot not found." });

    const inventory = await ensureInventory({
      buffet,
      dateKey: normalizedDate,
      slot,
    });

    const bookedSeats = await getBookedSeats({
      buffetId: buffet._id,
      dateKey: normalizedDate,
      slot,
    });

    inventory.totalSeats = Number(slot.totalSeats || 0);
    inventory.availableSeats = Math.max(
      Number(slot.totalSeats || 0) - bookedSeats,
      0
    );
    inventory.isClosed = false;
    inventory.overrideReason = "";
    inventory.overrideUpdatedAt = new Date();
    inventory.overrideUpdatedBy = req.user.id;

    await inventory.save();

    return res.json({
      message: "Inventory returned to the buffet's default capacity.",
      inventory: buildSlot(inventory, slot),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to reset inventory.",
      error: error.message,
    });
  }
};

module.exports.ensureInventory = ensureInventory;
module.exports.getDateAvailability = getDateAvailability;
module.exports.validateDate = validateDate;
module.exports.findSlot = findSlot;
