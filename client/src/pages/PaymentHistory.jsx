import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";

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

  useEffect(() => {
    if (storedUser?.token) fetchPayments();
  }, [storedUser?.token]);

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

  if (!storedUser?.token) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">lock</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Please Login</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">You need to be logged in to view payment history.</p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2 mt-6">Login</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Payment History</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Track your invoices and payment status</p>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm font-medium mb-6 ${
            message.includes("success") || message.includes("submitted")
              ? "bg-secondary-container/30 text-secondary"
              : "bg-error/10 text-error"
          }`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-pulse text-text-deep-green">Loading payments...</div>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">payments</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">No payments yet</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">Your payment history will appear here after your first booking.</p>
            <Link to="/feed" className="btn-primary inline-flex items-center gap-2 mt-6">Browse Buffets</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment._id} className="card-ambient p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    {payment.invoiceNumber || "Invoice"}
                  </p>
                  <p className="font-label-md text-label-md text-text-deep-green">
                    {payment.hotel?.hotelName || payment.booking?.buffet?.hotel?.hotelName || "Hotel"}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {payment.booking?.buffet?.title || payment.metadata?.buffetTitle || "Buffet Reservation"}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{formatDate(payment.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`status-pill ${payment.status}`}>{payment.status}</span>
                  <p className="font-headline-md text-headline-md text-highlight-gold">{money(payment.amount)}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewInvoice(payment.booking?._id || payment.booking)}
                      className="btn-outline text-xs py-1 px-3"
                    >
                      Invoice
                    </button>
                    {["paid", "pending"].includes(payment.status) && payment.refundStatus !== "requested" && payment.refundStatus !== "processed" && (
                      <button
                        disabled={actionId === payment._id}
                        onClick={() => requestRefund(payment)}
                        className="bg-error/10 text-error text-xs py-1 px-3 rounded-full hover:bg-error/20 transition-colors"
                      >
                        {actionId === payment._id ? "Sending..." : "Refund"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invoice Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
            <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-headline-md text-headline-md text-text-deep-green">Invoice</h2>
                <button onClick={() => setSelectedInvoice(null)} className="text-on-surface-variant hover:text-text-deep-green">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="space-y-2">
                <p><strong>Invoice:</strong> {selectedInvoice.invoiceNumber}</p>
                <p><strong>Hotel:</strong> {selectedInvoice.hotel?.hotelName}</p>
                <p><strong>Buffet:</strong> {selectedInvoice.buffet?.title}</p>
                <p><strong>Total:</strong> {money(selectedInvoice.totals?.grandTotal)}</p>
                <p><strong>Status:</strong> {selectedInvoice.paymentStatus}</p>
                <p><strong>Date:</strong> {formatDate(selectedInvoice.createdAt)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default PaymentHistory;