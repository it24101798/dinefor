import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";

function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("dineforUser") || "null"); } catch { return null; }
  }, []);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await api.get("/payments/history", { headers: { Authorization: `Bearer ${storedUser?.token}` } });
        setPayments(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load payment history.");
      } finally {
        setLoading(false);
      }
    };

    if (storedUser?.token) fetchPayments();
  }, [storedUser?.token]);

  return (
    <main className="payment-page-shell">
      <section className="payment-hero compact">
        <div>
          <span className="eyebrow">Finance</span>
          <h1>Payment History</h1>
          <p>Track invoices, payment methods, totals, commissions and payment status.</p>
        </div>
      </section>

      {message && <p className="error-text">{message}</p>}
      {loading ? <section className="payment-panel"><p>Loading payments...</p></section> : (
        <section className="payment-panel">
          {payments.length === 0 ? <p className="muted">No payments found yet.</p> : (
            <div className="payment-table-wrap">
              <table className="payment-table">
                <thead><tr><th>Invoice</th><th>Hotel / Buffet</th><th>Method</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td><strong>{payment.invoiceNumber || "-"}</strong></td>
                      <td>{payment.hotel?.hotelName || payment.booking?.buffet?.hotel?.hotelName || "Hotel"}<br/><small>{payment.booking?.buffet?.title || payment.metadata?.buffetTitle || "Buffet Reservation"}</small></td>
                      <td>{payment.gateway}</td>
                      <td><span className={`payment-status ${payment.status}`}>{payment.status}</span></td>
                      <td>{money(payment.amount)}</td>
                      <td>{formatDate(payment.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default PaymentHistory;
