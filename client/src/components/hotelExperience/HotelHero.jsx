import FavoriteHotelButton from "../customer/FavoriteHotelButton";

function HotelHero({ hotel, reviewSummary }) {
  const galleryFallback = hotel?.galleryImages?.[0] || hotel?.images?.[0];
  const heroMedia = hotel?.coverMediaUrl || galleryFallback || "https://images.unsplash.com/photo-1566073771259-6a8506099945";
  const mapUrl = hotel?.mapLocation?.googleMapUrl;

  return (
    <section className="df-hotel-hero">
      <div className="df-hotel-hero-media">
        {hotel?.coverMediaType === "video" && hotel?.coverMediaUrl ? (
          <video src={heroMedia} autoPlay muted loop playsInline />
        ) : (
          <img src={heroMedia} alt={hotel?.hotelName || "Hotel"} />
        )}
      </div>
      <div className="df-hotel-hero-shade" />
      <div className="df-hotel-hero-content">
        <div className="df-hotel-identity">
          {hotel?.logo ? <img src={hotel.logo} alt={`${hotel.hotelName} logo`} /> : <span>{hotel?.hotelName?.slice(0, 1) || "D"}</span>}
        </div>
        <div className="df-chip-row">
          {hotel?.isApproved && <span className="df-chip success">Verified Partner</span>}
          <span className="df-chip">⭐ {reviewSummary?.average || hotel?.averageRating || 0} ({reviewSummary?.total || hotel?.totalReviews || 0} reviews)</span>
          <span className="df-chip">📍 {hotel?.city || hotel?.location || "Sri Lanka"}</span>
        </div>
        <h1>{hotel?.hotelName}</h1>
        <p>{hotel?.description || "Explore buffet experiences, photos, guest reviews and reservations from this hotel."}</p>
        <div className="df-hero-actions">
          <a className="btn primary" href="#hotel-buffets">Reserve Buffet</a>
          {mapUrl && <a className="btn secondary" href={mapUrl} target="_blank" rel="noreferrer">Directions</a>}
          {hotel?.contactNumber && <a className="btn secondary" href={`tel:${hotel.contactNumber}`}>Call Hotel</a>}
          <FavoriteHotelButton hotelId={hotel?._id} />
        </div>
      </div>
    </section>
  );
}

export default HotelHero;
