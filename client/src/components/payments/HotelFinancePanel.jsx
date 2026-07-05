import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function HotelFinancePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [message, setMessage] = useState("");

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("dineforUser") || "null"); } catch { return null; }
  }, []);

  const headers = useMemo(() => ({ Authorization: `Bearer ${storedUser?.token}` }), [storedUser?.token]);

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payments/hotel-finance", { headers });
      setData(res.data);
      setMessage("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load hotel finance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (storedUser?.token) fetchFinance(); }, [storedUser?.token]);

  const markPaid = async (paymentId) => {
    const confirmed = window.confirm("Confirm that this Pay-at-Hotel amount was collected?");
    if (!confirmed) return;
    try {
      setActionId(paymentId);
      const res = await api.put(`/payments/${paymentId}/mark-paid`, {}, { headers });
      setMessage(res.data.message || "Payment marked as paid.");
      await fetchFinance();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to mark payment as paid.");
    } finally {
      setActionId("");
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get("/payments/export/csv", { headers, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `dinefor-hotel-finance-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage("CSV export failed.");
    }
  };

  if (loading) return <section className="hotel-panel"><p className="muted">Loading finance...</p></section>;
  const summary = data?.summary || {};

  return (
    <div className="hotel-portal-stack finance-upgrade">
      {message && <p className={message.toLowerCase().includes("fail") ? "error-text" : "success-text"}>{message}</p>}
      <section className="hotel-stat-grid finance-grid">
        <article className="hotel-stat-card"><span>Total Revenue</span><strong>{money(summary.totalRevenue)}</strong><small>Pending + paid value</small></article>
        <article className="hotel-stat-card"><span>Collected</span><strong>{money(summary.collectedRevenue)}</strong><small>Marked as paid</small></article>
        <article className="hotel-stat-card"><span>Today</span><strong>{money(summary.todayRevenue)}</strong><small>Today reservation value</small></article>
        <article className="hotel-stat-card"><span>This Week</span><strong>{money(summary.weekRevenue)}</strong><small>Last 7 days</small></article>
        <article className="hotel-stat-card"><span>Hotel Earning</span><strong>{money(summary.hotelEarning)}</strong><small>After DineFor commission</small></article>
        <article className="hotel-stat-card"><span>Refund Requests</span><strong>{summary.refundRequests || 0}</strong><small>Need admin review</small></article>
      </section>

      <section className="hotel-panel payment-panel">
        <div className="hotel-panel-head">
          <div><span className="eyebrow">Transactions</span><h2>Payment Collection Board</h2></div>
          <div className="payment-action-stack"><button className="mini-btn" onClick={fetchFinance}>Refresh</button><button className="mini-btn" onClick={exportCsv}>Export CSV</button></div>
        </div>
        <div className="payment-table-wrap">
          <table className="payment-table improved-payment-table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Buffet</th><th>Method</th><th>Status</th><th>Refund</th><th>Total</th><th>Hotel Earning</th><th>Action</th></tr></thead>
            <tbody>
              {(data?.payments || []).map((payment) => (
                <tr key={payment._id}>
                  <td><strong>{payment.invoiceNumber || "-"}</strong><br/><small>{new Date(payment.createdAt).toLocaleDateString()}</small></td>
                  <td>{payment.user?.name || "Customer"}<br/><small>{payment.user?.email || ""}</small></td>
                  <td>{payment.booking?.buffet?.title || payment.metadata?.buffetTitle || "Buffet"}</td>
                  <td>{payment.gateway}</td>
                  <td><span className={`payment-status ${payment.status}`}>{payment.status}</span></td>
                  <td><span className={`payment-status ${payment.refundStatus}`}>{payment.refundStatus || "none"}</span></td>
                  <td>{money(payment.amount)}</td>
                  <td>{money(payment.hotelEarning)}</td>
                  <td>{payment.status === "pending" && ["pay_at_hotel", "cash"].includes(payment.gateway) ? <button className="mini-btn success" disabled={actionId === payment._id} onClick={() => markPaid(payment._id)}>{actionId === payment._id ? "Saving..." : "Mark Paid"}</button> : <span className="muted">-</span>}</td>
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
