import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MapView from "../components/map/MapView";
import "../components/map/ExploreMap.css";

const mealOptions = [
  "",
  "Breakfast",
  "Lunch",
  "Dinner",
  "High Tea",
  "Brunch",
  "Seafood",
  "BBQ",
  "Weekend Buffet",
];

const normalize = (value) => String(value || "").trim().toLowerCase();
const buffetHotelId = (buffet) =>
  String(buffet.hotel?._id || buffet.hotel || "");

const buffetMatchesMeal = (buffet, meal) => {
  if (!meal) return true;
  return normalize(
    `${buffet.category || ""} ${buffet.buffetType || ""} ${
      buffet.title || ""
    } ${buffet.description || ""}`
  ).includes(normalize(meal));
};

const defaultFilters = {
  query: "",
  area: "",
  minPrice: "",
  maxPrice: "",
  minRating: "",
  minReviews: "",
  meal: "",
  sort: "recommended",
  markerMetric: "price",
};

export default function ExploreMap() {
  const [hotels, setHotels] = useState([]);
  const [buffets, setBuffets] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [hotelRes, buffetRes] = await Promise.all([
        api.get("/hotels/map"),
        api.get("/buffets"),
      ]);

      setHotels(Array.isArray(hotelRes.data) ? hotelRes.data : []);
      setBuffets(
        Array.isArray(buffetRes.data)
          ? buffetRes.data
          : buffetRes.data?.buffets || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load map data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metaByHotel = useMemo(() => {
    const result = {};

    hotels.forEach((hotel) => {
      const allBuffets = buffets.filter(
        (buffet) => buffetHotelId(buffet) === String(hotel._id)
      );
      const matchingBuffets = allBuffets.filter((buffet) =>
        buffetMatchesMeal(buffet, filters.meal)
      );
      const prices = matchingBuffets
        .map((buffet) => Number(buffet.price || 0))
        .filter((price) => price > 0);

      result[hotel._id] = {
        allBuffets,
        matchingBuffets,
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        mealLabel: filters.meal || "Buffets",
        popularity:
          Number(hotel.totalReviews || 0) * 3 +
          Number(hotel.averageRating || 0) * 20 +
          allBuffets.length * 5 +
          (hotel.featured ? 40 : 0),
      };
    });

    return result;
  }, [hotels, buffets, filters.meal]);

  const filteredHotels = useMemo(() => {
    const result = hotels.filter((hotel) => {
      const meta = metaByHotel[hotel._id] || {};
      const searchable = normalize(
        `${hotel.hotelName || ""} ${hotel.location || ""} ${
          hotel.city || ""
        } ${hotel.district || ""} ${hotel.province || ""}`
      );

      if (
        filters.query &&
        !searchable.includes(normalize(filters.query))
      )
        return false;

      if (filters.area && !searchable.includes(normalize(filters.area)))
        return false;

      if (filters.meal && !meta.matchingBuffets?.length) return false;

      if (
        filters.minRating &&
        Number(hotel.averageRating || 0) < Number(filters.minRating)
      )
        return false;

      if (
        filters.minReviews &&
        Number(hotel.totalReviews || 0) < Number(filters.minReviews)
      )
        return false;

      const prices = (meta.matchingBuffets || [])
        .map((buffet) => Number(buffet.price || 0))
        .filter((price) => price > 0);

      if (
        filters.minPrice &&
        !prices.some((price) => price >= Number(filters.minPrice))
      )
        return false;

      if (
        filters.maxPrice &&
        !prices.some((price) => price <= Number(filters.maxPrice))
      )
        return false;

      return true;
    });

    return [...result].sort((a, b) => {
      const aMeta = metaByHotel[a._id] || {};
      const bMeta = metaByHotel[b._id] || {};

      if (filters.sort === "rating")
        return Number(b.averageRating || 0) - Number(a.averageRating || 0);
      if (filters.sort === "reviews")
        return Number(b.totalReviews || 0) - Number(a.totalReviews || 0);
      if (filters.sort === "price-low")
        return Number(aMeta.minPrice || Infinity) -
          Number(bMeta.minPrice || Infinity);
      if (filters.sort === "price-high")
        return Number(bMeta.maxPrice || 0) - Number(aMeta.maxPrice || 0);
      if (filters.sort === "popularity")
        return Number(bMeta.popularity || 0) -
          Number(aMeta.popularity || 0);

      return (
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
        Number(b.averageRating || 0) - Number(a.averageRating || 0)
      );
    });
  }, [hotels, metaByHotel, filters]);

  const activeCount = [
    filters.query,
    filters.area,
    filters.minPrice,
    filters.maxPrice,
    filters.minRating,
    filters.minReviews,
    filters.meal,
  ].filter(Boolean).length;

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setSelectedHotel(null);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSelectedHotel(null);
  };

  return (
    <main className="df-map3-page">
      <section className="df-map3-shell">
        <div className="df-map3-toolbar">
          <label className="df-map3-search">
            <span className="material-symbols-outlined">search</span>
            <input
              value={filters.query}
              onChange={(event) =>
                updateFilter("query", event.target.value)
              }
              placeholder="Search hotel, buffet or destination"
              aria-label="Search hotels, buffets or destinations"
            />
          </label>

          <div className="df-map3-toolbar-actions">
            <label className="df-map3-control df-map3-marker-control">
              <span className="df-map3-control-label">Marker</span>
              <select
                value={filters.markerMetric}
                onChange={(event) =>
                  updateFilter("markerMetric", event.target.value)
                }
                aria-label="Map marker information"
              >
                <option value="price">Price</option>
                <option value="rating">Rating</option>
                <option value="reviews">Reviews</option>
                <option value="meal">Dining type</option>
              </select>
            </label>

            <button
              type="button"
              className="df-map3-control"
              onClick={() => setFiltersOpen(true)}
            >
              <span className="material-symbols-outlined">tune</span>
              <span className="df-map3-control-label">Filters</span>
              {activeCount > 0 && (
                <span className="df-map3-badge">{activeCount}</span>
              )}
            </button>
          </div>
        </div>

        <div className="df-map3-summary">
          <strong>
            {loading ? "Loading map..." : `${filteredHotels.length} hotels`}
          </strong>
          {" · "}
          {activeCount
            ? `${activeCount} active filter${activeCount === 1 ? "" : "s"}`
            : "all mapped DineFor hotels"}
        </div>

        <MapView
          hotels={filteredHotels}
          metaByHotel={metaByHotel}
          markerMetric={filters.markerMetric}
          selectedHotel={selectedHotel}
          onSelectHotel={setSelectedHotel}
        />

        {error && <div className="df-map3-error">{error}</div>}
      </section>

      {filtersOpen && (
        <div
          className="df-map3-filter-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Map filters"
        >
          <button
            type="button"
            className="df-map3-backdrop"
            onClick={() => setFiltersOpen(false)}
            aria-label="Close filters"
          />

          <aside className="df-map3-filter-panel">
            <header className="df-map3-filter-header">
              <div>
                <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                  Filter map
                </p>
                <h2>Find your buffet</h2>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="df-map3-filter-content">
              <label className="df-map3-filter-group">
                <span>Area</span>
                <input
                  value={filters.area}
                  onChange={(event) =>
                    updateFilter("area", event.target.value)
                  }
                  placeholder="Colombo, Galle, Kandy..."
                />
              </label>

              <div className="df-map3-filter-group">
                <span>Budget per person</span>
                <div className="df-map3-filter-two">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min LKR"
                    value={filters.minPrice}
                    onChange={(event) =>
                      updateFilter("minPrice", event.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Max LKR"
                    value={filters.maxPrice}
                    onChange={(event) =>
                      updateFilter("maxPrice", event.target.value)
                    }
                  />
                </div>
              </div>

              <label className="df-map3-filter-group">
                <span>Dining type</span>
                <select
                  value={filters.meal}
                  onChange={(event) =>
                    updateFilter("meal", event.target.value)
                  }
                >
                  {mealOptions.map((meal) => (
                    <option key={meal || "all"} value={meal}>
                      {meal || "Any dining type"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="df-map3-filter-group">
                <span>Guest rating</span>
                <select
                  value={filters.minRating}
                  onChange={(event) =>
                    updateFilter("minRating", event.target.value)
                  }
                >
                  <option value="">Any rating</option>
                  <option value="4.5">4.5+</option>
                  <option value="4">4.0+</option>
                  <option value="3.5">3.5+</option>
                </select>
              </label>

              <label className="df-map3-filter-group">
                <span>Review count</span>
                <select
                  value={filters.minReviews}
                  onChange={(event) =>
                    updateFilter("minReviews", event.target.value)
                  }
                >
                  <option value="">Any review count</option>
                  <option value="1">1+</option>
                  <option value="10">10+</option>
                  <option value="50">50+</option>
                  <option value="100">100+</option>
                </select>
              </label>

              <label className="df-map3-filter-group">
                <span>Sort hotels</span>
                <select
                  value={filters.sort}
                  onChange={(event) =>
                    updateFilter("sort", event.target.value)
                  }
                >
                  <option value="recommended">Recommended</option>
                  <option value="popularity">Most popular</option>
                  <option value="rating">Highest rated</option>
                  <option value="reviews">Most reviewed</option>
                  <option value="price-low">Lowest price</option>
                  <option value="price-high">Highest price</option>
                </select>
              </label>

              <label className="df-map3-filter-group">
                <span>Marker information</span>
                <select
                  value={filters.markerMetric}
                  onChange={(event) =>
                    updateFilter("markerMetric", event.target.value)
                  }
                >
                  <option value="price">Buffet price</option>
                  <option value="rating">Hotel rating</option>
                  <option value="reviews">Review count</option>
                  <option value="meal">Dining type</option>
                </select>
              </label>
            </div>

            <footer className="df-map3-filter-footer">
              <button
                type="button"
                className="btn-outline"
                onClick={resetFilters}
              >
                Clear all
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setFiltersOpen(false)}
              >
                Show {filteredHotels.length}
              </button>
            </footer>
          </aside>
        </div>
      )}
    </main>
  );
}
