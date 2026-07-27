import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import FeedCard from "../components/FeedCard";
import HeroMediaCarousel from "../components/HeroMediaCarousel";

// ============================================
// CONFIGURATION
// ============================================
const defaultSettings = {
  heroTitle: "Discover Sri Lanka's Best Hotel Buffets",
  heroSubtitle: "Curated culinary experiences from the finest establishments, designed for the discerning palate.",
  heroMediaType: "image",
  heroMediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&h=600&fit=crop",
  videoMuted: true,
  themeMode: "light",
  featuredSectionTitle: "Featured Buffet Experiences",
};

const categoryChips = [
  { key: "", label: "All", icon: "✨" },
  { key: "Lunch", label: "Lunch", icon: "🍽️" },
  { key: "Dinner", label: "Dinner", icon: "🌙" },
  { key: "High Tea", label: "High Tea", icon: "🫖" },
  { key: "Seafood", label: "Seafood", icon: "🦐" },
  { key: "Weekend Buffet", label: "Weekend Buffet", icon: "🎉" },
  { key: "BBQ", label: "BBQ", icon: "🔥" },
  { key: "Rooftop", label: "Rooftop", icon: "🏙️" },
  { key: "Luxury", label: "Luxury", icon: "💎" },
  { key: "Halal", label: "Halal", icon: "🕌" },
  { key: "Breakfast", label: "Breakfast", icon: "🥐" },
  { key: "Brunch", label: "Brunch", icon: "🥂" },
];

const howItWorksSteps = [
  {
    icon: "explore",
    title: "Discover",
    description: "Browse verified hotel buffets by city, cuisine, and occasion in one curated marketplace.",
    color: "bg-primary-container/10",
    iconColor: "text-primary",
  },
  {
    icon: "event_available",
    title: "Reserve a Slot",
    description: "Pick a live time slot and guest count so your table is guaranteed before you arrive.",
    color: "bg-secondary-container/10",
    iconColor: "text-secondary",
  },
  {
    icon: "qr_code_scanner",
    title: "Dine & Enjoy",
    description: "Show up, check in with your QR confirmation, and enjoy a premium buffet experience.",
    color: "bg-tertiary-container/10",
    iconColor: "text-tertiary",
  },
  {
    icon: "rate_review",
    title: "Share a Review",
    description: "Leave verified photos, videos, and ratings to help other diners choose with confidence.",
    color: "bg-highlight-gold/10",
    iconColor: "text-highlight-gold",
  },
];

const trustPoints = [
  {
    icon: "verified",
    title: "Verified Hotel Partners",
    description: "Every listing is confirmed directly with the hotel before it goes live on DineFor.",
  },
  {
    icon: "security",
    title: "Secure Reservations",
    description: "Your booking details and payments are protected end-to-end, every time.",
  },
  {
    icon: "qr_code_scanner",
    title: "QR Check-In",
    description: "Hotels verify bills and attendance on-site, preventing duplicate or fraudulent use.",
  },
  {
    icon: "rate_review",
    title: "Real Guest Reviews",
    description: "Ratings and photos come only from diners with a completed reservation.",
  },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Travel Blogger",
    avatar: "https://images.unsplash.com/photo-1494790108375-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    quote: "DineFor transformed my dining experience in Sri Lanka. The seafood buffet at Galle Face Hotel was absolutely incredible!",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "Food Enthusiast",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    quote: "The QR check-in system is brilliant. No more waiting in lines - just scan and enjoy the premium buffet experience.",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "Hotel Manager",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    quote: "As a hotel partner, DineFor has helped us fill our buffet seats and attract more walk-in guests. Game changer!",
    rating: 5,
  },
  {
    name: "David Wilson",
    role: "Frequent Traveler",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    quote: "I've discovered so many amazing hotel buffets through DineFor. The curated recommendations are always spot on.",
    rating: 4,
  },
];

