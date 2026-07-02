import { Link } from "react-router-dom";

function SimilarHotels({ hotels = [] }) {
  if (!hotels.length) return null;

  return (
    <section className="df-hotel-section">
      <div className="df-section-head">
        <span className="eyebrow">Nearby</span>
        <h2>Similar hotels</h2>
      </div>
      <div className="df-similar-grid">
        {hotels.map((hotel) => {
          const image = hotel.coverMediaUrl || hotel.galleryImages?.[0] || hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945";
          return (
            <Link className="df-similar-card" to={`/hotels/${hotel._id}`} key={hotel._id}>
              <img src={image} alt={hotel.hotelName} />
              <div>
                <strong>{hotel.hotelName}</strong>
                <span>📍 {hotel.city || hotel.location}</span>
                <span>⭐ {hotel.averageRating || 0} ({hotel.totalReviews || 0})</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default SimilarHotels;
