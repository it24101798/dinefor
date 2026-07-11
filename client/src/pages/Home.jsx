import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import FeedCard from "../components/FeedCard";

const defaultSettings = {
  heroTitle: "Discover Sri Lanka's Finest Hotel Buffets",
  heroSubtitle: "Indulge in premium lunch, dinner, seafood nights, and exclusive hotel buffet experiences — all in one trusted marketplace.",
  heroMediaType: "image",
  heroMediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80",
  videoMuted: true,
  themeMode: "dark",
  featuredSectionTitle: "Featured Buffet Experiences",
  tagline: "Curated by DineFor",
};

// Category data for quick browsing
const buffetCategories = [
  { id: "seafood", label: "🦐 Seafood", query: "seafood" },
  { id: "bbq", label: "🔥 BBQ Night", query: "bbq" },
  { id: "lunch", label: "🍽️ Lunch", query: "lunch" },
  { id: "dinner", label: "🌙 Dinner", query: "dinner" },
  { id: "high-tea", label: "🫖 High Tea", query: "high-tea" },
  { id: "brunch", label: "🥐 Brunch", query: "brunch" },
  { id: "luxury", label: "💎 Luxury", query: "luxury" },
  { id: "family", label: "👨‍👩‍👧 Family", query: "family" },
];

// Testimonials data
const testimonials = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Travel Enthusiast",
    content: "DineFor transformed our family vacation. The QR check-in made everything seamless, and the buffet at Galle Face Hotel was unforgettable!",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108372-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 2,
    name: "Michael Roberts",
    role: "Food Blogger",
    content: "As someone who reviews hotels for a living, DineFor is a game-changer. The discovery feed is beautifully curated and the reservation process is frictionless.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 3,
    name: "Priya Fernando",
    role: "Corporate Events Manager",
    content: "Booking corporate dining has never been easier. DineFor's platform saves me hours of coordination. The hotel partners are top-tier.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  },
];

// Feature data
const features = [
  {
    id: 1,
    icon: "⏰",
    title: "Live Seat Availability",
    description: "Real-time buffet seat counts so you never miss out on your preferred dining time.",
  },
  {
    id: 2,
    icon: "⭐",
    title: "Verified Guest Reviews",
    description: "Authentic reviews with photos from verified diners who've actually experienced the buffet.",
  },
  {
    id: 3,
    icon: "📱",
    title: "QR Check-In System",
    description: "Unique QR codes for each booking that hotels verify instantly — no paper tickets needed.",
  },
  {
    id: 4,
    icon: "🔒",
    title: "Secure Reservations",
    description: "Your booking details are protected, and cancellations are handled with transparency.",
  },
];

