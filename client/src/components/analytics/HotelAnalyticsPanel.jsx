import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import AnalyticsStatCards from "./AnalyticsStatCards";
import MonthlyTrendChart from "./MonthlyTrendChart";
import TopPerformersTable from "./TopPerformersTable";

function HotelAnalyticsPanel() {
  const storedUser = useMemo(() => JSON.parse(localStorage.getItem("dineforUser")), []);
  const token = storedUser?.token;
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [analytics, setAnalytics] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/analytics/hotel", { headers });
        setAnalytics(res.data);
      } catch (error) {
        setMessage(error.response?.data?.message || "Hotel analytics failed to load.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [headers]);

  if (loading) return <p className="muted page-message">Loading hotel analytics...</p>;
  if (message) return <p className="error-text page-message">{message}</p>;
  if (!analytics) return null;

  return (
    <section className="analytics-dashboard-block reveal-card">
      <section className="analytics-title-card">
        <p className="eyebrow">Hotel Analytics</p>
        <h2>{analytics.hotel?.hotelName}</h2>
        <p>Track bookings, revenue value, popular buffets, reviews, and guest demand.</p>
      </section>

      <AnalyticsStatCards totals={analytics.totals} scope="hotel" />
      <MonthlyTrendChart monthly={analytics.monthly} />
      <TopPerformersTable title="Best Performing Buffets" rows={analytics.topBuffets} type="buffet" />

      <div className="analytics-two-col">
        <section className="analytics-panel">
          <div className="analytics-panel-header">
            <div>
              <p className="eyebrow">Reservations</p>
              <h2>Latest Bookings</h2>
            </div>
          </div>

          {analytics.upcomingBookings?.length ? (
            <div className="mini-list">
              {analytics.upcomingBookings.map((booking) => (
                <article key={booking.id} className="mini-list-card">
                  <strong>{booking.buffet}</strong>
                  <span>{booking.customer} • {booking.seats} seats • Rs. {Number(booking.amount || 0).toLocaleString()}</span>
                  <small>{new Date(booking.date).toLocaleDateString()} • {booking.time}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No bookings yet.</p>
          )}
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-header">
            <div>
              <p className="eyebrow">Guest Voice</p>
              <h2>Recent Reviews</h2>
            </div>
          </div>

          {analytics.recentReviews?.length ? (
            <div className="mini-list">
              {analytics.recentReviews.map((review) => (
                <article key={review.id} className="mini-list-card">
                  <strong>{"⭐".repeat(review.rating)} {review.buffet}</strong>
                  <span>{review.customer}</span>
                  <small>{review.comment || "No written comment"}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No reviews yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}

export default HotelAnalyticsPanel;
