const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash, randomUUID } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Inventory = require("../models/BuffetSeatInventory");
const { readGuestDetails } = require("../utils/reservationDetails");
const { releaseBookingSeats } = require("../services/seatReleaseService");

const id = () => new mongoose.Types.ObjectId();

test("tracked seat release supplies the exact inventory slot and capped atomic update", async (t) => {
  const session = {};
  const bookingId = id();
  const buffet = id();
  let claimed = false;
  t.mock.method(Booking, "findOneAndUpdate", async (filter, update, options) => {
    assert.deepEqual(filter, { _id: bookingId, inventoryReleasedAt: null });
    assert.equal(options.session, session);
    if (claimed) return null;
    claimed = true;
    assert.ok(update.$set.inventoryReleasedAt instanceof Date);
    return { _id: bookingId, buffet, inventorySlotId: "original-slot", selectedDate: "2026-12-20", seats: 3 };
  });
  const write = t.mock.method(Inventory, "updateOne", async (query, update, options) => {
    assert.deepEqual(query, { buffet, dateKey: "2026-12-20", slotId: "original-slot" });
    assert.deepEqual(update, [{ $set: { availableSeats: { $min: ["$totalSeats", { $add: ["$availableSeats", 3] }] } } }]);
    assert.deepEqual(options, { session, updatePipeline: true });
    return { matchedCount: 1 };
  });
  assert.equal((await releaseBookingSeats(bookingId, { session })).released, true);
  assert.equal((await releaseBookingSeats(bookingId, { session })).released, false);
  assert.equal(write.mock.callCount(), 1);
});

test("missing tracked inventory rejects the enclosing transaction", async (t) => {
  t.mock.method(Booking, "findOneAndUpdate", async () => ({
    buffet: id(), inventorySlotId: "removed-slot", selectedDate: "2026-12-20", seats: 2,
  }));
  t.mock.method(Inventory, "updateOne", async () => ({ matchedCount: 0 }));
  await assert.rejects(releaseBookingSeats(id(), { session: {} }), { statusCode: 409 });
});

test("booking HTTP routes enforce ownership and replay an existing checkout", async (t) => {
  const secret = randomUUID();
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  t.after(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });
  const customer = { id: String(id()), role: "customer" };
  const outsider = { id: String(id()), role: "customer" };
  const hotel = { id: String(id()), role: "hotel" };
  const actors = new Map([customer, outsider, hotel].map((actor) => [actor.id, actor]));
  const query = (result) => {
    const chain = {
      select: () => chain, populate: () => chain, lean: () => chain,
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    return chain;
  };
  t.mock.method(User, "findById", (key) => query(actors.get(key)));
  const key = randomUUID();
  const selectedDate = "2026-12-20";
  const body = {
    buffetId: String(id()), selectedDate, slotId: String(id()), seats: 2, expectedTotal: 4800,
    paymentMode: "full_payment", acceptedCancellationPolicy: true,
    guestDetails: { name: "Fixture Guest", email: "guest@example.test", phone: "+94771234567" },
  };
  const bookingId = createHash("sha256").update(`${customer.id}:${key}`).digest("hex").slice(0, 24);
  const hash = createHash("sha256").update(JSON.stringify([
    body.buffetId, selectedDate, body.slotId, 2, "", 4800,
    readGuestDetails(body.guestDetails, undefined),
  ])).digest("hex");
  const payment = { _id: id(), metadata: { checkoutHash: hash } };
  t.mock.method(Payment, "findOne", (filter) => query(filter.booking === bookingId && filter.user === customer.id && filter.gateway === "sandbox" ? payment : null));
  const booking = {
    _id: bookingId, bookingCode: "DF-FIXTURE", user: customer.id, bookingStatus: "confirmed",
    selectedDate, seats: 2, selectedTimeSlot: { startTime: "18:00", endTime: "20:00" },
    buffet: { title: "Fixture Dining", hotel: { hotelName: "Fixture Hotel", location: "Colombo" } },
  };
  t.mock.method(Booking, "findOne", (filter) => query(String(filter._id) === bookingId && filter.user === customer.id ? booking : null));
  const app = express();
  app.use(express.json());
  app.use("/bookings", require("../routes/bookingRoutes"));
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    listener.once("error", reject);
  });
  t.after(() => server.close());
  const request = (path, actor, options = {}) => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    ...options,
    headers: { ...options.headers, ...(actor ? { Authorization: `Bearer ${jwt.sign({ id: actor.id }, secret)}` } : {}) },
  });
  assert.equal((await request(`/bookings/my-bookings/${bookingId}/calendar`)).status, 401);
  assert.equal((await request(`/bookings/my-bookings/${bookingId}/calendar`, hotel)).status, 403);
  assert.equal((await request(`/bookings/my-bookings/${bookingId}/calendar`, outsider)).status, 404);
  const calendar = await request(`/bookings/my-bookings/${bookingId}/calendar`, customer);
  assert.equal(calendar.status, 200);
  assert.match(await calendar.text(), /DTSTART:20261220T123000Z/);
  assert.match(calendar.headers.get("cache-control"), /no-store/);

  const post = (payload) => request("/bookings", customer, {
    method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(payload),
  });
  const replay = await post(body);
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).paymentId, String(payment._id));
  assert.equal((await post({ ...body, seats: 3 })).status, 409);
});

