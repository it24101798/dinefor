import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import AnalyticsStatCards from "./AnalyticsStatCards";
import MonthlyTrendChart from "./MonthlyTrendChart";
import TopPerformersTable from "./TopPerformersTable";

function AdminAnalyticsPanel() {
  const storedUser = useMemo(() => JSON.parse(localStorage.getItem("dineforUser")), []);
  const token = storedUser?.token;
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [analytics, setAnalytics] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get("/analytics/admin", { headers });
        setAnalytics(res.data);
      } catch (error) {
        setMessage(error.response?.data?.message || "Admin analytics failed to load.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [headers]);

  if (loading) return <p className="muted page-message">Loading analytics...</p>;
  if (message) return <p className="error-text page-message">{message}</p>;
  if (!analytics) return null;

  return (
    <section className="analytics-dashboard-block">
      <AnalyticsStatCards totals={analytics.totals} scope="admin" />
      <MonthlyTrendChart monthly={analytics.monthly} />

      <div className="analytics-two-col">
        <TopPerformersTable title="Top Buffets by Revenue" rows={analytics.topBuffets} type="buffet" />
        <TopPerformersTable title="Top Hotels by Revenue" rows={analytics.topHotels} type="hotel" />
      </div>

      <section className="analytics-panel">
        <div className="analytics-panel-header">
          <div>
            <p className="eyebrow">Live Activity</p>
            <h2>Recent Bookings</h2>
          </div>
        </div>

        {analytics.recentBookings?.length ? (
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer</th>
                  <th>Buffet</th>
                  <th>Hotel</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.code}</td>
                    <td>{booking.customer}</td>
                    <td>{booking.buffet}</td>
                    <td>{booking.hotel}</td>
                    <td><span className={`status-pill ${booking.status}`}>{booking.status}</span></td>
                    <td>Rs. {Number(booking.totalAmount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No recent bookings yet.</p>
        )}
      </section>
    </section>
  );
}

export default AdminAnalyticsPanel;
