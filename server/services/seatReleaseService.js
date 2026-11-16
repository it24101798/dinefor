const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const BuffetSeatInventory = require("../models/BuffetSeatInventory");

function inventoryError(message) {
  return Object.assign(new Error(message), { statusCode: 409 });
}

// Bookings created before slot IDs were stored can still reference a historical inventory row.
async function restoreInventorySeats(booking, { session, slotId, seats = booking.seats }) {
  const date = new Date(booking.selectedDate);
  const dateKey = Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  const stableSlotId = booking.inventorySlotId || slotId;
  if (!dateKey) {
    if (stableSlotId) throw inventoryError("The reserved inventory date is missing.");
    return false;
  }

  const filter = { buffet: booking.buffet?._id || booking.buffet, dateKey };
  if (stableSlotId) {
    filter.slotId = String(stableSlotId);
  } else {
    const { startTime, endTime } = booking.selectedTimeSlot || {};
    if (!startTime || !endTime) return false;
    const matches = await BuffetSeatInventory.find({ ...filter, startTime, endTime }).select("_id").limit(2).session(session);
    if (!matches.length) return false;
    if (matches.length > 1) throw inventoryError("The historical inventory slot needs reconciliation.");
    filter._id = matches[0]._id;
  }

  const count = Number(seats);
  if (!Number.isSafeInteger(count) || count <= 0) throw inventoryError("The reserved seat count is invalid.");
  const result = await BuffetSeatInventory.updateOne(
    filter,
    [{ $set: { availableSeats: { $min: ["$totalSeats", { $add: ["$availableSeats", count] }] } } }],
    { session, updatePipeline: true }
  );
  if (!result.matchedCount) throw inventoryError("The reserved inventory slot is missing.");
  return true;
}

async function releaseBookingSeats(bookingOrId, { session, slotId } = {}) {
  const bookingId = bookingOrId?._id || bookingOrId;
  if (!session) {
    return mongoose.connection.transaction((activeSession) => releaseBookingSeats(bookingId, { session: activeSession, slotId }));
  }

  const releasedAt = new Date();
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, inventoryReleasedAt: null },
    { $set: { inventoryReleasedAt: releasedAt } },
    { new: true, session }
  );
  if (!booking) return { released: false, reason: "already_released_or_missing" };

  const released = await restoreInventorySeats(booking, { session, slotId });
  return released ? { released, releasedAt } : { released, reason: "legacy_inventory_missing" };
}

module.exports = { releaseBookingSeats, restoreInventorySeats };
