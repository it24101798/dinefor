import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import ReviewForm from "../components/reviews/ReviewForm";
import ReviewList from "../components/reviews/ReviewList";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

const fallbackImage = "https://images.unsplash.com/photo-1555244162-803834f70033";

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
  if (seats <= 0) return { label: "Sold out", tone: "danger" };
  if (seats <= 5) return { label: `Only ${seats} seats left`, tone: "hot" };
  if (seats <= 15) return { label: `${seats} seats left`, tone: "warning" };
  return { label: `${seats} seats available`, tone: "good" };
};

function BuffetDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

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
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchBuffet = async () => {
    try {
      const res = await api.get(`/buffets/${id}`);
      setBuffet(res.data);

      if (res.data.specialDate) {
        setSelectedDate(toDateInput(res.data.specialDate));
      } else {
        setSelectedDate((current) => current || toDateInput(res.data.availableFromDate) || new Date().toISOString().slice(0, 10));
      }
    } catch (error) {
      console.log(error);
      setBuffet(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/reviews/buffet/${id}`);
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.log(error);
      setReviews([]);
    }
  };

  const fetchSimilarBuffets = async () => {
    try {
      const res = await api.get("/buffets");
      const items = Array.isArray(res.data) ? res.data : res.data?.buffets || [];
      setSimilarBuffets(items.filter((item) => item._id !== id).slice(0, 4));
    } catch (error) {
      console.log(error);
      setSimilarBuffets([]);
    }
  };

  const fetchAvailability = async (dateValue) => {
    if (!dateValue) return;
    setAvailabilityLoading(true);
    setMessage("");

    try {
      const res = await api.get(`/bookings/availability/${id}?date=${dateValue}`);
      setAvailability(res.data);

      const firstAvailableSlot = res.data.slots?.find((slot) => Number(slot.availableSeats) > 0) || res.data.slots?.[0];
      setSelectedSlotId((current) => {
        const currentStillExists = res.data.slots?.some((slot) => slot._id === current && Number(slot.availableSeats) > 0);
        return currentStillExists ? current : firstAvailableSlot?._id || "";
      });
    } catch (error) {
      console.log(error);
      setAvailability({ isAvailableDate: false, message: error.response?.data?.message || "Seat availability could not be loaded.", slots: [] });
      setSelectedSlotId("");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  useEffect(() => {
    fetchBuffet();
    fetchReviews();
    fetchSimilarBuffets();

    const storedUser = JSON.parse(localStorage.getItem("dineforUser") || "null");
    if (storedUser?.token && id) {
      api.put(`/discovery/recently-viewed/${id}`).catch(() => {
        // non-blocking customer history feature; never break buffet details loading
      });
    }
  }, [id]);

  useEffect(() => {
    if (selectedDate) fetchAvailability(selectedDate);
  }, [selectedDate, id]);

  const gallery = useMemo(() => buildGallery(buffet), [buffet]);
  const availabilitySlots = availability?.slots || [];
  const selectedSlot = availabilitySlots.find((slot) => slot._id === selectedSlotId);
  const hasSlots = Boolean(availabilitySlots.length);
  const urgency = getUrgencyLabel(selectedSlot);
  const rating = Number(buffet?.averageRating || 0);
  const reviewCount = Number(buffet?.totalReviews || reviews.length || 0);
  const experienceScore = Math.min(9.8, Math.max(7.2, rating ? rating * 1.9 : 8.6)).toFixed(1);

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

  const handleBooking = async () => {
    setMessage("");
    const storedUser = JSON.parse(localStorage.getItem("dineforUser") || "null");

    if (!storedUser) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    if (!selectedDate || !selectedSlotId || !hasSlots) {
      setMessage("Please select an available date and time slot before reserving.");
      return;
    }

    if (!selectedSlot || Number(selectedSlot.availableSeats) <= 0) {
      setMessage("This selected slot is fully booked. Please select another slot.");
      return;
    }

    if (Number(seats) > Number(selectedSlot.availableSeats)) {
      setMessage(`Only ${selectedSlot.availableSeats} seats are available for this date and time.`);
      return;
    }

    setBookingLoading(true);
    try {
      const res = await api.post(
        "/bookings",
        { buffetId: buffet._id, selectedDate, slotId: selectedSlotId, seats: Number(seats) },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );

      setMessage(res.data.message || "Reservation confirmed ✅");
      await fetchAvailability(selectedDate);
      await fetchBuffet();
      setTimeout(() => navigate("/my-bookings"), 700);
    } catch (error) {
      setMessage(error.response?.data?.message || "Booking failed");
      await fetchAvailability(selectedDate);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <main className="stitch-buffet-page"><div className="stitch-loading-card">Loading buffet experience...</div></main>;
  }

  if (!buffet) {
    return <main className="stitch-buffet-page"><div className="stitch-loading-card">Buffet not found.</div></main>;
  }

  return (
    <main className="stitch-buffet-page">
      <section className="stitch-buffet-hero">
        <div className="stitch-hero-copy">
          <p className="stitch-kicker">Curated buffet experience</p>
          <h1>{buffet.title}</h1>
          <div className="stitch-hero-meta">
            <Link to={`/hotels/${buffet.hotel?._id}`} className="stitch-hotel-link">{buffet.hotel?.hotelName || "Hotel partner"}</Link>
            <span>⭐ {rating.toFixed(1)} ({reviewCount} reviews)</span>
            <span>📍 {buffet.hotel?.location || buffet.location?.city || "Sri Lanka"}</span>
          </div>
          <p>{buffet.description || "A premium hotel buffet experience selected for DineFor guests."}</p>
        </div>
        <div className="stitch-score-card">
          <span>Experience Score</span>
          <strong>{experienceScore}</strong>
          <small>Based on ratings, availability and popularity</small>
        </div>
      </section>

      <section className="stitch-gallery-shell">
        <button className="stitch-main-media" type="button" onClick={() => setLightboxOpen(true)}>
          <img src={gallery[activeImage] || fallbackImage} alt={buffet.title} />
          <span className="stitch-view-photos">View gallery</span>
        </button>
        <div className="stitch-thumbs">
          {gallery.slice(0, 5).map((img, index) => (
            <button key={img + index} type="button" className={index === activeImage ? "active" : ""} onClick={() => setActiveImage(index)}>
              <img src={img} alt={`${buffet.title} ${index + 1}`} />
            </button>
          ))}
        </div>
      </section>

      <div className="stitch-content-grid">
        <div className="stitch-main-content">
          <section className="stitch-info-card stitch-live-card">
            <div>
              <p className="stitch-kicker">Live availability</p>
              <h2>{urgency.label}</h2>
              <p>Choose your date, time, and guest count to reserve instantly.</p>
            </div>
            <span className={`stitch-availability-pill ${urgency.tone}`}>{urgency.label}</span>
          </section>

          <section className="stitch-info-card">
            <p className="stitch-kicker">Buffet details</p>
            <h2>What to expect</h2>
            <div className="stitch-feature-grid">
              <span>🍽 {buffet.category || "Premium buffet"}</span>
              <span>🏨 {buffet.buffetType || "Regular"} buffet</span>
              <span>⭐ {rating.toFixed(1)} guest rating</span>
              <span>💳 Pay at hotel available</span>
              <span>📱 QR reservation bill</span>
              <span>🛡 Verified hotel workflow</span>
            </div>
          </section>

          <section className="stitch-info-card">
            <div className="stitch-section-head">
              <div>
                <p className="stitch-kicker">Hotel preview</p>
                <h2>{buffet.hotel?.hotelName || "Hotel partner"}</h2>
              </div>
              {buffet.hotel?._id && <Link to={`/hotels/${buffet.hotel._id}`} className="stitch-outline-btn">View hotel</Link>}
            </div>
            <p>{buffet.hotel?.description || "View the full hotel profile for gallery, reviews, directions, amenities and more buffet offers."}</p>
          </section>

          <section className="stitch-info-card">
            <div className="stitch-section-head">
              <div>
                <p className="stitch-kicker">Guest reviews</p>
                <h2>Ratings & customer photos</h2>
              </div>
              <strong className="stitch-rating-large">⭐ {rating.toFixed(1)}</strong>
            </div>
            <div className="stitch-review-summary">
              {[5, 4, 3, 2, 1].map((star, index) => (
                <div key={star}>
                  <span>{star}★</span>
                  <div><i style={{ width: `${Math.max(8, 80 - index * 16)}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="reviews-layout stitch-reviews-wrap">
              <ReviewForm buffetId={buffet._id} onReviewCreated={() => { fetchReviews(); fetchBuffet(); }} />
              <ReviewList reviews={reviews} />
            </div>
          </section>

          {similarBuffets.length > 0 && (
            <section className="stitch-info-card">
              <p className="stitch-kicker">Similar experiences</p>
              <h2>You may also like</h2>
              <div className="stitch-similar-grid">
                {similarBuffets.map((item) => (
                  <Link key={item._id} to={`/buffets/${item._id}`} className="stitch-similar-card">
                    <img src={resolveMedia(item.thumbnail || item.images?.[0]) || fallbackImage} alt={item.title} />
                    <strong>{item.title}</strong>
                    <span>{formatPrice(item.price)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="stitch-booking-card">
          <div className="stitch-booking-price">
            <strong>{formatPrice(buffet.price)}</strong>
            <span>/ person</span>
          </div>

          <label>Date</label>
          <input type="date" value={selectedDate} min={dateWindow.min} max={dateWindow.max} onChange={(e) => setSelectedDate(e.target.value)} readOnly={buffet.buffetType === "special"} />

          {availabilityLoading && <p className="stitch-muted">Checking live seats...</p>}
          {availability && !availability.isAvailableDate && <p className="stitch-error">{availability.message}</p>}

          <label>Time slot</label>
          <div className="stitch-slot-list">
            {hasSlots ? availabilitySlots.map((slot) => (
              <button key={slot._id} type="button" disabled={Number(slot.availableSeats) <= 0} className={slot._id === selectedSlotId ? "active" : ""} onClick={() => setSelectedSlotId(slot._id)}>
                <span>{slot.startTime} - {slot.endTime}</span>
                <small>{slot.availableSeats}/{slot.totalSeats} seats</small>
              </button>
            )) : <p className="stitch-error">No time slots available for this date.</p>}
          </div>

          <label>Guests</label>
          <div className="stitch-guest-stepper">
            <button type="button" onClick={() => setSeats((value) => Math.max(1, Number(value) - 1))}>−</button>
            <input type="number" min="1" max={selectedSlot?.availableSeats || 1} value={seats} onChange={(e) => setSeats(e.target.value)} />
            <button type="button" onClick={() => setSeats((value) => Math.min(Number(selectedSlot?.availableSeats || 1), Number(value) + 1))}>+</button>
          </div>

          <div className="stitch-price-breakdown">
            <div><span>Subtotal</span><strong>{formatPrice(totals.subtotal)}</strong></div>
            <div><span>Service charge</span><strong>{formatPrice(0)}</strong></div>
            <div><span>Tax</span><strong>{formatPrice(0)}</strong></div>
            <div className="total"><span>Total</span><strong>{formatPrice(totals.total)}</strong></div>
          </div>

          <button className="stitch-reserve-btn" type="button" onClick={handleBooking} disabled={bookingLoading || !selectedSlot || Number(selectedSlot.availableSeats) <= 0}>
            {bookingLoading ? "Reserving..." : "Reserve Buffet"}
          </button>
          <p className="stitch-muted">You will receive a DineFor QR bill after reservation.</p>
          {message && <p className={message.toLowerCase().includes("success") || message.toLowerCase().includes("confirmed") || message.toLowerCase().includes("created") ? "stitch-success" : "stitch-error"}>{message}</p>}
        </aside>
      </div>

      <button className="stitch-mobile-reserve" type="button" onClick={() => document.querySelector(".stitch-booking-card")?.scrollIntoView({ behavior: "smooth" })}>
        Reserve • {formatPrice(buffet.price)}
      </button>

      {lightboxOpen && (
        <div className="stitch-lightbox" onClick={() => setLightboxOpen(false)}>
          <button type="button" onClick={() => setLightboxOpen(false)}>×</button>
          <img src={gallery[activeImage] || fallbackImage} alt={buffet.title} />
        </div>
      )}
    </main>
  );
}

export default BuffetDetails;
