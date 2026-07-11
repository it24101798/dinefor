import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import SearchBar from "../components/discovery/SearchBar";
import FilterSidebar from "../components/discovery/FilterSidebar";
import DiscoveryFeedCard from "../components/discovery/DiscoveryFeedCard";
import {
  defaultDiscoveryFilters,
  fetchDiscoveryBuffets,
  filterDiscoveryBuffets,
  getPrimaryMedia,
} from "../services/discoveryService";

// Category data with icons and labels
const categories = [
  { label: "All", value: "all", icon: "✨", color: "#2D8B4E" },
  { label: "Seafood", value: "seafood", icon: "🦐", color: "#2196F3" },
  { label: "BBQ", value: "bbq", icon: "🔥", color: "#FF5722" },
  { label: "Lunch", value: "lunch", icon: "🍽️", color: "#FF9800" },
  { label: "Dinner", value: "dinner", icon: "🌙", color: "#3F51B5" },
  { label: "High Tea", value: "high-tea", icon: "🫖", color: "#9C27B0" },
  { label: "Brunch", value: "brunch", icon: "🥐", color: "#E91E63" },
  { label: "Luxury", value: "luxury", icon: "💎", color: "#FFD700" },
  { label: "Family", value: "family", icon: "👨‍👩‍👧", color: "#4CAF50" },
  { label: "Vegetarian", value: "vegetarian", icon: "🥗", color: "#8BC34A" },
  { label: "Halal", value: "halal", icon: "🕌", color: "#795548" },
  { label: "International", value: "international", icon: "🌍", color: "#607D8B" },
];

// Sort options
const sortOptions = [
  { value: "recommended", label: "Recommended", icon: "⭐" },
  { value: "rating", label: "Highest Rated", icon: "📈" },
  { value: "price-low", label: "Price: Low to High", icon: "💰" },
  { value: "price-high", label: "Price: High to Low", icon: "💎" },
  { value: "newest", label: "Newest First", icon: "🆕" },
  { value: "popular", label: "Most Popular", icon: "🔥" },
];

function getHotelKey(buffet) {
  return buffet?.hotel?._id || buffet?.hotel?.hotelName || buffet?.hotelName || buffet?._id;
}

