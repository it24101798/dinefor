function DashboardStats({ hotel, bookings, myBuffets }) {
  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  const totalSlots = myBuffets.reduce((sum, b) => sum + (b.timeSlots?.length || 0), 0);
  const totalRemainingSeats = myBuffets.reduce(
    (sum, b) => sum + (b.timeSlots || []).reduce((s, slot) => s + Number(slot.availableSeats || 0), 0),
    0
  );

  return (
    <section className="stats-grid reveal-card">
      <div className="stat-card">
        <span>Hotel Status</span>
        <strong>{hotel?.isApproved ? "Approved" : "Pending"}</strong>
      </div>
      <div className="stat-card">
        <span>Buffets</span>
        <strong>{myBuffets.length}</strong>
      </div>
      <div className="stat-card">
        <span>Time Slots</span>
        <strong>{totalSlots}</strong>
      </div>
      <div className="stat-card">
        <span>Seats Left</span>
        <strong>{totalRemainingSeats}</strong>
      </div>
      <div className="stat-card">
        <span>Reservations</span>
        <strong>{bookings.length}</strong>
      </div>
      <div className="stat-card">
        <span>Revenue Value</span>
        <strong>Rs. {totalRevenue}</strong>
      </div>
    </section>
  );
}

export default DashboardStats;
