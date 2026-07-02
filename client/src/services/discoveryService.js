import api from "./api";

const normalizeText = (value) => String(value || "").toLowerCase().trim();

const getHotelName = (buffet) => buffet?.hotel?.hotelName || buffet?.hotelName || "";
const getCity = (buffet) =>
  buffet?.location?.city ||
  buffet?.hotel?.city ||
  buffet?.hotel?.location ||
  buffet?.hotel?.address ||
  "";

export const defaultDiscoveryFilters = {
  query: "",
  location: "",
  date: "",
  guests: 1,
  category: "all",
  buffetType: "all",
  minPrice: "",
  maxPrice: "",
  minRating: "all",
  featuredOnly: false,
  availableOnly: false,
  sortBy: "recommended",
};

export async function fetchDiscoveryBuffets() {
  const res = await api.get("/buffets");
  return Array.isArray(res.data) ? res.data : [];
}

export function getDiscoverySuggestions(buffets = [], query = "") {
  const q = normalizeText(query);
  const values = new Set();

  buffets.forEach((buffet) => {
    [buffet.title, getHotelName(buffet), getCity(buffet), buffet.category, buffet.buffetType]
      .filter(Boolean)
      .forEach((item) => values.add(String(item)));
  });

  return [...values]
    .filter((item) => !q || normalizeText(item).includes(q))
    .slice(0, 8);
}

export function filterDiscoveryBuffets(buffets = [], filters = defaultDiscoveryFilters) {
  const q = normalizeText(filters.query);
  const location = normalizeText(filters.location);
  const category = filters.category || "all";
  const buffetType = filters.buffetType || "all";
  const minPrice = filters.minPrice === "" ? null : Number(filters.minPrice);
  const maxPrice = filters.maxPrice === "" ? null : Number(filters.maxPrice);
  const minRating = filters.minRating === "all" ? null : Number(filters.minRating);
  const guests = Math.max(1, Number(filters.guests || 1));

  let filtered = buffets.filter((buffet) => {
    const searchable = normalizeText([
      buffet.title,
      buffet.description,
      buffet.category,
      buffet.buffetType,
      getHotelName(buffet),
      getCity(buffet),
      buffet?.hotel?.province,
      buffet?.hotel?.district,
    ].join(" "));

    const cityText = normalizeText(`${getCity(buffet)} ${buffet?.hotel?.province || ""} ${buffet?.hotel?.district || ""}`);
    const price = Number(buffet.price || 0);
    const rating = Number(buffet.averageRating || buffet.hotel?.averageRating || 0);
    const seatsLeft = getTotalAvailableSeats(buffet);

    if (q && !searchable.includes(q)) return false;
    if (location && !cityText.includes(location)) return false;
    if (category !== "all" && buffet.category !== category) return false;
    if (buffetType !== "all" && buffet.buffetType !== buffetType) return false;
    if (minPrice !== null && price < minPrice) return false;
    if (maxPrice !== null && price > maxPrice) return false;
    if (minRating !== null && rating < minRating) return false;
    if (filters.featuredOnly && !buffet.isFeatured) return false;
    if (filters.availableOnly && seatsLeft < guests) return false;

    return true;
  });

  switch (filters.sortBy) {
    case "price-low":
      filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      break;
    case "price-high":
      filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
      break;
    case "rating":
      filtered.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
      break;
    case "newest":
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;
    default:
      filtered.sort((a, b) => {
        const featuredScore = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
        if (featuredScore !== 0) return featuredScore;
        return Number(b.averageRating || 0) - Number(a.averageRating || 0);
      });
  }

  return filtered;
}

export function getTotalAvailableSeats(buffet) {
  return (buffet?.timeSlots || []).reduce((total, slot) => total + Number(slot.availableSeats || 0), 0);
}

export function getPrimaryMedia(buffet) {
  return (
    buffet?.thumbnail ||
    buffet?.images?.[0] ||
    buffet?.hotel?.coverMediaUrl ||
    buffet?.hotel?.galleryImages?.[0] ||
    "https://images.unsplash.com/photo-1555244162-803834f70033"
  );
}
