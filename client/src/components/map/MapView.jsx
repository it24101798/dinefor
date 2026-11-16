import React, { useEffect, useMemo, useRef, useState } from "react";
import { GOOGLE_MAPS_KEY, loadGoogleMaps, loadLeaflet } from "./mapProviders";
import DiscoveryCard from "../../discovery/DiscoveryCard";

const DEFAULT_CENTER = [7.8731, 80.7718];
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
  if (hotel?.mapLocation?.latitude == null || hotel?.mapLocation?.longitude == null) return null;
  const latitude = Number(hotel?.mapLocation?.latitude);
  const longitude = Number(hotel?.mapLocation?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
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
  visible = true,
  position,
  date,
  guests,
}) {
  const rootRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [mapError, setMapError] = useState("");
  const googleRef = useRef(null);
  const googleMarkersRef = useRef([]);

  const mappedHotels = useMemo(
    () => hotels.filter((hotel) => coordinates(hotel)),
    [hotels]
  );

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return undefined;
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !rootRef.current) return;
      if (!googleRef.current) {
        googleRef.current = new maps.Map(rootRef.current, {
          center: { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] },
          zoom: 7, mapTypeControl: false, streetViewControl: false,
          fullscreenControl: true, gestureHandling: "greedy",
        });
      }
      googleMarkersRef.current.forEach((marker) => marker.setMap(null));
      googleMarkersRef.current = [];
      const bounds = new maps.LatLngBounds();
      mappedHotels.forEach((hotel) => {
        const point = coordinates(hotel);
        if (!point) return;
        const location = { lat: point[0], lng: point[1] };
        bounds.extend(location);
        const meta = metaByHotel[hotel._id] || {};
        const active = String(selectedHotel?._id || "") === String(hotel._id);
        const label = markerText(hotel, meta, markerMetric);
        const marker = new maps.Marker({
          map: googleRef.current, position: location,
          title: `${hotel.hotelName || "DineFor hotel"} — ${label}`,
          label: { text: label, color: "#ffffff", fontSize: "12px", fontWeight: "700" },
          icon: {
            path: maps.SymbolPath.CIRCLE, scale: Math.max(30, 7 + label.length * 3.2),
            fillColor: active ? "#004e49" : "#006b63", fillOpacity: 1,
            strokeColor: "#ffffff", strokeWeight: 2,
          },
        });
        marker.addListener("click", () => onSelectHotel?.(hotel));
        googleMarkersRef.current.push(marker);
      });
      if (selectedHotel) {
        const point = coordinates(selectedHotel);
        if (point) { googleRef.current.panTo({ lat: point[0], lng: point[1] }); googleRef.current.setZoom(Math.max(googleRef.current.getZoom() || 12, 12)); }
      } else if (position) {
        googleRef.current.setCenter({ lat: position[0], lng: position[1] });
        googleRef.current.setZoom(13);
      } else if (mappedHotels.length > 1) {
        googleRef.current.fitBounds(bounds, 70);
      } else if (mappedHotels.length === 1) {
        googleRef.current.setCenter(bounds.getCenter());
        googleRef.current.setZoom(13);
      }
      setMapError("");
    }).catch((error) => { if (!cancelled) setMapError(error.message || "Unable to load Google Maps."); });
    return () => { cancelled = true; };
  }, [mappedHotels, metaByHotel, markerMetric, selectedHotel, onSelectHotel, position]);

  useEffect(() => {
    if (GOOGLE_MAPS_KEY) return undefined;
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !rootRef.current) return;

        if (!mapRef.current) {
          mapRef.current = L.map(rootRef.current, {
            zoomControl: true,
            scrollWheelZoom: false,
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
          if (position) {
            mapRef.current.setView(position, 13);
          } else if (bounds.length > 1) {
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
  }, [mappedHotels, metaByHotel, markerMetric, selectedHotel, onSelectHotel, position]);

  useEffect(
    () => () => {
      googleMarkersRef.current.forEach((marker) => marker.setMap(null));
      googleMarkersRef.current = [];
      googleRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (!visible) return undefined;
    // Leaflet needs a resize after its container is shown on mobile.
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize?.();
      if (googleRef.current && window.google?.maps) {
        window.google.maps.event.trigger(googleRef.current, "resize");
      }
    }, 90);
    return () => clearTimeout(timer);
  }, [visible]);

  const buffet = selectedHotel && metaByHotel[selectedHotel._id]?.matchingBuffets?.[0];

  return <div className="df-map3-stage">
    <div ref={rootRef} className="df-map3-canvas" aria-label="Interactive DineFor hotel map" />
    {mapError && <div className="df-map3-error" role="status">{mapError} Open the List view to browse results.</div>}
    {buffet && <section className="df-buffet-map-preview" aria-label="Selected buffet">
      <button type="button" className="df-shell-secondary" onClick={() => onSelectHotel?.(null)}>Close preview</button>
      <DiscoveryCard buffet={buffet} compact date={date} guests={guests} />
    </section>}
  </div>;
}
