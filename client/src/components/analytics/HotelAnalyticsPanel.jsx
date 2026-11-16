import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AnalyticsStatCards from "./AnalyticsStatCards";
import MonthlyTrendChart from "./MonthlyTrendChart";
import TopPerformersTable from "./TopPerformersTable";

function HotelAnalyticsPanel() {
  const { user } = useAuth();
  const token = user?.token;
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [analytics, setAnalytics] = useState(null);
  const [months, setMonths] = useState("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMessage("");
    const fetchAnalytics = async () => {
      try {
        const res = await api.get("/analytics/hotel", { headers, signal: controller.signal });
        if (!controller.signal.aborted) setAnalytics(res.data);
      } catch (error) {
        if (!controller.signal.aborted) setMessage(error.response?.data?.message || "Hotel analytics failed to load.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => controller.abort();
  }, [headers, attempt]);

  if (loading) return <p className="muted page-message">Loading hotel analytics...</p>;
  if (message) return <p className="error-text page-message" role="alert">{message} <button type="button" className="btn-outline" onClick={() => setAttempt((value) => value + 1)}>Try again</button></p>;
  if (!analytics) return null;

  return (
    <section className="analytics-dashboard-block reveal-card">
      <section className="analytics-title-card">
        <p className="eyebrow">Hotel Analytics</p>
        <h2>{analytics.hotel?.hotelName}</h2>
        <p>Track bookings, revenue value, popular buffets, reviews, and guest demand.</p>
      </section>

      <AnalyticsStatCards totals={analytics.totals} scope="hotel" />
      <label className="df-chart-filter">Chart period<select value={months} onChange={e=>setMonths(e.target.value)}><option value="all">All available months</option><option value="3">Last 3 available months</option><option value="6">Last 6 available months</option></select></label>
      <MonthlyTrendChart monthly={months === "all" ? analytics.monthly : (analytics.monthly || []).slice(-Number(months))} />
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
