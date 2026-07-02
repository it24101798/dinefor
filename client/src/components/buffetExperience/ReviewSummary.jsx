function ReviewSummary({ rating = 0, count = 0, reviews = [] }) {
  const rounded = Number(rating || 0).toFixed(1);
  const total = reviews.length || count || 0;

  const bars = [5, 4, 3, 2, 1].map((star) => {
    const starCount = reviews.filter((review) => Number(review.rating) === star).length;
    const percent = total ? Math.round((starCount / total) * 100) : star === 5 ? 82 : star === 4 ? 14 : star === 3 ? 3 : star === 2 ? 1 : 0;
    return { star, percent };
  });

  return (
    <section className="df-section-card df-review-summary-card">
      <div>
        <span className="df-eyebrow">Guest confidence</span>
        <h2>Reviews & ratings</h2>
        <p>Photo reviews and guest feedback help customers book with confidence.</p>
      </div>

      <div className="df-review-score">
        <strong>{rounded}</strong>
        <span>★★★★★</span>
        <small>{total} reviews</small>
      </div>

      <div className="df-rating-bars">
        {bars.map((bar) => (
          <div key={bar.star} className="df-rating-bar-row">
            <span>{bar.star}★</span>
            <div><i style={{ width: `${bar.percent}%` }} /></div>
            <small>{bar.percent}%</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ReviewSummary;
