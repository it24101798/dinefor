import React from "react";
import { Link } from "react-router-dom";

function MapView({ hotels = [], height = "100%", selectedHotel = null }) {
  // Get hotels with valid coordinates
  const validHotels = hotels.filter(
    (hotel) =>
      hotel?.mapLocation &&
      hotel.mapLocation.latitude &&
      hotel.mapLocation.longitude
  );

  // If no hotels with coordinates, show placeholder
  if (validHotels.length === 0) {
    return (
      <div className="w-full bg-surface-dim rounded-xl flex items-center justify-center relative overflow-hidden" style={{ height }}>
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, #c3c8c1 1px, transparent 1px),
              radial-gradient(circle at 80% 30%, #c3c8c1 1px, transparent 1px),
              radial-gradient(circle at 50% 80%, #c3c8c1 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px, 60px 60px, 50px 50px',
          }}
        />
        <div className="text-center relative z-10 p-6">
          <span className="material-symbols-outlined text-5xl text-outline mb-3 block">map</span>
          <p className="font-body-md text-body-md text-text-deep-green">
            {hotels.length > 0 ? `${hotels.length} hotels on map` : "Map view"}
          </p>
          {hotels.length > 0 && (
            <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
              {hotels.slice(0, 5).map((hotel) => (
                <div key={hotel._id} className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                  <span className="truncate">{hotel.hotelName}</span>
                </div>
              ))}
              {hotels.length > 5 && (
                <p className="font-label-sm text-label-sm text-outline">+{hotels.length - 5} more</p>
              )}
            </div>
          )}
          <p className="font-label-sm text-label-sm text-outline mt-3">Map view</p>
          <p className="font-label-xs text-label-sm text-outline">Leaflet integration coming soon</p>
        </div>
      </div>
    );
  }

  // Show hotels with coordinates as a styled list
  return (
    <div className="w-full bg-surface-dim rounded-xl overflow-y-auto p-4" style={{ height }}>
      <div className="space-y-3">
        {validHotels.map((hotel) => {
          const isSelected = selectedHotel?._id === hotel._id;
          return (
            <Link
              key={hotel._id}
              to={`/hotels/${hotel._id}`}
              className={`block p-3 rounded-xl border transition-all ${
                isSelected
                  ? "border-secondary bg-secondary-container/10"
                  : "border-border-subtle bg-surface-container-lowest hover:border-secondary"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">
                  {isSelected ? "location_on" : "fmd_bad"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-label-md text-label-md text-text-deep-green">{hotel.hotelName}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {hotel.city || hotel.location || ""}
                  </p>
                  {hotel.averageRating > 0 && (
                    <p className="font-label-sm text-label-sm text-highlight-gold">
                      ⭐ {hotel.averageRating.toFixed(1)}
                    </p>
                  )}
                </div>
                <span className="material-symbols-outlined text-outline">
                  chevron_right
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-4 p-3 rounded-xl bg-surface-container-low text-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          {validHotels.length} hotel{validHotels.length > 1 ? "s" : ""} with locations
        </p>
        <p className="font-label-xs text-label-sm text-outline">Click a hotel to view details</p>
      </div>
    </div>
  );
}

export default MapView;