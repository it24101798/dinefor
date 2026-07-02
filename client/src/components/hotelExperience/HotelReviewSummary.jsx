function HotelReviewSummary({ summary, reviews = [] }) {
  const total = summary?.total || reviews.length || 0;
  const distribution = summary?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  return (
    <section className="df-hotel-section">
      <div className="df-section-head">
        <span className="eyebrow">Reviews</span>
        <h2>Guest rating summary</h2>
      </div>
      <div className="df-review-summary">
        <div className="df-review-score">
          <strong>{summary?.average || 0}</strong>
          <span>⭐ {summary?.label || "No reviews yet"}</span>
          <p>{total} guest reviews</p>
        </div>
        <div className="df-review-bars">
          {[5, 4, 3, 2, 1].map((star) => {
            const value = distribution[star] || 0;
            const width = total ? Math.round((value / total) * 100) : 0;
            return (
              <div className="df-review-bar" key={star}>
                <span>{star}★</span>
                <div><b style={{ width: `${width}%` }} /></div>
                <em>{value}</em>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HotelReviewSummary;
