import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import AccountLayout from "../design/AccountLayout";
import { Icon } from "../design/ReferenceUI";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";

function displayStatus(payment) {
  if (payment.status === "pending" && payment.paymentMode !== "pay_at_hotel" && payment.expiresAt && Date.parse(payment.expiresAt) <= Date.now()) return "expired";
  if (payment.status === "pending" && ["sandbox_failed", "failed_-1", "failed_-2"].includes(payment.gatewayStatus)) return "failed";
  return payment.status || "unknown";
}

function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionId, setActionId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

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
    const refundable = Math.max(Number(payment.paidAmount || 0) - Number(payment.refundedAmount || 0), 0);
    const amountText = window.prompt(`Refundable amount is ${money(refundable)}. Enter full or partial refund amount:`, String(refundable));
    if (amountText === null) return;
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0 || amount > refundable) {
      setMessage("Enter a valid refund amount within the refundable balance.");
      return;
    }
    const reason = window.prompt("Enter refund request reason:", "Customer requested cancellation/refund review.");
    if (reason === null) return;
    try {
      setActionId(payment._id);
      const res = await api.put(`/payments/${payment._id}/refund-request`, { reason, amount }, { headers });
      setMessage(res.data.message || "Refund request submitted.");
      await fetchPayments();
    } catch (error) {
      setMessage(error.response?.data?.message || "Refund request failed.");
    } finally {
      setActionId("");
    }
  };

  const downloadDocument = async (payment, type) => {
    try {
      setActionId(`${payment._id}-${type}`);
      const res = await api.get(`/documents/payment/${payment._id}/${type}/pdf`, { headers, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `dinefor-${type}-${payment.invoiceNumber || payment._id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (error) { setMessage(error.response?.data?.message || `${type.replace("_", " ")} download failed.`); }
    finally { setActionId(""); }
  };

  const emailDocument = async (payment, type) => {
    try {
      setActionId(`${payment._id}-email`);
      const res = await api.post(`/documents/payment/${payment._id}/${type}/email`, {}, { headers });
      setMessage(res.data.message || "Document emailed successfully.");
    } catch (error) { setMessage(error.response?.data?.message || "Document email failed."); }
    finally { setActionId(""); }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesStatus = statusFilter === "all" || displayStatus(payment) === statusFilter;
    const text = [payment.invoiceNumber, payment.hotel?.hotelName, payment.booking?.buffet?.hotel?.hotelName, payment.booking?.buffet?.title, payment.metadata?.buffetTitle].filter(Boolean).join(" ").toLowerCase();
    return matchesStatus && text.includes(searchTerm.trim().toLowerCase());
  });
  const totalPaid = payments.filter(payment => payment.gateway !== "sandbox").reduce((total, payment) => total + Math.max(0, Number(payment.paidAmount) || 0), 0);
  const totalRefunded = payments.filter(payment => payment.gateway !== "sandbox").reduce((total, payment) => total + Math.max(0, Number(payment.refundedAmount) || 0), 0);
  const filters = ["all", "paid", "pending", "failed", "expired", "refunded"];

  if (!storedUser?.token) {
    return <main className="rf-page min-h-screen px-5 py-20 text-center"><Icon name="lock"/><h1 className="text-3xl font-bold my-4">Sign in to see your payments</h1><p>Your invoices and receipts are private to your account.</p><Link className="rf-button inline-flex mt-6" to="/login">Sign in</Link></main>;
  }

  return <AccountLayout title="Every payment, clearly in view." description="Find your buffet payments, download receipts and manage payment requests in one place." className="rf-payments" artwork="/images/characters/account-concierge.png">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
      {[
        { label: "Transactions", value: String(payments.length), icon: "receipt_long" },
        { label: "Total paid", value: money(totalPaid), icon: "verified" },
        { label: "Total refunded", value: money(totalRefunded), icon: "currency_exchange" },
      ].map((item) => <section key={item.label} className="bg-white rounded-2xl border border-emerald-100 p-5 flex items-start gap-3 shadow-sm"><span className="rounded-xl bg-emerald-50 text-[#006B63] p-3"><Icon name={item.icon}/></span><div><p className="text-sm text-gray-500">{item.label}</p><p className="text-xl font-extrabold text-[#123b35] mt-1 break-words">{loading ? "—" : item.value}</p></div></section>)}
    </div>
    <div className="bg-white rounded-2xl border border-emerald-100 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5"><div><h2 className="text-2xl font-extrabold text-[#123b35]">Payment history</h2><p className="text-sm text-gray-500 mt-1">Review your transactions and available documents.</p></div><Link to="/my-bookings" className="inline-flex gap-2 items-center text-sm font-bold text-[#006B63]"><Icon name="calendar_month"/> View my bookings</Link></div>
      {message && <div role="status" className="mb-5 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">{message}</div>}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <label className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 flex-1 min-w-0"><Icon name="search"/><span className="sr-only">Search transactions</span><input className="w-full min-w-0 bg-transparent outline-none text-sm" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search hotel, buffet or invoice"/></label>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter payment status">{filters.map((filter) => <button type="button" key={filter} aria-pressed={filter === statusFilter} onClick={() => setStatusFilter(filter)} className={`shrink-0 rounded-full text-sm px-4 py-2 capitalize border transition-colors ${filter === statusFilter ? "bg-[#006B63] border-[#006B63] text-white" : "border-gray-200 text-gray-700 hover:bg-emerald-50"}`}>{filter}</button>)}</div>
      </div>
      {loading ? <div role="status" className="py-14 text-center text-gray-500">Loading your payments…</div> : payments.length === 0 ? <div className="py-16 text-center"><div className="text-[#006B63] mb-3"><Icon name="payments"/></div><h3 className="font-bold text-xl">No payments yet</h3><p className="text-sm text-gray-500 mt-2">Your transactions will appear after you make a booking.</p><Link to="/listings" className="rf-button inline-flex mt-5">Discover buffets</Link></div> : filteredPayments.length === 0 ? <div className="py-12 text-center text-gray-500">No transactions match your filters. <button className="text-[#006B63] underline" onClick={() => { setStatusFilter("all"); setSearchTerm(""); }}>Clear filters</button></div> : <div className="grid gap-4">{filteredPayments.map((payment) => {
        const bookingId = payment.booking?._id || payment.booking;
        const paid = Number(payment.paidAmount || 0);
        const sandbox = payment.gateway === "sandbox";
        const status = displayStatus(payment);
        const statusPath = sandbox ? `/payment/status/${payment._id}` : payment.gateway === "payhere" && payment.gatewayOrderId ? `/payment/return?order_id=${encodeURIComponent(payment.gatewayOrderId)}` : "";
        const refunded = Number(payment.refundedAmount || 0);
        return <article key={payment._id} className="border border-gray-200 rounded-2xl p-4 sm:p-5 hover:border-emerald-200 transition-colors">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap gap-2 items-center mb-2"><span className="text-xs uppercase tracking-wider text-gray-500 break-all">{payment.invoiceNumber || "Invoice pending"}</span><span className={`text-xs px-3 py-1 rounded-full font-bold capitalize ${status === "paid" ? "bg-emerald-100 text-emerald-800" : status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{status.replaceAll("_", " ")}</span>{sandbox && <strong className="text-xs text-[#006B63]">Sandbox · No real payment</strong>}</div><h3 className="font-extrabold text-lg text-[#123b35]">{payment.hotel?.hotelName || payment.booking?.buffet?.hotel?.hotelName || "Buffet hotel"}</h3><p className="text-sm text-gray-600 mt-1">{payment.booking?.buffet?.title || payment.metadata?.buffetTitle || "Buffet reservation"}</p><p className="text-xs text-gray-500 mt-2">{formatDate(payment.createdAt)} · {String(payment.paymentMode || "pay_at_hotel").replaceAll("_", " ")}{!sandbox && payment.gateway && payment.gateway !== "pay_at_hotel" ? ` · ${payment.gateway}` : ""}</p></div><div className="sm:text-right shrink-0"><p className="text-xl font-extrabold text-[#006B63]">{money(payment.customerTotal || payment.amount)}</p><p className="text-xs text-gray-500 mt-1">{sandbox ? "Simulated paid" : "Paid"} {money(paid)} · Refunded {money(refunded)}</p></div></div>
          <div className="border-t border-gray-100 mt-4 pt-4 flex flex-wrap gap-2">
            {!sandbox && <button type="button" disabled={!bookingId || Boolean(actionId)} onClick={() => viewInvoice(bookingId)} className="btn-outline text-xs px-3 py-2">View invoice</button>}
            {!sandbox && <button type="button" disabled={Boolean(actionId)} onClick={() => downloadDocument(payment, "invoice")} className="btn-outline text-xs px-3 py-2">Invoice PDF</button>}
            {!sandbox && paid > 0 && <button type="button" disabled={Boolean(actionId)} onClick={() => downloadDocument(payment, "receipt")} className="btn-outline text-xs px-3 py-2">Receipt PDF</button>}
            {!sandbox && refunded > 0 && <button type="button" disabled={Boolean(actionId)} onClick={() => downloadDocument(payment, "credit_note")} className="btn-outline text-xs px-3 py-2">Credit note</button>}
            {!sandbox && <button type="button" disabled={Boolean(actionId)} onClick={() => emailDocument(payment, paid > 0 ? "receipt" : "invoice")} className="btn-outline text-xs px-3 py-2">Email document</button>}
            {statusPath && <Link to={statusPath} className="btn-primary text-xs px-3 py-2">Check payment status</Link>}
            {!sandbox && paid > refunded && !["requested", "processing", "processed"].includes(payment.refundStatus) && <button type="button" disabled={Boolean(actionId)} onClick={() => requestRefund(payment)} className="rounded-full bg-amber-50 text-amber-900 text-xs px-4 py-2 font-bold hover:bg-amber-100">Request refund review</button>}
          </div>
        </article>;
      })}</div>}
    </div>
    {selectedInvoice && <div role="presentation" className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}><section role="dialog" aria-modal="true" aria-label="Invoice details" onClick={(event) => event.stopPropagation()} className="bg-white text-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"><div className="flex justify-between items-center gap-3 mb-5"><h2 className="text-xl font-extrabold text-[#123b35]">{selectedInvoice.documentType || "Invoice"}</h2><button type="button" aria-label="Close invoice" onClick={() => setSelectedInvoice(null)}><Icon name="close"/></button></div><dl className="grid gap-3 text-sm">{[["Invoice", selectedInvoice.invoiceNumber],["Hotel",selectedInvoice.hotel?.hotelName],["Buffet",selectedInvoice.buffet?.title],["Subtotal",money(selectedInvoice.totals?.subtotal)],["Discount",money(selectedInvoice.totals?.discountAmount)],["Tax",money(selectedInvoice.totals?.taxAmount)],["Service charge",money(selectedInvoice.totals?.serviceCharge)],["Customer total",money(selectedInvoice.totals?.customerTotal)],["Paid",money(selectedInvoice.totals?.paidAmount)],["Due at hotel",money(selectedInvoice.totals?.amountDueAtHotel)],["Refunded",money(selectedInvoice.totals?.refundedAmount)],["Status",selectedInvoice.paymentStatus],["Issued",formatDate(selectedInvoice.issuedAt)]].map(([label,value]) => <div key={label} className="flex justify-between gap-4 border-b border-gray-100 pb-2"><dt className="text-gray-500">{label}</dt><dd className="font-semibold text-right break-words">{value || "—"}</dd></div>)}</dl><div className="flex gap-2 mt-5"><button type="button" onClick={() => window.print()} className="btn-outline flex-1">Print / save</button><button type="button" onClick={() => setSelectedInvoice(null)} className="btn-primary flex-1">Close</button></div></section></div>}
  </AccountLayout>;
}

export default PaymentHistory;
