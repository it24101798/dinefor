import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import FeedCard from "../components/FeedCard";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const sortOptions = [
  { value: "featured", label: "Featured First" },
  { value: "rating", label: "Highest Rating" },
  { value: "lowest", label: "Price: Low to High" },
  { value: "highest", label: "Price: High to Low" },
  { value: "seats", label: "Most Seats Left" },
  { value: "newest", label: "Newest First" },
];

const mealOptions = [
  { value: "", label: "All Meals" },
  { value: "Breakfast", label: "Breakfast" },
  { value: "Lunch", label: "Lunch" },
  { value: "Dinner", label: "Dinner" },
  { value: "High Tea", label: "High Tea" },
  { value: "Seafood", label: "Seafood" },
  { value: "BBQ", label: "BBQ" },
  { value: "Brunch", label: "Brunch" },
  { value: "Weekend Buffet", label: "Weekend Buffet" },
];

const ratingOptions = [
  { value: "", label: "Any Rating" },
  { value: "4.5", label: "4.5 & Up ⭐" },
  { value: "4.0", label: "4.0 & Up ⭐" },
  { value: "3.5", label: "3.5 & Up ⭐" },
  { value: "3.0", label: "3.0 & Up ⭐" },
];

// ============================================
// MAIN COMPONENT
// ============================================
function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ============================================
  // STATE
  // ============================================
  const [buffets, setBuffets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  // Filter state
  const [filters, setFilters] = useState({
    location: searchParams.get("location") || "",
    meal: searchParams.get("meal") || "",
    date: searchParams.get("date") || "",
    guests: searchParams.get("guests") || "",
    minPrice: "",
    maxPrice: "",
    rating: "",
    sort: searchParams.get("sort") || "featured",
  });

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchBuffets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`${API_BASE}/api/buffets`, { timeout: 10000 });
      setBuffets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.message || "Failed to load buffets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuffets();
  }, [fetchBuffets]);

  // ============================================
  // DATE AVAILABILITY CHECK
  // ============================================
  const isDateAvailable = useCallback((buffet, selectedDate) => {
    if (!selectedDate) return true;
    const date = new Date(`${selectedDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return true;
    const day = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

    if (buffet.buffetType === "special" && buffet.specialDate) {
      return new Date(buffet.specialDate).toISOString().slice(0, 10) === selectedDate;
    }

    if (buffet.availableFromDate && date < new Date(buffet.availableFromDate)) return false;
    if (buffet.availableToDate && date > new Date(buffet.availableToDate)) return false;
    if (buffet.scheduleType === "selected_days" && buffet.recurringDays?.length) {
      return buffet.recurringDays.includes(day);
    }
    return true;
  }, []);

  // ============================================
  // FILTERED DATA
  // ============================================
  const filteredBuffets = useMemo(() => {
    let result = [...buffets];

    // Location filter
    if (filters.location) {
      const q = filters.location.toLowerCase();
      result = result.filter((b) =>
        `${b.location?.city || ""} ${b.location?.address || ""} ${b.hotel?.location || ""} ${b.hotel?.city || ""} ${b.hotel?.address || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    // Meal filter
    if (filters.meal) {
      const q = filters.meal.toLowerCase();
      result = result.filter((b) =>
        `${b.category || ""} ${b.title || ""} ${b.description || ""} ${b.buffetType || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    // Date filter
    if (filters.date) {
      result = result.filter((b) => isDateAvailable(b, filters.date));
    }

    // Guests filter
    if (filters.guests) {
      const guestCount = Number(filters.guests);
      if (guestCount > 0) {
        result = result.filter((b) =>
          (b.timeSlots || []).some((slot) => Number(slot.availableSeats || 0) >= guestCount)
        );
      }
    }

    // Price range filter
    if (filters.minPrice) {
      result = result.filter((b) => Number(b.price || 0) >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter((b) => Number(b.price || 0) <= Number(filters.maxPrice));
    }

    // Rating filter
    if (filters.rating) {
      result = result.filter((b) => Number(b.averageRating || 0) >= Number(filters.rating));
    }

    // Sorting
    switch (filters.sort) {
      case "lowest":
        result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        break;
      case "highest":
        result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        break;
      case "rating":
        result.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
        break;
      case "seats": {
        const getMaxSeats = (buffet) =>
          Math.max(...(buffet.timeSlots || [{ availableSeats: 0 }]).map((s) => Number(s.availableSeats || 0)));
        result.sort((a, b) => getMaxSeats(b) - getMaxSeats(a));
        break;
      }
      case "newest":
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case "featured":
      default:
        result.sort((a, b) =>
          Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
          Number(b.averageRating || 0) - Number(a.averageRating || 0)
        );
        break;
    }

    return result;
  }, [buffets, filters, isDateAvailable]);

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => {
    const total = buffets.length;
    const featured = buffets.filter((b) => b.isFeatured).length;
    const avgRating = buffets.length > 0
      ? buffets.reduce((sum, b) => sum + Number(b.averageRating || 0), 0) / buffets.length
      : 0;
    const maxPrice = buffets.length > 0
      ? Math.max(...buffets.map((b) => Number(b.price || 0)))
      : 0;
    const minPrice = buffets.length > 0
      ? Math.min(...buffets.map((b) => Number(b.price || 0)))
      : 0;

    return { total, featured, avgRating, maxPrice, minPrice };
  }, [buffets]);

  // ============================================
  // HANDLERS
  // ============================================
  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const resetFilters = () => {
    setFilters({
      location: "",
      meal: "",
      date: "",
      guests: "",
      minPrice: "",
      maxPrice: "",
      rating: "",
      sort: "featured",
    });
    setSearchParams({});
  };

  const clearFilter = (key) => {
    updateFilter(key, "");
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderMessage = () => {
    if (!error) return null;

    return (
      <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error mb-6">
        <p className="font-body-md text-body-md flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {error}
        </p>
        <button
          onClick={() => setError("")}
          className="float-right text-inherit opacity-70 hover:opacity-100"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    );
  };

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <div className="p-3 rounded-xl bg-surface-container-low text-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Total Buffets</p>
        <p className="font-headline-md text-headline-md text-text-deep-green">{stats.total}</p>
      </div>
      <div className="p-3 rounded-xl bg-highlight-gold/10 text-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Featured</p>
        <p className="font-headline-md text-headline-md text-highlight-gold">{stats.featured}</p>
      </div>
      <div className="p-3 rounded-xl bg-secondary-container/10 text-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Avg Rating</p>
        <p className="font-headline-md text-headline-md text-secondary">⭐ {stats.avgRating.toFixed(1)}</p>
      </div>
      <div className="p-3 rounded-xl bg-primary-container/10 text-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Min Price</p>
        <p className="font-headline-md text-headline-md text-primary">Rs. {stats.minPrice.toLocaleString()}</p>
      </div>
      <div className="p-3 rounded-xl bg-tertiary-container/10 text-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Max Price</p>
        <p className="font-headline-md text-headline-md text-tertiary">Rs. {stats.maxPrice.toLocaleString()}</p>
      </div>
    </div>
  );

  const renderActiveFilters = () => {
    const activeFilters = Object.entries(filters).filter(([key, value]) => value && key !== "sort");
    if (activeFilters.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="font-label-sm text-label-sm text-on-surface-variant">Active Filters:</span>
        {activeFilters.map(([key, value]) => (
          <button
            key={key}
            onClick={() => clearFilter(key)}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-text-deep-green font-label-sm text-label-sm hover:bg-surface-container-highest transition-colors"
          >
            {key}: {value}
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        ))}
        <button
          onClick={resetFilters}
          className="text-label-sm text-label-sm text-secondary hover:underline"
        >
          Clear All
        </button>
      </div>
    );
  };

  const renderFilters = () => (
    <div className="card-ambient p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-headline-md text-headline-md text-text-deep-green">Filters</h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-secondary font-label-md text-label-md hover:underline"
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Location</label>
            <input
              value={filters.location}
              onChange={(e) => updateFilter("location", e.target.value)}
              placeholder="City or hotel name"
              className="form-input w-full"
            />
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Meal Type</label>
            <select
              value={filters.meal}
              onChange={(e) => updateFilter("meal", e.target.value)}
              className="form-select w-full"
            >
              {mealOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => updateFilter("date", e.target.value)}
              className="form-input w-full"
            />
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Guests</label>
            <input
              type="number"
              min="1"
              max="20"
              value={filters.guests}
              onChange={(e) => updateFilter("guests", e.target.value)}
              placeholder="Number of guests"
              className="form-input w-full"
            />
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Min Price (Rs.)</label>
            <input
              type="number"
              min="0"
              value={filters.minPrice}
              onChange={(e) => updateFilter("minPrice", e.target.value)}
              placeholder="Min price"
              className="form-input w-full"
            />
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Max Price (Rs.)</label>
            <input
              type="number"
              min="0"
              value={filters.maxPrice}
              onChange={(e) => updateFilter("maxPrice", e.target.value)}
              placeholder="Max price"
              className="form-input w-full"
            />
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Rating</label>
            <select
              value={filters.rating}
              onChange={(e) => updateFilter("rating", e.target.value)}
              className="form-select w-full"
            >
              {ratingOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Sort By</label>
            <select
              value={filters.sort}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className="form-select w-full"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!showFilters && (
        <div className="flex flex-wrap gap-4">
          {filters.location && (
            <span className="chip flex items-center gap-1">
              📍 {filters.location}
              <button onClick={() => clearFilter("location")} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
          {filters.meal && (
            <span className="chip flex items-center gap-1">
              🍽️ {filters.meal}
              <button onClick={() => clearFilter("meal")} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
          {filters.date && (
            <span className="chip flex items-center gap-1">
              📅 {filters.date}
              <button onClick={() => clearFilter("date")} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
          {filters.guests && (
            <span className="chip flex items-center gap-1">
              👥 {filters.guests} guests
              <button onClick={() => clearFilter("guests")} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
          {filters.minPrice && (
            <span className="chip flex items-center gap-1">
              Min: Rs. {Number(filters.minPrice).toLocaleString()}
              <button onClick={() => clearFilter("minPrice")} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
          {filters.maxPrice && (
            <span className="chip flex items-center gap-1">
              Max: Rs. {Number(filters.maxPrice).toLocaleString()}
              <button onClick={() => clearFilter("maxPrice")} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
          {filters.rating && (
            <span className="chip flex items-center gap-1">
              ⭐ {filters.rating}+
              <button onClick={() => clearFilter("rating")} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
          <span className="chip">Sort: {sortOptions.find((s) => s.value === filters.sort)?.label}</span>
        </div>
      )}
    </div>
  );

  const renderEmpty = () => (
    <div className="text-center py-16">
      <span className="material-symbols-outlined text-6xl text-outline mb-4">search_off</span>
      <h3 className="font-headline-md text-headline-md text-text-deep-green">No Buffets Found</h3>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">
        Try adjusting your filters or search terms.
      </p>
      <button onClick={resetFilters} className="btn-secondary inline-flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">refresh</span>
        Reset Filters
      </button>
    </div>
  );

  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card-ambient h-[380px] animate-pulse">
          <div className="h-48 bg-surface-container-high" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-surface-container-high rounded w-3/4" />
            <div className="h-4 bg-surface-container-high rounded w-1/2" />
            <div className="flex justify-between pt-2">
              <div className="h-6 bg-surface-container-high rounded w-1/4" />
              <div className="h-8 bg-surface-container-high rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-text-deep-green">
                Buffet Discovery
                <span className="ml-3 text-base font-body-md text-on-surface-variant">
                  ({filteredBuffets.length} {filteredBuffets.length === 1 ? "result" : "results"})
                </span>
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Find and compare premium buffet experiences
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex border border-border-subtle rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition-colors ${viewMode === "grid" ? "bg-secondary-container/20 text-secondary" : "text-on-surface-variant hover:text-text-deep-green"}`}
                >
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 transition-colors ${viewMode === "list" ? "bg-secondary-container/20 text-secondary" : "text-on-surface-variant hover:text-text-deep-green"}`}
                >
                  <span className="material-symbols-outlined text-[18px]">list</span>
                </button>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-outline flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Filters
              </button>
            </div>
          </div>
        </div>

        {renderMessage()}
        {renderStats()}
        {renderFilters()}
        {renderActiveFilters()}

        {/* Results */}
        {loading ? (
          renderLoadingSkeleton()
        ) : filteredBuffets.length === 0 ? (
          renderEmpty()
        ) : (
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
          }>
            {filteredBuffets.map((buffet) => (
              <FeedCard key={buffet._id} buffet={buffet} />
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredBuffets.length > 0 && filteredBuffets.length < buffets.length && (
          <div className="text-center mt-8">
            <button className="btn-outline inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
              Load More Results
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default Listings;