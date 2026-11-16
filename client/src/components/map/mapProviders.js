// Configure VITE_GOOGLE_MAPS_API_KEY to enable Google Maps. Without it, the
// existing Leaflet map remains available so discovery continues to work.
export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
let googleMapsPromise;
export const loadGoogleMaps = () => {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (googleMapsPromise) return googleMapsPromise;
  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}&v=weekly`;
    script.async = true;
    script.onload = () => window.google?.maps ? resolve(window.google.maps) : reject(new Error("Google Maps did not initialize."));
    script.onerror = () => reject(new Error("Unable to load Google Maps. Check your API key and domain restrictions."));
    document.head.appendChild(script);
  });
  googleMapsPromise.catch(() => { googleMapsPromise = undefined; });
  return googleMapsPromise;
};
export async function loadLeaflet() {
  const [{ default: leaflet }] = await Promise.all([
    import("leaflet"),
    import("leaflet/dist/leaflet.css"),
  ]);
  return leaflet;
}
