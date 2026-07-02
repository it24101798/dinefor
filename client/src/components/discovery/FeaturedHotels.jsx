import { Link } from "react-router-dom";

function FeaturedHotels({ buffets = [] }) {
  const hotelMap = new Map();

  buffets.forEach((buffet) => {
    const hotel = buffet.hotel;
    if (!hotel?._id || hotelMap.has(hotel._id)) return;
    hotelMap.set(hotel._id, {
      ...hotel,
      buffetCount: buffets.filter((item) => item.hotel?._id === hotel._id).length,
      sampleImage: hotel.coverImage || hotel.coverMediaUrl || buffet.thumbnail || buffet.images?.[0],
      rating: hotel.averageRating || buffet.averageRating || 0,
    });
  });

  const hotels = [...hotelMap.values()].slice(0, 6);
  if (hotels.length === 0) return null;

  return (
    <section className="df-featured-hotels">
      <div className="df-section-heading horizontal">
        <div>
          <p className="df-kicker">Trusted partners</p>
          <h2>Featured hotels</h2>
        </div>
        <Link to="/map" className="df-text-link">Explore on map</Link>
      </div>

      <div className="df-hotel-carousel">
        {hotels.map((hotel) => (
          <Link to={`/hotels/${hotel._id}`} className="df-hotel-feature-card" key={hotel._id}>
            <img src={hotel.sampleImage || "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa"} alt={hotel.hotelName} />
            <div className="df-hotel-feature-body">
              <div className="df-hotel-logo-sm">
                {hotel.logo ? <img src={hotel.logo} alt="" /> : <span>{hotel.hotelName?.charAt(0) || "H"}</span>}
              </div>
              <div>
                <strong>{hotel.hotelName}</strong>
                <span>📍 {hotel.city || hotel.location || "Sri Lanka"}</span>
                <small>⭐ {Number(hotel.rating || 0).toFixed(1)} · {hotel.buffetCount} buffet{hotel.buffetCount === 1 ? "" : "s"}</small>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default FeaturedHotels;
