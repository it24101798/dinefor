import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

function FeedCard({ buffet }) {
  const firstSlot = buffet.timeSlots?.[0];
  const firstVideo = buffet.videos?.[0];
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleSave = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    try {
      setSaving(true);
      const res = await axios.put(
        `http://localhost:5000/api/users/saved-buffets/${buffet._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSaved(res.data.saved);
    } catch (error) {
      alert(error.response?.data?.message || "Could not update saved buffet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="feed-card reveal-card discovery-card">
      <Link to={`/buffets/${buffet._id}`} className="feed-card-media discovery-media-link">
        <img src={buffet.images?.[0] || "https://images.unsplash.com/photo-1555244162-803834f70033"} alt={buffet.title} />
        {firstVideo && <video src={firstVideo} muted loop playsInline preload="metadata" onMouseEnter={(e) => e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} />}
        {buffet.isFeatured && <span className="badge gold">Featured</span>}
        <span className={`badge ${buffet.buffetType === "special" ? "red" : "blue"}`}>{buffet.buffetType}</span>
      </Link>

      <div className="feed-card-body">
        <Link to={`/hotels/${buffet.hotel?._id}`} className="hotel-link">{buffet.hotel?.hotelName || "Hotel Partner"}</Link>
        <h2>{buffet.title}</h2>
        <p className="muted-text">{buffet.description?.slice(0, 120) || "Premium dining experience available for reservation."}</p>
        <div className="meta-row"><span>{buffet.category || "Dining"}</span><span>Rs. {buffet.price}</span><span>⭐ {buffet.averageRating || 0} ({buffet.totalReviews || 0})</span></div>
        {firstSlot && <p className="slot-line">{firstSlot.startTime} - {firstSlot.endTime} • {firstSlot.availableSeats} seats left</p>}
        <div className="action-row">
          <Link to={`/buffets/${buffet._id}`} className="btn primary grow">Reserve</Link>
          <button className={`btn ghost ${saved ? "saved-active" : ""}`} type="button" onClick={toggleSave} disabled={saving}>{saved ? "♥ Saved" : "♡ Save"}</button>
        </div>
      </div>
    </div>
  );
}

export default FeedCard;
