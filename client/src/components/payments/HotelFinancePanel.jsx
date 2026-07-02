import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function HotelFinancePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("dineforUser") || "null"); } catch { return null; }
  }, []);

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payments/hotel-finance", {
        headers: { Authorization: `Bearer ${storedUser?.token}` },
      });
      setData(res.data);
      setMessage("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load hotel finance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (storedUser?.token) fetchFinance(); }, []);

  if (loading) return <section className="hotel-panel"><p className="muted">Loading finance...</p></section>;
  const summary = data?.summary || {};

  return (
    <div className="hotel-portal-stack">
      {message && <p className="error-text">{message}</p>}
      <section className="hotel-stat-grid finance-grid">
        <article className="hotel-stat-card"><span>Total Revenue</span><strong>{money(summary.totalRevenue)}</strong><small>Pay-at-hotel and paid bookings</small></article>
        <article className="hotel-stat-card"><span>Today</span><strong>{money(summary.todayRevenue)}</strong><small>Today reservation value</small></article>
        <article className="hotel-stat-card"><span>This Week</span><strong>{money(summary.weekRevenue)}</strong><small>Last 7 days</small></article>
        <article className="hotel-stat-card"><span>This Month</span><strong>{money(summary.monthRevenue)}</strong><small>Last 30 days</small></article>
        <article className="hotel-stat-card"><span>Hotel Earning</span><strong>{money(summary.hotelEarning)}</strong><small>After DineFor commission</small></article>
        <article className="hotel-stat-card"><span>Pending Payments</span><strong>{summary.pendingPayments || 0}</strong><small>Collect at hotel</small></article>
      </section>

      <section className="hotel-panel payment-panel">
        <div className="hotel-panel-head"><div><span className="eyebrow">Transactions</span><h2>Payment Records</h2></div><button className="mini-btn" onClick={fetchFinance}>Refresh</button></div>
        <div className="payment-table-wrap">
          <table className="payment-table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Buffet</th><th>Status</th><th>Total</th><th>Hotel Earning</th></tr></thead>
            <tbody>
              {(data?.payments || []).map((payment) => (
                <tr key={payment._id}>
                  <td><strong>{payment.invoiceNumber || "-"}</strong></td>
                  <td>{payment.user?.name || "Customer"}</td>
                  <td>{payment.booking?.buffet?.title || payment.metadata?.buffetTitle || "Buffet"}</td>
                  <td><span className={`payment-status ${payment.status}`}>{payment.status}</span></td>
                  <td>{money(payment.amount)}</td>
                  <td>{money(payment.hotelEarning)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default HotelFinancePanel;
