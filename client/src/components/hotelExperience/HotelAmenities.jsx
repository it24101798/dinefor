const defaultAmenities = ["Parking", "Family Friendly", "Air Conditioned", "Card Payments", "Reservations", "Buffet Dining"];

function HotelAmenities({ amenities = [], facilities = [], diningHighlights = [] }) {
  const items = [...amenities, ...facilities, ...diningHighlights].filter(Boolean);
  const displayItems = items.length ? items : defaultAmenities;

  return (
    <section className="df-hotel-section">
      <div className="df-section-head">
        <span className="eyebrow">Amenities</span>
        <h2>What this hotel offers</h2>
      </div>
      <div className="df-amenity-grid">
        {displayItems.map((item) => (
          <div className="df-amenity-card" key={item}>
            <span>✓</span>
            <strong>{item}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HotelAmenities;
