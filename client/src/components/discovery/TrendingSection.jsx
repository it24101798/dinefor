import { Link } from "react-router-dom";
import { getPrimaryMedia, getTotalAvailableSeats } from "../../services/discoveryService";

function TrendingSection({ buffets = [], loading = false }) {
  const trending = [...buffets]
    .sort((a, b) => {
      const ratingGap = Number(b.averageRating || 0) - Number(a.averageRating || 0);
      if (ratingGap !== 0) return ratingGap;
      return getTotalAvailableSeats(a) - getTotalAvailableSeats(b);
    })
    .slice(0, 3);

  if (loading || trending.length === 0) return null;

  const [lead, ...rest] = trending;

  return (
    <section className="df-trending-section">
      <div className="df-section-heading">
        <p className="df-kicker">Trending now</p>
        <h2>Buffets guests are checking today</h2>
      </div>

      <div className="df-trending-grid">
        <Link to={`/buffets/${lead._id}`} className="df-trending-hero-card">
          <img src={getPrimaryMedia(lead)} alt={lead.title} />
          <div className="df-trending-overlay" />
          <div className="df-trending-content">
            <span className="df-pill warm">Most viewed</span>
            <h3>{lead.title}</h3>
            <p>{lead.hotel?.hotelName || "Hotel Partner"} · {lead.location?.city || lead.hotel?.location || "Sri Lanka"}</p>
            <div className="df-trending-meta">
              <span>⭐ {Number(lead.averageRating || 0).toFixed(1)}</span>
              <span>Rs. {Number(lead.price || 0).toLocaleString()}</span>
              <span>{getTotalAvailableSeats(lead)} seats left</span>
            </div>
          </div>
        </Link>

        <div className="df-trending-side">
          {rest.map((buffet) => (
            <Link to={`/buffets/${buffet._id}`} className="df-mini-trending-card" key={buffet._id}>
              <img src={getPrimaryMedia(buffet)} alt={buffet.title} />
              <div>
                <strong>{buffet.title}</strong>
                <span>{buffet.hotel?.hotelName || "Hotel Partner"}</span>
                <small>⭐ {Number(buffet.averageRating || 0).toFixed(1)} · Rs. {Number(buffet.price || 0).toLocaleString()}</small>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrendingSection;
