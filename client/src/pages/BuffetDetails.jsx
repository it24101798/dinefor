import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { resolveMediaUrl } from "../services/api";
import ReviewForm from "../components/reviews/ReviewForm";
import ReviewList from "../components/reviews/ReviewList";


const fallbackImage = "https://images.unsplash.com/photo-1555244162-803834f70033";

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const resolveMedia = (value) => {
  if (!value) return fallbackImage;
  if (typeof value === "string") {
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    if (value.startsWith("/uploads")) return resolveMediaUrl(value);
    if (value.startsWith("uploads")) return resolveMediaUrl(`/${value}`);
    return value;
  }
  return value.url || value.path || value.secure_url || fallbackImage;
};

const formatPrice = (value) => `Rs. ${Number(value || 0).toLocaleString("en-LK")}`;
const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

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
  if (seats <= 0) return { label: "Sold Out", tone: "error" };
  if (seats <= 5) return { label: `🔥 Only ${seats} seats left`, tone: "warning" };
  if (seats <= 15) return { label: `⚡ ${seats} seats left`, tone: "info" };
  return { label: `✅ ${seats} seats available`, tone: "good" };
};

// ============================================
// MAIN COMPONENT
// ============================================
function BuffetDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingRef = useRef(null);
  const recentlyViewedRecordedRef = useRef("");

  // ============================================
  // STATE
  // ============================================
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
  const [messageType, setMessageType] = useState("info");
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("dineforUser") || "null");
    } catch {
      return null;
    }
  }, []);

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchBuffet = useCallback(async () => {
    try {
      const res = await api.get(`/buffets/${id}`);
      setBuffet(res.data);

      if (res.data.specialDate) {
        setSelectedDate(toDateInput(res.data.specialDate));
      } else {
        setSelectedDate((current) => current || toDateInput(res.data.availableFromDate) || new Date().toISOString().slice(0, 10));
      }

      // Check if saved
      if (storedUser?.token) {
        try {
          const savedRes = await api.get("/users/saved-buffets", {
            headers: { Authorization: `Bearer ${storedUser.token}` },
          });
          const savedIds = savedRes.data.map((b) => b._id);
          setIsSaved(savedIds.includes(id));
        } catch {
          // Ignore
        }
      }
    } catch (error) {
      console.error("Failed to fetch buffet:", error);
      setBuffet(null);
      setMessage(error.response?.data?.message || "Buffet details could not be loaded.");
      setMessageType("error");
    }
  }, [id, storedUser?.token]);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await api.get(`/reviews/buffet/${id}`);
      setReviews(Array.isArray(res.data) ? res.data : res.data?.reviews || []);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      setReviews([]);
    }
  }, [id]);

  const fetchSimilarBuffets = useCallback(async () => {
    try {
      const res = await api.get("/buffets");
      const items = Array.isArray(res.data) ? res.data : res.data?.buffets || [];
      setSimilarBuffets(items.filter((item) => item._id !== id).slice(0, 4));
    } catch (error) {
      console.error("Failed to fetch similar buffets:", error);
      setSimilarBuffets([]);
    }
  }, [id]);

  const fetchAvailability = useCallback(async (dateValue) => {
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
      console.error("Failed to fetch availability:", error);
      setAvailability({ isAvailableDate: false, slots: [] });
      setSelectedSlotId("");
      setMessage(error.response?.data?.message || "Availability could not be loaded for this date.");
      setMessageType("error");
    } finally {
      setAvailabilityLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBuffet(), fetchReviews(), fetchSimilarBuffets()]);
      if (!cancelled) setLoading(false);
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [fetchBuffet, fetchReviews, fetchSimilarBuffets]);

  useEffect(() => {
    if (!storedUser?.token || !id || recentlyViewedRecordedRef.current === id) return;
    recentlyViewedRecordedRef.current = id;
    api.put(`/discovery/recently-viewed/${id}`).catch((error) => {
      console.warn("Recently viewed could not be recorded:", error.response?.data?.message || error.message);
    });
  }, [id, storedUser?.token]);

  useEffect(() => {
    if (selectedDate && buffet) {
      fetchAvailability(selectedDate);
    }
  }, [selectedDate, buffet, fetchAvailability]);

  // ============================================
  // COMPUTED DATA
  // ============================================
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

  // ============================================
  // HANDLERS
  // ============================================
  const toggleSave = async () => {
    if (!storedUser?.token) {
      navigate("/login");
      return;
    }

    setSaving(true);
    try {
      const response = await api.put(`/users/saved-buffets/${id}`, null, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });
      const nextSaved = Boolean(response.data?.saved);
      setIsSaved(nextSaved);
      setMessage(nextSaved ? "Added to saved buffets!" : "Removed from saved buffets.");
      setMessageType("success");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update saved buffets.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleBooking = async () => {
    setMessage("");
    setMessageType("info");

    if (!storedUser) {
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
          seats: Number(seats) 
        },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );

      setMessage(res.data.message || "🎉 Reservation confirmed!");
      setMessageType("success");
      await fetchAvailability(selectedDate);
      await fetchBuffet();
      setTimeout(() => navigate("/my-bookings"), 1500);
    } catch (error) {
      setMessage(error.response?.data?.message || "Booking failed. Please try again.");
      setMessageType("error");
      await fetchAvailability(selectedDate);
    } finally {
      setBookingLoading(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderMessage = () => {
    if (!message) return null;

    const styles = {
      success: "bg-secondary-container/30 text-secondary border border-secondary/30",
      error: "bg-error/10 text-error border border-error/20",
      warning: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30",
      info: "bg-primary-container/10 text-primary border border-primary-container/20",
    };

    return (
      <div className={`p-3 rounded-lg text-sm font-medium ${styles[messageType] || styles.info}`}>
        {message}
        <button
          onClick={() => setMessage("")}
          className="float-right text-inherit opacity-70 hover:opacity-100"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    );
  };

  const renderLoading = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-pulse">
          <span className="material-symbols-outlined text-5xl text-secondary mb-3 block">restaurant</span>
          <p className="font-headline-md text-headline-md text-text-deep-green">Loading buffet experience...</p>
        </div>
      </div>
    </div>
  );

  // ============================================
  // SECTION RENDERERS
  // ============================================
  const renderGallery = () => (
    <div className="relative w-full h-[300px] md:h-[450px] rounded-2xl overflow-hidden">
      <img
        src={gallery[activeImage] || fallbackImage}
        alt={buffet?.title}
        className="w-full h-full object-cover"
        onError={(e) => { e.target.src = fallbackImage; }}
      />
      
      {gallery.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {gallery.slice(0, 6).map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveImage(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === activeImage ? "bg-surface-cream w-6" : "bg-surface-cream/50"
              }`}
            />
          ))}
          {gallery.length > 6 && (
            <button
              onClick={() => setLightboxOpen(true)}
              className="text-xs text-surface-cream/70 hover:text-surface-cream ml-2"
            >
              +{gallery.length - 6}
            </button>
          )}
        </div>
      )}

      <button
        onClick={toggleSave}
        disabled={saving}
        className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-surface-cream/90 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 ${
          isSaved ? "text-highlight-gold" : "text-on-surface-variant"
        }`}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}>
          favorite
        </span>
      </button>

      {gallery.length > 1 && (
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute bottom-4 right-4 z-10 bg-surface-cream/90 backdrop-blur-sm px-4 py-2 rounded-full font-label-sm text-label-sm text-text-deep-green flex items-center gap-2 hover:bg-surface-cream transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">grid_view</span>
          View All Photos
        </button>
      )}
    </div>
  );

  const renderHeader = () => (
    <div className="space-y-4">
      <div>
        <Link 
          to={`/hotels/${buffet?.hotel?._id}`}
          className="font-label-sm text-label-sm text-secondary hover:underline hover:text-highlight-gold transition-colors uppercase tracking-wider"
        >
          {buffet?.hotel?.hotelName || "Hotel Partner"}
        </Link>
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-1">{buffet?.title}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {rating > 0 && (
          <span className="flex items-center gap-1 text-highlight-gold">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              star
            </span>
            {rating.toFixed(1)} ({reviewCount} reviews)
          </span>
        )}
        <Link 
          to={`/hotels/${buffet?.hotel?._id}`}
          className="text-on-surface-variant flex items-center gap-1 hover:text-secondary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">location_on</span>
          {buffet?.location?.city || buffet?.hotel?.location || "Sri Lanka"}
        </Link>
        <span className="badge-gold">Experience {experienceScore}/10</span>
        {buffet?.isFeatured && (
          <span className="badge-gold bg-highlight-gold/20 text-highlight-gold">⭐ Featured</span>
        )}
        {false && (
          <span className="badge-gold bg-tertiary-container/20 text-tertiary">Preview Mode</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`status-pill ${urgency.tone === "error" ? "rejected" : urgency.tone === "warning" ? "pending" : "approved"}`}>
          {urgency.label}
        </span>
        {buffet?.category && (
          <span className="chip">{buffet.category}</span>
        )}
        {buffet?.buffetType && (
          <span className="chip">{buffet.buffetType}</span>
        )}
      </div>
    </div>
  );

  const renderDescription = () => (
    <section className="space-y-4">
      <h2 className="font-headline-md text-headline-md text-text-deep-green">About the Experience</h2>
      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
        {buffet?.description || "A premium hotel buffet experience selected for DineFor guests."}
      </p>
    </section>
  );

  const renderHighlights = () => (
    buffet?.highlights?.length > 0 && (
      <section className="space-y-4">
        <h2 className="font-headline-md text-headline-md text-text-deep-green">Menu Highlights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {buffet.highlights.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-border-subtle">
              <span className="material-symbols-outlined text-secondary">restaurant</span>
              <span className="font-body-md text-body-md text-text-deep-green">{item}</span>
            </div>
          ))}
        </div>
      </section>
    )
  );

  const renderReviews = () => (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-headline-md text-headline-md text-text-deep-green">Guest Reviews</h2>
        <button
          onClick={() => setShowReviewForm(!showReviewForm)}
          className="text-secondary font-label-md text-label-md hover:underline"
        >
          {showReviewForm ? "Hide Form" : "Write a Review"}
        </button>
      </div>
      {showReviewForm && (
        <ReviewForm
          buffetId={id}
          onReviewCreated={() => {
            setShowReviewForm(false);
            fetchReviews();
            fetchBuffet();
          }}
        />
      )}
      <ReviewList reviews={reviews} />
    </section>
  );

  const renderSimilar = () => (
    similarBuffets.length > 0 && (
      <section className="space-y-4">
        <h2 className="font-headline-md text-headline-md text-text-deep-green">You May Also Like</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {similarBuffets.map((item) => (
            <Link
              key={item._id}
              to={`/buffets/${item._id}`}
              className="card-ambient-hover overflow-hidden"
            >
              <img
                src={resolveMedia(item.thumbnail || item.images?.[0])}
                alt={item.title}
                className="w-full h-40 object-cover"
              />
              <div className="p-3">
                <h4 className="font-label-sm text-label-sm text-text-deep-green">{item.title}</h4>
                <p className="font-label-sm text-label-sm text-highlight-gold">{formatPrice(item.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    )
  );

  const renderBookingPanel = () => (
    <div className="sticky top-28">
      <div className="card-ambient p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="font-headline-lg text-headline-lg text-highlight-gold">{formatPrice(buffet?.price)}</span>
            <span className="font-body-md text-body-md text-on-surface-variant ml-1">/ person</span>
          </div>
          {buffet?.price && buffet?.originalPrice && buffet.originalPrice > buffet.price && (
            <span className="font-label-sm text-label-sm text-on-surface-variant line-through">
              {formatPrice(buffet.originalPrice)}
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              min={dateWindow.min}
              max={dateWindow.max}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input w-full"
              readOnly={buffet?.buffetType === "special"}
            />
          </div>

          {availabilityLoading && (
            <p className="font-body-md text-body-md text-on-surface-variant text-center py-2">
              <span className="animate-pulse">Checking live seats...</span>
            </p>
          )}

          {availability && !availability.isAvailableDate && (
            <div className="p-3 rounded-xl bg-error/10 text-error text-sm">
              {availability.message}
            </div>
          )}

          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Time Slot</label>
            <div className="grid grid-cols-2 gap-2">
              {hasSlots ? (
                availabilitySlots.map((slot) => {
                  const isAvailable = Number(slot.availableSeats) > 0;
                  const isSelected = slot._id === selectedSlotId;
                  return (
                    <button
                      key={slot._id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSlotId(slot._id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected && isAvailable
                          ? "border-secondary bg-secondary-container/20 text-text-deep-green ring-1 ring-secondary"
                          : isAvailable
                          ? "border-border-subtle hover:border-secondary cursor-pointer"
                          : "border-border-subtle bg-surface-container-low text-on-surface-variant/50 cursor-not-allowed"
                      }`}
                    >
                      <div className="font-label-sm text-label-sm">
                        {slot.startTime} - {slot.endTime}
                      </div>
                      <div className="font-label-xs text-label-sm text-on-surface-variant">
                        {slot.availableSeats} / {slot.totalSeats} seats
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant col-span-2 text-center py-4">
                  No time slots available for this date.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Number of Guests</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSeats((v) => Math.max(1, v - 1))}
                className="w-10 h-10 rounded-full border border-border-subtle flex items-center justify-center hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <input
                type="number"
                min="1"
                max={selectedSlot?.availableSeats || 1}
                value={seats}
                onChange={(e) => {
                  const val = Math.min(
                    Number(selectedSlot?.availableSeats || 1),
                    Math.max(1, Number(e.target.value) || 1)
                  );
                  setSeats(val);
                }}
                className="form-input w-20 text-center"
              />
              <button
                onClick={() => setSeats((v) => Math.min(Number(selectedSlot?.availableSeats || 1), v + 1))}
                className="w-10 h-10 rounded-full border border-border-subtle flex items-center justify-center hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle space-y-2">
            <div className="flex justify-between">
              <span className="font-body-md text-body-md text-on-surface-variant">Subtotal</span>
              <span className="font-body-md text-body-md text-text-deep-green">{formatPrice(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-body-md text-body-md text-on-surface-variant">Service & Tax</span>
              <span className="font-body-md text-body-md text-text-deep-green">Included</span>
            </div>
            <div className="flex justify-between border-t border-border-subtle pt-3">
              <span className="font-headline-md text-headline-md text-text-deep-green">Total</span>
              <span className="font-headline-md text-headline-md text-highlight-gold">{formatPrice(totals.total)}</span>
            </div>
          </div>

          {renderMessage()}

          <button
            onClick={handleBooking}
            disabled={bookingLoading || !selectedSlot || Number(selectedSlot.availableSeats) <= 0}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            {bookingLoading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-text-deep-green border-t-transparent" />
                Reserving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Reserve Buffet
              </>
            )}
          </button>
          <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
            You'll receive a QR confirmation after booking
          </p>
        </div>
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  if (loading) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          {renderLoading()}
        </div>
      </main>
    );
  }

  if (!buffet) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">restaurant</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Buffet Not Found</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              The buffet you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/feed" className="btn-primary inline-flex items-center gap-2 mt-6">
              Browse Buffets
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20 pb-24 md:pb-0">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {renderGallery()}
            {renderHeader()}
            {renderDescription()}
            {renderHighlights()}
            {renderReviews()}
            {renderSimilar()}
          </div>

          <div className="lg:col-span-1">
            {renderBookingPanel()}
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-highlight-gold transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
          <div className="relative max-w-5xl w-full">
            <img
              src={gallery[activeImage] || fallbackImage}
              alt={buffet.title}
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex justify-center gap-2 mt-4">
              {gallery.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeImage ? "bg-highlight-gold w-6" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveImage((prev) => (prev - 1 + gallery.length) % gallery.length);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-highlight-gold transition-colors"
            >
              <span className="material-symbols-outlined text-4xl">chevron_left</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveImage((prev) => (prev + 1) % gallery.length);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-highlight-gold transition-colors"
            >
              <span className="material-symbols-outlined text-4xl">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default BuffetDetails;