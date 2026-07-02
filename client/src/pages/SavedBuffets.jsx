import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import FeedCard from "../components/FeedCard";
import { useAuth } from "../context/AuthContext";
import SkeletonCard from "../components/shared/SkeletonCard";

function SavedBuffets() {
  const { token } = useAuth();
  const [buffets, setBuffets] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [activeTab, setActiveTab] = useState("buffets");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSaved = async () => {
    try {
      setLoading(true);
      const [buffetRes, hotelRes] = await Promise.all([
        api.get("/users/saved-buffets", { headers: { Authorization: `Bearer ${token}` } }),
        api.get("/customer/saved-hotels", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setBuffets(buffetRes.data || []);
      setHotels(hotelRes.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load saved items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchSaved(); }, [token]);

  return (
    <main className="feed-page saved-page df-customer-page">
      <section className="df-customer-hero compact">
        <div>
          <span className="eyebrow">Saved</span>
          <h1>Your DineFor wishlist</h1>
          <p>Saved buffets and favourite hotels are collected here for faster booking later.</p>
        </div>
        <Link className="btn primary" to="/feed">Find more</Link>
      </section>

      <div className="df-tabs">
        <button className={activeTab === "buffets" ? "active" : ""} type="button" onClick={() => setActiveTab("buffets")}>Saved Buffets ({buffets.length})</button>
        <button className={activeTab === "hotels" ? "active" : ""} type="button" onClick={() => setActiveTab("hotels")}>Favourite Hotels ({hotels.length})</button>
      </div>

      {message && <p className="error-text page-message">{message}</p>}
      {loading ? <div className="feed-grid masonry-lite"><SkeletonCard /><SkeletonCard /></div> : null}

      {!loading && activeTab === "buffets" && (
        buffets.length === 0 ? <section className="df-empty-state">No saved buffets yet.</section> : <div className="feed-grid masonry-lite">{buffets.map((buffet) => <FeedCard key={buffet._id} buffet={buffet} />)}</div>
      )}

      {!loading && activeTab === "hotels" && (
        hotels.length === 0 ? <section className="df-empty-state">No favourite hotels yet.</section> : <div className="df-similar-grid">{hotels.map((hotel) => (
          <Link className="df-similar-card" to={`/hotels/${hotel._id}`} key={hotel._id}>
            <img src={hotel.logo || hotel.coverMediaUrl || hotel.galleryImages?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945"} alt={hotel.hotelName} />
            <div><strong>{hotel.hotelName}</strong><span>📍 {hotel.city || hotel.location}</span><span>⭐ {hotel.averageRating || 0}</span></div>
          </Link>
        ))}</div>
      )}
    </main>
  );
}

export default SavedBuffets;