test("MongoDB serializes competing holds, replays checkout and releases once", {
  skip: !process.env.DINEFOR_QA_MONGO_URI,
}, async () => {
  const dbName = `dinefor_qa_${randomUUID().replaceAll("-", "")}_sandbox`;
  await mongoose.connect(process.env.DINEFOR_QA_MONGO_URI, { dbName });
  const original = { NODE_ENV: process.env.NODE_ENV, DINEFOR_CHECKOUT_SANDBOX: process.env.DINEFOR_CHECKOUT_SANDBOX };
  process.env.NODE_ENV = "test";
  process.env.DINEFOR_CHECKOUT_SANDBOX = "true";
  try {
    const Hotel = require("../models/Hotel");
    const Buffet = require("../models/Buffet");
    const Ledger = require("../models/PaymentTransaction");
    const { createBooking } = require("../controllers/bookingController");
    const { calculateTotals } = require("../utils/pricing");
    await Promise.all([Booking, Inventory, Payment, Ledger, Hotel, Buffet].map((model) => model.init()));
    const hotel = await Hotel.create({ owner: id(), hotelName: "QA Hotel", location: "Colombo", status: "approved", isApproved: true });
    const buffet = await Buffet.create({
      hotel: hotel._id, title: "QA Buffet", status: "active", scheduleType: "all_days", price: 2400,
      timeSlots: [{ startTime: "18:00", endTime: "20:00", totalSeats: 2, availableSeats: 2 }],
    });
    const selectedDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const body = {
      buffetId: String(buffet._id), selectedDate, slotId: String(buffet.timeSlots[0]._id), seats: 2,
      expectedTotal: calculateTotals({ price: 2400, seats: 2 }).grandTotal,
      paymentMode: "full_payment", acceptedCancellationPolicy: true,
      guestDetails: { name: "Fixture Guest", email: "guest@example.test", phone: "+94771234567" },
    };
    const submit = async (customer, key) => {
      const res = { code: 200, status(code) { this.code = code; return this; }, json(value) { this.data = value; return this; } };
      await createBooking({ user: { id: customer }, body, get: () => key }, res);
      return res;
    };
    const users = [id(), id()];
    const keys = [randomUUID(), randomUUID()];
    const competing = await Promise.all(users.map((user, index) => submit(user, keys[index])));
    assert.deepEqual(competing.map((res) => res.code).sort(), [201, 409]);
    const winner = competing.findIndex((res) => res.code === 201);
    const replay = await submit(users[winner], keys[winner]);
    assert.equal(replay.code, 200);
    assert.equal(String(replay.data.paymentId), String(competing[winner].data.paymentId));
    assert.equal(await Booking.countDocuments(), 1);
    assert.equal(await Payment.countDocuments(), 1);
    assert.equal((await Inventory.findOne({ buffet: buffet._id })).availableSeats, 0);

    const booking = await Booking.findOne();
    const results = await Promise.all(Array.from({ length: 5 }, () => releaseBookingSeats(booking._id)));
    assert.equal(results.filter((result) => result.released).length, 1);
    assert.equal((await Inventory.findOne({ buffet: buffet._id })).availableSeats, 2);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    try { await mongoose.connection.dropDatabase(); } finally { await mongoose.disconnect(); }
  }
});
