import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { getPrimaryMedia } from "../../services/discoveryService";

// Helper function to format price
const formatPrice = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

// Helper function to get urgency label
const getUrgencyLabel = (buffet, guests = 1) => {
  // Find the first available slot with enough seats
  const slots = buffet?.timeSlots || [];
  const availableSlots = slots.filter(
    (slot) => Number(slot.availableSeats || 0) >= Number(guests || 1)
  );

  if (availableSlots.length === 0) {
    return { label: "Sold Out", tone: "danger" };
  }

  const maxSeats = Math.max(...slots.map((s) => Number(s.availableSeats || 0)));
  if (maxSeats <= 3) {
    return { label: `Only ${maxSeats} seats left!`, tone: "hot" };
  }
  if (maxSeats <= 8) {
    return { label: `${maxSeats} seats available`, tone: "warning" };
  }
  return { label: "Available", tone: "good" };
};

// Helper function to get the best image
const getBestImage = (buffet) => {
  const primary = getPrimaryMedia(buffet);
  if (primary) return primary;

  // Fallback to any available image
  const images = buffet?.images || buffet?.gallery || [];
  if (images.length > 0) {
    const img = images[0];
    if (typeof img === "string") return img;
    return img?.url || img?.path || img?.secure_url || "";
  }

  // Hotel fallback
  const hotelImages = buffet?.hotel?.images || buffet?.hotel?.gallery || [];
  if (hotelImages.length > 0) {
    const img = hotelImages[0];
    if (typeof img === "string") return img;
    return img?.url || img?.path || img?.secure_url || "";
  }

  return "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&q=80";
};

function DiscoveryFeedCard({ buffet, guests = 1, index = 0 }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageUrl = useMemo(() => getBestImage(buffet), [buffet]);
  const urgency = useMemo(() => getUrgencyLabel(buffet, guests), [buffet, guests]);
  const rating = Number(buffet?.averageRating || 0);
  const reviewCount = Number(buffet?.totalReviews || 0);
  const price = Number(buffet?.price || 0);
  const isFeatured = buffet?.isFeatured || false;

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  return (
    <article
      className={`discovery-feed-card ${isHovered ? "hovered" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Link to={`/buffets/${buffet._id}`} className="card-link">
        {/* Image Container */}
        <div className="card-image-container">
          {!imageLoaded && <div className="image-placeholder" />}
          <img
            src={imageUrl}
            alt={buffet.title || "Buffet experience"}
            loading={index < 4 ? "eager" : "lazy"}
            onLoad={handleImageLoad}
            className={imageLoaded ? "loaded" : "loading"}
          />

          {/* Badges */}
          <div className="card-badges">
            {isFeatured && (
              <span className="badge featured">
                <span className="badge-icon">⭐</span>
                Featured
              </span>
            )}
            {buffet.buffetType === "special" && (
              <span className="badge special">
                <span className="badge-icon">✨</span>
                Special
              </span>
            )}
          </div>

          {/* Urgency Indicator */}
          {urgency.tone !== "good" && (
            <div className={`urgency-indicator ${urgency.tone}`}>
              {urgency.label}
            </div>
          )}

          {/* Rating Overlay */}
          {rating > 0 && (
            <div className="rating-overlay">
              <span className="rating-stars">⭐</span>
              <span className="rating-value">{rating.toFixed(1)}</span>
              {reviewCount > 0 && (
                <span className="review-count">({reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="card-body">
          {/* Hotel Name */}
          <div className="card-hotel">
            <span className="hotel-name">
              {buffet.hotel?.hotelName || "Hotel Partner"}
            </span>
            {buffet.hotel?.city && (
              <span className="hotel-location">
                📍 {buffet.hotel.city}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="card-title">{buffet.title || "Premium Buffet"}</h3>

          {/* Description (truncated) */}
          {buffet.description && (
            <p className="card-description line-clamp-2">
              {buffet.description}
            </p>
          )}

          {/* Meta Information */}
          <div className="card-meta">
            <span className="meta-item category">
              {buffet.category || "Buffet"}
            </span>
            <span className="meta-divider">•</span>
            <span className="meta-item meal-type">
              {buffet.buffetType || "Regular"}
            </span>
            {guests > 0 && (
              <>
                <span className="meta-divider">•</span>
                <span className="meta-item guests">
                  👥 {guests} guest{guests > 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>

          {/* Price and Action */}
          <div className="card-footer">
            <div className="price-section">
              <span className="price">{formatPrice(price)}</span>
              <span className="price-per-person">/ person</span>
            </div>

            <div className="action-section">
              <span className={`availability-status ${urgency.tone}`}>
                {urgency.tone === "good" && "✅"}
                {urgency.tone === "warning" && "🟡"}
                {urgency.tone === "hot" && "🔴"}
                {urgency.tone === "danger" && "⛔"}
                <span className="status-label">{urgency.label}</span>
              </span>
              <span className="view-details-btn">
                View Details →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default DiscoveryFeedCard;