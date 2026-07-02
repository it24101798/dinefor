import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import MapView from "../components/map/MapView";

function ExploreMap() {
  const [hotels, setHotels] = useState([]);
  const [buffets, setBuffets] = useState([]);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hotelRes, buffetRes] = await Promise.all([
        axios.get("http://localhost:5000/api/hotels/map", {
          params: { q: query, city },
        }),
        axios.get("http://localhost:5000/api/buffets"),
      ]);

      setHotels(hotelRes.data);
      setBuffets(buffetRes.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const visibleBuffets = useMemo(() => {
    const hotelIds = hotels.map((hotel) => hotel._id);
    return buffets.filter((buffet) => hotelIds.includes(buffet.hotel?._id));
  }, [hotels, buffets]);

  return (
    <main className="map-page">
      <section className="map-hero">
        <div>
          <span className="map-eyebrow">Explore by location</span>
          <h1>Find buffets around you</h1>
          <p>Search hotels, cities, and buffet experiences with a map-first discovery view.</p>
        </div>

        <div className="map-search-card">
          <input
            placeholder="Search hotel, city, area..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <input
            placeholder="City e.g. Colombo"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <button onClick={fetchData}>Search</button>
        </div>
      </section>

      <section className="map-layout">
        <div className="map-results">
          <div className="map-results-header">
            <h2>{loading ? "Searching..." : `${visibleBuffets.length} buffet options`}</h2>
            <p>{hotels.length} hotels with map locations</p>
          </div>

          <div className="map-card-list">
            {visibleBuffets.map((buffet) => (
              <article className="map-buffet-card" key={buffet._id}>
                <img
                  src={
                    buffet.images?.[0] ||
                    "https://images.unsplash.com/photo-1555244162-803834f70033"
                  }
                  alt={buffet.title}
                />

                <div>
                  <Link to={`/hotels/${buffet.hotel?._id}`} className="hotel-link">
                    {buffet.hotel?.hotelName}
                  </Link>
                  <h3>{buffet.title}</h3>
                  <p>{buffet.category} • {buffet.buffetType}</p>
                  <strong>Rs. {buffet.price}</strong>
                  <div className="map-actions">
                    <Link to={`/buffets/${buffet._id}`}>Reserve</Link>
                    {buffet.hotel?.mapLocation?.googleMapUrl && (
                      <a href={buffet.hotel.mapLocation.googleMapUrl} target="_blank" rel="noreferrer">
                        Maps
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="map-panel">
          <MapView hotels={hotels} />
        </div>
      </section>
    </main>
  );
}

export default ExploreMap;
