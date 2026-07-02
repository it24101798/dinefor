import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapView({ hotels }) {
  const defaultCenter = [6.9271, 79.8612];

  const firstHotelWithLocation = hotels.find(
    (hotel) => hotel.mapLocation?.latitude && hotel.mapLocation?.longitude
  );

  const center = firstHotelWithLocation
    ? [
        firstHotelWithLocation.mapLocation.latitude,
        firstHotelWithLocation.mapLocation.longitude,
      ]
    : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={true}
      style={{ width: "100%", height: "100%", minHeight: "680px", borderRadius: "22px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {hotels.map((hotel) => {
        const lat = hotel.mapLocation?.latitude;
        const lng = hotel.mapLocation?.longitude;

        if (!lat || !lng) return null;

        return (
          <Marker key={hotel._id} position={[lat, lng]} icon={markerIcon}>
            <Popup>
              <div style={{ minWidth: "190px" }}>
                <strong>{hotel.hotelName}</strong>
                <p style={{ margin: "6px 0" }}>{hotel.location}</p>
                <p style={{ margin: "6px 0" }}>⭐ {hotel.averageRating || 0}</p>
                <Link to={`/hotels/${hotel._id}`}>View Hotel</Link>
                {hotel.mapLocation?.googleMapUrl && (
                  <>
                    <br />
                    <a href={hotel.mapLocation.googleMapUrl} target="_blank" rel="noreferrer">
                      Open Google Maps
                    </a>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default MapView;
