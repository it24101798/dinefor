import React from "react";

function HotelHero({ hotel, reviewSummary }) {
  const rating = Number(hotel?.averageRating || reviewSummary?.average || 0);
  const reviewCount = Number(hotel?.totalReviews || reviewSummary?.total || 0);

  return (
    <div className="relative w-full h-[300px] md:h-[450px] bg-surface-dim overflow-hidden">
      <img
        src={hotel?.coverImage || hotel?.coverMediaUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&h=450&fit=crop"}
        alt={hotel?.hotelName}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-text-deep-green/70 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 text-surface-cream">
        <h1 className="font-display-lg text-display-lg">{hotel?.hotelName}</h1>
        <div className="flex items-center gap-4 mt-2">
          {rating > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-highlight-gold">star</span>
              {rating.toFixed(1)} ({reviewCount} reviews)
            </span>
          )}
          {hotel?.location && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined">location_on</span>
              {hotel.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default HotelHero;