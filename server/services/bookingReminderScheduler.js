const { processBookingReminders } = require("./bookingReminderService");

let timer = null;
let running = false;

const shouldEnable = () => {
  if (String(process.env.BOOKING_REMINDERS_ENABLED || "").toLowerCase() === "false")
    return false;
  if (String(process.env.BOOKING_REMINDERS_ENABLED || "").toLowerCase() === "true")
    return true;
  return process.env.NODE_ENV === "production";
};

const runOnce = async () => {
  if (running) return;
  running = true;
  try {
    const result = await processBookingReminders();
    if (result.processed > 0) {
      console.log("Booking reminder scheduler:", result);
    }
  } catch (error) {
    console.error("Booking reminder scheduler error:", error.message);
  } finally {
    running = false;
  }
};

const startBookingReminderScheduler = () => {
  if (!shouldEnable() || timer) return;

  const intervalMinutes = Math.max(
    1,
    Number(process.env.BOOKING_REMINDER_INTERVAL_MINUTES || 5)
  );

  setTimeout(runOnce, 20 * 1000);
  timer = setInterval(runOnce, intervalMinutes * 60 * 1000);

  if (typeof timer.unref === "function") timer.unref();

  console.log(
    `Booking reminders enabled every ${intervalMinutes} minute(s).`
  );
};

module.exports = { startBookingReminderScheduler, runOnce };
