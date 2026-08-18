import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import BuffetCard from "../components/buffet/BuffetCard";

const categoryChips = [
  { key: "", label: "All" },
  { key: "Lunch", label: "Lunch" },
  { key: "Dinner", label: "Dinner" },
  { key: "High Tea", label: "High Tea" },
  { key: "Seafood", label: "Seafood" },
  { key: "Weekend Buffet", label: "Weekend Buffet" },
  { key: "BBQ", label: "BBQ" },
  { key: "Rooftop", label: "Rooftop" },
  { key: "Luxury", label: "Luxury" },
  { key: "Halal", label: "Halal" },
];

const priceRanges = [
  { label: "Under $30", min: 0, max: 30 },
  { label: "$30 - $60", min: 30, max: 60 },
  { label: "$60 - $100", min: 60, max: 100 },
  { label: "$100+", min: 100, max: Infinity },
];

const ratingOptions = [
  { label: "4.5 & up", value: 4.5 },
  { label: "4.0 & up", value: 4.0 },
];

function Feed() {
  const [buffets, setBuffets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [sortBy, setSortBy] = useState("recommended");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchBuffets = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/buffets`, {
          timeout: 10000,
        });
        
        let buffetData = [];
        if (Array.isArray(res.data)) {
          buffetData = res.data;
        } else if (res.data && Array.isArray(res.data.buffets)) {
          buffetData = res.data.buffets;
        } else if (res.data && Array.isArray(res.data.data)) {
          buffetData = res.data.data;
        } else {
          buffetData = [];
        }
        
        setBuffets(buffetData);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.response?.data?.message || err.message || "Failed to load buffets.");
      } finally {
        setLoading(false);
      }
    };
    fetchBuffets();
  }, []);

  const filteredBuffets = useMemo(() => {
    let result = [...buffets];

    if (activeCategory) {
      result = result.filter((b) => 
        b.category?.toLowerCase().includes(activeCategory.toLowerCase()) ||
        b.buffetType?.toLowerCase().includes(activeCategory.toLowerCase())
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((b) =>
        b.title?.toLowerCase().includes(query) ||
        b.hotel?.hotelName?.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query)
      );
    }

    if (selectedPriceRange) {
      result = result.filter((b) => {
        const price = Number(b.price || 0);
        return price >= selectedPriceRange.min && price <= selectedPriceRange.max;
      });
    }

    if (selectedRating) {
      result = result.filter((b) => Number(b.averageRating || 0) >= selectedRating);
    }

    switch (sortBy) {
      case "recommended":
        result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || Number(b.averageRating || 0) - Number(a.averageRating || 0));
        break;
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
      default:
        break;
    }

    return result;
  }, [buffets, activeCategory, searchQuery, selectedPriceRange, selectedRating, sortBy]);

  const clearFilters = () => {
    setActiveCategory("");
    setSearchQuery("");
    setSelectedPriceRange(null);
    setSelectedRating(null);
    setSortBy("recommended");
  };

  const displayBuffets = filteredBuffets;

  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20">
      {/* HERO */}
      <section className="relative bg-primary-container py-12 md:py-20 px-margin-mobile md:px-margin-desktop">
        <div className="max-w-container-max mx-auto text-center">
          <span className="font-label-md text-label-md text-highlight-gold uppercase tracking-wider">
            Discover
          </span>
          <h1 className="font-display-lg text-display-lg md:text-[56px] text-surface-cream mt-2 mb-4">
            Discover Sri Lanka's Best Hotel Buffets
          </h1>
          <p className="font-body-lg text-body-lg text-on-primary-container max-w-2xl mx-auto">
            Curated culinary experiences from the finest establishments, designed for the discerning palate.
          </p>

          <div className="search-bar max-w-4xl mx-auto mt-8">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant">search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search buffets, hotels, or cuisines..."
                className="search-field-input flex-1"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 rounded-full border border-border-subtle text-text-deep-green font-label-sm text-label-sm hover:bg-surface-container-low transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  Filters
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-4">
          <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error">
            <p className="font-body-md text-body-md">
              <span className="font-semibold">⚠️ {error}</span>
            </p>
          </div>
        </div>
      )}

      {/* Category Chips */}
      <section className="py-6 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto overflow-x-auto hide-scrollbar border-b border-border-subtle">
        <div className="flex gap-3 w-max md:w-full md:flex-wrap">
          {categoryChips.map((chip) => (
            <button
              key={chip.key || "all"}
              type="button"
              onClick={() => setActiveCategory(chip.key)}
              className={`chip ${activeCategory === chip.key ? "chip-active" : ""}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {/* Filters */}
      {showFilters && (
        <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-6 border-b border-border-subtle">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-label-md text-label-md text-text-deep-green uppercase tracking-wider mb-3">
                Price Range
              </h4>
              <div className="space-y-2">
                {priceRanges.map((range) => (
                  <label key={range.label} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`relative flex items-center justify-center w-5 h-5 border rounded-[4px] transition-colors ${
                      selectedPriceRange?.label === range.label
                        ? "border-secondary bg-secondary"
                        : "border-outline bg-surface-container-lowest group-hover:border-secondary"
                    }`}>
                      {selectedPriceRange?.label === range.label && (
                        <span className="material-symbols-outlined text-[14px] text-highlight-gold" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check
                        </span>
                      )}
                      <input
                        type="checkbox"
                        checked={selectedPriceRange?.label === range.label}
                        onChange={() => setSelectedPriceRange(
                          selectedPriceRange?.label === range.label ? null : range
                        )}
                        className="opacity-0 absolute inset-0 cursor-pointer"
                      />
                    </div>
                    <span className={`font-body-md text-body-md ${
                      selectedPriceRange?.label === range.label
                        ? "text-text-deep-green"
                        : "text-on-surface-variant group-hover:text-text-deep-green"
                    } transition-colors`}>
                      {range.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-label-md text-label-md text-text-deep-green uppercase tracking-wider mb-3">
                Rating
              </h4>
              <div className="space-y-2">
                {ratingOptions.map((rating) => (
                  <label key={rating.value} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`relative flex items-center justify-center w-5 h-5 border rounded-[4px] transition-colors ${
                      selectedRating === rating.value
                        ? "border-secondary bg-secondary"
                        : "border-outline bg-surface-container-lowest group-hover:border-secondary"
                    }`}>
                      {selectedRating === rating.value && (
                        <span className="material-symbols-outlined text-[14px] text-highlight-gold" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check
                        </span>
                      )}
                      <input
                        type="checkbox"
                        checked={selectedRating === rating.value}
                        onChange={() => setSelectedRating(
                          selectedRating === rating.value ? null : rating.value
                        )}
                        className="opacity-0 absolute inset-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-highlight-gold">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                      <span className={`font-body-md text-body-md ${
                        selectedRating === rating.value
                          ? "text-text-deep-green"
                          : "text-on-surface-variant group-hover:text-text-deep-green"
                      } transition-colors`}>
                        {rating.label}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-label-md text-label-md text-text-deep-green uppercase tracking-wider mb-3">
                Sort By
              </h4>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-select w-full"
              >
                <option value="recommended">Recommended</option>
                <option value="rating">Highest Rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
              <button
                onClick={clearFilters}
                className="mt-4 text-label-sm text-label-sm text-outline hover:text-text-deep-green transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      <section className="py-8 md:py-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-headline-md text-headline-md text-text-deep-green">
              {loading ? "Loading..." : `${displayBuffets.length} Premium Buffet${displayBuffets.length !== 1 ? "s" : ""} Found`}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              {displayBuffets.length > 0 ? "Showing available experiences" : "No buffets match your filters"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="df-buffet-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card-ambient h-[400px] animate-pulse bg-surface-container-low" />
            ))}
          </div>
        ) : displayBuffets.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">restaurant</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green mb-2">No buffets found</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              Try adjusting your filters or search terms.
            </p>
            <button
              onClick={clearFilters}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="df-buffet-grid">
            {displayBuffets.map((buffet) => (
              <BuffetCard key={buffet._id || buffet.id} buffet={buffet} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Feed;