function Home() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [muted, setMuted] = useState(true);
  const [buffets, setBuffets] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ location: "", date: "", meal: "", guests: 2 });
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [settingsRes, buffetsRes, hotelsRes] = await Promise.allSettled([
          axios.get("http://localhost:5000/api/site-settings"),
          axios.get("http://localhost:5000/api/buffets"),
          axios.get("http://localhost:5000/api/hotels"),
        ]);

        if (settingsRes.status === "fulfilled") {
          const merged = { ...defaultSettings, ...settingsRes.value.data };
          setSettings(merged);
          setMuted(merged.videoMuted !== undefined ? merged.videoMuted : true);
        }

        if (buffetsRes.status === "fulfilled") {
          const buffetData = Array.isArray(buffetsRes.value.data) ? buffetsRes.value.data : [];
          setBuffets(buffetData);
        }

        if (hotelsRes.status === "fulfilled") {
          const hotelData = Array.isArray(hotelsRes.value.data) ? hotelsRes.value.data : [];
          setHotels(hotelData);
        }
      } catch (error) {
        console.error("Failed to fetch home data:", error);
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Memoized featured buffets
  const featuredBuffets = useMemo(() => {
    const featured = buffets.filter((buffet) => buffet.isFeatured);
    return (featured.length ? featured : buffets).slice(0, 8);
  }, [buffets]);

  // Memoized popular hotels
  const popularHotels = useMemo(() => {
    const hotelMap = new Map();
    buffets.forEach((buffet) => {
      const hotel = buffet.hotel;
      if (hotel?._id && !hotelMap.has(hotel._id)) {
        hotelMap.set(hotel._id, {
          ...hotel,
          buffetCount: buffets.filter((b) => b.hotel?._id === hotel._id).length,
        });
      }
    });
    return Array.from(hotelMap.values())
      .sort((a, b) => (b.buffetCount || 0) - (a.buffetCount || 0))
      .slice(0, 6);
  }, [buffets]);

  // Handle search submission
  const handleSearch = useCallback(
    (event) => {
      event.preventDefault();
      const params = new URLSearchParams();
      Object.entries(search).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      navigate(`/listings?${params.toString()}`);
    },
    [search, navigate]
  );

  // Handle category click
  const handleCategoryClick = useCallback(
    (category) => {
      navigate(`/listings?meal=${encodeURIComponent(category.query)}`);
    },
    [navigate]
  );

  // Handle testimonial navigation
  const goToTestimonial = useCallback((index) => {
    setActiveTestimonial(index);
  }, []);

  const isLight = settings.themeMode === "light";

  // Loading skeleton
  if (loading) {
    return (
      <main className="home-page">
        <section className="home-hero-skeleton">
          <div className="skeleton" style={{ width: "100%", height: "70vh" }} />
        </section>
        <section className="home-section">
          <div className="section-header">
            <span className="eyebrow skeleton" style={{ width: 120, height: 20 }} />
            <h2 className="skeleton" style={{ width: 300, height: 40 }} />
          </div>
          <div className="feed-grid skeleton-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton" style={{ height: 200, borderRadius: "var(--radius-lg)" }} />
                <div className="skeleton" style={{ height: 24, marginTop: 16 }} />
                <div className="skeleton" style={{ height: 16, marginTop: 8, width: "60%" }} />
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`home-page ${isLight ? "light" : "beach-home"}`}>
      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="home-hero beach-hero" ref={heroRef}>
        {/* Hero Media */}
        <div className="hero-media beach-hero-media">
          {settings.heroMediaType === "video" ? (
            <>
              <video
                src={settings.heroMediaUrl}
                autoPlay
                loop
                muted={muted}
                playsInline
                poster={settings.heroMediaUrl?.replace(/\.(mp4|webm|ogg)/, ".jpg")}
              />
              <button
                className="mute-btn"
                type="button"
                onClick={() => setMuted(!muted)}
                aria-label={muted ? "Unmute video" : "Mute video"}
              >
                {muted ? "🔇" : "🔊"}
              </button>
            </>
          ) : (
            <img
              src={settings.heroMediaUrl}
              alt={settings.heroTitle}
              loading="eager"
            />
          )}
          <div className="hero-overlay-gradient" />
        </div>

        {/* Hero Content */}
        <div className="hero-overlay beach-hero-overlay">
          <div className="hero-content-wrapper">
            <span className="hero-tagline">{settings.tagline || "Curated by DineFor"}</span>
            <h1 className="hero-title">{settings.heroTitle}</h1>
            <p className="hero-subtitle">{settings.heroSubtitle}</p>

            {/* Premium Search Bar */}
            <form className="booking-search-bar premium-search" onSubmit={handleSearch}>
              <div className="search-row">
                <div className="search-group location-group">
                  <span className="search-icon">📍</span>
                  <input
                    type="text"
                    placeholder="Search city or hotel..."
                    value={search.location}
                    onChange={(e) => setSearch({ ...search, location: e.target.value })}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    aria-label="Search location"
                  />
                </div>

                <div className="search-divider" />

                <div className="search-group date-group">
                  <span className="search-icon">📅</span>
                  <input
                    type="date"
                    value={search.date}
                    onChange={(e) => setSearch({ ...search, date: e.target.value })}
                    aria-label="Select date"
                  />
                </div>

                <div className="search-divider" />

                <div className="search-group meal-group">
                  <span className="search-icon">🍽️</span>
                  <select
                    value={search.meal}
                    onChange={(e) => setSearch({ ...search, meal: e.target.value })}
                    aria-label="Select meal type"
                  >
                    <option value="">All Meals</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Seafood">Seafood</option>
                    <option value="BBQ">BBQ</option>
                    <option value="High-tea">High Tea</option>
                    <option value="Brunch">Brunch</option>
                  </select>
                </div>

                <div className="search-divider" />

                <div className="search-group guests-group">
                  <span className="search-icon">👥</span>
                  <div className="guest-stepper">
                    <button
                      type="button"
                      onClick={() => setSearch({ ...search, guests: Math.max(1, search.guests - 1) })}
                      aria-label="Decrease guests"
                    >
                      −
                    </button>
                    <span className="guest-count">{search.guests}</span>
                    <button
                      type="button"
                      onClick={() => setSearch({ ...search, guests: Math.min(20, search.guests + 1) })}
                      aria-label="Increase guests"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button className="btn primary search-btn" type="submit">
                  <span>Search Buffets</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Quick Actions */}
            <div className="hero-actions compact-actions">
              <Link to="/feed" className="btn primary hero-btn">
                Explore All Buffets
              </Link>
              <Link to="/explore-map" className="btn ghost hero-btn">
                <span>📍</span> View Map
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          CATEGORIES SECTION
          ============================================ */}
      <section className="home-section categories-section">
        <div className="section-header">
          <span className="eyebrow">Browse by Category</span>
          <h2>Discover Your Perfect Buffet</h2>
          <p>Explore curated categories to find the dining experience that matches your craving.</p>
        </div>

        <div className="categories-grid">
          {buffetCategories.map((category) => (
            <button
              key={category.id}
              className="category-card"
              onClick={() => handleCategoryClick(category)}
              aria-label={`Browse ${category.label} buffets`}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-label">{category.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ============================================
          FEATURED BUFFETS
          ============================================ */}
      <section className="home-section featured-section">
        <div className="section-header">
          <span className="eyebrow">Curated Selection</span>
          <h2>{settings.featuredSectionTitle}</h2>
          <p>Handpicked premium buffet experiences from Sri Lanka's finest hotels.</p>
        </div>

        {featuredBuffets.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🍽️</span>
            <h3>No featured buffets yet</h3>
            <p>Check back soon for curated dining experiences.</p>
          </div>
        ) : (
          <>
            <div className="feed-grid masonry-lite home-featured-feed">
              {featuredBuffets.slice(0, 4).map((buffet, index) => (
                <div
                  key={buffet._id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <FeedCard buffet={buffet} />
                </div>
              ))}
            </div>
            {featuredBuffets.length > 4 && (
              <div className="view-all-wrapper">
                <Link to="/feed" className="btn secondary view-all-btn">
                  View All Buffets →
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* ============================================
          FEATURES / WHY DINEFOR
          ============================================ */}
      <section className="home-section features-section">
        <div className="features-container">
          <div className="features-header">
            <span className="eyebrow">Why DineFor</span>
            <h2>Designed for the Modern Diner</h2>
            <p>Every feature is crafted to make your buffet discovery and booking experience seamless.</p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                className="feature-card animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          POPULAR HOTELS
          ============================================ */}
      {popularHotels.length > 0 && (
        <section className="home-section hotels-section">
          <div className="section-header">
            <span className="eyebrow">Trusted Partners</span>
            <h2>Popular Hotel Dining Destinations</h2>
            <p>Discover top-rated hotels offering exceptional buffet experiences.</p>
          </div>

          <div className="hotels-grid">
            {popularHotels.map((hotel, index) => (
              <Link
                key={hotel._id}
                to={`/hotels/${hotel._id}`}
                className="hotel-card animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="hotel-image-wrapper">
                  <img
                    src={
                      hotel.logo ||
                      hotel.coverMediaUrl ||
                      hotel.galleryImages?.[0] ||
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80"
                    }
                    alt={hotel.hotelName}
                    loading="lazy"
                  />
                  {hotel.buffetCount > 0 && (
                    <span className="hotel-badge">{hotel.buffetCount} Buffets</span>
                  )}
                </div>
                <div className="hotel-info">
                  <h3>{hotel.hotelName}</h3>
                  <p className="hotel-location">
                    📍 {hotel.city || hotel.location || "Sri Lanka"}
                  </p>
                  {hotel.averageRating > 0 && (
                    <div className="hotel-rating">
                      <span className="stars">⭐</span>
                      <span>{Number(hotel.averageRating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="view-all-wrapper">
            <Link to="/explore-map" className="btn secondary view-all-btn">
              Explore All Hotels →
            </Link>
          </div>
        </section>
      )}

      {/* ============================================
          TESTIMONIALS
          ============================================ */}
      <section className="home-section testimonials-section">
        <div className="testimonials-container">
          <div className="section-header centered">
            <span className="eyebrow">Guest Stories</span>
            <h2>What Our Diners Say</h2>
            <p>Real experiences from real guests who discovered their perfect buffet through DineFor.</p>
          </div>

          <div className="testimonials-carousel">
            <div className="testimonial-track">
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className={`testimonial-card ${index === activeTestimonial ? "active" : ""}`}
                  style={{
                    transform: `translateX(${(index - activeTestimonial) * 100}%)`,
                  }}
                >
                  <div className="testimonial-content">
                    <div className="testimonial-stars">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="star">★</span>
                      ))}
                    </div>
                    <blockquote>"{testimonial.content}"</blockquote>
                    <div className="testimonial-author">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="testimonial-avatar"
                        loading="lazy"
                      />
                      <div>
                        <strong>{testimonial.name}</strong>
                        <span>{testimonial.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dots Navigation */}
            <div className="testimonial-dots">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${index === activeTestimonial ? "active" : ""}`}
                  onClick={() => goToTestimonial(index)}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          CTA SECTION
          ============================================ */}
      <section className="home-section cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <span className="eyebrow">For Hotels & Restaurants</span>
            <h2>Partner with DineFor</h2>
            <p>
              Join Sri Lanka's premier hotel buffet marketplace. Fill your seats,
              manage reservations, and grow your dining revenue with our all-in-one platform.
            </p>
            <div className="cta-actions">
              <Link to="/hotel-apply" className="btn gold cta-btn">
                Apply as Hotel Partner
              </Link>
              <Link to="/feed" className="btn secondary cta-btn">
                Explore Buffets
              </Link>
            </div>
          </div>
          <div className="cta-visual">
            <div className="cta-stats">
              <div className="stat-item">
                <span className="stat-number">{buffets.length}+</span>
                <span className="stat-label">Buffet Experiences</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-number">{hotels.length}+</span>
                <span className="stat-label">Hotel Partners</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-number">{testimonials.length}K+</span>
                <span className="stat-label">Happy Diners</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;