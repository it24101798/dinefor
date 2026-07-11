import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import AvailabilityBadge from "./AvailabilityBadge";
import { getPrimaryMedia, getTotalAvailableSeats } from "../../services/discoveryService";

function DiscoveryFeedCard({ buffet, guests = 1 }) {
  const navigate = useNavigate();
  const { token, isLoggedIn } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const media = getPrimaryMedia(buffet);
  const firstVideo = buffet?.videos?.[0];
  const firstSlot = buffet?.timeSlots?.[0];
  const seatsLeft = getTotalAvailableSeats(buffet);
  const rating = Number(buffet.averageRating || buffet.hotel?.averageRating || 0);
  const price = Number(buffet.price || 0);

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

  const shareBuffet = async () => {
    const url = `${window.location.origin}/buffets/${buffet._id}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: buffet.title, text: "Check this buffet on DineFor", url });
        return;
      } catch {
        // user cancelled native share
      }
    }

    await navigator.clipboard?.writeText(url);
    alert("Buffet link copied.");
  };

  return (
    <article className="stitch-buffet-card">
      <Link className="stitch-card-media" to={`/buffets/${buffet._id}`}>
        <img src={media} alt={buffet.title} />
        {firstVideo && (
          <video
            src={firstVideo}
            muted
            loop
            playsInline
            preload="metadata"
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        )}
        <div className="stitch-card-gradient" />
        <div className="stitch-card-badges">
          <span className="stitch-rating-badge">★ {rating.toFixed(1)}</span>
          {buffet.isFeatured && <span className="stitch-featured-badge">Featured</span>}
        </div>
        <button
          className={`stitch-save-float ${saved ? "active" : ""}`}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleSave();
          }}
          disabled={saving}
          aria-label={saved ? "Remove saved buffet" : "Save buffet"}
        >
          {saved ? "♥" : "♡"}
        </button>
      </Link>

      <div className="stitch-card-body">
        <div className="stitch-card-title-row">
          <div>
            <Link to={`/hotels/${buffet.hotel?._id}`} className="stitch-hotel-link">
              {buffet.hotel?.logo ? <img src={buffet.hotel.logo} alt="" /> : <span>D</span>}
              {buffet.hotel?.hotelName || "Hotel Partner"}
            </Link>
            <Link to={`/buffets/${buffet._id}`} className="stitch-card-title">
              <h2>{buffet.title}</h2>
            </Link>
          </div>
          <div className="stitch-price">
            <strong>Rs. {price.toLocaleString()}</strong>
            <span>/ person</span>
          </div>
        </div>

        <p className="stitch-location">📍 {buffet.location?.city || buffet.hotel?.city || buffet.hotel?.location || "Sri Lanka"}</p>
        <p className="stitch-card-description">
          {buffet.description?.slice(0, 115) || "Premium buffet experience available for online reservation."}
        </p>

        <div className="stitch-meta-row">
          <span>🍽️ {buffet.category || "Dining"}</span>
          <span>{buffet.buffetType || "buffet"}</span>
          {firstSlot && <span>🕒 {firstSlot.startTime} - {firstSlot.endTime}</span>}
        </div>

        <div className="stitch-card-footer">
          <div>
            <AvailabilityBadge buffet={buffet} guests={guests} />
            <p>{seatsLeft > 0 ? "Book before it fills" : "Try another date"}</p>
          </div>
          <div className="stitch-card-actions">
            <Link to={`/buffets/${buffet._id}`} className="stitch-primary-btn">Reserve</Link>
            <button className="stitch-mini-btn" type="button" onClick={shareBuffet}>Share</button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default DiscoveryFeedCard;
