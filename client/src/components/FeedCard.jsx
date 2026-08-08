import React from "react";
import { Link } from "react-router-dom";
import FavoriteBuffetButton from "./customer/FavoriteBuffetButton";

const fallbackImage =
  "https://images.unsplash.com/photo-1555244162-803834f70033?w=400&h=300&fit=crop";

const resolveMedia = (value) => {
  if (!value) return fallbackImage;

  if (
    typeof value === "string" &&
    (value.startsWith("http") || value.startsWith("data:"))
  ) {
    return value;
  }

  if (typeof value === "string") return value;
  return fallbackImage;
};

function FeedCard({ buffet, saved = false, onSavedChange }) {
  if (!buffet) {
    return (
      <div className="card-ambient h-[400px] flex items-center justify-center">
        <p className="text-on-surface-variant">
          Buffet data unavailable
        </p>
      </div>
    );
  }

  const image = resolveMedia(
    buffet.thumbnail || buffet.images?.[0]
  );
  const rating = Number(buffet.averageRating || 0);
  const reviewCount = Number(buffet.totalReviews || 0);
  const price = Number(buffet.price || 0);
  const hotelName =
    buffet.hotel?.hotelName || "Hotel Partner";
  const hotelId = buffet.hotel?._id;
  const isFeatured = buffet.isFeatured;
  const title = buffet.title || "Buffet Experience";
  const description = buffet.description || "";
  const location =
    buffet.location?.city ||
    buffet.location?.address ||
    buffet.hotel?.city ||
    buffet.hotel?.location ||
    "";
  const category =
    buffet.category || buffet.buffetType || "";
  const id = buffet._id || buffet.id;

  return (
    <article className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient card-hover border border-border-subtle flex flex-col h-full group">
      <div className="relative h-56 overflow-hidden">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = fallbackImage;
          }}
        />

        <FavoriteBuffetButton
          buffetId={id}
          defaultSaved={saved}
          onChange={onSavedChange}
        />

        {isFeatured && (
          <span className="absolute top-3 left-3 bg-highlight-gold text-text-deep-green px-3 py-1 rounded-full font-label-sm text-label-sm shadow-sm">
            Featured
          </span>
        )}

        {rating > 0 && (
          <span className="absolute bottom-3 right-3 bg-surface-cream/90 backdrop-blur-sm px-3 py-1 rounded-full font-label-sm text-label-sm text-text-deep-green shadow-sm flex items-center gap-1">
            <span
              className="material-symbols-outlined text-[14px] text-highlight-gold"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            {rating.toFixed(1)}
            {reviewCount > 0 && ` (${reviewCount})`}
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        {hotelId ? (
          <Link
            to={`/hotels/${hotelId}`}
            className="font-label-sm text-label-sm text-secondary hover:text-highlight-gold transition-colors uppercase tracking-wider hover:underline"
          >
            {hotelName}
          </Link>
        ) : (
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            {hotelName}
          </p>
        )}

        <h3 className="font-headline-md text-headline-md text-text-deep-green leading-tight mb-2 line-clamp-2">
          <Link
            to={`/buffets/${id}`}
            className="hover:text-highlight-gold transition-colors"
          >
            {title}
          </Link>
        </h3>

        {description && (
          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-4 flex-1">
            {description}
          </p>
        )}

        <div className="flex items-center gap-3 text-on-surface-variant font-label-sm text-label-sm mb-4">
          {location && (
            <span className="flex items-center gap-1 min-w-0">
              <span className="material-symbols-outlined text-[16px]">
                location_on
              </span>
              <span className="truncate">{location}</span>
            </span>
          )}

          {category && (
            <>
              <span className="w-1 h-1 bg-outline-variant rounded-full shrink-0" />
              <span className="truncate">{category}</span>
            </>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
          <div>
            <span className="font-headline-md text-headline-md text-highlight-gold">
              Rs. {price.toLocaleString()}
            </span>
            <span className="font-label-sm text-label-sm text-outline ml-1">
              /person
            </span>
          </div>

          <Link
            to={`/buffets/${id}`}
            className="bg-accent-mint text-text-deep-green px-5 py-2.5 rounded-full font-label-md text-label-md hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0"
          >
            Reserve
          </Link>
        </div>
      </div>
    </article>
  );
}

export default FeedCard;
