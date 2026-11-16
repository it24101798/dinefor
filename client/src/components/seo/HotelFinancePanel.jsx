import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function HotelFinancePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [message, setMessage] = useState("");
  const [settlements, setSettlements] = useState([]);

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("dineforUser") || "null"); } catch { return null; }
  }, []);

  const headers = useMemo(() => ({ Authorization: `Bearer ${storedUser?.token}` }), [storedUser?.token]);

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const [res, settlementRes] = await Promise.all([
        api.get("/payments/hotel-finance", { headers }),
        api.get("/settlements/hotel", { headers }),
      ]);
      setData(res.data);
      setSettlements(settlementRes.data?.settlements || []);
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

  const collectBalance = async (payment) => {
    const confirmed = window.confirm(`Confirm collection of the remaining ${money(payment.amountDueAtHotel)} at the hotel?`);
    if (!confirmed) return;
    try {
      setActionId(payment._id);
      const res = await api.put(`/payments/${payment._id}/collect-balance`, {}, { headers });
      setMessage(res.data.message || "Balance collected.");
      await fetchFinance();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to collect balance.");
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

  const downloadPdf = async (path, filename) => {
    try {
      const res = await api.get(path, { headers, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (error) { setMessage(error.response?.data?.message || "PDF download failed."); }
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
        <article className="hotel-stat-card"><span>Refunded</span><strong>{money(summary.refundedAmount)}</strong><small>Full and partial refunds</small></article>
        <article className="hotel-stat-card"><span>Net Collected</span><strong>{money(summary.netCollected)}</strong><small>Paid minus refunds and fees</small></article>
      </section>

      <section className="hotel-panel payment-panel">
        <div className="hotel-panel-head">
          <div><span className="eyebrow">Transactions</span><h2>Payment Collection Board</h2></div>
          <div className="payment-action-stack"><button className="mini-btn" onClick={fetchFinance}>Refresh</button><button className="mini-btn" onClick={exportCsv}>Export CSV</button></div>
        </div>
        <div className="payment-table-wrap">
          <table className="payment-table improved-payment-table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Buffet</th><th>Mode</th><th>Status</th><th>Customer total</th><th>Paid</th><th>Refunded</th><th>Commission</th><th>Hotel payable</th><th>Action</th></tr></thead>
            <tbody>
              {(data?.payments || []).map((payment) => (
                <tr key={payment._id}>
                  <td><strong>{payment.invoiceNumber || "-"}</strong><br/><small>{new Date(payment.createdAt).toLocaleDateString()}</small></td>
                  <td>{payment.user?.name || "Customer"}<br/><small>{payment.user?.email || ""}</small></td>
                  <td>{payment.booking?.buffet?.title || payment.metadata?.buffetTitle || "Buffet"}</td>
                  <td>{String(payment.paymentMode || payment.gateway).replaceAll("_", " ")}{payment.gateway !== "pay_at_hotel" && <><br/><small>{payment.gateway}</small></>}</td>
                  <td><span className={`payment-status ${payment.status}`}>{payment.status}</span></td>
                  <td>{money(payment.customerTotal || payment.amount)}</td>
                  <td>{money(payment.paidAmount)}</td>
                  <td>{money(payment.refundedAmount)}</td>
                  <td>{money(payment.dineForCommission || payment.commissionAmount)}</td>
                  <td>{money(payment.hotelPayable || payment.hotelEarning)}</td>
                  <td>
                    <div className="payment-action-stack compact">
                    <button className="mini-btn" onClick={() => downloadPdf(`/documents/payment/${payment._id}/${Number(payment.paidAmount || 0) > 0 ? "receipt" : "invoice"}/pdf`, `dinefor-${payment.invoiceNumber || payment._id}.pdf`)}>PDF</button>
                    {payment.status === "pending" && payment.paymentMode === "pay_at_hotel" && <button className="mini-btn success" disabled={actionId === payment._id} onClick={() => markPaid(payment._id)}>{actionId === payment._id ? "Saving..." : "Mark Paid"}</button>}
                    {payment.status === "partially_paid" && Number(payment.amountDueAtHotel || 0) > 0 && <button className="mini-btn success" disabled={actionId === payment._id} onClick={() => collectBalance(payment)}>{actionId === payment._id ? "Saving..." : `Collect ${money(payment.amountDueAtHotel)}`}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hotel-panel payment-panel">
        <div className="hotel-panel-head"><div><span className="eyebrow">Settlement statements</span><h2>Payout & Commission Reconciliation</h2></div></div>
        <p className="muted">Positive hotel-payable batches are transferred by DineFor. Receivable batches show commission collected by the hotel and due to DineFor.</p>
        <div className="payment-table-wrap">
          <table className="payment-table improved-payment-table">
            <thead><tr><th>Statement</th><th>Period</th><th>Gross</th><th>Gateway</th><th>Hotel collected</th><th>Commission</th><th>Net direction</th><th>Status</th><th>Reference</th><th>Document</th></tr></thead>
            <tbody>{settlements.length ? settlements.map((item) => <tr key={item._id}><td><strong>{item.settlementCode}</strong></td><td>{new Date(item.periodStart).toLocaleDateString()} – {new Date(item.periodEnd).toLocaleDateString()}</td><td>{money(item.grossRecognized)}</td><td>{money(item.gatewayCollected)}</td><td>{money(item.hotelCollected)}</td><td>{money(item.commissionDue)}</td><td>{item.direction === "payable_to_hotel" ? `DineFor pays ${money(item.netAmount)}` : item.direction === "receivable_from_hotel" ? `Hotel pays ${money(item.netAmount)}` : "Balanced"}</td><td><span className={`payment-status ${item.status}`}>{item.status}</span></td><td>{item.payoutReference || "-"}</td><td><button className="mini-btn" onClick={() => downloadPdf(`/documents/settlement/${item._id}/pdf`, `${item.settlementCode}.pdf`)}>PDF</button></td></tr>) : <tr><td colSpan="10" className="muted">No settlement statements yet.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default HotelFinancePanel;