function Feed() {
  const [buffets, setBuffets] = useState([]);
  const [filters, setFilters] = useState(defaultDiscoveryFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const resultsRef = useRef(null);

  // Fetch buffets on mount
  useEffect(() => {
    const loadBuffets = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchDiscoveryBuffets();
        setBuffets(data);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load discovery feed.");
      } finally {
        setLoading(false);
      }
    };

    loadBuffets();
  }, []);

  // Filter results based on current filters
  const results = useMemo(() => filterDiscoveryBuffets(buffets, filters), [buffets, filters]);

  // Trending buffets calculation
  const trendingBuffets = useMemo(() => {
    return [...buffets]
      .sort((a, b) => {
        const aScore = Number(a.averageRating || 0) + Number(a.reviewCount || 0) / 50 + (a.isFeatured ? 2 : 0);
        const bScore = Number(b.averageRating || 0) + Number(b.reviewCount || 0) / 50 + (b.isFeatured ? 2 : 0);
        return bScore - aScore;
      })
      .slice(0, 3);
  }, [buffets]);

  // Featured hotels extraction
  const featuredHotels = useMemo(() => {
    const map = new Map();

    buffets.forEach((buffet) => {
      const key = getHotelKey(buffet);
      if (!key || map.has(key)) return;

      map.set(key, {
        id: buffet?.hotel?._id || key,
        name: buffet?.hotel?.hotelName || buffet?.hotelName || "Hotel Partner",
        location: buffet?.hotel?.city || buffet?.hotel?.location || buffet?.location?.city || "Sri Lanka",
        logo: buffet?.hotel?.logo,
        image: buffet?.hotel?.coverImage || buffet?.hotel?.cover || getPrimaryMedia(buffet),
        rating: Number(buffet?.hotel?.averageRating || buffet?.averageRating || 0),
        buffetCount: buffets.filter((b) => getHotelKey(b) === key).length,
      });
    });

    return [...map.values()]
      .sort((a, b) => b.buffetCount - a.buffetCount)
      .slice(0, 6);
  }, [buffets]);

  // Handle category change
  const updateCategory = useCallback((value) => {
    setActiveCategory(value);
    setFilters((prev) => ({ ...prev, category: value }));
    setSearched(true);
  }, []);

  // Handle search
  const handleSearch = useCallback(() => {
    setSearched(true);
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(defaultDiscoveryFilters);
    setActiveCategory("all");
    setSearched(false);
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((e) => {
    setFilters((prev) => ({ ...prev, sortBy: e.target.value }));
  }, []);

  // Scroll to results when search is performed
  useEffect(() => {
    if (searched && resultsRef.current) {
      const timeout = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [searched]);

  return (
    <main className="discovery-page stitch-discovery-page">
      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="stitch-hero">
        <div className="stitch-hero-content">
          <div className="hero-badge">
            <span className="badge-icon">🍽️</span>
            <span>Discover Sri Lanka's Best Buffets</span>
          </div>
          <h1>Find Your Perfect Buffet Experience</h1>
          <p>
            Explore curated hotel buffets by price, rating, location, and availability.
            Book your table with confidence.
          </p>
        </div>

        <SearchBar
          filters={filters}
          setFilters={setFilters}
          buffets={buffets}
          onSearch={handleSearch}
        />
      </section>

      {/* ============================================
          CATEGORY PILLS
          ============================================ */}
      <section className="stitch-category-scroll" aria-label="Buffet categories">
        <div className="stitch-category-track">
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`stitch-category-pill ${activeCategory === item.value ? "active" : ""}`}
              onClick={() => updateCategory(item.value)}
              style={
                activeCategory === item.value
                  ? { "--pill-color": item.color }
                  : {}
              }
            >
              <span className="pill-icon">{item.icon}</span>
              <span className="pill-label">{item.label}</span>
              {activeCategory === item.value && (
                <span className="pill-active-indicator" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ============================================
          TRENDING BUFFETS
          ============================================ */}
      {!loading && !error && trendingBuffets.length > 0 && (
        <section className="stitch-showcase">
          <div className="stitch-section-heading">
            <div>
              <span className="section-badge">🔥 Trending Now</span>
              <h2>Popular Buffet Experiences</h2>
              <p>Handpicked by our community. Book before they're gone.</p>
            </div>
            <Link to="/listings" className="stitch-link-btn">
              View All →
            </Link>
          </div>

          <div className="stitch-trending-grid">
            {trendingBuffets.map((buffet, index) => (
              <Link
                to={`/buffets/${buffet._id}`}
                className="stitch-trending-card"
                key={buffet._id}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <img
                  src={getPrimaryMedia(buffet)}
                  alt={buffet.title}
                  loading={index < 2 ? "eager" : "lazy"}
                />
                <div className="stitch-trending-overlay">
                  <div className="trending-badge">
                    <span>🔥</span>
                    <span>Trending</span>
                  </div>
                  <div className="trending-meta">
                    <span className="trending-rating">
                      ⭐ {Number(buffet.averageRating || 0).toFixed(1)}
                    </span>
                    <span className="trending-price">
                      Rs. {Number(buffet.price || 0).toLocaleString()}
                    </span>
                  </div>
                  <h3>{buffet.title}</h3>
                  <p>{buffet.hotel?.hotelName || "Hotel Partner"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============================================
          FEATURED HOTELS
          ============================================ */}
      {!loading && !error && featuredHotels.length > 0 && (
        <section className="stitch-hotels">
          <div className="stitch-section-heading">
            <div>
              <span className="section-badge">🏨 Trusted Partners</span>
              <h2>Featured Hotels</h2>
              <p>Discover top-rated hotels offering exceptional buffet experiences.</p>
            </div>
            <Link to="/explore-map" className="stitch-link-btn">
              View All Hotels →
            </Link>
          </div>

          <div className="stitch-hotel-track">
            {featuredHotels.map((hotel, index) => (
              <Link
                to={`/hotels/${hotel.id}`}
                className="stitch-hotel-card"
                key={hotel.id}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="hotel-card-image">
                  <img src={hotel.image} alt={hotel.name} loading="lazy" />
                  {hotel.buffetCount > 0 && (
                    <span className="hotel-buffet-count">{hotel.buffetCount} Buffets</span>
                  )}
                </div>
                <div className="hotel-card-content">
                  <div className="hotel-card-logo">
                    {hotel.logo ? (
                      <img src={hotel.logo} alt="" />
                    ) : (
                      <span className="hotel-logo-fallback">🏨</span>
                    )}
                  </div>
                  <h3>{hotel.name}</h3>
                  <p className="hotel-location">📍 {hotel.location}</p>
                  <div className="hotel-rating">
                    <span className="stars">⭐</span>
                    <span>{hotel.rating.toFixed(1)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============================================
          RESULTS SECTION
          ============================================ */}
      <section className="stitch-results-wrap" ref={resultsRef}>
        {/* Mobile Filter Toggle */}
        <div className="stitch-mobile-filter-row">
          <button
            className="stitch-outline-btn filter-toggle"
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            aria-expanded={mobileFiltersOpen}
          >
            <span>🔍</span> Filters
            {results.length > 0 && (
              <span className="result-count-badge">{results.length}</span>
            )}
          </button>
          <button
            className="stitch-outline-btn reset-btn"
            type="button"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>

        {/* Filter Sidebar */}
        <FilterSidebar
          filters={filters}
          setFilters={setFilters}
          resultCount={results.length}
          onReset={resetFilters}
          mobileOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
        />

        {/* Results Area */}
        <div className="stitch-results-area">
          <div className="stitch-results-heading">
            <div className="results-info">
              <span className="section-badge">📋 Results</span>
              <h2>
                {loading
                  ? "Finding premium buffets..."
                  : `${results.length} Premium Buffet${results.length === 1 ? "" : "s"}`
                }
              </h2>
              <p>
                {searched
                  ? "Showing results for your search."
                  : "Sorted by recommended buffet experiences."
                }
              </p>
            </div>

            <div className="results-controls">
              <select
                value={filters.sortBy}
                onChange={handleSortChange}
                className="sort-select"
                aria-label="Sort results"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="stitch-empty-state error-state">
              <span className="empty-icon">😕</span>
              <h3>Discovery Failed to Load</h3>
              <p>{error}</p>
              <button
                className="stitch-primary-btn"
                type="button"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {!error && loading && (
            <div className="stitch-card-grid">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div className="stitch-skeleton-card" key={item}>
                  <div className="skeleton-image" />
                  <div className="skeleton-body">
                    <div className="skeleton-line" style={{ width: "70%" }} />
                    <div className="skeleton-line" style={{ width: "50%" }} />
                    <div className="skeleton-line" style={{ width: "40%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!error && !loading && results.length === 0 && (
            <div className="stitch-empty-state">
              <span className="empty-icon">🍽️</span>
              <h3>No Buffets Found</h3>
              <p>
                We couldn't find any buffets matching your criteria.
                Try adjusting your filters or search terms.
              </p>
              <div className="empty-actions">
                <button
                  className="stitch-primary-btn"
                  type="button"
                  onClick={resetFilters}
                >
                  Reset Filters
                </button>
                <Link to="/explore-map" className="stitch-outline-btn">
                  Explore Map
                </Link>
              </div>
              <div className="empty-suggestions">
                <span>Try:</span>
                <button
                  type="button"
                  onClick={() => updateCategory("all")}
                  className="suggestion-chip"
                >
                  ✨ All Buffets
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, guests: 2 }))}
                  className="suggestion-chip"
                >
                  👥 2 Guests
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, maxPrice: 5000 }))}
                  className="suggestion-chip"
                >
                  💰 Under Rs. 5,000
                </button>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {!error && !loading && results.length > 0 && (
            <div className="stitch-card-grid">
              {results.map((buffet, index) => (
                <DiscoveryFeedCard
                  key={buffet._id}
                  buffet={buffet}
                  guests={filters.guests}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Load More (placeholder for future implementation) */}
          {!error && !loading && results.length > 12 && (
            <div className="load-more-wrapper">
              <button className="stitch-outline-btn load-more-btn" type="button">
                Load More Buffets
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Feed;