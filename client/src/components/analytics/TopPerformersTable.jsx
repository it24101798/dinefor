function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function TopPerformersTable({ title = "Top Performers", rows = [], type = "buffet" }) {
  return (
    <section className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <p className="eyebrow">Insights</p>
          <h2>{title}</h2>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="muted">No analytics data yet. Create bookings and reviews to see insights.</p>
      ) : (
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>{type === "hotel" ? "Hotel" : "Buffet"}</th>
                {type !== "hotel" && <th>Hotel</th>}
                <th>Bookings</th>
                <th>Seats</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id || row.title || row.hotelName}>
                  <td>{type === "hotel" ? row.hotelName : row.title}</td>
                  {type !== "hotel" && <td>{row.hotelName}</td>}
                  <td>{row.bookings}</td>
                  <td>{row.seats}</td>
                  <td>{formatCurrency(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default TopPerformersTable;