const faqs = [
  {
    question: "What is DineFor?",
    answer: "DineFor is a premium hospitality marketplace that connects diners with the finest hotel buffet experiences across Sri Lanka. We curate, verify, and make it easy to discover and reserve buffet seats at top hotels.",
  },
  {
    question: "How do I make a reservation?",
    answer: "Simply browse our curated buffet listings, select your preferred date, time slot, and number of guests, then confirm your booking. You'll receive a QR code confirmation for easy check-in.",
  },
  {
    question: "Can I cancel or modify my booking?",
    answer: "Yes, you can cancel or modify your booking up to 24 hours before the scheduled time. Please check the hotel's cancellation policy for specific details.",
  },
  {
    question: "How does the QR check-in work?",
    answer: "After booking, you'll receive a unique QR code. Simply show this QR code at the hotel entrance for quick verification and check-in. No paperwork needed!",
  },
  {
    question: "Are the hotels verified?",
    answer: "Yes, every hotel partner undergoes a thorough verification process before joining DineFor. We ensure all listings are authentic and meet our quality standards.",
  },
  {
    question: "What payment methods are accepted?",
    answer: "Currently, we support 'Pay at Hotel' where you pay directly at the venue. Online payment options are coming soon for even more convenience.",
  },
];

// ============================================
// MAIN COMPONENT
// ============================================
function Home() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const stepsRef = useRef(null);
  const testimonialsRef = useRef(null);
  const faqRef = useRef(null);

  // ============================================
  // STATE
  // ============================================
  const [settings, setSettings] = useState(defaultSettings);
  const [muted, setMuted] = useState(true);
  const [buffets, setBuffets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ location: "", date: "", meal: "", guests: 2 });
  const [activeCategory, setActiveCategory] = useState("");
  const [showSearchMobile, setShowSearchMobile] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [showAllTestimonials, setShowAllTestimonials] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [emailSubscribe, setEmailSubscribe] = useState("");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [stats, setStats] = useState({ totalBuffets: 0, totalHotels: 0, totalReviews: 0, satisfactionRate: 0 });
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [topRatedBuffets, setTopRatedBuffets] = useState([]);
  const [latestBuffets, setLatestBuffets] = useState([]);

  // ============================================
  // SCROLL HANDLING
  // ============================================
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 50);
      setShowScrollTop(scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // ============================================
  // FETCH DATA
  // ============================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [settingsRes, buffetsRes] = await Promise.allSettled([
          api.get("/site-settings"),
          api.get("/buffets"),
        ]);

        if (settingsRes.status === "fulfilled") {
          const merged = { ...defaultSettings, ...settingsRes.value.data };
          setSettings(merged);
          setMuted(merged.videoMuted);
        }
        
        let buffetData = [];
        if (buffetsRes.status === "fulfilled") {
          buffetData = Array.isArray(buffetsRes.value.data) ? buffetsRes.value.data : [];
          setBuffets(buffetData);
        }

        // Calculate stats
        const uniqueHotels = new Set();
        let totalReviews = 0;
        let totalRating = 0;
        let ratedBuffets = 0;

        buffetData.forEach((b) => {
          if (b.hotel?._id) uniqueHotels.add(b.hotel._id);
          if (b.totalReviews) totalReviews += b.totalReviews;
          if (b.averageRating) {
            totalRating += b.averageRating;
            ratedBuffets++;
          }
        });

        setStats({
          totalBuffets: buffetData.length,
          totalHotels: uniqueHotels.size,
          totalReviews: totalReviews,
          satisfactionRate: ratedBuffets > 0 ? Math.round((totalRating / ratedBuffets) * 20) : 95,
        });

        // Featured hotels
        const hotelMap = new Map();
        buffetData.forEach((b) => {
          if (b.hotel?._id && !hotelMap.has(b.hotel._id) && b.isFeatured) {
            hotelMap.set(b.hotel._id, b.hotel);
          }
        });
        setFeaturedHotels(Array.from(hotelMap.values()).slice(0, 4));

        // Top rated buffets
        const topRated = [...buffetData]
          .filter((b) => b.averageRating >= 4.0)
          .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
          .slice(0, 4);
        setTopRatedBuffets(topRated);

        // Latest buffets
        const latest = [...buffetData]
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 4);
        setLatestBuffets(latest);

      } catch {
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ============================================
  // AUTO SLIDE FOR HERO
  // ============================================
  useEffect(() => {
    if (settings.heroMediaType === "image") return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 5);
    }, 5000);

    return () => clearInterval(interval);
  }, [settings.heroMediaType]);

  // ============================================
  // COMPUTED DATA
  // ============================================
  const featuredBuffets = useMemo(() => {
    const featured = buffets.filter((buffet) => buffet.isFeatured);
    return (featured.length ? featured : buffets).slice(0, 6);
  }, [buffets]);

  const popularHotels = useMemo(() => {
    const map = new Map();
    buffets.forEach((buffet) => {
      const hotel = buffet.hotel;
      if (hotel?._id && !map.has(hotel._id)) map.set(hotel._id, hotel);
    });
    return Array.from(map.values()).slice(0, 4);
  }, [buffets]);

  const displayedTestimonials = useMemo(() => {
    return showAllTestimonials ? testimonials : testimonials.slice(0, 3);
  }, [showAllTestimonials]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(search).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    navigate(`/listings?${params.toString()}`);
  };

  const handleCategorySelect = (categoryKey) => {
    setActiveCategory(categoryKey);
    setSearch((prev) => ({ ...prev, meal: categoryKey }));
    if (categoryKey) {
      navigate(`/listings?meal=${categoryKey}`);
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!emailSubscribe) {
      setSubscribeMessage("Please enter your email address.");
      return;
    }

    setSubscribeLoading(true);
    setSubscribeMessage("");

    try {
      await api.post("/newsletter/subscribe", {
        email: emailSubscribe,
      });
      setSubscribeMessage("✅ Successfully subscribed to our newsletter!");
      setEmailSubscribe("");
    } catch (error) {
      setSubscribeMessage(error.response?.data?.message || "Failed to subscribe. Please try again.");
    } finally {
      setSubscribeLoading(false);
    }
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card-ambient h-[400px] animate-pulse">
          <div className="h-56 bg-surface-container-high" />
          <div className="p-5 space-y-3">
            <div className="h-4 bg-surface-container-high rounded w-3/4" />
            <div className="h-4 bg-surface-container-high rounded w-1/2" />
            <div className="h-4 bg-surface-container-high rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderStatsSection = () => (
    <section className="py-8 md:py-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-ambient p-4 md:p-6 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-display-lg text-display-lg text-highlight-gold">{stats.totalBuffets}+</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Premium Buffets</p>
        </div>
        <div className="card-ambient p-4 md:p-6 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-display-lg text-display-lg text-highlight-gold">{stats.totalHotels}+</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Partner Hotels</p>
        </div>
        <div className="card-ambient p-4 md:p-6 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-display-lg text-display-lg text-highlight-gold">{stats.totalReviews.toLocaleString()}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Verified Reviews</p>
        </div>
        <div className="card-ambient p-4 md:p-6 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-display-lg text-display-lg text-highlight-gold">{stats.satisfactionRate}%</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Satisfaction Rate</p>
        </div>
      </div>
    </section>
  );

  const renderHero = () => (
    <section className="relative w-full overflow-hidden" ref={heroRef}>
      <div className="relative h-[540px] md:h-[600px] w-full bg-surface-dim">
        <HeroMediaCarousel settings={settings} />
        <div className="absolute inset-0 bg-gradient-to-t from-text-deep-green/75 via-text-deep-green/35 to-text-deep-green/10 pointer-events-none" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-margin-mobile md:px-margin-desktop">
        <div className="max-w-4xl mx-auto text-center text-surface-cream">
          <div className="animate-fade-in-down">
            <span className="inline-block font-label-md text-label-md uppercase tracking-widest text-highlight-gold mb-4 animate-pulse">
              Premium Hospitality Marketplace
            </span>
            <h1 className="font-display-lg text-display-lg md:text-[56px] leading-tight text-surface-cream mb-4">
              {settings.heroTitle}
            </h1>
            <p className="font-body-lg text-body-lg text-surface-cream/80 max-w-2xl mx-auto mb-8">
              {settings.heroSubtitle}
            </p>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="search-bar flex flex-col md:flex-row items-center gap-4 max-w-5xl mx-auto"
          >
            <div className="search-field">
              <span className="material-symbols-outlined text-on-surface-variant">search</span>
              <div className="flex flex-col w-full text-left">
                <label className="search-field-label">Location</label>
                <input
                  value={search.location}
                  onChange={(e) => setSearch({ ...search, location: e.target.value })}
                  placeholder="Colombo, Galle, Kandy"
                  className="search-field-input"
                />
              </div>
            </div>

            <div className="search-divider" />
            <div className="search-divider-mobile" />

            <div className="search-field">
              <span className="material-symbols-outlined text-on-surface-variant">calendar_month</span>
              <div className="flex flex-col w-full text-left">
                <label className="search-field-label">Date</label>
                <input
                  type="date"
                  value={search.date}
                  onChange={(e) => setSearch({ ...search, date: e.target.value })}
                  className="search-field-input"
                />
              </div>
            </div>

            <div className="search-divider" />
            <div className="search-divider-mobile" />

            <div className="search-field">
              <span className="material-symbols-outlined text-on-surface-variant">restaurant</span>
              <div className="flex flex-col w-full text-left">
                <label className="search-field-label">Meal</label>
                <select
                  value={search.meal}
                  onChange={(e) => {
                    setSearch({ ...search, meal: e.target.value });
                    setActiveCategory(e.target.value);
                  }}
                  className="search-field-input appearance-none cursor-pointer"
                >
                  <option value="">Any</option>
                  <option>Breakfast</option>
                  <option>Lunch</option>
                  <option>Dinner</option>
                  <option>High Tea</option>
                  <option>Seafood</option>
                  <option>Weekend Buffet</option>
                </select>
              </div>
            </div>

            <div className="search-divider" />
            <div className="search-divider-mobile" />

            <div className="search-field">
              <span className="material-symbols-outlined text-on-surface-variant">group</span>
              <div className="flex flex-col w-full text-left">
                <label className="search-field-label">Guests</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={search.guests}
                  onChange={(e) => setSearch({ ...search, guests: e.target.value })}
                  className="search-field-input"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto btn-primary flex items-center justify-center gap-2 group"
            >
              Search
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link
              to="/feed"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface-cream/20 backdrop-blur-sm text-surface-cream font-label-md text-label-md hover:bg-surface-cream/30 transition-all border border-surface-cream/20 hover:scale-105"
            >
              <span className="material-symbols-outlined text-[18px]">rss_feed</span>
              Discover Feed
            </Link>
            <Link
              to="/explore-map"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-transparent text-surface-cream font-label-md text-label-md hover:bg-surface-cream/10 transition-all border border-surface-cream/30 hover:scale-105"
            >
              <span className="material-symbols-outlined text-[18px]">explore</span>
              Explore Map
            </Link>
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-highlight-gold/20 backdrop-blur-sm text-highlight-gold font-label-md text-label-md hover:bg-highlight-gold/30 transition-all border border-highlight-gold/30 hover:scale-105"
            >
              <span className="material-symbols-outlined text-[18px]">list</span>
              View All
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <button
          onClick={() => scrollToSection(featuresRef)}
          className="text-surface-cream/50 hover:text-surface-cream transition-colors"
        >
          <span className="material-symbols-outlined text-3xl">expand_more</span>
        </button>
      </div>
    </section>
  );

  const renderCategoryChips = () => (
    <section className="py-6 md:py-8 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto overflow-x-auto hide-scrollbar">
      <div className="flex gap-3 w-max md:w-full md:flex-wrap">
        {categoryChips.map((chip) => (
          <button
            key={chip.key || "all"}
            type="button"
            onClick={() => handleCategorySelect(chip.key)}
            className={`chip flex items-center gap-2 transition-all duration-300 ${
              activeCategory === chip.key ? "chip-active" : ""
            }`}
          >
            <span className="text-base">{chip.icon}</span>
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  );

  const renderFeaturedBuffets = () => (
    <section className="py-12 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="font-label-md text-label-md text-highlight-gold uppercase tracking-wider">
          Featured This Week
        </span>
        <h2 className="font-headline-lg text-headline-lg text-text-deep-green mt-2 mb-3">
          {settings.featuredSectionTitle}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Hand-picked buffet experiences from Sri Lanka's finest hotels.
        </p>
        <div className="w-20 h-1 bg-highlight-gold mx-auto mt-4 rounded-full" />
      </div>

      {loading ? (
        renderLoadingSkeleton()
      ) : featuredBuffets.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {featuredBuffets.map((buffet, index) => (
            <div
              key={buffet._id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <FeedCard buffet={buffet} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-5xl text-outline mb-3 block">restaurant</span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Featured buffets will appear here once listings are added.
          </p>
          <Link to="/listings" className="btn-secondary inline-flex items-center gap-2 mt-4">
            Browse All Buffets
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      )}
    </section>
  );

  const renderTopRated = () => (
    <section className="py-12 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto bg-surface-container-low/50 rounded-3xl">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="font-label-md text-label-md text-highlight-gold uppercase tracking-wider">
          Top Rated
        </span>
        <h2 className="font-headline-lg text-headline-lg text-text-deep-green mt-2 mb-3">
          Highest Rated Buffets
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Discover the most highly rated buffet experiences by our community.
        </p>
        <div className="w-20 h-1 bg-highlight-gold mx-auto mt-4 rounded-full" />
      </div>

      {loading ? (
        renderLoadingSkeleton()
      ) : topRatedBuffets.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topRatedBuffets.map((buffet) => (
            <Link
              key={buffet._id}
              to={`/buffets/${buffet._id}`}
              className="card-ambient-hover p-4 text-center group"
            >
              <div className="relative h-40 rounded-xl overflow-hidden">
                <img
                  src={buffet.thumbnail || buffet.images?.[0] || "https://images.unsplash.com/photo-1555244162-803834f70033?w=300&h=200&fit=crop"}
                  alt={buffet.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 right-2 bg-highlight-gold text-text-deep-green px-2 py-1 rounded-full text-xs font-bold">
                  ★ {buffet.averageRating?.toFixed(1) || "4.5"}
                </div>
                {buffet.isFeatured && (
                  <div className="absolute top-2 left-2 bg-secondary text-surface-cream px-2 py-1 rounded-full text-xs font-bold">
                    Featured
                  </div>
                )}
              </div>
              <h3 className="font-label-md text-label-md text-text-deep-green mt-3 group-hover:text-secondary transition-colors">
                {buffet.title}
              </h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {buffet.hotel?.hotelName}
              </p>
              <p className="font-headline-md text-headline-md text-highlight-gold mt-2">
                Rs. {Number(buffet.price || 0).toLocaleString()}
              </p>
              <p className="font-label-sm text-label-sm text-secondary mt-1">
                {buffet.totalReviews || 0} reviews
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center font-body-md text-body-md text-on-surface-variant">No top rated buffets available yet.</p>
      )}
    </section>
  );

  const renderLatestBuffets = () => (
    <section className="py-12 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <span className="font-label-md text-label-md text-highlight-gold uppercase tracking-wider">
            New Arrivals
          </span>
          <h2 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">
            Latest Buffet Experiences
          </h2>
        </div>
        <Link to="/listings" className="text-secondary hover:underline font-label-md text-label-md">
          View All →
        </Link>
      </div>

      {loading ? (
        renderLoadingSkeleton()
      ) : latestBuffets.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {latestBuffets.map((buffet) => (
            <Link
              key={buffet._id}
              to={`/buffets/${buffet._id}`}
              className="card-ambient-hover overflow-hidden group"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={buffet.thumbnail || buffet.images?.[0] || "https://images.unsplash.com/photo-1555244162-803834f70033?w=400&h=300&fit=crop"}
                  alt={buffet.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {buffet.isNew && (
                  <span className="absolute top-3 left-3 bg-secondary text-surface-cream px-3 py-1 rounded-full font-label-sm text-label-sm">
                    New
                  </span>
                )}
                {buffet.averageRating > 0 && (
                  <span className="absolute top-3 right-3 bg-surface-cream/90 backdrop-blur-sm px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-highlight-gold">star</span>
                    {buffet.averageRating.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-label-md text-label-md text-text-deep-green group-hover:text-secondary transition-colors">
                  {buffet.title}
                </h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {buffet.hotel?.hotelName}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <p className="font-headline-md text-headline-md text-highlight-gold">
                    Rs. {Number(buffet.price || 0).toLocaleString()}
                  </p>
                  <span className="text-secondary font-label-sm text-label-sm group-hover:translate-x-1 transition-transform">
                    Reserve
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center font-body-md text-body-md text-on-surface-variant">No new buffets available yet.</p>
      )}
    </section>
  );

  const renderWhyDineFor = () => (
    <section className="py-12 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto" ref={featuresRef}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        <div className="card-ambient p-6 md:p-8 hover:shadow-ambient-lg transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-3xl text-highlight-gold">stars</span>
            <span className="font-label-md text-label-md text-highlight-gold uppercase tracking-wider">
              Why DineFor
            </span>
          </div>
          <h2 className="font-headline-md text-headline-md text-text-deep-green mt-2 mb-6">
            For walk-in guests, tourists, and family dining plans
          </h2>
          <div className="space-y-4">
            {[
              { icon: "event_available", title: "Live Slots", desc: "Reserve real buffet time slots with seat availability." },
              { icon: "rate_review", title: "Verified Reviews", desc: "Photos, videos, and booking-based trust." },
              { icon: "qr_code_scanner", title: "QR Check-In", desc: "Hotels can verify bills and prevent duplicate usage." },
              { icon: "shield", title: "Secure Payments", desc: "Your payments are protected end-to-end, every time." },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-4 p-4 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors group">
                <span className="material-symbols-outlined text-2xl text-secondary group-hover:scale-110 transition-transform">
                  {feature.icon}
                </span>
                <div>
                  <h3 className="font-label-md text-label-md text-text-deep-green">{feature.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-ambient p-6 md:p-8 hover:shadow-ambient-lg transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-3xl text-highlight-gold">hotel</span>
            <span className="font-label-md text-label-md text-highlight-gold uppercase tracking-wider">
              Popular Hotels
            </span>
          </div>
          <h2 className="font-headline-md text-headline-md text-text-deep-green mt-2 mb-6">
            Dining partners
          </h2>
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-surface-container-low animate-pulse rounded-xl" />
              ))
            ) : popularHotels.length ? (
              popularHotels.map((hotel) => (
                <Link
                  key={hotel._id}
                  to={`/hotels/${hotel._id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-border-subtle hover:border-secondary hover:bg-surface-container-low transition-all group"
                >
                  <div>
                    <strong className="font-label-md text-label-md text-text-deep-green block group-hover:text-secondary transition-colors">
                      {hotel.hotelName}
                    </strong>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      {hotel.location || hotel.address || "View profile"}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors group-hover:translate-x-1 transition-transform">
                    chevron_right
                  </span>
                </Link>
              ))
            ) : (
              <p className="font-body-md text-body-md text-on-surface-variant py-4">
                Hotels will appear here after buffet listings are added.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  const renderHowItWorks = () => (
    <section className="py-12 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto" ref={stepsRef}>
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="font-label-md text-label-md text-highlight-gold uppercase tracking-wider">
          Simple Process
        </span>
        <h2 className="font-headline-lg text-headline-lg text-text-deep-green mt-2 mb-3">
          How DineFor Works
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          From discovery to check-in, reserving a premium buffet takes minutes.
        </p>
        <div className="w-20 h-1 bg-highlight-gold mx-auto mt-4 rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {howItWorksSteps.map((step, index) => (
          <div
            key={step.title}
            className="card-ambient p-6 text-center hover:shadow-ambient-lg transition-all hover:-translate-y-2 duration-300 group"
          >
            <div className={`w-16 h-16 rounded-full ${step.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
              <span className={`material-symbols-outlined text-3xl ${step.iconColor}`}>
                {step.icon}
              </span>
            </div>
            <span className="inline-block font-headline-md text-headline-md text-highlight-gold opacity-50 mb-2">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green mb-2">
              {step.title}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );

  const renderTrustSafety = () => (
    <section className="py-12 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto bg-primary-container/5 rounded-3xl">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="font-label-md text-label-md text-highlight-gold uppercase tracking-wider">
          Trust &amp; Safety
        </span>
        <h2 className="font-headline-lg text-headline-lg text-surface-cream mt-2 mb-3">
          Booked with confidence, every time
        </h2>
        <p className="font-body-md text-body-md text-on-primary-container">
          Your dining experience is protected by our comprehensive safety measures.
        </p>
        <div className="w-20 h-1 bg-highlight-gold mx-auto mt-4 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {trustPoints.map((point, index) => (
          <div
            key={point.title}
            className="card-ambient p-6 text-center hover:shadow-ambient-lg transition-all hover:-translate-y-2 duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="w-14 h-14 rounded-full bg-secondary-container/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-secondary">
                {point.icon}
              </span>
            </div>
            <h3 className="font-label-md text-label-md text-text-deep-green mb-2">
              {point.title}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {point.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );

  const renderTestimonials = () => (
    <section className="py-12 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto" ref={testimonialsRef}>
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="font-label-md text-label-md text-highlight-gold uppercase tracking-wider">
          Testimonials
        </span>
        <h2 className="font-headline-lg text-headline-lg text-text-deep-green mt-2 mb-3">
          What Our Community Says
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Real experiences from real diners who discovered premium buffets through DineFor.
        </p>
        <div className="w-20 h-1 bg-highlight-gold mx-auto mt-4 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayedTestimonials.map((testimonial) => (
          <div key={testimonial.name} className="card-ambient p-6 hover:shadow-ambient-lg transition-all hover:-translate-y-2 duration-300">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-border-subtle"
              />
              <div>
                <h4 className="font-label-md text-label-md text-text-deep-green">{testimonial.name}</h4>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{testimonial.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-highlight-gold mb-3">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: i < testimonial.rating ? "'FILL' 1" : "'FILL' 0" }}
                >
                  star
                </span>
              ))}
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant italic leading-relaxed">
              "{testimonial.quote}"
            </p>
          </div>
        ))}
      </div>

      {testimonials.length > 3 && (
        <div className="text-center mt-8">
          <button
            onClick={() => setShowAllTestimonials(!showAllTestimonials)}
            className="btn-outline inline-flex items-center gap-2"
          >
            {showAllTestimonials ? "Show Less" : "Read More Testimonials"}
            <span className="material-symbols-outlined text-[18px]">
              {showAllTestimonials ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>
      )}
    </section>
  );

  const renderFaq = () => (
    <section className="py-12 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto" ref={faqRef}>
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="font-label-md text-label-md text-highlight-gold uppercase tracking-wider">
          FAQ
        </span>
        <h2 className="font-headline-lg text-headline-lg text-text-deep-green mt-2 mb-3">
          Frequently Asked Questions
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Find answers to common questions about DineFor and our platform.
        </p>
        <div className="w-20 h-1 bg-highlight-gold mx-auto mt-4 rounded-full" />
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className={`card-ambient overflow-hidden transition-all duration-300 ${
              activeFaq === index ? "border-secondary" : ""
            }`}
          >
            <button
              onClick={() => toggleFaq(index)}
              className="w-full flex justify-between items-center p-4 text-left hover:bg-surface-container-low transition-colors"
            >
              <span className="font-label-md text-label-md text-text-deep-green">{faq.question}</span>
              <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${
                activeFaq === index ? "rotate-180" : ""
              }`}>
                expand_more
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                activeFaq === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="p-4 pt-0 border-t border-border-subtle">
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderHotelPartnerCTA = () => (
    <section className="py-12 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <div className="bg-primary-container rounded-3xl p-8 md:p-12 text-center border border-border-subtle shadow-ambient relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-highlight-gold/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-mint/5 rounded-full -ml-32 -mb-32" />

        <div className="relative z-10">
          <span className="font-label-md text-label-md text-highlight-gold uppercase tracking-wider">
            For Hotels
          </span>
          <h2 className="font-headline-lg text-headline-lg text-surface-cream mt-2 mb-4">
            Fill buffet seats with a visual reservation marketplace.
          </h2>
          <p className="font-body-md text-body-md text-on-primary-container max-w-2xl mx-auto mb-6">
            DineFor helps hotels list buffets, manage time slots, verify QR bills, and grow walk-in dining revenue.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/hotel-apply"
              className="inline-flex items-center gap-2 bg-accent-mint text-text-deep-green px-8 py-3 rounded-full font-label-md text-label-md hover:opacity-90 active:scale-95 transition-all shadow-md hover:shadow-lg"
            >
              Apply as Hotel
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 border border-surface-cream/30 text-surface-cream px-8 py-3 rounded-full font-label-md text-label-md hover:bg-surface-cream/10 transition-all"
            >
              Sign In
              <span className="material-symbols-outlined text-[18px]">login</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );

  const renderNewsletter = () => (
    <section className="py-12 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <div className="card-ambient p-8 md:p-12 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="material-symbols-outlined text-4xl text-highlight-gold mb-3 block">mail</span>
          <h2 className="font-headline-lg text-headline-lg text-text-deep-green mb-2">
            Stay Updated
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6">
            Subscribe to our newsletter for exclusive buffet deals, new hotel partners, and dining experiences.
          </p>

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={emailSubscribe}
              onChange={(e) => setEmailSubscribe(e.target.value)}
              placeholder="Enter your email"
              className="form-input flex-1"
              required
            />
            <button
              type="submit"
              disabled={subscribeLoading}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {subscribeLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-surface-cream border-t-transparent" />
                  Subscribing...
                </>
              ) : (
                <>
                  Subscribe
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </>
              )}
            </button>
          </form>

          {subscribeMessage && (
            <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
              subscribeMessage.includes("✅")
                ? "bg-secondary-container/30 text-secondary"
                : "bg-error/10 text-error"
            }`}>
              {subscribeMessage}
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const renderFinalCTA = () => (
    <section className="py-16 md:py-20 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto text-center">
      <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 bg-highlight-gold/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <h2 className="font-headline-lg text-headline-lg text-text-deep-green mb-4">
            Your next great buffet is one reservation away.
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-8">
            Join DineFor and discover premium hotel dining across Sri Lanka.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 bg-text-deep-green text-surface-cream px-8 py-3 rounded-full font-label-md text-label-md hover:opacity-90 active:scale-95 transition-all shadow-md hover:shadow-lg"
            >
              Browse Buffets
              <span className="material-symbols-outlined text-[18px]">restaurant</span>
            </Link>
            <Link
              to="/hotel-apply"
              className="inline-flex items-center gap-2 border border-border-subtle bg-surface-container-lowest text-text-deep-green px-8 py-3 rounded-full font-label-md text-label-md hover:border-secondary hover:bg-surface-container-low transition-all"
            >
              Partner With Us
              <span className="material-symbols-outlined text-[18px]">handshake</span>
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 btn-secondary"
            >
              Create Account
              <span className="material-symbols-outlined text-[18px]">person_add</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-16 md:pt-20">
      {renderHero()}
      {renderStatsSection()}
      {renderCategoryChips()}
      {renderFeaturedBuffets()}
      {renderTopRated()}
      {renderLatestBuffets()}
      {renderWhyDineFor()}
      {renderHowItWorks()}
      {renderTrustSafety()}
      {renderTestimonials()}
      {renderFaq()}
      {renderHotelPartnerCTA()}
      {renderNewsletter()}
      {renderFinalCTA()}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 z-50 w-12 h-12 rounded-full bg-secondary text-surface-cream shadow-lg hover:bg-secondary/80 transition-all hover:scale-110 active:scale-95"
        >
          <span className="material-symbols-outlined">arrow_upward</span>
        </button>
      )}
    </main>
  );
}

export default Home;