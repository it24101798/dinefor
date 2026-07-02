import { Link } from "react-router-dom";

function SimilarBuffets({ buffets = [], currentId }) {
  const items = buffets.filter((item) => item?._id !== currentId).slice(0, 4);
  if (!items.length) return null;

  return (
    <section className="df-similar-section">
      <div className="df-section-title-row">
        <div>
          <span className="df-eyebrow">More experiences</span>
          <h2>Similar buffets</h2>
        </div>
      </div>

      <div className="df-similar-grid">
        {items.map((item) => (
          <Link className="df-similar-card" to={`/buffets/${item._id}`} key={item._id}>
            <img src={item.images?.[0] || "https://images.unsplash.com/photo-1555244162-803834f70033"} alt={item.title} />
            <div>
              <span>{item.category || item.buffetType || "Buffet"}</span>
              <h3>{item.title}</h3>
              <p>{item.hotel?.hotelName || item.location?.city || "DineFor hotel"}</p>
              <strong>Rs. {Number(item.price || 0).toLocaleString()}</strong>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default SimilarBuffets;
