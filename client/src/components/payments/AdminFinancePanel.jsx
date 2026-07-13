import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function AdminFinancePanel() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("month");
  const [status, setStatus] = useState("all");
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
      const res = await api.get(`/payments/admin-finance?period=${period}&status=${status}`, { headers });
      setData(res.data);
      setMessage("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load finance dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (storedUser?.token) fetchFinance(); }, [period, status, storedUser?.token]);

  const updateStatus = async (paymentId, nextStatus) => {
    if (!nextStatus) return;
    try {
      setActionId(paymentId);
      const res = await api.put(`/payments/${paymentId}/status`, { status: nextStatus, note: `Admin changed payment status to ${nextStatus}.` }, { headers });
      setMessage(res.data.message || "Payment status updated.");
      await fetchFinance();
    } catch (error) {
      setMessage(error.response?.data?.message || "Payment status update failed.");
    } finally {
      setActionId("");
    }
  };

  const refundAction = async (paymentId, action) => {
    try {
      setActionId(paymentId);
      const res = await api.put(`/payments/${paymentId}/refund-action`, { action, note: `Admin refund ${action}.` }, { headers });
      setMessage(res.data.message || "Refund action completed.");
      await fetchFinance();
    } catch (error) {
      setMessage(error.response?.data?.message || "Refund action failed.");
    } finally {
      setActionId("");
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get(`/payments/export/csv?status=${status}`, { headers, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `dinefor-admin-finance-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage("CSV export failed.");
    }
  };

  const summary = data?.summary || {};
  if (loading) return <section className="payment-panel"><p>Loading finance data...</p></section>;

  return (
    <section className="payment-panel finance-upgrade admin-feature-panel">
      <div className="admin-toolbar-v2 payment-finance-toolbar">
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="year">Last 12 months</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <button className="btn secondary" onClick={fetchFinance}>Refresh</button>
        <button className="btn secondary" onClick={exportCsv}>Export CSV</button>
      </div>

      {message && <p className={message.toLowerCase().includes("fail") ? "error-text" : "success-text"}>{message}</p>}

      <div className="admin-stat-grid-v2 finance-grid">
        <div><span>Total Revenue</span><strong>{money(summary.totalRevenue)}</strong><small>Pending + paid payments</small></div>
        <div><span>Collected Revenue</span><strong>{money(summary.collectedRevenue)}</strong><small>Payments marked as paid</small></div>
        <div><span>DineFor Commission</span><strong>{money(summary.totalCommission)}</strong><small>Platform earning foundation</small></div>
        <div><span>Hotel Earnings</span><strong>{money(summary.hotelEarnings)}</strong><small>Estimated payout value</small></div>
        <div><span>Refund Requests</span><strong>{summary.refundRequests || 0}</strong><small>Require admin decision</small></div>
        <div><span>Pending</span><strong>{summary.pendingPayments || 0}</strong><small>Pay-at-hotel collections</small></div>
      </div>

      <h2>Finance Control Ledger</h2>
      <div className="payment-table-wrap">
        <table className="payment-table improved-payment-table">
          <thead><tr><th>Invoice</th><th>Hotel</th><th>Customer</th><th>Gateway</th><th>Status</th><th>Refund</th><th>Total</th><th>Commission</th><th>Actions</th></tr></thead>
          <tbody>
            {(data?.payments || []).map((payment) => (
              <tr key={payment._id}>
                <td><strong>{payment.invoiceNumber || "-"}</strong><br/><small>{new Date(payment.createdAt).toLocaleDateString()}</small></td>
                <td>{payment.hotel?.hotelName || payment.booking?.buffet?.hotel?.hotelName || "Hotel"}</td>
                <td>{payment.user?.name || "Customer"}</td>
                <td>{payment.gateway}</td>
                <td><span className={`payment-status ${payment.status}`}>{payment.status}</span></td>
                <td><span className={`payment-status ${payment.refundStatus}`}>{payment.refundStatus || "none"}</span></td>
                <td>{money(payment.amount)}</td>
                <td>{money(payment.commissionAmount)}</td>
                <td className="payment-row-actions">
                  <select disabled={actionId === payment._id} defaultValue="" onChange={(e) => updateStatus(payment._id, e.target.value)}>
                    <option value="">Set status</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  {payment.refundStatus === "requested" && (
                    <div className="payment-action-stack compact">
                      <button className="mini-btn" onClick={() => refundAction(payment._id, "approve")}>Approve</button>
                      <button className="mini-btn danger" onClick={() => refundAction(payment._id, "reject")}>Reject</button>
                      <button className="mini-btn success" onClick={() => refundAction(payment._id, "process")}>Process</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminFinancePanel;
