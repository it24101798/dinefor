export function mapResults(rows) {
  const hotels = new Map();
  for (const row of rows) {
    const hotel = row?.hotel;
    if (!hotel?._id) continue;
    const candidate = row.buffet || row.buffets?.[0] || (row._id ? row : null);
    if (!candidate?._id || !candidate.title) continue;
    const hotelId = String(hotel._id);
    const price = candidate.price != null && candidate.price !== "" ? Number(candidate.price) : NaN;
    const validPrice = Number.isFinite(price) && price >= 0 ? price : null;
    const existing = hotels.get(hotelId);
    const count = Number.isSafeInteger(row.count) && row.count > 0 ? row.count : 1;
    if (!existing || (validPrice !== null && (existing.price === null || validPrice < existing.price))) {
      hotels.set(hotelId, { hotel, buffet: { ...candidate, hotel }, count: (existing?.count || 0) + count, price: validPrice });
    } else {
      existing.count += count;
    }
  }
  return [...hotels.values()];
}

export function hotelCoordinates(hotel) {
  const { latitude, longitude } = hotel?.mapLocation || {};
  if (latitude == null || latitude === "" || longitude == null || longitude === "") return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat || lng) ? [lat, lng] : null;
}
