import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const getBuffetImage = (item) => {
  const buffet = item?.buffet || item;
  const image = buffet?.images?.[0] || buffet?.image || buffet?.coverImage;
  if (!image) return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80";
  if (String(image).startsWith("http")) return image;
  return `http://localhost:5000${String(image).startsWith("/") ? image : `/uploads/${image}`}`;
};

const RecentlyViewed = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadRecentlyViewed = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/discovery/recently-viewed");
        if (!mounted) return;
        const list = Array.isArray(data) ? data : data?.items || data?.recentlyViewed || [];
        setItems(list);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || "Recently viewed items are not available yet.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadRecentlyViewed();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="page-shell">
      <section className="page-hero compact">
        <span className="eyebrow">Your activity</span>
        <h1>Recently viewed buffets</h1>
        <p>Return to buffets and hotels you explored recently.</p>
      </section>

      {loading && (
        <div className="feed-grid">
          {[1, 2, 3].map((item) => (
            <article className="feed-card" key={item}>
              <div className="loading-skeleton" style={{ height: 220 }} />
              <div className="feed-body">
                <div className="loading-skeleton" style={{ height: 22, marginBottom: 12 }} />
                <div className="loading-skeleton" style={{ height: 16, width: "70%" }} />
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && error && (
        <section className="panel empty-state">
          <span className="empty-state-icon">↻</span>
          <h2 className="empty-state-title">Recently viewed is not connected</h2>
          <p className="empty-state-description">{error}</p>
          <Link className="btn primary" to="/feed">Browse buffets</Link>
        </section>
      )}

      {!loading && !error && items.length === 0 && (
        <section className="panel empty-state">
          <span className="empty-state-icon">🍽️</span>
          <h2 className="empty-state-title">No recently viewed buffets yet</h2>
          <p className="empty-state-description">Start exploring and your recent buffets will appear here.</p>
          <Link className="btn primary" to="/feed">Explore buffets</Link>
        </section>
      )}

      {!loading && !error && items.length > 0 && (
        <section className="feed-grid">
          {items.map((item) => {
            const buffet = item?.buffet || item;
            const id = buffet?._id || buffet?.id || item?._id;
            return (
              <article className="feed-card" key={item?._id || id}>
                <div className="feed-image-wrap">
                  <img className="feed-image" src={getBuffetImage(item)} alt={buffet?.title || "Buffet"} />
                  {buffet?.buffetType && <span className={`badge type ${buffet.buffetType}`}>{buffet.buffetType}</span>}
                </div>
                <div className="feed-body">
                  <p className="hotel-link">{buffet?.hotel?.hotelName || buffet?.hotelName || "DineFor Hotel"}</p>
                  <h2>{buffet?.title || "Luxury buffet"}</h2>
                  <p className="muted line-clamp-2">{buffet?.description || "Premium buffet experience available on DineFor."}</p>
                  <div className="meta-row">
                    <span>{buffet?.category || "Buffet"}</span>
                    <span>LKR {Number(buffet?.price || 0).toLocaleString()}</span>
                  </div>
                  <Link className="btn primary wide" to={id ? `/buffets/${id}` : "/feed"}>View details</Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
};

export default RecentlyViewed;
