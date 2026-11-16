import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_KEY, loadGoogleMaps, loadLeaflet } from "../components/map/mapProviders";

const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim();
const center = { lat: 7.87, lng: 80.77 };
const pair = pin => pin ? { lat: pin.latitude, lng: pin.longitude } : center;
const toPin = (latitude, longitude) => ({ latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) });

export default function ApplicationMap({ pin, setPin, address, disabled }) {
  const root = useRef(null);
  const provider = useRef(null);
  const handler = useRef(setPin);
  const latestPin = useRef(pin);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [latitude, setLatitude] = useState(pin?.latitude ?? "");
  const [longitude, setLongitude] = useState(pin?.longitude ?? "");
  const [google, setGoogle] = useState(false);

  useEffect(() => { handler.current = setPin; latestPin.current = pin; }, [setPin, pin]);

  useEffect(() => {
    if (!open || disabled) return;
    let alive = true;
    let cleanup = () => {};
    const onPoint = (lat, lng) => { if (alive) handler.current(toPin(lat, lng)); };

    async function initialise() {
      if (GOOGLE_MAPS_KEY && mapId) {
        try {
          const maps = await loadGoogleMaps();
          const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([maps.importLibrary("maps"), maps.importLibrary("marker")]);
          if (!alive) return;
          const map = new Map(root.current, { center: pair(latestPin.current), zoom: latestPin.current ? 14 : 7, mapId, mapTypeControl: false, streetViewControl: false });
          const marker = new AdvancedMarkerElement({ map: latestPin.current ? map : null, position: pair(latestPin.current), title: "Hotel location", gmpDraggable: true });
          const click = map.addListener("click", event => onPoint(event.latLng.lat(), event.latLng.lng()));
          const drag = marker.addListener("dragend", event => onPoint(event.latLng.lat(), event.latLng.lng()));
          provider.current = { position: next => { marker.map = next ? map : null; if (next) marker.position = pair(next); }, focus: next => { map.panTo(pair(next)); map.setZoom(15); }, maps };
          cleanup = () => { click.remove(); drag.remove(); marker.map = null; };
          setGoogle(true);
          return;
        } catch { if (!alive) return; }
      }
      try {
        const L = await loadLeaflet();
        if (!alive) return;
        const point = pair(latestPin.current);
        const map = L.map(root.current).setView([point.lat, point.lng], latestPin.current ? 14 : 7);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }).addTo(map);
        const marker = L.marker([point.lat, point.lng], { draggable: true, title: "Hotel location" });
        if (latestPin.current) marker.addTo(map);
        map.on("click", ({ latlng }) => onPoint(latlng.lat, latlng.lng));
        marker.on("dragend", () => { const value = marker.getLatLng(); onPoint(value.lat, value.lng); });
        provider.current = { position: next => {
          if (!next) { marker.remove(); return; }
          marker.setLatLng([next.latitude, next.longitude]);
          if (!map.hasLayer(marker)) marker.addTo(map);
        } };
        cleanup = () => map.remove();
      } catch {
        if (alive) setMessage("The map is unavailable. You can enter the address and coordinates below.");
      }
    }

    initialise();
    return () => { alive = false; cleanup(); provider.current = null; };
  }, [open, disabled]);

  useEffect(() => {
    provider.current?.position(pin);
    setLatitude(pin?.latitude ?? "");
    setLongitude(pin?.longitude ?? "");
  }, [pin]);

  function setCoordinates() {
    const lat = Number(latitude), lng = Number(longitude);
    if (!latitude || !longitude || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 5.8 || lat > 10.1 || lng < 79.4 || lng > 82) {
      setMessage("Enter valid coordinates within Sri Lanka.");
      return;
    }
    setMessage("");
    const next = toPin(lat, lng);
    setPin(next);
    provider.current?.focus?.(next);
  }

  async function searchGoogle() {
    if (!provider.current?.maps || pending) return;
    setPending(true);
    setMessage("");
    try {
      const { Geocoder } = await provider.current.maps.importLibrary("geocoding");
      const { results } = await new Geocoder().geocode({ address, componentRestrictions: { country: "LK" } });
      if (!results[0]) throw new Error();
      const location = results[0].geometry.location;
      const next = toPin(location.lat(), location.lng());
      setPin(next);
      provider.current?.focus?.(next);
    } catch { setMessage("That address could not be found. Place the pin manually or enter coordinates."); }
    finally { setPending(false); }
  }

  return <section className="df11-card df11-form">
    <h2>Map pin (optional)</h2>
    {!open ? <button type="button" disabled={disabled} className="df11-button secondary" onClick={() => setOpen(true)}>Open location map</button>
      : <><div ref={root} className="df11-map" aria-label="Hotel location map" />
        <p>Click the map to place the pin or drag it to the entrance.</p>
        {address && (google ? <button type="button" className="df11-button secondary" onClick={searchGoogle} disabled={pending}>Find address on Google Maps</button>
          : <a href={`https://www.openstreetmap.org/search?${new URLSearchParams({ query: address })}`} target="_blank" rel="noreferrer">Search address on OpenStreetMap</a>)}
      </>}
    <div className="df11-grid">
      <label>Latitude<input inputMode="decimal" value={latitude} disabled={disabled} onChange={e => setLatitude(e.target.value)} /></label>
      <label>Longitude<input inputMode="decimal" value={longitude} disabled={disabled} onChange={e => setLongitude(e.target.value)} /></label>
    </div>
    <div className="df11-actions"><button type="button" className="df11-button secondary" disabled={disabled} onClick={setCoordinates}>Use coordinates</button>
      {pin && <button type="button" className="df11-button secondary" disabled={disabled} onClick={() => setPin(null)}>Clear pin</button>}</div>
    {message && <p role="status">{message}</p>}
  </section>;
}
