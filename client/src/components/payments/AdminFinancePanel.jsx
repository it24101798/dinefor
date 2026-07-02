import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function AdminFinancePanel() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("dineforUser") || "null"); } catch { return null; }
  }, []);

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/payments/admin-finance?period=${period}`, {
        headers: { Authorization: `Bearer ${storedUser?.token}` },
      });
      setData(res.data);
      setMessage("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load finance dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (storedUser?.token) fetchFinance(); }, [period]);

  const summary = data?.summary || {};

  if (loading) return <section className="payment-panel"><p>Loading finance data...</p></section>;

  return (
    <section className="payment-panel">
      <div className="admin-toolbar-v2">
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="year">Last 12 months</option>
        </select>
        <button className="btn secondary" onClick={fetchFinance}>Refresh</button>
      </div>

      {message && <p className="error-text">{message}</p>}

      <div className="admin-stat-grid-v2 finance-grid">
        <div><span>Total Revenue</span><strong>{money(summary.totalRevenue)}</strong><small>All active payments</small></div>
        <div><span>Period Revenue</span><strong>{money(summary.periodRevenue)}</strong><small>Selected period</small></div>
        <div><span>DineFor Commission</span><strong>{money(summary.totalCommission)}</strong><small>Platform earning foundation</small></div>
        <div><span>Hotel Earnings</span><strong>{money(summary.hotelEarnings)}</strong><small>Estimated payout value</small></div>
        <div><span>Transactions</span><strong>{summary.transactions || 0}</strong><small>Payment records</small></div>
        <div><span>Pending</span><strong>{summary.pendingPayments || 0}</strong><small>Pay-at-hotel collections</small></div>
      </div>

      <h2>Recent Transactions</h2>
      <div className="payment-table-wrap">
        <table className="payment-table">
          <thead><tr><th>Invoice</th><th>Hotel</th><th>Customer</th><th>Gateway</th><th>Status</th><th>Total</th><th>Commission</th></tr></thead>
          <tbody>
            {(data?.payments || []).map((payment) => (
              <tr key={payment._id}>
                <td><strong>{payment.invoiceNumber || "-"}</strong></td>
                <td>{payment.hotel?.hotelName || payment.booking?.buffet?.hotel?.hotelName || "Hotel"}</td>
                <td>{payment.user?.name || "Customer"}</td>
                <td>{payment.gateway}</td>
                <td><span className={`payment-status ${payment.status}`}>{payment.status}</span></td>
                <td>{money(payment.amount)}</td>
                <td>{money(payment.commissionAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminFinancePanel;
