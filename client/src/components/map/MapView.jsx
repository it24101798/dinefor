import React, { useMemo } from "react";
import { Link } from "react-router-dom";

const DEFAULT_LAT = 7.8731;
const DEFAULT_LNG = 80.7718;

const osmEmbedUrl = (latitude, longitude, zoom = 13) => {
  const delta = zoom >= 13 ? 0.035 : 0.18;
  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

function MapView({ hotels = [], height = "100%", selectedHotel = null, onSelectHotel }) {
  const validHotels = useMemo(() => hotels.filter((hotel) => {
    const latitude = Number(hotel?.mapLocation?.latitude);
    const longitude = Number(hotel?.mapLocation?.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude !== 0 && longitude !== 0;
  }), [hotels]);

  const activeHotel = validHotels.find((hotel) => hotel._id === selectedHotel?._id) || validHotels[0] || null;
  const latitude = Number(activeHotel?.mapLocation?.latitude || DEFAULT_LAT);
  const longitude = Number(activeHotel?.mapLocation?.longitude || DEFAULT_LNG);

  if (!validHotels.length) {
    return (
      <div className="w-full bg-surface-dim rounded-xl flex items-center justify-center p-6 text-center" style={{ height }}>
        <div>
          <span className="material-symbols-outlined text-5xl text-outline block mb-3">map</span>
          <p className="font-headline-md text-text-deep-green">No map coordinates available</p>
          <p className="text-on-surface-variant mt-2">Hotels remain available in list view. Add latitude and longitude in the hotel profile to place them on the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-surface-container-low" style={{ height }}>
      <iframe
        key={`${latitude}-${longitude}`}
        title={`Map showing ${activeHotel?.hotelName || "DineFor hotels"}`}
        src={osmEmbedUrl(latitude, longitude, validHotels.length === 1 ? 14 : 12)}
        className="absolute inset-0 w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      <div className="absolute left-3 right-3 bottom-3 rounded-2xl bg-white/95 backdrop-blur-sm border border-border-subtle shadow-ambient p-3 max-h-44 overflow-auto">
        <div className="flex items-center justify-between gap-3 mb-2">
          <strong className="text-text-deep-green">Hotels on map ({validHotels.length})</strong>
          {activeHotel && <Link to={`/hotels/${activeHotel._id}`} className="text-secondary font-semibold text-sm">View hotel</Link>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validHotels.map((hotel) => (
            <button
              key={hotel._id}
              type="button"
              onClick={() => onSelectHotel?.(hotel)}
              className={`flex-shrink-0 text-left px-3 py-2 rounded-xl border ${activeHotel?._id === hotel._id ? "border-secondary bg-secondary-container/10" : "border-border-subtle bg-white"}`}
            >
              <span className="block font-semibold text-sm text-text-deep-green">{hotel.hotelName}</span>
              <span className="block text-xs text-on-surface-variant">{hotel.city || hotel.location || "Sri Lanka"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MapView;
