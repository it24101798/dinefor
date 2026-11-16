function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function MonthlyTrendChart({ monthly = [] }) {
  const maxRevenue = Math.max(...monthly.map((row) => Number(row.revenue || 0)), 1);

  return (
    <section className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <p className="eyebrow">Performance</p>
          <h2>Monthly Revenue Trend</h2>
        </div>
      </div>

      {monthly.length === 0 && <p className="muted">No monthly activity to display yet.</p>}
      <div className="simple-chart" aria-label="Monthly revenue chart">
        {monthly.map((row) => {
          const height = Math.max((Number(row.revenue || 0) / maxRevenue) * 100, 0);
          return (
            <div className="chart-column" key={row.key}>
              <span className="chart-value">{formatCurrency(row.revenue)}</span>
              <div className="chart-bar-wrap">
                <div className="chart-bar" role="img" aria-label={`${row.label}: ${formatCurrency(row.revenue)}, ${row.bookings || 0} bookings`} style={{ height: `${height}%` }} />
              </div>
              <strong>{row.label}</strong>
              <small>{row.bookings} bookings</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default MonthlyTrendChart;
