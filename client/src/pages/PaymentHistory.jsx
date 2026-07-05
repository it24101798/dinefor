import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";

function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionId, setActionId] = useState("");

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("dineforUser") || "null"); } catch { return null; }
  }, []);

  const headers = useMemo(() => ({ Authorization: `Bearer ${storedUser?.token}` }), [storedUser?.token]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payments/history", { headers });
      setPayments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load payment history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (storedUser?.token) fetchPayments(); }, [storedUser?.token]);

  const viewInvoice = async (bookingId) => {
    try {
      const res = await api.get(`/payments/invoice/${bookingId}`, { headers });
      setSelectedInvoice(res.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Invoice could not be loaded.");
    }
  };

  const requestRefund = async (payment) => {
    const reason = window.prompt("Enter refund request reason:", "Customer requested cancellation/refund review.");
    if (reason === null) return;
    try {
      setActionId(payment._id);
      const res = await api.put(`/payments/${payment._id}/refund-request`, { reason, amount: payment.amount }, { headers });
      setMessage(res.data.message || "Refund request submitted.");
      await fetchPayments();
    } catch (error) {
      setMessage(error.response?.data?.message || "Refund request failed.");
    } finally {
      setActionId("");
    }
  };

  return (
    <main className="payment-page-shell finance-upgrade">
      <section className="payment-hero compact">
        <div>
          <span className="eyebrow">Finance</span>
          <h1>Payment History</h1>
          <p>Track invoices, payment methods, totals, refund status and collection status.</p>
        </div>
      </section>

      {message && <p className={message.toLowerCase().includes("fail") || message.toLowerCase().includes("could") ? "error-text" : "success-text"}>{message}</p>}
      {loading ? <section className="payment-panel"><p>Loading payments...</p></section> : (
        <section className="payment-panel">
          {payments.length === 0 ? <p className="muted">No payments found yet.</p> : (
            <div className="payment-table-wrap">
              <table className="payment-table improved-payment-table">
                <thead><tr><th>Invoice</th><th>Hotel / Buffet</th><th>Method</th><th>Status</th><th>Refund</th><th>Total</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td><strong>{payment.invoiceNumber || "-"}</strong></td>
                      <td>{payment.hotel?.hotelName || payment.booking?.buffet?.hotel?.hotelName || "Hotel"}<br/><small>{payment.booking?.buffet?.title || payment.metadata?.buffetTitle || "Buffet Reservation"}</small></td>
                      <td>{payment.gateway}</td>
                      <td><span className={`payment-status ${payment.status}`}>{payment.status}</span></td>
                      <td><span className={`payment-status ${payment.refundStatus}`}>{payment.refundStatus || "none"}</span></td>
                      <td>{money(payment.amount)}</td>
                      <td>{formatDate(payment.createdAt)}</td>
                      <td className="payment-row-actions">
                        <button className="mini-btn" onClick={() => viewInvoice(payment.booking?._id || payment.booking)}>Invoice</button>
                        {["paid", "pending"].includes(payment.status) && payment.refundStatus !== "requested" && payment.refundStatus !== "processed" && (
                          <button className="mini-btn danger" disabled={actionId === payment._id} onClick={() => requestRefund(payment)}>{actionId === payment._id ? "Sending..." : "Request Refund"}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {selectedInvoice && (
        <section className="payment-panel invoice-detail-card">
          <div className="hotel-panel-head">
            <div><span className="eyebrow">Invoice Detail</span><h2>{selectedInvoice.invoiceNumber}</h2></div>
            <button className="mini-btn" onClick={() => setSelectedInvoice(null)}>Close</button>
          </div>
          <div className="payment-info-grid invoice-grid">
            <p><strong>Hotel</strong><span>{selectedInvoice.hotel?.hotelName}</span></p>
            <p><strong>Buffet</strong><span>{selectedInvoice.buffet?.title}</span></p>
            <p><strong>Guest</strong><span>{selectedInvoice.guest?.name}</span></p>
            <p><strong>Booking Code</strong><span>{selectedInvoice.booking?.bookingCode}</span></p>
            <p><strong>Date</strong><span>{formatDate(selectedInvoice.booking?.selectedDate)}</span></p>
            <p><strong>Slot</strong><span>{selectedInvoice.booking?.selectedTimeSlot?.startTime} - {selectedInvoice.booking?.selectedTimeSlot?.endTime}</span></p>
            <p><strong>Subtotal</strong><span>{money(selectedInvoice.totals?.subtotal)}</span></p>
            <p><strong>Discount</strong><span>{money(selectedInvoice.totals?.discountAmount)}</span></p>
            <p><strong>Service</strong><span>{money(selectedInvoice.totals?.serviceCharge)}</span></p>
            <p><strong>Tax</strong><span>{money(selectedInvoice.totals?.taxAmount)}</span></p>
            <p><strong>Total</strong><span>{money(selectedInvoice.totals?.grandTotal)}</span></p>
            <p><strong>Payment</strong><span>{selectedInvoice.paymentStatus} / {selectedInvoice.paymentMethod}</span></p>
          </div>
        </section>
      )}
    </main>
  );
}

export default PaymentHistory;
