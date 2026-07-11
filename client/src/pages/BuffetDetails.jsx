import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import ReviewForm from "../components/reviews/ReviewForm";
import ReviewList from "../components/reviews/ReviewList";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

const fallbackImage = "https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&q=80";

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const resolveMedia = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    if (value.startsWith("/uploads")) return `${API_ORIGIN}${value}`;
    if (value.startsWith("uploads")) return `${API_ORIGIN}/${value}`;
    return value;
  }
  return value.url || value.path || value.secure_url || "";
};

const formatPrice = (value) => `Rs. ${Number(value || 0).toLocaleString("en-LK")}`;

const buildGallery = (buffet) => {
  const raw = [
    buffet?.thumbnail,
    ...(buffet?.images || []),
    ...(buffet?.gallery || []),
    buffet?.hotel?.coverImage,
    buffet?.hotel?.coverPhoto,
    ...(buffet?.hotel?.images || []),
    ...(buffet?.hotel?.gallery || []),
  ];
  const unique = [];
  raw.map(resolveMedia).filter(Boolean).forEach((item) => {
    if (!unique.includes(item)) unique.push(item);
  });
  return unique.length ? unique : [fallbackImage];
};

const getUrgencyLabel = (slot) => {
  const seats = Number(slot?.availableSeats || 0);
  if (seats <= 0) return { label: "Sold Out", tone: "danger", emoji: "⛔" };
  if (seats <= 3) return { label: `Only ${seats} seats left!`, tone: "hot", emoji: "🔥" };
  if (seats <= 8) return { label: `${seats} seats available`, tone: "warning", emoji: "🟡" };
  if (seats <= 15) return { label: `${seats} seats available`, tone: "good", emoji: "✅" };
  return { label: "Plenty of seats", tone: "excellent", emoji: "✅" };
};

const getMealEmoji = (category) => {
  const map = {
    seafood: "🦐",
    bbq: "🔥",
    lunch: "🍽️",
    dinner: "🌙",
    "high-tea": "🫖",
    brunch: "🥐",
    luxury: "💎",
    family: "👨‍👩‍👧",
    vegetarian: "🥗",
    halal: "🕌",
    international: "🌍",
  };
  return map[category?.toLowerCase()] || "🍽️";
};

function BuffetDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingRef = useRef(null);
  const galleryRef = useRef(null);

  const [buffet, setBuffet] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [similarBuffets, setSimilarBuffets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [seats, setSeats] = useState(1);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Fetch buffet data
  const fetchBuffet = useCallback(async () => {
    try {
      const res = await api.get(`/buffets/${id}`);
      setBuffet(res.data);

      if (res.data.specialDate) {
        setSelectedDate(toDateInput(res.data.specialDate));
      } else {
        setSelectedDate((current) => current || toDateInput(res.data.availableFromDate) || new Date().toISOString().slice(0, 10));
      }
    } catch (error) {
      console.error("Error fetching buffet:", error);
      setBuffet(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    try {
      const res = await api.get(`/reviews/buffet/${id}`);
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]);
    }
  }, [id]);

  // Fetch similar buffets
  const fetchSimilarBuffets = useCallback(async () => {
    try {
      const res = await api.get("/buffets");
      const items = Array.isArray(res.data) ? res.data : res.data?.buffets || [];
      setSimilarBuffets(items.filter((item) => item._id !== id).slice(0, 6));
    } catch (error) {
      console.error("Error fetching similar buffets:", error);
      setSimilarBuffets([]);
    }
  }, [id]);

  // Fetch availability
  const fetchAvailability = useCallback(async (dateValue) => {
    if (!dateValue) return;
    setAvailabilityLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const res = await api.get(`/bookings/availability/${id}?date=${dateValue}`);
      setAvailability(res.data);

      const firstAvailableSlot = res.data.slots?.find((slot) => Number(slot.availableSeats) > 0) || res.data.slots?.[0];
      setSelectedSlotId((current) => {
        const currentStillExists = res.data.slots?.some((slot) => slot._id === current && Number(slot.availableSeats) > 0);
        return currentStillExists ? current : firstAvailableSlot?._id || "";
      });
    } catch (error) {
      console.error("Error fetching availability:", error);
      setAvailability({
        isAvailableDate: false,
        message: error.response?.data?.message || "Seat availability could not be loaded.",
        slots: [],
      });
      setSelectedSlotId("");
    } finally {
      setAvailabilityLoading(false);
    }
  }, [id]);

  // Initial data fetch
  useEffect(() => {
    fetchBuffet();
    fetchReviews();
    fetchSimilarBuffets();
  }, [fetchBuffet, fetchReviews, fetchSimilarBuffets]);

  // Fetch availability when date changes
  useEffect(() => {
    if (selectedDate) fetchAvailability(selectedDate);
  }, [selectedDate, fetchAvailability, id]);

  // Sticky booking card observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-100px 0px 0px 0px" }
    );

    if (bookingRef.current) {
      observer.observe(bookingRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Memoized values
  const gallery = useMemo(() => buildGallery(buffet), [buffet]);
  const availabilitySlots = availability?.slots || [];
  const selectedSlot = availabilitySlots.find((slot) => slot._id === selectedSlotId);
  const urgency = getUrgencyLabel(selectedSlot);
  const rating = Number(buffet?.averageRating || 0);
  const reviewCount = Number(buffet?.totalReviews || reviews.length || 0);
  const experienceScore = Math.min(9.8, Math.max(7.2, rating ? rating * 1.9 : 8.6)).toFixed(1);
  const hasSlots = Boolean(availabilitySlots.length);

  const dateWindow = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (!buffet) return { min: today, max: "" };
    if (buffet.buffetType === "special") {
      const special = toDateInput(buffet.specialDate);
      return { min: special || today, max: special || "" };
    }
    return {
      min: toDateInput(buffet.availableFromDate) || today,
      max: toDateInput(buffet.availableToDate) || "",
    };
  }, [buffet]);

  const totals = useMemo(() => {
    const subtotal = Number(buffet?.price || 0) * Number(seats || 1);
    return { subtotal, total: subtotal };
  }, [buffet?.price, seats]);

  const mealEmoji = useMemo(() => getMealEmoji(buffet?.category), [buffet?.category]);

  // Handle booking
  const handleBooking = useCallback(async () => {
    setMessage("");
    setMessageType("");
    const storedUser = JSON.parse(localStorage.getItem("dineforUser") || "null");

    if (!storedUser) {
      setMessage("Please login to make a reservation.");
      setMessageType("error");
      navigate("/login");
      return;
    }

    if (!selectedDate || !selectedSlotId || !hasSlots) {
      setMessage("Please select an available date and time slot before reserving.");
      setMessageType("error");
      return;
    }

    if (!selectedSlot || Number(selectedSlot.availableSeats) <= 0) {
      setMessage("This selected slot is fully booked. Please select another slot.");
      setMessageType("error");
      return;
    }

    if (Number(seats) > Number(selectedSlot.availableSeats)) {
      setMessage(`Only ${selectedSlot.availableSeats} seats are available for this date and time.`);
      setMessageType("error");
      return;
    }

    setBookingLoading(true);
    try {
      const res = await api.post(
        "/bookings",
        {
          buffetId: buffet._id,
          selectedDate,
          slotId: selectedSlotId,
          seats: Number(seats),
        },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );

      setMessage(res.data.message || "Reservation confirmed! 🎉");
      setMessageType("success");
      await fetchAvailability(selectedDate);
      await fetchBuffet();
      setTimeout(() => navigate("/my-bookings"), 700);
    } catch (error) {
      setMessage(error.response?.data?.message || "Booking failed. Please try again.");
      setMessageType("error");
      await fetchAvailability(selectedDate);
    } finally {
      setBookingLoading(false);
    }
  }, [selectedDate, selectedSlotId, hasSlots, selectedSlot, seats, buffet, navigate, fetchAvailability, fetchBuffet]);

  // Handle lightbox navigation
  const handleLightboxPrev = useCallback((e) => {
    e.stopPropagation();
    setActiveImage((prev) => (prev > 0 ? prev - 1 : gallery.length - 1));
  }, [gallery.length]);

  const handleLightboxNext = useCallback((e) => {
    e.stopPropagation();
    setActiveImage((prev) => (prev < gallery.length - 1 ? prev + 1 : 0));
  }, [gallery.length]);

  // Loading state
  if (loading) {
    return (
      <main className="buffet-details-page">
        <div className="details-loading">
          <div className="skeleton" style={{ width: "100%", height: "60vh" }} />
          <div className="details-loading-content">
            <div className="skeleton" style={{ width: "60%", height: 40 }} />
            <div className="skeleton" style={{ width: "40%", height: 20 }} />
            <div className="skeleton" style={{ width: "100%", height: 200 }} />
          </div>
        </div>
      </main>
    );
  }

  if (!buffet) {
    return (
      <main className="buffet-details-page">
        <div className="details-error">
          <span className="error-icon">😕</span>
          <h2>Buffet Not Found</h2>
          <p>The buffet you're looking for doesn't exist or has been removed.</p>
          <Link to="/feed" className="btn primary">Browse Buffets</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="buffet-details-page">
      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="details-hero">
        <div className="details-hero-background">
          <img
            src={gallery[activeImage] || fallbackImage}
            alt={buffet.title}
            loading="eager"
          />
          <div className="hero-overlay" />
        </div>

        <div className="details-hero-content">
          <div className="hero-breadcrumb">
            <Link to="/feed">← Back to Discover</Link>
            <span className="separator">/</span>
            <span>{buffet.category || "Buffet"}</span>
          </div>

          <div className="hero-main">
            <div className="hero-text">
              <div className="hero-badges">
                <span className="hero-badge category">
                  {mealEmoji} {buffet.category || "Premium Buffet"}
                </span>
                {buffet.isFeatured && (
                  <span className="hero-badge featured">⭐ Featured</span>
                )}
                {buffet.buffetType === "special" && (
                  <span className="hero-badge special">✨ Special Event</span>
                )}
              </div>
              <h1 className="hero-title">{buffet.title}</h1>
              <div className="hero-meta">
                <Link to={`/hotels/${buffet.hotel?._id}`} className="hotel-link">
                  🏨 {buffet.hotel?.hotelName || "Hotel Partner"}
                </Link>
                <span className="meta-divider">•</span>
                <span className="meta-rating">
                  ⭐ {rating.toFixed(1)} ({reviewCount} reviews)
                </span>
                <span className="meta-divider">•</span>
                <span className="meta-location">
                  📍 {buffet.hotel?.city || buffet.location?.city || "Sri Lanka"}
                </span>
              </div>
              <p className="hero-description">
                {buffet.description || "A premium hotel buffet experience selected for DineFor guests."}
              </p>
            </div>

            <div className="hero-score-card">
              <span className="score-label">Experience Score</span>
              <strong className="score-value">{experienceScore}</strong>
              <div className="score-bar">
                <div className="score-fill" style={{ width: `${(Number(experienceScore) / 10) * 100}%` }} />
              </div>
              <small className="score-sub">
                Based on ratings, availability & popularity
              </small>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          GALLERY SECTION
          ============================================ */}
      <section className="details-gallery" ref={galleryRef}>
        <div className="gallery-main">
          <button
            className="gallery-main-image"
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Open gallery"
          >
            <img
              src={gallery[activeImage] || fallbackImage}
              alt={buffet.title}
              loading="lazy"
            />
            <span className="gallery-view-btn">
              <span className="view-icon">🔍</span> View Gallery
            </span>
          </button>
        </div>

        <div className="gallery-thumbs">
          {gallery.slice(0, 6).map((img, index) => (
            <button
              key={`${img}-${index}`}
              type="button"
              className={`thumb-btn ${index === activeImage ? "active" : ""}`}
              onClick={() => setActiveImage(index)}
              aria-label={`View image ${index + 1}`}
            >
              <img src={img} alt={`${buffet.title} ${index + 1}`} loading="lazy" />
              {index === 5 && gallery.length > 6 && (
                <span className="thumb-overlay">+{gallery.length - 6}</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ============================================
          CONTENT & BOOKING GRID
          ============================================ */}
      <div className="details-content-grid" ref={bookingRef}>
        <div className="details-main-content">
          {/* Live Availability */}
          <section className="details-card live-card">
            <div className="live-card-header">
              <div>
                <span className="card-badge">📡 Live Availability</span>
                <h2>{urgency.emoji} {urgency.label}</h2>
                <p>Choose your date, time, and guest count to reserve instantly.</p>
              </div>
              <span className={`availability-pill ${urgency.tone}`}>
                {urgency.emoji} {urgency.label}
              </span>
            </div>
          </section>

          {/* Buffet Details */}
          <section className="details-card">
            <span className="card-badge">About This Buffet</span>
            <h2>What to Expect</h2>
            <div className="details-feature-grid">
              <div className="feature-item">
                <span className="feature-icon">{mealEmoji}</span>
                <span className="feature-label">{buffet.category || "Premium"}</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🏨</span>
                <span className="feature-label">{buffet.buffetType || "Regular"} Buffet</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⭐</span>
                <span className="feature-label">{rating.toFixed(1)} Guest Rating</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💳</span>
                <span className="feature-label">Pay at Hotel</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📱</span>
                <span className="feature-label">QR Reservation Bill</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🛡</span>
                <span className="feature-label">Verified Hotel</span>
              </div>
            </div>
          </section>

          {/* Hotel Preview */}
          {buffet.hotel && (
            <section className="details-card hotel-preview">
              <div className="hotel-preview-header">
                <div>
                  <span className="card-badge">🏨 Hotel Partner</span>
                  <h2>{buffet.hotel.hotelName}</h2>
                </div>
                {buffet.hotel._id && (
                  <Link to={`/hotels/${buffet.hotel._id}`} className="btn secondary btn-sm">
                    View Hotel →
                  </Link>
                )}
              </div>
              <p className="hotel-description">
                {buffet.hotel.description ||
                  `${buffet.hotel.hotelName} offers exceptional dining experiences. View the full hotel profile for gallery, reviews, and more buffet offers.`}
              </p>
              <div className="hotel-quick-info">
                {buffet.hotel.city && (
                  <span className="quick-info">📍 {buffet.hotel.city}</span>
                )}
                {buffet.hotel.contactNumber && (
                  <span className="quick-info">📞 {buffet.hotel.contactNumber}</span>
                )}
                {buffet.hotel.averageRating > 0 && (
                  <span className="quick-info">⭐ {Number(buffet.hotel.averageRating).toFixed(1)}</span>
                )}
              </div>
            </section>
          )}

          {/* Reviews Section */}
          <section className="details-card reviews-section">
            <div className="reviews-header">
              <div>
                <span className="card-badge">💬 Guest Feedback</span>
                <h2>Ratings & Reviews</h2>
              </div>
              <div className="reviews-summary-stats">
                <span className="big-rating">⭐ {rating.toFixed(1)}</span>
                <span className="review-count-text">{reviewCount} reviews</span>
              </div>
            </div>

            {/* Rating Breakdown */}
            <div className="rating-breakdown">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((r) => Math.floor(r.rating || 0) === star).length;
                const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                return (
                  <div key={star} className="rating-row">
                    <span className="rating-star">{star}★</span>
                    <div className="rating-bar">
                      <div className="rating-fill" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="rating-count">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Review Form */}
            <ReviewForm buffetId={buffet._id} onReviewCreated={() => { fetchReviews(); fetchBuffet(); }} />

            {/* Review List */}
            <ReviewList
              reviews={showAllReviews ? reviews : reviews.slice(0, 3)}
              totalReviews={reviews.length}
              onShowAll={() => setShowAllReviews(true)}
              showAll={showAllReviews}
            />
          </section>

          {/* Similar Buffets */}
          {similarBuffets.length > 0 && (
            <section className="details-card similar-section">
              <span className="card-badge">✨ You May Also Like</span>
              <h2>Similar Buffet Experiences</h2>
              <div className="similar-grid">
                {similarBuffets.map((item) => (
                  <Link
                    key={item._id}
                    to={`/buffets/${item._id}`}
                    className="similar-card"
                  >
                    <img
                      src={resolveMedia(item.thumbnail || item.images?.[0]) || fallbackImage}
                      alt={item.title}
                      loading="lazy"
                    />
                    <div className="similar-card-content">
                      <h3>{item.title}</h3>
                      <p className="similar-hotel">{item.hotel?.hotelName || "Hotel"}</p>
                      <span className="similar-price">{formatPrice(item.price)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ============================================
            STICKY BOOKING CARD
            ============================================ */}
        <aside className={`details-booking-card ${isSticky ? "sticky" : ""}`}>
          <div className="booking-card-inner">
            <div className="booking-price">
              <strong className="price">{formatPrice(buffet.price)}</strong>
              <span className="price-unit">/ person</span>
            </div>

            {/* Date Selection */}
            <div className="booking-field">
              <label htmlFor="booking-date">📅 Select Date</label>
              <input
                id="booking-date"
                type="date"
                value={selectedDate}
                min={dateWindow.min}
                max={dateWindow.max}
                onChange={(e) => setSelectedDate(e.target.value)}
                readOnly={buffet.buffetType === "special"}
                className="booking-input"
              />
            </div>

            {/* Loading / Error */}
            {availabilityLoading && (
              <div className="booking-loading">Checking live seats...</div>
            )}
            {availability && !availability.isAvailableDate && (
              <div className="booking-error">{availability.message}</div>
            )}

            {/* Time Slots */}
            <div className="booking-field">
              <label>⏰ Select Time Slot</label>
              <div className="slot-list">
                {hasSlots ? (
                  availabilitySlots.map((slot) => {
                    const isAvailable = Number(slot.availableSeats) > 0;
                    const isSelected = slot._id === selectedSlotId;
                    return (
                      <button
                        key={slot._id}
                        type="button"
                        disabled={!isAvailable}
                        className={`slot-btn ${isSelected ? "active" : ""} ${!isAvailable ? "disabled" : ""}`}
                        onClick={() => setSelectedSlotId(slot._id)}
                      >
                        <span className="slot-time">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <span className="slot-seats">
                          {slot.availableSeats}/{slot.totalSeats} seats
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="slot-error">No time slots available for this date.</p>
                )}
              </div>
            </div>

            {/* Guest Stepper */}
            <div className="booking-field">
              <label>👥 Number of Guests</label>
              <div className="guest-stepper">
                <button
                  type="button"
                  onClick={() => setSeats((value) => Math.max(1, Number(value) - 1))}
                  className="stepper-btn"
                  aria-label="Decrease guests"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={selectedSlot?.availableSeats || 1}
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  className="guest-input"
                  aria-label="Number of guests"
                />
                <button
                  type="button"
                  onClick={() => setSeats((value) => Math.min(Number(selectedSlot?.availableSeats || 1), Number(value) + 1))}
                  className="stepper-btn"
                  aria-label="Increase guests"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="price-breakdown">
              <div className="breakdown-row">
                <span>Subtotal</span>
                <strong>{formatPrice(totals.subtotal)}</strong>
              </div>
              <div className="breakdown-row">
                <span>Service Charge</span>
                <strong>{formatPrice(0)}</strong>
              </div>
              <div className="breakdown-row">
                <span>Tax</span>
                <strong>{formatPrice(0)}</strong>
              </div>
              <div className="breakdown-total">
                <span>Total</span>
                <strong>{formatPrice(totals.total)}</strong>
              </div>
            </div>

            {/* Reserve Button */}
            <button
              className="reserve-btn"
              type="button"
              onClick={handleBooking}
              disabled={bookingLoading || !selectedSlot || Number(selectedSlot.availableSeats) <= 0}
            >
              {bookingLoading ? (
                <>
                  <span className="spinner" />
                  Reserving...
                </>
              ) : (
                "Reserve Buffet"
              )}
            </button>

            <p className="booking-note">
              You will receive a DineFor QR bill after reservation.
            </p>

            {/* Message */}
            {message && (
              <div className={`booking-message ${messageType}`}>
                {message}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ============================================
          MOBILE RESERVE BUTTON (Floating)
          ============================================ */}
      <button
        className="mobile-reserve-btn"
        type="button"
        onClick={() => bookingRef.current?.scrollIntoView({ behavior: "smooth" })}
        aria-label="Scroll to booking"
      >
        Reserve • {formatPrice(buffet.price)}
      </button>

      {/* ============================================
          LIGHTBOX
          ============================================ */}
      {lightboxOpen && (
        <div className="lightbox" onClick={() => setLightboxOpen(false)}>
          <button
            className="lightbox-close"
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            ×
          </button>

          <button
            className="lightbox-nav prev"
            type="button"
            onClick={handleLightboxPrev}
            aria-label="Previous image"
          >
            ‹
          </button>

          <button
            className="lightbox-nav next"
            type="button"
            onClick={handleLightboxNext}
            aria-label="Next image"
          >
            ›
          </button>

          <div className="lightbox-image-container">
            <img
              src={gallery[activeImage] || fallbackImage}
              alt={`${buffet.title} - Image ${activeImage + 1}`}
            />
          </div>

          <div className="lightbox-counter">
            {activeImage + 1} / {gallery.length}
          </div>

          <div className="lightbox-thumbs">
            {gallery.map((img, index) => (
              <button
                key={`lightbox-${index}`}
                type="button"
                className={`lightbox-thumb ${index === activeImage ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImage(index);
                }}
                aria-label={`Go to image ${index + 1}`}
              >
                <img src={img} alt="" />
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

export default BuffetDetails;