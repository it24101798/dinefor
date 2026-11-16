import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../services/api";
import ReconciliationIssuesPanel from "./ReconciliationIssuesPanel";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const stages = {
  draft: "Prepared",
  approved: "Approved",
  processing: "Submitted",
  paid: "Confirmed · paid",
  received: "Confirmed · received",
  reconciled: "Confirmed · balanced",
  disputed: "Disputed",
  cancelled: "Cancelled",
};
const stageFilters = [
  ["all", "All batches"], ["draft", "Prepared"], ["approved", "Approved"],
  ["processing", "Submitted"], ["confirmed", "Confirmed"], ["exceptions", "Exceptions"],
];
const actionLabels = {
  approved: "Approve", processing: "Record submission", paid: "Confirm paid",
  received: "Confirm received", reconciled: "Confirm balanced", disputed: "Flag dispute", cancelled: "Cancel batch",
};
const finalStatuses = new Set(["paid", "received", "reconciled"]);
const date = (value) => value ? new Intl.DateTimeFormat("en-LK", {
  dateStyle: "medium", timeZone: "Asia/Colombo",
}).format(new Date(value)) : "—";

function AdminFinancePanel() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("month");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [message, setMessage] = useState("");
  const [settlements, setSettlements] = useState([]);
  const [settlementHotelId, setSettlementHotelId] = useState("");
  const [settlementFilter, setSettlementFilter] = useState("all");
  const [updating, setUpdating] = useState(null);
  const [reference, setReference] = useState("");
  const settlementForm = useRef(null);
  const { hash } = useLocation();

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("dineforUser") || "null"); } catch { return null; }
  }, []);

  const headers = useMemo(() => ({ Authorization: `Bearer ${storedUser?.token}` }), [storedUser?.token]);

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const [res, settlementRes] = await Promise.all([
        api.get(`/payments/admin-finance?period=${period}&status=${status}`, { headers }),
        api.get("/settlements/admin", { headers }),
      ]);
      setData(res.data);
      setSettlements(Array.isArray(settlementRes.data) ? settlementRes.data : []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load finance dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const hotels = useMemo(() => {
    const map = new Map();
    (data?.payments || []).forEach((payment) => {
      const hotel = payment.hotel || payment.booking?.buffet?.hotel;
      if (hotel?._id) map.set(hotel._id, hotel.hotelName || "Hotel");
    });
    return [...map.entries()];
  }, [data?.payments]);

  const createSettlement = async () => {
    if (!settlementHotelId) return setMessage("Select a hotel before creating a settlement.");
    try {
      setActionId("settlement-create");
      const res = await api.post("/settlements/admin", { hotelId: settlementHotelId, periodEnd: new Date().toISOString(), note: "Admin-created reconciliation batch." }, { headers });
      setMessage(res.data.message || "Settlement created.");
      setSettlementFilter("draft");
      await fetchFinance();
    } catch (error) {
      setMessage(error.response?.data?.message || "Settlement creation failed.");
    } finally { setActionId(""); }
  };

  const updateSettlement = async (event) => {
    event.preventDefault();
    const { item, nextStatus } = updating;
    try {
      setActionId(item._id);
      const res = await api.put(`/settlements/admin/${item._id}/status`, { status: nextStatus, payoutReference: reference.trim() }, { headers });
      setUpdating(null);
      setSettlementFilter("all");
      setMessage(res.data.message || "Settlement updated.");
      await fetchFinance();
    } catch (error) {
      setMessage(error.response?.data?.message || "Settlement update failed.");
    } finally { setActionId(""); }
  };

  const visibleSettlements = settlements.filter((item) => {
    if (settlementFilter === "all") return true;
    if (settlementFilter === "confirmed") return finalStatuses.has(item.status);
    if (settlementFilter === "exceptions") return ["disputed", "cancelled"].includes(item.status);
    return item.status === settlementFilter;
  });

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
      let amount;
      if (action === "process") {
        const payment = (data?.payments || []).find((item) => item._id === paymentId);
        const refundable = Number(payment?.paidAmount || 0) - Number(payment?.refundedAmount || 0);
        const entered = window.prompt(`Enter full or partial refund amount (maximum ${money(refundable)}):`, String(payment?.metadata?.refundRequest?.amount || refundable));
        if (entered === null) return;
        amount = Number(entered);
      }
      const res = await api.put(`/payments/${paymentId}/refund-action`, { action, amount, note: `Admin refund ${action}.` }, { headers });
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

  const documentAction = async (path, filename, email = false) => {
    try {
      if (email) {
        const res = await api.post(path, {}, { headers });
        setMessage(res.data.message || "Document emailed.");
        return;
      }
      const res = await api.get(path, { headers, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (error) { setMessage(error.response?.data?.message || "Document action failed."); }
  };

  useEffect(() => {
    if (!loading && hash === "#settlement-batches") {
      document.getElementById("settlement-batches")?.scrollIntoView({ block: "start" });
    }
  }, [hash, loading]);

  useEffect(() => {
    if (updating) settlementForm.current?.focus();
  }, [updating]);

  const summary = data?.summary || {};
  if (loading) return <section className="payment-panel"><p>Loading finance data...</p></section>;

  return (
    <section className="payment-panel finance-upgrade admin-feature-panel">
      <div className="admin-toolbar-v2 payment-finance-toolbar">
        <select aria-label="Finance period" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="year">Last 12 months</option>
        </select>
        <select aria-label="Payment status" value={status} onChange={(e) => setStatus(e.target.value)}>
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

      <div className="admin-toolbar-v2 payment-finance-toolbar">
        <select aria-label="Settlement hotel" value={settlementHotelId} onChange={(e) => setSettlementHotelId(e.target.value)}><option value="">Select hotel for settlement</option>{hotels.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        <button className="btn secondary" disabled={actionId === "settlement-create"} onClick={createSettlement}>{actionId === "settlement-create" ? "Creating..." : "Create Settlement Draft"}</button>
      </div>

      {message && <p className={message.toLowerCase().includes("fail") ? "error-text" : "success-text"}>{message}</p>}

      <div className="admin-stat-grid-v2 finance-grid">
        <div><span>Payment order value</span><strong>{money(summary.totalRevenue)}</strong><small>Pending + paid payments</small></div>
        <div><span>Recorded collection</span><strong>{money(summary.collectedRevenue)}</strong><small>Recorded paid amounts</small></div>
        <div><span>DineFor Commission</span><strong>{money(summary.totalCommission)}</strong><small>Platform earning foundation</small></div>
        <div><span>Hotel Earnings</span><strong>{money(summary.hotelEarnings)}</strong><small>Estimated payout value</small></div>
        <div><span>Refund Requests</span><strong>{summary.refundRequests || 0}</strong><small>Require admin decision</small></div>
        <div><span>Pending</span><strong>{summary.pendingPayments || 0}</strong><small>Hotel collection or gateway holds</small></div>
        <div><span>Gateway Fees</span><strong>{money(summary.gatewayFees)}</strong><small>Recorded payment processing fees</small></div>
        <div><span>Refunded</span><strong>{money(summary.refundedAmount)}</strong><small>Full and partial refunds</small></div>
        <div><span>Net Collected</span><strong>{money(summary.netCollected)}</strong><small>After refunds and gateway fees</small></div>
      </div>

      <nav className="df-admin-shortcuts" aria-label="Finance sections">
        <a href="#payment-ledger">Payment ledger</a>
        <a href="#settlement-batches">Settlement batches</a>
        <a href="#finance-reconciliation">Reconciliation issues</a>
      </nav>
      <h2 id="payment-ledger">Payment ledger</h2>
      <div className="payment-table-wrap">
        <table className="payment-table improved-payment-table">
          <thead><tr><th>Invoice</th><th>Hotel</th><th>Customer</th><th>Mode / Gateway</th><th>Status</th><th>Customer total</th><th>Paid</th><th>Gateway fee</th><th>Commission</th><th>Hotel payable</th><th>Refunded</th><th>Net collected</th><th>Actions</th></tr></thead>
          <tbody>
            {(data?.payments || []).map((payment) => (
              <tr key={payment._id}>
                <td><strong>{payment.invoiceNumber || "-"}</strong><br/><small>{new Date(payment.createdAt).toLocaleDateString()}</small></td>
                <td>{payment.hotel?.hotelName || payment.booking?.buffet?.hotel?.hotelName || "Hotel"}</td>
                <td>{payment.user?.name || "Customer"}</td>
                <td>{String(payment.paymentMode || "pay_at_hotel").replaceAll("_", " ")}{payment.gateway !== "pay_at_hotel" && <><br/><small>{payment.gateway}</small></>}</td>
                <td><span className={`payment-status ${payment.status}`}>{payment.status}</span></td>
                <td>{money(payment.customerTotal || payment.amount)}</td>
                <td>{money(payment.paidAmount)}</td>
                <td>{money(payment.gatewayFee)}</td>
                <td>{money(payment.dineForCommission || payment.commissionAmount)}</td>
                <td>{money(payment.hotelPayable || payment.hotelEarning)}</td>
                <td>{money(payment.refundedAmount)}<br/><small>{payment.refundStatus || "none"}</small></td>
                <td>{money(payment.netCollected)}</td>
                <td className="payment-row-actions">
                  <div className="payment-action-stack compact">
                    <button className="mini-btn" onClick={() => documentAction(`/documents/payment/${payment._id}/${Number(payment.paidAmount || 0) > 0 ? "receipt" : "invoice"}/pdf`, `${payment.invoiceNumber || payment._id}.pdf`)}>PDF</button>
                    <button className="mini-btn" onClick={() => documentAction(`/documents/payment/${payment._id}/${Number(payment.paidAmount || 0) > 0 ? "receipt" : "invoice"}/email`, "", true)}>Email</button>
                  </div>
                  <select disabled={actionId === payment._id} defaultValue="" onChange={(e) => updateStatus(payment._id, e.target.value)}>
                    <option value="">Set status</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                  {["requested", "approved", "failed"].includes(payment.refundStatus) && (
                    <div className="payment-action-stack compact">
                      {payment.refundStatus === "requested" && <button className="mini-btn" onClick={() => refundAction(payment._id, "approve")}>Approve</button>}
                      {payment.refundStatus === "requested" && <button className="mini-btn danger" onClick={() => refundAction(payment._id, "reject")}>Reject</button>}
                      <button className="mini-btn success" onClick={() => refundAction(payment._id, "process")}>Process</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="settlement-batches" className="mt-8">Settlement batches</h2>
      <p>Record approval, external transfer submission, and bank confirmation separately.</p>
      <div className="df-finance-stages" role="group" aria-label="Filter settlement batches">
        {stageFilters.map(([value, label]) => (
          <button key={value} className="btn-outline" type="button" aria-pressed={settlementFilter === value} onClick={() => setSettlementFilter(value)}>{label}</button>
        ))}
      </div>
      {updating && (
        <form className="df-finance-stage-group card-ambient p-4" ref={settlementForm} tabIndex={-1} onSubmit={updateSettlement}>
          <h3>{actionLabels[updating.nextStatus]} · {updating.item.settlementCode}</h3>
          {updating.nextStatus === "processing" && <p>Record the reference from the external transfer submission.</p>}
          {["paid", "received"].includes(updating.nextStatus) && <p>Use the bank or payment reference for the confirmed transfer.</p>}
          {["processing", "paid", "received"].includes(updating.nextStatus) && (
            <label>Bank or payment reference
              <input className="form-input" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={200}
                required />
            </label>
          )}
          <div className="df-finance-row-actions">
            <button className="btn-primary" type="submit" disabled={Boolean(actionId)}>Save update</button>
            <button className="btn-outline" type="button" disabled={Boolean(actionId)} onClick={() => setUpdating(null)}>Back</button>
          </div>
        </form>
      )}
      <div className="payment-table-wrap">
        <table className="payment-table improved-payment-table">
          <thead><tr><th>Statement</th><th>Hotel</th><th>Period</th><th>Net direction</th><th>Stage</th><th>Action</th></tr></thead>
          <tbody>{visibleSettlements.length ? visibleSettlements.map((item) => (
            <tr key={item._id}>
              <td><strong>{item.settlementCode}</strong><div className="payment-action-stack compact">
                <button className="mini-btn" onClick={() => documentAction(`/documents/settlement/${item._id}/pdf`, `${item.settlementCode}.pdf`)}>PDF</button>
                <button className="mini-btn" onClick={() => documentAction(`/documents/settlement/${item._id}/email`, "", true)}>Email</button>
              </div></td>
              <td>{item.hotel?.hotelName || "Hotel"}</td>
              <td>{date(item.periodStart)} – {date(item.periodEnd)}</td>
              <td>{item.direction === "payable_to_hotel" ? `Pay hotel ${money(item.netAmount)}` : item.direction === "receivable_from_hotel" ? `Collect ${money(item.netAmount)}` : "Balanced"}
                <details><summary>Amounts</summary>
                  <div>Gateway collection · {money(item.gatewayCollected)}</div>
                  <div>Hotel collection · {money(item.hotelCollected)}</div>
                  <div>Gateway fees · {money(item.gatewayFees)}</div>
                  <div>Commission · {money(item.commissionDue)}</div>
                </details>
              </td>
              <td><span className={`payment-status ${item.status}`}>{stages[item.status] || item.status}</span>
                {(item.completedAt || item.submittedAt || item.approvedAt) && <div><small>{date(item.completedAt || item.submittedAt || item.approvedAt)}</small></div>}
                {item.payoutReference && <div><small>Ref. {item.payoutReference}</small></div>}
              </td>
              <td><div className="df-finance-row-actions">{(item.availableActions || []).map((nextStatus) => (
                <button key={nextStatus} className="mini-btn" disabled={Boolean(actionId)} onClick={() => {
                  setUpdating({ item, nextStatus });
                  setReference(nextStatus === "processing" ? "" : item.payoutReference || "");
                }}>{actionLabels[nextStatus]}</button>
              ))}</div></td>
            </tr>
          )) : <tr><td colSpan="6">No settlement batches in this stage.</td></tr>}</tbody>
        </table>
      </div>

      <div id="finance-reconciliation" />
      <ReconciliationIssuesPanel />
    </section>
  );
}

export default AdminFinancePanel;
