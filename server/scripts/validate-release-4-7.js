const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

process.env.BUSINESS_TIMEZONE_OFFSET_MINUTES = "330";
const { calculateCancellationQuote, normalizeCancellationPolicy } = require("../services/cancellationPolicyService");

const root = path.resolve(__dirname, "../..");
const serverFiles = [
  "server/models/Hotel.js", "server/models/Booking.js", "server/models/CancellationRequest.js",
  "server/services/cancellationPolicyService.js", "server/services/bookingCommunicationService.js", "server/services/emailService.js",
  "server/controllers/cancellationController.js", "server/controllers/bookingController.js", "server/controllers/hotelController.js",
  "server/controllers/hotelPortalController.js", "server/controllers/paymentController.js", "server/routes/bookingRoutes.js",
  "server/routes/cancellationRoutes.js", "server/server.js",
];
for (const file of serverFiles) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
  assert.strictEqual(result.status, 0, `${file} syntax failed: ${result.stderr}`);
}

const policy = normalizeCancellationPolicy({ freeCancellationHours: 24, lateCancellationHours: 6, lateRefundPercent: 50, lastMinuteRefundPercent: 0 });
assert.strictEqual(policy.freeCancellationHours, 24);
assert.strictEqual(normalizeCancellationPolicy({ freeCancellationHours: 6, lateCancellationHours: 24 }).lateCancellationHours, 6);
const payment = { paidAmount: 10000, refundedAmount: 1000, paymentMode: "full_payment", currency: "LKR" };
const hotel = { cancellationPolicy: policy };
const makeBooking = (isoDate) => ({ selectedDate: isoDate, selectedTimeSlot: { startTime: "12:00" } });
const reservation = "2026-09-10T00:00:00.000Z";
const full = calculateCancellationQuote({ booking: makeBooking(reservation), payment, hotel, now: new Date("2026-09-08T00:00:00.000Z") });
assert.deepStrictEqual({ percent: full.refundPercent, amount: full.refundableAmount, retained: full.retainedAmount, band: full.policyBand }, { percent: 100, amount: 9000, retained: 0, band: "free_cancellation" });
const late = calculateCancellationQuote({ booking: makeBooking(reservation), payment, hotel, now: new Date("2026-09-10T00:00:00.000Z") });
assert.deepStrictEqual({ percent: late.refundPercent, amount: late.refundableAmount, band: late.policyBand }, { percent: 50, amount: 4500, band: "late_cancellation" });
const lastMinute = calculateCancellationQuote({ booking: makeBooking(reservation), payment, hotel, now: new Date("2026-09-10T05:00:00.000Z") });
assert.deepStrictEqual({ percent: lastMinute.refundPercent, amount: lastMinute.refundableAmount, band: lastMinute.policyBand }, { percent: 0, amount: 0, band: "last_minute" });
const operator = calculateCancellationQuote({ booking: makeBooking(reservation), payment, hotel, actorRole: "hotel", now: new Date("2026-09-10T05:00:00.000Z") });
assert.strictEqual(operator.refundableAmount, 9000);
const protectedOperator = calculateCancellationQuote({ booking: makeBooking(reservation), payment, hotel: { cancellationPolicy: { hotelCancellationRefundPercent: 0 } }, actorRole: "hotel", now: new Date("2026-09-10T05:00:00.000Z") });
assert.strictEqual(protectedOperator.refundPercent, 100);
const retainedDeposit = calculateCancellationQuote({ booking: makeBooking(reservation), payment: { ...payment, paymentMode: "deposit" }, hotel: { cancellationPolicy: { ...policy, depositRefundableWithinFreeWindow: false } }, now: new Date("2026-09-08T00:00:00.000Z") });
assert.deepStrictEqual({ percent: retainedDeposit.refundPercent, amount: retainedDeposit.refundableAmount, band: retainedDeposit.policyBand }, { percent: 0, amount: 0, band: "non_refundable_deposit" });
const noShow = calculateCancellationQuote({ booking: makeBooking(reservation), payment, hotel, actorRole: "hotel", eventType: "no_show", now: new Date("2026-09-10T08:00:00.000Z") });
assert.strictEqual(noShow.refundableAmount, 0);

const routes = fs.readFileSync(path.join(root, "server/routes/cancellationRoutes.js"), "utf8");
for (const route of ["/bookings/:id/quote", "/bookings/:id/operator-cancel", "/bookings/:id/no-show", "/hotel", "/admin"]) assert(routes.includes(route), `Missing lifecycle route ${route}`);
const bookingRoutes = fs.readFileSync(path.join(root, "server/routes/bookingRoutes.js"), "utf8");
for (const route of ["/my-bookings/:id/cancel", "/my-bookings/:id/reschedule"]) assert(bookingRoutes.includes(route), `Missing customer lifecycle route ${route}`);
assert(fs.readFileSync(path.join(root, "server/controllers/bookingController.js"), "utf8").includes("Use the protected cancellation or no-show workflow"));
assert(fs.readFileSync(path.join(root, "server/controllers/hotelPortalController.js"), "utf8").includes("Use the protected cancellation or no-show workflow"));

const parserPath = path.join(root, "client/node_modules/@babel/parser");
if (fs.existsSync(parserPath)) {
  const parser = require(parserPath);
  for (const file of ["client/src/pages/MyBookings.jsx", "client/src/pages/HotelDashboard.jsx", "client/src/pages/AdminDashboard.jsx", "client/src/pages/BookingSummary.jsx", "client/src/components/hotel/HotelOperationsPanels.jsx", "client/src/components/booking/CancellationCasesPanel.jsx"]) parser.parse(fs.readFileSync(path.join(root, file), "utf8"), { sourceType: "module", plugins: ["jsx"] });
}

assert(fs.readFileSync(path.join(root, "server/.env.example"), "utf8").includes("BUSINESS_TIMEZONE_OFFSET_MINUTES=330"));

console.log("[PASS] Release 4.7 cancellation policy, refund quotes, protected lifecycle routes, rescheduling and source syntax validated.");
