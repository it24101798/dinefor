import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const fallbackImage = "https://images.unsplash.com/photo-1555244162-803834f70033";
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

const resolveMedia = (value) => {
  if (!value) return fallbackImage;
  if (value.startsWith("http") || value.startsWith("data:")) return value;
  if (value.startsWith("/uploads")) return `${API_ORIGIN}${value}`;
  if (value.startsWith("uploads")) return `${API_ORIGIN}/${value}`;
  return value;
};

function RecentlyViewed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadItems = async () => {
    try {
      setLoading(true);
      setMessage("");
      const res = await api.get("/discovery/recently-viewed");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Recently viewed items could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <main className="qa-page-shell recently-viewed-page">
      <section className="qa-hero-card">
        <span className="eyebrow">Customer History</span>
        <h1>Recently Viewed Buffets</h1>
        <p>Continue browsing buffets and hotels you opened during your discovery journey.</p>
      </section>

      {message && <p className="error-text page-message">{message}</p>}
      {loading && <p className="muted page-message">Loading recently viewed buffets...</p>}

      {!loading && !items.length ? (
        <section className="qa-empty-card">
          <h2>No recently viewed buffets yet</h2>
          <p>Open buffet detail pages from Discover. They will appear here automatically.</p>
          <Link to="/discover" className="btn primary">Open Discover</Link>
        </section>
      ) : (
        <section className="qa-card-grid">
          {items.map((buffet) => (
            <Link key={buffet._id} to={`/buffets/${buffet._id}`} className="qa-buffet-card">
              <img src={resolveMedia(buffet.thumbnail || buffet.images?.[0])} alt={buffet.title} />
              <div>
                <span className="status-pill approved">{buffet.category || buffet.buffetType || "Buffet"}</span>
                <h2>{buffet.title}</h2>
                <p>{buffet.hotel?.hotelName || "Hotel partner"}</p>
                <strong>Rs. {Number(buffet.price || 0).toLocaleString()}</strong>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

export default RecentlyViewed;
