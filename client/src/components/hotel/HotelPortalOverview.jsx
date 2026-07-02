function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function HotelPortalOverview({ summary, onNavigate }) {
  const stats = summary?.stats || {};
  const recentBookings = summary?.recentBookings || [];
  const recentReviews = summary?.recentReviews || [];
  const buffets = summary?.buffets || [];

  const statCards = [
    ["Today’s Reservations", stats.todayReservations || 0, "Bookings scheduled for today"],
    ["Upcoming Guests", stats.upcomingGuests || 0, "Seats reserved in upcoming week"],
    ["Expected Revenue", money(stats.revenue), "Pay-at-hotel reservation value"],
    ["Active Buffets", `${stats.activeBuffets || 0}/${stats.totalBuffets || 0}`, "Currently visible buffet offers"],
    ["Average Rating", stats.averageRating || "0.0", "Guest satisfaction score"],
    ["Reviews", stats.totalReviews || 0, "Latest public guest feedback"],
  ];

  return (
    <div className="hotel-portal-stack">
      <section className="hotel-stat-grid">
        {statCards.map(([label, value, help]) => (
          <article className="hotel-stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{help}</small>
          </article>
        ))}
      </section>

      <section className="hotel-action-grid">
        <button onClick={() => onNavigate("reservations")}><strong>Reservation Center</strong><span>Search, filter, update status and view guest details.</span></button>
        <button onClick={() => onNavigate("buffets")}><strong>Buffet Manager</strong><span>Pause, resume, duplicate and manage active buffet offers.</span></button>
        <button onClick={() => onNavigate("media")}><strong>Media Library</strong><span>Maintain logo, cover, gallery photos and videos.</span></button>
        <button onClick={() => onNavigate("profile")}><strong>Profile Settings</strong><span>Update business details, location and public information.</span></button>
      </section>

      <section className="hotel-two-column">
        <div className="hotel-panel">
          <div className="hotel-panel-head">
            <div><span className="eyebrow">Operations</span><h2>Recent reservations</h2></div>
            <button className="mini-btn" onClick={() => onNavigate("reservations")}>View all</button>
          </div>
          {recentBookings.length === 0 ? <p className="muted">No reservations yet.</p> : (
            <div className="hotel-mini-list">
              {recentBookings.slice(0, 6).map((booking) => (
                <article key={booking._id}>
                  <div><strong>{booking.user?.name || "Guest"}</strong><span>{booking.buffet?.title || "Buffet"}</span></div>
                  <div><b>{booking.seats} seats</b><span>{formatDate(booking.selectedDate)} · {booking.selectedTimeSlot?.startTime}</span></div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="hotel-panel">
          <div className="hotel-panel-head">
            <div><span className="eyebrow">Guest Voice</span><h2>Latest reviews</h2></div>
            <button className="mini-btn" onClick={() => onNavigate("reviews")}>Manage</button>
          </div>
          {recentReviews.length === 0 ? <p className="muted">No reviews yet.</p> : (
            <div className="hotel-mini-list reviews">
              {recentReviews.slice(0, 5).map((review) => (
                <article key={review._id}>
                  <div><strong>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</strong><span>{review.user?.name || "Guest"}</span></div>
                  <p>{review.comment || "No written review."}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="hotel-panel">
        <div className="hotel-panel-head">
          <div><span className="eyebrow">Inventory</span><h2>Buffet health</h2></div>
          <button className="mini-btn" onClick={() => onNavigate("buffets")}>Open manager</button>
        </div>
        {buffets.length === 0 ? <p className="muted">No buffets created yet.</p> : (
          <div className="hotel-buffet-strip">
            {buffets.map((buffet) => (
              <article key={buffet._id}>
                <strong>{buffet.title}</strong>
                <span>{buffet.category} · Rs. {Number(buffet.price || 0).toLocaleString()}</span>
                <small className={buffet.isActive ? "status-pill success" : "status-pill warning"}>{buffet.isActive ? "Active" : "Paused"}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default HotelPortalOverview;
