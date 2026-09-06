import api from "./api";

export const defaultDiscoveryFilters = {
  query: "", location: "", date: "", guests: 1, category: "", buffetType: "",
  minPrice: "", maxPrice: "", minRating: "", availableOnly: false,
  sort: "recommended", page: 1, limit: 24,
};

const cleanParams = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined && value !== false)
);

export async function searchDiscovery(filters = {}) {
  const res = await api.get("/discovery/search", { params: cleanParams({ ...defaultDiscoveryFilters, ...filters }) });
  return res.data;
}

export async function fetchDiscoveryBuffets(filters = {}) {
  const payload = await searchDiscovery({ ...filters, limit: filters.limit || 100 });
  return payload?.buffets || payload?.data || [];
}

export async function fetchDiscoveryFacets() {
  const res = await api.get("/discovery/facets");
  return res.data;
}

export async function fetchTrendingBuffets(limit = 12) {
  const res = await api.get("/discovery/trending", { params: { limit } });
  return res.data?.data || [];
}

export async function fetchDiscoverySuggestions(q = "") {
  const res = await api.get("/discovery/suggestions", { params: { q } });
  return res.data?.data || [];
}

export async function trackDiscoveryEvent(event) {
  try { await api.post("/discovery/events", event); } catch { /* analytics must never block booking UX */ }
}

export function getTotalAvailableSeats(buffet) {
  return (buffet?.timeSlots || []).reduce((total, slot) => total + Number(slot.availableSeats || 0), 0);
}

export function getPrimaryMedia(buffet) {
  return buffet?.thumbnail || buffet?.images?.[0] || buffet?.hotel?.coverMediaUrl || buffet?.hotel?.galleryImages?.[0] || "https://images.unsplash.com/photo-1555244162-803834f70033";
}
