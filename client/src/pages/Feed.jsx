import { useEffect, useMemo, useState } from "react";
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

const categories = [
  { label: "All", value: "all", icon: "✨" },
  { label: "Seafood", value: "seafood", icon: "🦐" },
  { label: "BBQ", value: "bbq", icon: "🔥" },
  { label: "Lunch", value: "lunch", icon: "🍽️" },
  { label: "Dinner", value: "dinner", icon: "🌙" },
  { label: "High Tea", value: "high-tea", icon: "🫖" },
  { label: "Brunch", value: "brunch", icon: "🥐" },
  { label: "Luxury", value: "luxury", icon: "💎" },
  { label: "Family", value: "family", icon: "👨‍👩‍👧" },
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

  const results = useMemo(() => filterDiscoveryBuffets(buffets, filters), [buffets, filters]);

  const trendingBuffets = useMemo(() => {
    return [...buffets]
      .sort((a, b) => {
        const aScore = Number(a.averageRating || 0) + Number(a.reviewCount || 0) / 50 + (a.isFeatured ? 2 : 0);
        const bScore = Number(b.averageRating || 0) + Number(b.reviewCount || 0) / 50 + (b.isFeatured ? 2 : 0);
        return bScore - aScore;
      })
      .slice(0, 3);
  }, [buffets]);

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
      });
    });

    return [...map.values()].slice(0, 5);
  }, [buffets]);

  const updateCategory = (value) => {
    setFilters((prev) => ({ ...prev, category: value }));
    setSearched(true);
  };

  const resetFilters = () => {
    setFilters(defaultDiscoveryFilters);
    setSearched(false);
  };

  return (
    <main className="discovery-page stitch-discovery-page">
      <section className="stitch-hero">
        <div className="stitch-hero-content">
          <p className="stitch-kicker">Curated hotel buffet experiences</p>
          <h1>Discover Sri Lanka’s Best Hotel Buffets</h1>
          <p>
            Compare premium buffets by price, rating, location, availability, and atmosphere before you reserve.
          </p>
        </div>

        <SearchBar
          filters={filters}
          setFilters={setFilters}
          buffets={buffets}
          onSearch={() => setSearched(true)}
        />
      </section>

      <section className="stitch-category-scroll" aria-label="Buffet categories">
        <div className="stitch-category-track">
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`stitch-category-pill ${filters.category === item.value ? "active" : ""}`}
              onClick={() => updateCategory(item.value)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {!loading && !error && trendingBuffets.length > 0 && (
        <section className="stitch-showcase">
          <div className="stitch-section-heading">
            <div>
              <p className="stitch-kicker">Trending tonight</p>
              <h2>Popular buffet experiences</h2>
            </div>
            <Link to="/map" className="stitch-link-btn">Explore map →</Link>
          </div>

          <div className="stitch-trending-grid">
            {trendingBuffets.map((buffet) => (
              <Link to={`/buffets/${buffet._id}`} className="stitch-trending-card" key={buffet._id}>
                <img src={getPrimaryMedia(buffet)} alt={buffet.title} />
                <div className="stitch-trending-overlay">
                  <span>{Number(buffet.averageRating || 0).toFixed(1)} ★</span>
                  <h3>{buffet.title}</h3>
                  <p>{buffet.hotel?.hotelName || "Hotel Partner"} · Rs. {Number(buffet.price || 0).toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && featuredHotels.length > 0 && (
        <section className="stitch-hotels">
          <div className="stitch-section-heading">
            <div>
              <p className="stitch-kicker">Featured hotels</p>
              <h2>Trusted hotel partners</h2>
            </div>
          </div>

          <div className="stitch-hotel-track">
            {featuredHotels.map((hotel) => (
              <Link to={`/hotels/${hotel.id}`} className="stitch-hotel-card" key={hotel.id}>
                <img src={hotel.image} alt={hotel.name} />
                <div>
                  {hotel.logo ? <img className="stitch-hotel-logo" src={hotel.logo} alt="" /> : <span className="stitch-hotel-logo fallback">D</span>}
                  <h3>{hotel.name}</h3>
                  <p>{hotel.location} · {hotel.rating.toFixed(1)} ★</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="stitch-results-wrap">
        <div className="stitch-mobile-filter-row">
          <button className="stitch-outline-btn" type="button" onClick={() => setMobileFiltersOpen(true)}>
            Filters
          </button>
          <button className="stitch-outline-btn" type="button" onClick={resetFilters}>
            Reset
          </button>
        </div>

        <FilterSidebar
          filters={filters}
          setFilters={setFilters}
          resultCount={results.length}
          onReset={resetFilters}
          mobileOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
        />

        <div className="stitch-results-area">
          <div className="stitch-results-heading">
            <div>
              <p className="stitch-kicker">Results</p>
              <h2>{loading ? "Finding premium buffets..." : `${results.length} premium buffet${results.length === 1 ? "" : "s"}`}</h2>
              <p>{searched ? "Showing results for your latest search." : "Sorted by recommended buffet experiences."}</p>
            </div>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
              aria-label="Sort results"
            >
              <option value="recommended">Recommended</option>
              <option value="rating">Highest rated</option>
              <option value="price-low">Price low to high</option>
              <option value="price-high">Price high to low</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {error && (
            <div className="stitch-empty-state error-state">
              <h3>Discovery failed to load</h3>
              <p>{error}</p>
            </div>
          )}

          {!error && loading && (
            <div className="stitch-card-grid">
              {[1, 2, 3, 4].map((item) => <div className="stitch-skeleton-card" key={item} />)}
            </div>
          )}

          {!error && !loading && results.length === 0 && (
            <div className="stitch-empty-state">
              <span>🍽️</span>
              <h3>No buffet found</h3>
              <p>Try another date, location, price range, or category.</p>
              <button className="stitch-primary-btn" type="button" onClick={resetFilters}>Reset filters</button>
            </div>
          )}

          {!error && !loading && results.length > 0 && (
            <div className="stitch-card-grid">
              {results.map((buffet) => (
                <DiscoveryFeedCard key={buffet._id} buffet={buffet} guests={filters.guests} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Feed;
