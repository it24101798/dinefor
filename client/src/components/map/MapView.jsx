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
      if (window.L) return resolve(window.L);
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
  return price > 0 ? `LKR ${price.toLocaleString("en-LK")}` : "View buffets";
};

const markerText = (hotel, meta, metric) => {
  if (metric === "rating") return `${Number(hotel.averageRating || 0).toFixed(1)} ★`;
  if (metric === "reviews") return `${Number(hotel.totalReviews || 0)} reviews`;
  if (metric === "meal") return meta?.mealLabel || "Buffets";
  return priceText(meta?.minPrice);
};

const coordinates = (hotel) => {
  const latitude = Number(hotel?.mapLocation?.latitude);
  const longitude = Number(hotel?.mapLocation?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? [latitude, longitude]
    : null;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export default function MapView({
  hotels = [],
  metaByHotel = {},
  markerMetric = "price",
  selectedHotel,
  onSelectHotel,
}) {
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
            preferCanvas: true,
          }).setView(DEFAULT_CENTER, 7);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          }).addTo(mapRef.current);
        }

        if (layerRef.current) {
          layerRef.current.clearLayers();
        } else {
          layerRef.current = L.layerGroup().addTo(mapRef.current);
        }

        const bounds = [];

        mappedHotels.forEach((hotel) => {
          const point = coordinates(hotel);
          if (!point) return;

          bounds.push(point);
          const meta = metaByHotel[hotel._id] || {};
          const label = markerText(hotel, meta, markerMetric);
          const active = String(selectedHotel?._id || "") === String(hotel._id);

          const icon = L.divIcon({
            className: "df-map3-icon",
            html: `<div class="df-map3-pin ${active ? "is-active" : ""}"><strong>${escapeHtml(label)}</strong></div>`,
            iconSize: [108, 42],
            iconAnchor: [54, 42],
          });

          const marker = L.marker(point, {
            icon,
            keyboard: true,
            title: hotel.hotelName || "DineFor hotel",
          }).addTo(layerRef.current);

          marker.on("click", () => onSelectHotel?.(hotel));
        });

        if (!selectedHotel) {
          if (bounds.length > 1) {
            mapRef.current.fitBounds(bounds, {
              paddingTopLeft: [36, 90],
              paddingBottomRight: [36, 36],
              maxZoom: 13,
            });
          } else if (bounds.length === 1) {
            mapRef.current.setView(bounds[0], 13);
          }
        } else {
          const point = coordinates(selectedHotel);
          if (point) mapRef.current.panTo(point, { animate: true });
        }

        setTimeout(() => mapRef.current?.invalidateSize(), 20);
      })
      .catch((error) => setMapError(error.message || "Map failed to load."));

    return () => {
      cancelled = true;
    };
  }, [mappedHotels, metaByHotel, markerMetric, selectedHotel, onSelectHotel]);

  useEffect(
    () => () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    },
    []
  );

  const selectedMeta = selectedHotel
    ? metaByHotel[selectedHotel._id] || {}
    : null;

  const hero =
    selectedHotel?.coverMediaUrl ||
    selectedHotel?.images?.[0] ||
    selectedHotel?.galleryImages?.[0] ||
    "";

  return (
    <div className="df-map3-stage">
      <div
        ref={rootRef}
        className="df-map3-canvas"
        aria-label="Interactive DineFor hotel map"
      />

      {mapError && <div className="df-map3-error">{mapError}</div>}

      {selectedHotel && (
        <article className="df-map3-property" aria-live="polite">
          {hero ? (
            <img src={hero} alt={`${selectedHotel.hotelName || "Hotel"} preview`} />
          ) : (
            <div className="df-map3-placeholder" aria-hidden="true" />
          )}

          <div className="df-map3-property-body">
            <button
              type="button"
              className="df-map3-property-close"
              onClick={() => onSelectHotel?.(null)}
              aria-label="Close hotel preview"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3>{selectedHotel.hotelName}</h3>
            <p className="df-map3-property-location">
              {selectedHotel.city ||
                selectedHotel.location ||
                selectedHotel.district ||
                "Sri Lanka"}
            </p>

            <div className="df-map3-rating">
              <span className="df-map3-score">
                {Number(selectedHotel.averageRating || 0).toFixed(1)}
              </span>
              <span>{Number(selectedHotel.totalReviews || 0)} reviews</span>
            </div>

            <p className="df-map3-price">
              {priceText(selectedMeta?.minPrice)}
              <small>from / person</small>
            </p>

            <div className="df-map3-actions">
              <Link to={`/hotels/${selectedHotel._id}`} className="btn-outline">
                Hotel
              </Link>
              {selectedMeta?.matchingBuffets?.[0]?._id ? (
                <Link
                  to={`/buffets/${selectedMeta.matchingBuffets[0]._id}`}
                  className="btn-primary"
                >
                  View buffet
                </Link>
              ) : (
                <Link to="/buffets" className="btn-primary">
                  Browse buffets
                </Link>
              )}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
