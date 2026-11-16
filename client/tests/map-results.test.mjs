import { test } from "node:test";
import assert from "node:assert/strict";
import { hotelCoordinates, mapResults } from "../src/components/map/mapResults.js";

const hotel = { _id: "h1", hotelName: "Fixture Hotel" };
const dinner = { _id: "b1", title: "Dinner buffet", price: 3500 };

test("mixed map responses keep usable buffets and skip empty rows", () => {
  const rows = mapResults([
    null, { hotel, count: 1 }, { buffet: dinner },
    { hotel, buffet: dinner, count: 2 },
    { ...dinner, _id: "b2", price: "2700", hotel },
    { hotel: { _id: "h2" }, buffets: [{ ...dinner, price: null }] },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].buffet._id, "b2");
  assert.equal(rows[0].price, 2700);
  assert.equal(rows[0].count, 3);
  assert.equal(rows[1].price, null);
});

test("hotels without valid coordinates remain list results", () => {
  assert.equal(mapResults([{ hotel, buffet: dinner }]).length, 1);
  assert.equal(hotelCoordinates(hotel), null);
  assert.equal(hotelCoordinates({ mapLocation: { latitude: "", longitude: 80 } }), null);
  assert.equal(hotelCoordinates({ mapLocation: { latitude: 0, longitude: 0 } }), null);
  assert.equal(hotelCoordinates({ mapLocation: { latitude: 91, longitude: 80 } }), null);
  assert.deepEqual(hotelCoordinates({ mapLocation: { latitude: "6.04", longitude: 80.22 } }), [6.04, 80.22]);
});
