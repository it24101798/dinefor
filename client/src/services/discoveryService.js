import api from "./api";

// ============================================
// DISCOVERY SERVICE
// ============================================

export const defaultDiscoveryFilters = {
  category: "",
  minPrice: "",
  maxPrice: "",
  rating: "",
  sortBy: "recommended",
  guests: 1,
  date: "",
  location: "",
  meal: "",
};

export const fetchDiscoveryBuffets = async () => {
  try {
    const res = await api.get("/buffets");
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Failed to fetch discovery buffets:", error);
    throw error;
  }
};

export const filterDiscoveryBuffets = (buffets, filters) => {
  let result = [...buffets];

  // Category filter
  if (filters.category) {
    result = result.filter((b) =>
      b.category?.toLowerCase().includes(filters.category.toLowerCase()) ||
      b.buffetType?.toLowerCase().includes(filters.category.toLowerCase())
    );
  }

  // Location filter
  if (filters.location) {
    const q = filters.location.toLowerCase();
    result = result.filter((b) =>
      `${b.location?.city || ""} ${b.location?.address || ""} ${b.hotel?.location || ""} ${b.hotel?.city || ""}`
        .toLowerCase()
        .includes(q)
    );
  }

  // Meal filter
  if (filters.meal) {
    const q = filters.meal.toLowerCase();
    result = result.filter((b) =>
      `${b.category || ""} ${b.title || ""} ${b.buffetType || ""}`
        .toLowerCase()
        .includes(q)
    );
  }

  // Price range
  if (filters.minPrice) {
    result = result.filter((b) => Number(b.price || 0) >= Number(filters.minPrice));
  }
  if (filters.maxPrice) {
    result = result.filter((b) => Number(b.price || 0) <= Number(filters.maxPrice));
  }

  // Rating
  if (filters.rating) {
    result = result.filter((b) => Number(b.averageRating || 0) >= Number(filters.rating));
  }

  // Guests
  if (filters.guests > 1) {
    result = result.filter((b) =>
      (b.timeSlots || []).some((slot) => Number(slot.availableSeats || 0) >= filters.guests)
    );
  }

  // Date
  if (filters.date) {
    const selectedDate = new Date(filters.date);
    result = result.filter((b) => {
      if (b.buffetType === "special" && b.specialDate) {
        return new Date(b.specialDate).toISOString().slice(0, 10) === filters.date;
      }
      if (b.availableFromDate && selectedDate < new Date(b.availableFromDate)) return false;
      if (b.availableToDate && selectedDate > new Date(b.availableToDate)) return false;
      if (b.scheduleType === "selected_days" && b.recurringDays?.length) {
        const day = selectedDate.toLocaleDateString("en-US", { weekday: "long" });
        return b.recurringDays.includes(day);
      }
      return true;
    });
  }

  // Sorting
  switch (filters.sortBy) {
    case "rating":
      result.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
      break;
    case "price-low":
      result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      break;
    case "price-high":
      result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
      break;
    case "newest":
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;
    case "recommended":
    default:
      result.sort((a, b) =>
        (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) ||
        Number(b.averageRating || 0) - Number(a.averageRating || 0)
      );
      break;
  }

  return result;
};

export const getPrimaryMedia = (buffet) => {
  return buffet.thumbnail || buffet.images?.[0] || "https://images.unsplash.com/photo-1555244162-803834f70033";
};