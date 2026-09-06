const DAY = 24 * 60 * 60 * 1000;

const norm = (v) => String(v || "").toLowerCase().trim();
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function availableSeats(buffet) {
  return (buffet.timeSlots || []).reduce((sum, slot) => sum + Number(slot.availableSeats || 0), 0);
}

function textRelevance(buffet, query) {
  const q = norm(query);
  if (!q) return 0.5;
  const title = norm(buffet.title);
  const hotel = norm(buffet.hotel?.hotelName);
  const category = norm(buffet.category);
  const city = norm(buffet.location?.city || buffet.hotel?.city || buffet.hotel?.location);
  const description = norm(buffet.description);
  let score = 0;
  if (title === q) score += 1;
  else if (title.includes(q)) score += 0.8;
  if (hotel.includes(q)) score += 0.7;
  if (category.includes(q)) score += 0.55;
  if (city.includes(q)) score += 0.5;
  if (description.includes(q)) score += 0.25;
  return clamp(score, 0, 1);
}

function rankingScore(buffet, bookingStats = {}, query = "") {
  const rating = clamp(Number(buffet.averageRating || buffet.hotel?.averageRating || 0) / 5, 0, 1);
  const reviews = clamp(Math.log10(Number(buffet.totalReviews || 0) + 1) / 2, 0, 1);
  const completed = Number(bookingStats.completed || 0);
  const recent = Number(bookingStats.recent || 0);
  const demand = clamp(Math.log10(completed + 1) / 2.2, 0, 1);
  const recentDemand = clamp(Math.log10(recent + 1) / 1.7, 0, 1);
  const seats = clamp(availableSeats(buffet) / 50, 0, 1);
  const ageDays = Math.max(0, (Date.now() - new Date(buffet.createdAt || 0).getTime()) / DAY);
  const freshness = clamp(1 - ageDays / 180, 0, 1);
  const completeness = clamp([
    buffet.description,
    buffet.thumbnail || buffet.images?.[0],
    buffet.location?.city || buffet.hotel?.city,
    buffet.timeSlots?.length,
    buffet.price,
  ].filter(Boolean).length / 5, 0, 1);
  const relevance = textRelevance(buffet, query);

  // Organic marketplace ranking. Paid placement is deliberately not part of this score.
  const score =
    relevance * 28 +
    rating * 16 +
    reviews * 8 +
    demand * 15 +
    recentDemand * 13 +
    seats * 8 +
    freshness * 5 +
    completeness * 7;

  return Math.round(score * 100) / 100;
}

module.exports = { availableSeats, rankingScore, textRelevance };
