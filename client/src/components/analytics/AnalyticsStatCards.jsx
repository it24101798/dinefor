function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function AnalyticsStatCards({ totals = {}, scope = "admin" }) {
  const cards = scope === "hotel"
    ? [
        ["Revenue Value", formatCurrency(totals.revenue)],
        ["Bookings", totals.bookings || 0],
        ["Reserved Seats", totals.seats || 0],
        ["Average Rating", totals.averageRating ? `${totals.averageRating} ⭐` : "0 ⭐"],
        ["Reviews", totals.reviews || 0],
        ["Active Buffets", totals.activeBuffets || 0],
      ]
    : [
        ["Revenue Value", formatCurrency(totals.revenue)],
        ["Bookings", totals.bookings || 0],
        ["Reserved Seats", totals.seats || 0],
        ["Hotels", totals.hotels || 0],
        ["Pending Hotels", totals.pendingHotels || 0],
        ["Reviews", totals.reviews || 0],
      ];

  return (
    <section className="analytics-stat-grid">
      {cards.map(([label, value]) => (
        <article className="analytics-stat-card" key={label}>
          <p>{label}</p>
          <h3>{value}</h3>
        </article>
      ))}
    </section>
  );
}

export default AnalyticsStatCards;
