import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/map/MapView";
import ReviewList from "../components/reviews/ReviewList";
import ReviewForm from "../components/reviews/ReviewForm";
import SkeletonCard from "../components/shared/SkeletonCard";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  });
};

const formatCurrency = (value) => {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
};

const resolveMedia = (value) => {
  if (!value) return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop";
  if (typeof value === "string") {
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    if (value.startsWith("/uploads")) return `${API_BASE}${value}`;
    if (value.startsWith("uploads")) return `${API_BASE}/${value}`;
    return value;
  }
  return value;
};

// ============================================
// MAIN COMPONENT
// ============================================
function HotelProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isLoggedIn, user } = useAuth();
  const reviewsRef = useRef(null);

  // ============================================
  // STATE
  // ============================================
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [activeTab, setActiveTab] = useState("overview");
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // ============================================
  // CHECK IF CLIENT SIDE
  // ============================================
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchHotelExperience = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");
      
      // Always fetch hotel data regardless of login status
      const res = await api.get(`/hotel-experience/${id}/experience`);
      setData(res.data);

      // Check if hotel is saved (only if logged in)
      if (isLoggedIn && token) {
        try {
          const savedRes = await api.get("/customer/saved-hotels", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const savedIds = savedRes.data.map((h) => h._id);
          setIsSaved(savedIds.includes(id));
        } catch {
          // Ignore saved check errors
        }

        // Track recently viewed (non-blocking)
        api.post(
          "/customer/recently-viewed",
          { itemType: "hotel", itemId: id },
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => null);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to load hotel profile.";
      setMessage(errorMsg);
      setMessageType("error");
      console.error("Hotel fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [id, isLoggedIn, token]);

  useEffect(() => {
    if (id) {
      fetchHotelExperience();
    }
  }, [id, fetchHotelExperience]);

  // ============================================
  // COMPUTED DATA
  // ============================================
  const hotel = useMemo(() => data?.hotel || null, [data]);
  const gallery = useMemo(() => data?.gallery || [], [data]);
  const buffets = useMemo(() => data?.buffets || [], [data]);
  const reviews = useMemo(() => data?.reviews || [], [data]);
  const reviewSummary = useMemo(() => data?.reviewSummary || null, [data]);
  const similarHotels = useMemo(() => data?.similarHotels || [], [data]);

  const rating = useMemo(() => {
    return Number(hotel?.averageRating || reviewSummary?.average || 0);
  }, [hotel, reviewSummary]);

  const reviewCount = useMemo(() => {
    return Number(hotel?.totalReviews || reviewSummary?.total || 0);
  }, [hotel, reviewSummary]);

  const amenities = useMemo(() => {
    return [...(hotel?.amenities || []), ...(hotel?.facilities || [])];
  }, [hotel]);

  const displayedReviews = useMemo(() => {
    return showAllReviews ? reviews : reviews.slice(0, 3);
  }, [reviews, showAllReviews]);

  // ============================================
  // HANDLERS
  // ============================================
  const toggleSave = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        await api.delete(`/customer/saved-hotels/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsSaved(false);
        setMessage("Hotel removed from favourites.");
        setMessageType("success");
      } else {
        await api.post(
          "/customer/saved-hotels",
          { hotelId: id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsSaved(true);
        setMessage("Hotel added to favourites!");
        setMessageType("success");
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to update favourites.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const scrollToReviews = () => {
    if (reviewsRef.current) {
      reviewsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <div className={`p-4 rounded-xl text-sm font-medium mb-6 ${styles[messageType] || styles.info}`}>
        {message}
        <button
          onClick={() => setMessage("")}
          className="float-right text-inherit opacity-70 hover:opacity-100"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    );
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="h-[300px] md:h-[400px] bg-surface-container-low animate-pulse rounded-2xl" />
      <div className="card-ambient p-6 animate-pulse">
        <div className="h-8 bg-surface-container-low rounded w-3/4 mb-3" />
        <div className="h-4 bg-surface-container-low rounded w-1/2 mb-2" />
        <div className="h-4 bg-surface-container-low rounded w-2/3" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );

  const renderEmpty = (title, text, icon = "inbox") => (
    <div className="text-center py-12">
      <span className="material-symbols-outlined text-5xl text-outline mb-3 block">{icon}</span>
      <h4 className="font-headline-md text-headline-md text-text-deep-green">{title}</h4>
      <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
    </div>
  );

  // ============================================
  // SECTION RENDERERS
  // ============================================
  const renderHero = () => {
    const coverImage = resolveMedia(hotel?.coverImage || hotel?.coverMediaUrl || gallery?.[0]);
    const logoImage = resolveMedia(hotel?.logo);
    const hotelName = hotel?.hotelName || "Hotel";
    const location = hotel?.city || hotel?.location || "";
    const hasLogo = logoImage && !logoImage.includes("default");

    return (
      <section className="relative w-full h-[320px] md:h-[420px] bg-surface-dim overflow-hidden">
        {/* Cover Image */}
        <img
          src={coverImage}
          alt={hotelName}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&h=450&fit=crop";
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-text-deep-green/80 via-text-deep-green/30 to-transparent" />
        
        {/* Logo Overlay - Centered */}
        {hasLogo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-surface-cream/90 backdrop-blur-sm p-4 rounded-2xl shadow-ambient-lg border border-border-subtle max-w-[200px] max-h-[200px]">
              <img
                src={logoImage}
                alt={`${hotelName} logo`}
                className="w-full h-full object-contain max-h-[150px]"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Save Button */}
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

        {/* Hotel Info Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-surface-cream">
          <div className="max-w-container-max mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-label-sm text-label-sm text-highlight-gold uppercase tracking-wider">
                {hotel?.category || "HOTEL"}
              </span>
              {hotel?.starRating && (
                <span className="badge-gold text-surface-cream bg-highlight-gold/20">
                  ⭐ {hotel.starRating}
                </span>
              )}
              {hotel?.verified && (
                <span className="material-symbols-outlined text-highlight-gold text-sm">verified</span>
              )}
            </div>
            <h1 className="font-display-lg text-display-lg md:text-[42px] leading-tight">
              {hotelName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              {location && (
                <span className="flex items-center gap-1 text-sm">
                  <span className="material-symbols-outlined text-[18px]">location_on</span>
                  {location}
                </span>
              )}
              {rating > 0 && (
                <span className="flex items-center gap-1 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-highlight-gold">star</span>
                  {rating.toFixed(1)} ({reviewCount} reviews)
                </span>
              )}
              {buffets.length > 0 && (
                <span className="flex items-center gap-1 text-sm">
                  <span className="material-symbols-outlined text-[18px]">restaurant</span>
                  {buffets.length} {buffets.length === 1 ? "buffet" : "buffets"}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderQuickActions = () => (
    <div className="card-ambient p-4 -mt-10 relative z-10 mx-4 md:mx-0">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {hotel?.contactNumber && (
          <a
            href={`tel:${hotel.contactNumber}`}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-border-subtle hover:border-secondary transition-all hover:bg-surface-container-low group"
          >
            <span className="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform">call</span>
            <span className="font-label-sm text-label-sm text-text-deep-green">Call</span>
          </a>
        )}
        {hotel?.mapLocation?.googleMapUrl && (
          <a
            href={hotel.mapLocation.googleMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-border-subtle hover:border-secondary transition-all hover:bg-surface-container-low group"
          >
            <span className="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform">directions</span>
            <span className="font-label-sm text-label-sm text-text-deep-green">Directions</span>
          </a>
        )}
        {hotel?.website && (
          <a
            href={hotel.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-border-subtle hover:border-secondary transition-all hover:bg-surface-container-low group"
          >
            <span className="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform">language</span>
            <span className="font-label-sm text-label-sm text-text-deep-green">Website</span>
          </a>
        )}
        <button
          onClick={() => setShowReviewForm(!showReviewForm)}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border border-border-subtle hover:border-secondary transition-all hover:bg-surface-container-low group"
        >
          <span className="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform">rate_review</span>
          <span className="font-label-sm text-label-sm text-text-deep-green">Review</span>
        </button>
      </div>
    </div>
  );

  const renderTabs = () => (
    <div className="flex gap-1 border-b border-border-subtle mb-6 overflow-x-auto hide-scrollbar">
      {["overview", "buffets", "reviews", "photos"].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-5 py-3 font-label-md text-label-md transition-all border-b-2 whitespace-nowrap ${
            activeTab === tab
              ? "border-secondary text-text-deep-green font-semibold"
              : "border-transparent text-on-surface-variant hover:text-text-deep-green"
          }`}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
          {tab === "buffets" && buffets.length > 0 && (
            <span className="ml-2 text-xs bg-secondary-container/30 text-secondary px-2 py-0.5 rounded-full">
              {buffets.length}
            </span>
          )}
          {tab === "reviews" && reviewCount > 0 && (
            <span className="ml-2 text-xs bg-secondary-container/30 text-secondary px-2 py-0.5 rounded-full">
              {reviewCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  const renderAbout = () => {
    const description = hotel?.description || "This hotel is preparing its public DineFor profile. Guests can still browse active buffet experiences and make reservations.";
    const shouldTruncate = description.length > 200 && !expandedDescription;
    const truncatedDescription = shouldTruncate ? description.slice(0, 200) + "..." : description;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-headline-md text-headline-md text-text-deep-green mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">info</span>
            About the Hotel
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {truncatedDescription}
          </p>
          {description.length > 200 && (
            <button
              onClick={() => setExpandedDescription(!expandedDescription)}
              className="text-secondary font-label-md text-label-md hover:underline mt-2 inline-flex items-center gap-1"
            >
              {expandedDescription ? "Show less" : "Read more"}
              <span className="material-symbols-outlined text-[16px]">
                {expandedDescription ? "expand_less" : "expand_more"}
              </span>
            </button>
          )}
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hotel?.address && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle">
              <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                Address
              </p>
              <p className="font-body-md text-body-md text-text-deep-green mt-1">{hotel.address}</p>
            </div>
          )}
          {hotel?.contactNumber && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle">
              <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">phone</span>
                Contact
              </p>
              <a href={`tel:${hotel.contactNumber}`} className="font-body-md text-body-md text-secondary hover:underline mt-1 block">
                {hotel.contactNumber}
              </a>
            </div>
          )}
          {hotel?.email && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle">
              <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">email</span>
                Email
              </p>
              <a href={`mailto:${hotel.email}`} className="font-body-md text-body-md text-secondary hover:underline mt-1 block truncate">
                {hotel.email}
              </a>
            </div>
          )}
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div>
            <h3 className="font-headline-md text-headline-md text-text-deep-green mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">checklist</span>
              Amenities & Facilities
            </h3>
            <div className="flex flex-wrap gap-2">
              {amenities.map((item, index) => (
                <span key={index} className="chip flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {hotel?.diningHighlights && (
          <div className="p-4 rounded-xl bg-secondary-container/10 border border-secondary/30">
            <h4 className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">restaurant</span>
              Dining Highlights
            </h4>
            <p className="font-body-md text-body-md text-text-deep-green mt-1">{hotel.diningHighlights}</p>
          </div>
        )}
      </div>
    );
  };

  const renderBuffets = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-headline-md text-headline-md text-text-deep-green flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">restaurant_menu</span>
          Available Buffets
        </h2>
        <Link to="/feed" className="text-label-sm text-label-sm text-secondary hover:underline flex items-center gap-1">
          View All
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>

      {buffets.length === 0 ? (
        renderEmpty("No Buffets Available", "This hotel hasn't listed any buffets yet. Check back later!", "restaurant")
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buffets.map((buffet) => (
            <Link
              key={buffet._id}
              to={`/buffets/${buffet._id}`}
              className="card-ambient-hover overflow-hidden group flex flex-col"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={resolveMedia(buffet.thumbnail || buffet.images?.[0])}
                  alt={buffet.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {buffet.isFeatured && (
                  <span className="absolute top-3 left-3 bg-highlight-gold text-text-deep-green px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">star</span>
                    Featured
                  </span>
                )}
                {buffet.averageRating > 0 && (
                  <span className="absolute top-3 right-3 bg-surface-cream/90 backdrop-blur-sm px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-highlight-gold">star</span>
                    {buffet.averageRating.toFixed(1)}
                  </span>
                )}
                {buffet.category && (
                  <span className="absolute bottom-3 left-3 bg-surface-cream/90 backdrop-blur-sm px-3 py-1 rounded-full font-label-sm text-label-sm">
                    {buffet.category}
                  </span>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-label-md text-label-md text-text-deep-green group-hover:text-secondary transition-colors">
                  {buffet.title}
                </h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{buffet.buffetType || "Buffet"}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border-subtle">
                  <p className="font-headline-md text-headline-md text-highlight-gold">
                    {formatCurrency(buffet.price)}
                    <span className="font-label-sm text-label-sm text-outline ml-1">/person</span>
                  </p>
                  <span className="text-secondary font-label-sm text-label-sm group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Reserve
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const renderReviews = () => (
    <div ref={reviewsRef} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-text-deep-green flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">rate_review</span>
            Guest Reviews
          </h2>
          {rating > 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant">
              {rating.toFixed(1)} ⭐ • {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowReviewForm(!showReviewForm)}
          className="btn-secondary flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">rate_review</span>
          Write a Review
        </button>
      </div>

      {showReviewForm && (
        <div className="card-ambient p-6">
          <ReviewForm
            hotelId={id}
            onReviewCreated={() => {
              setShowReviewForm(false);
              fetchHotelExperience();
            }}
          />
        </div>
      )}

      {reviews.length === 0 ? (
        renderEmpty("No Reviews Yet", "Be the first to review this hotel!", "rate_review")
      ) : (
        <>
          <ReviewList reviews={displayedReviews} />
          {reviews.length > 3 && (
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="text-secondary font-label-md text-label-md hover:underline flex items-center gap-1"
            >
              {showAllReviews ? "Show Less" : `Show All ${reviews.length} Reviews`}
              <span className="material-symbols-outlined text-[16px]">
                {showAllReviews ? "expand_less" : "expand_more"}
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );

  const renderGallery = () => (
    <div className="space-y-4">
      <h2 className="font-headline-md text-headline-md text-text-deep-green flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary">photo_camera</span>
        Photo Gallery
      </h2>
      {gallery.length === 0 ? (
        renderEmpty("No Photos Available", "This hotel hasn't uploaded any photos yet.", "photo_camera")
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {gallery.slice(0, 8).map((img, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedImage(img);
                setShowLightbox(true);
              }}
              className={`relative overflow-hidden rounded-xl group ${
                index === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <img
                src={resolveMedia(img)}
                alt={`Gallery ${index + 1}`}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-3xl">zoom_in</span>
              </div>
            </button>
          ))}
          {gallery.length > 8 && (
            <button
              onClick={() => setShowLightbox(true)}
              className="col-span-1 relative overflow-hidden rounded-xl bg-surface-container-high flex items-center justify-center h-48"
            >
              <span className="font-headline-md text-headline-md text-text-deep-green">+{gallery.length - 8}</span>
              <p className="font-label-sm text-label-sm text-on-surface-variant">more photos</p>
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMap = () => (
    hotel?.mapLocation?.latitude && hotel?.mapLocation?.longitude && (
      <div className="mt-8">
        <h2 className="font-headline-md text-headline-md text-text-deep-green flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-secondary">map</span>
          Location
        </h2>
        <div className="card-ambient p-4">
          <div className="h-64 rounded-xl overflow-hidden">
            <MapView hotels={[hotel]} />
          </div>
          {hotel.address && (
            <p className="font-body-md text-body-md text-on-surface-variant mt-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">location_on</span>
              {hotel.address}
            </p>
          )}
          {hotel.mapLocation?.googleMapUrl && (
            <a
              href={hotel.mapLocation.googleMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary font-label-sm text-label-sm hover:underline inline-flex items-center gap-1 mt-2"
            >
              Open in Google Maps
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
          )}
        </div>
      </div>
    )
  );

  const renderSimilarHotels = () => (
    similarHotels.length > 0 && (
      <div className="mt-8">
        <h2 className="font-headline-md text-headline-md text-text-deep-green flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-secondary">hotel</span>
          Similar Hotels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {similarHotels.slice(0, 3).map((h) => (
            <Link
              key={h._id}
              to={`/hotels/${h._id}`}
              className="card-ambient-hover overflow-hidden group"
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={resolveMedia(h.coverImage || h.coverMediaUrl)}
                  alt={h.hotelName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {h.averageRating > 0 && (
                  <span className="absolute top-2 right-2 bg-surface-cream/90 backdrop-blur-sm px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-highlight-gold">star</span>
                    {h.averageRating.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-label-md text-label-md text-text-deep-green group-hover:text-secondary transition-colors">
                  {h.hotelName}
                </h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{h.city || h.location}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  if (loading) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          {renderLoadingSkeleton()}
        </div>
      </main>
    );
  }

  if (!hotel) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">hotel</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Hotel Not Found</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              {message || "The hotel you're looking for doesn't exist or has been removed."}
            </p>
            <Link to="/feed" className="btn-primary inline-flex items-center gap-2 mt-6">
              Browse Hotels
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20">
      <div className="max-w-container-max mx-auto">
        {renderMessage()}
        {renderHero()}
        {renderQuickActions()}

        <div className="px-margin-mobile md:px-margin-desktop py-6">
          {renderTabs()}

          {activeTab === "overview" && (
            <div className="space-y-8">
              {renderAbout()}
              {renderMap()}
              {renderSimilarHotels()}
            </div>
          )}

          {activeTab === "buffets" && renderBuffets()}
          {activeTab === "reviews" && renderReviews()}
          {activeTab === "photos" && renderGallery()}
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 text-white hover:text-highlight-gold transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
          <img
            src={resolveMedia(selectedImage)}
            alt="Gallery"
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              const currentIndex = gallery.indexOf(selectedImage);
              const prevIndex = (currentIndex - 1 + gallery.length) % gallery.length;
              setSelectedImage(gallery[prevIndex]);
            }}
            className="absolute left-4 text-white hover:text-highlight-gold transition-colors"
          >
            <span className="material-symbols-outlined text-4xl">chevron_left</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const currentIndex = gallery.indexOf(selectedImage);
              const nextIndex = (currentIndex + 1) % gallery.length;
              setSelectedImage(gallery[nextIndex]);
            }}
            className="absolute right-4 text-white hover:text-highlight-gold transition-colors"
          >
            <span className="material-symbols-outlined text-4xl">chevron_right</span>
          </button>
        </div>
      )}
    </main>
  );
}

export default HotelProfile;