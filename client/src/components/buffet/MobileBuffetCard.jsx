import React from "react";
import { Link } from "react-router-dom";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&h=500&fit=crop";

const resolveMedia = (value) => {
  if (!value) return FALLBACK_IMAGE;
  if (typeof value === "string") return value;
  return FALLBACK_IMAGE;
};

export default function MobileBuffetCard({ buffet, className = "" }) {
  if (!buffet) return null;

  const id = buffet._id || buffet.id;
  const image = resolveMedia(buffet.thumbnail || buffet.images?.[0]);
  const title = buffet.title || "Buffet Experience";
  const hotelName = buffet.hotel?.hotelName || "Hotel Partner";
  const price = Number(buffet.price || 0);
  const rating = Number(buffet.averageRating || 0);
  const reviewCount = Number(buffet.totalReviews || 0);

  return (
    <Link
      to={`/buffets/${id}`}
      className={`df-mobile-buffet-card group ${className}`}
      aria-label={`View ${title} at ${hotelName}`}
    >
      <div className="df-mobile-buffet-card__media">
        <img
          src={image}
          alt={title}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
        />

        {buffet.isFeatured && (
          <span className="df-mobile-buffet-card__featured">Featured</span>
        )}

        {rating > 0 && (
          <span className="df-mobile-buffet-card__rating">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            {rating.toFixed(1)}
            {reviewCount > 0 && <small>({reviewCount})</small>}
          </span>
        )}
      </div>

      <div className="df-mobile-buffet-card__content">
        <p className="df-mobile-buffet-card__hotel">{hotelName}</p>
        <h3 className="df-mobile-buffet-card__title">{title}</h3>

        <div className="df-mobile-buffet-card__footer">
          <div className="min-w-0">
            <strong>Rs. {price.toLocaleString()}</strong>
            <small>per person</small>
          </div>
          <span className="df-mobile-buffet-card__open" aria-hidden="true">
            <span className="material-symbols-outlined">arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
