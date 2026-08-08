import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const DEFAULT_CENTER = [7.8731, 80.7718];
const LEAFLET_CSS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
let leafletPromise;

const loadLeaflet = () => {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Unable to load the map library."));
    document.body.appendChild(script);
  });
  return leafletPromise;
};

const priceText = (value) => {
  const price = Number(value || 0);
  return price > 0 ? `LKR ${price.toLocaleString()}` : "View buffets";
};

const markerText = (hotel, meta, metric) => {
  if (metric === "rating") return `${Number(hotel.averageRating || 0).toFixed(1)} ★`;
  if (metric === "reviews") return `${Number(hotel.totalReviews || 0)} reviews`;
  if (metric === "meal") return meta?.mealLabel || "Buffets";
  return priceText(meta?.minPrice);
};

const coordinates = (hotel) => {
  const lat = Number(hotel?.mapLocation?.latitude);
  const lng = Number(hotel?.mapLocation?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
};

export default function MapView({ hotels = [], metaByHotel = {}, markerMetric = "price", selectedHotel, onSelectHotel }) {
  const rootRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [mapError, setMapError] = useState("");

  const mappedHotels = useMemo(
    () => hotels.filter((hotel) => coordinates(hotel)),
    [hotels]
  );

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !rootRef.current) return;
        if (!mapRef.current) {
          mapRef.current = L.map(rootRef.current, {
            zoomControl: true,
            scrollWheelZoom: true,
          }).setView(DEFAULT_CENTER, 7);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          }).addTo(mapRef.current);
        }
        if (layerRef.current) layerRef.current.clearLayers();
        layerRef.current = L.layerGroup().addTo(mapRef.current);

        const bounds = [];
        mappedHotels.forEach((hotel) => {
          const point = coordinates(hotel);
          if (!point) return;
          bounds.push(point);
          const meta = metaByHotel[hotel._id] || {};
          const label = markerText(hotel, meta, markerMetric);
          const active = selectedHotel?._id === hotel._id;
          const icon = L.divIcon({
            className: "df-booking-map-icon",
            html: `<button class="df-booking-map-pin ${active ? "is-active" : ""}" type="button"><strong>${label}</strong></button>`,
            iconSize: [112, 40],
            iconAnchor: [56, 40],
          });
          const marker = L.marker(point, { icon }).addTo(layerRef.current);
          marker.on("click", () => onSelectHotel?.(hotel));
        });

        if (bounds.length > 1) {
          mapRef.current.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
        } else if (bounds.length === 1) {
          mapRef.current.setView(bounds[0], 13);
        }
        setTimeout(() => mapRef.current?.invalidateSize(), 0);
      })
      .catch((error) => setMapError(error.message || "Map failed to load."));
    return () => {
      cancelled = true;
    };
  }, [mappedHotels, metaByHotel, markerMetric, selectedHotel, onSelectHotel]);

  const selectedMeta = selectedHotel ? metaByHotel[selectedHotel._id] || {} : null;
  const hero = selectedHotel?.coverMediaUrl || selectedHotel?.images?.[0] || selectedHotel?.galleryImages?.[0] || "";

  return (
    <div className="df-booking-map-stage">
      <div ref={rootRef} className="df-booking-map-canvas" aria-label="Interactive hotel map" />
      {mapError && <div className="df-booking-map-error">{mapError}</div>}

      {selectedHotel && (
        <article className="df-map-property-card" aria-live="polite">
          {hero ? <img src={hero} alt="" /> : <div className="df-map-property-placeholder" />}
          <div className="df-map-property-content">
            <button type="button" className="df-map-property-close" onClick={() => onSelectHotel?.(null)} aria-label="Close hotel preview">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3>{selectedHotel.hotelName}</h3>
            <p className="df-map-property-location">{selectedHotel.city || selectedHotel.location || selectedHotel.district || "Sri Lanka"}</p>
            <div className="df-map-property-rating">
              <span className="df-map-score">{Number(selectedHotel.averageRating || 0).toFixed(1)}</span>
              <span>{Number(selectedHotel.totalReviews || 0)} reviews</span>
            </div>
            <p className="df-map-property-price">{priceText(selectedMeta?.minPrice)} <small>from / person</small></p>
            <div className="df-map-property-actions">
              <Link to={`/hotels/${selectedHotel._id}`} className="btn-outline">Hotel</Link>
              {selectedMeta?.matchingBuffets?.[0]?._id ? (
                <Link to={`/buffets/${selectedMeta.matchingBuffets[0]._id}`} className="btn-primary">View buffet</Link>
              ) : (
                <Link to="/buffets" className="btn-primary">Browse buffets</Link>
              )}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
