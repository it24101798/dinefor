import { useEffect, useState } from "react";
import api from "../../services/api";

export default function ReconciliationIssuesPanel() {
  const [data, setData] = useState({ issues: [], recentWebhooks: [], counts: {} });
  const [status, setStatus] = useState("open");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { const res = await api.get(`/reconciliation/issues?status=${status}`); setData(res.data); }
    catch (error) { setMessage(error.response?.data?.message || "Reconciliation queue could not be loaded."); }
  };
  useEffect(() => { load(); }, [status]);

  const runAudit = async () => {
    try { setBusy(true); const res = await api.post("/reconciliation/audit", { limit: 1000 }); setMessage(`${res.data.message} Checked ${res.data.checked}; found ${res.data.issuesFound}.`); await load(); }
    catch (error) { setMessage(error.response?.data?.message || "Audit failed."); }
    finally { setBusy(false); }
  };
  const update = async (id, nextStatus) => {
    const note = nextStatus === "resolved" ? window.prompt("Resolution note:", "Verified against gateway and ledger.") : "";
    if (nextStatus === "resolved" && note === null) return;
    try { await api.put(`/reconciliation/issues/${id}`, { status: nextStatus, note }); setMessage(`Issue ${nextStatus}.`); await load(); }
    catch (error) { setMessage(error.response?.data?.message || "Issue update failed."); }
  };

  return (
    <section className="payment-panel finance-upgrade mt-8">
      <div className="admin-toolbar-v2 payment-finance-toolbar"><div><h2>Gateway Monitoring & Reconciliation</h2><small>Investigate exceptions before changing financial records.</small></div><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option><option value="all">All</option></select><button className="btn secondary" disabled={busy} onClick={runAudit}>{busy ? "Auditing…" : "Run Ledger Audit"}</button></div>
      {message && <p className="success-text">{message}</p>}
      <div className="admin-stat-grid-v2 finance-grid"><div><span>Open issues</span><strong>{data.counts?.open || 0}</strong></div><div><span>Acknowledged</span><strong>{data.counts?.acknowledged || 0}</strong></div><div><span>Resolved</span><strong>{data.counts?.resolved || 0}</strong></div><div><span>Recent callbacks</span><strong>{data.recentWebhooks?.length || 0}</strong></div></div>
      <div className="payment-table-wrap"><table className="payment-table improved-payment-table"><thead><tr><th>Severity</th><th>Issue</th><th>Payment / Hotel</th><th>Expected / Actual</th><th>Detected</th><th>Action</th></tr></thead><tbody>{data.issues?.length ? data.issues.map((issue) => <tr key={issue._id}><td><span className={`payment-status ${issue.severity}`}>{issue.severity}</span></td><td><strong>{issue.title}</strong><br/><small>{String(issue.type).replaceAll("_", " ")}</small></td><td>{issue.payment?.invoiceNumber || "No payment"}<br/><small>{issue.hotel?.hotelName || "-"}</small></td><td>{issue.details?.expected ?? "-"} / {issue.details?.actual ?? "-"}</td><td>{new Date(issue.detectedAt).toLocaleString()}</td><td><div className="payment-action-stack compact">{issue.status === "open" && <button className="mini-btn" onClick={() => update(issue._id, "acknowledged")}>Acknowledge</button>}{issue.status !== "resolved" && <button className="mini-btn success" onClick={() => update(issue._id, "resolved")}>Resolve</button>}</div></td></tr>) : <tr><td colSpan="6">No {status === "all" ? "" : status} reconciliation issues.</td></tr>}</tbody></table></div>
      <h3 className="mt-8">Recent PayHere callbacks</h3>
      <div className="payment-table-wrap"><table className="payment-table"><thead><tr><th>Order</th><th>Verification</th><th>Processing</th><th>Amount</th><th>Attempts</th><th>Received</th></tr></thead><tbody>{data.recentWebhooks?.map((event) => <tr key={event._id}><td>{event.orderId || "-"}<br/><small>{event.gatewayReference || ""}</small></td><td>{event.verificationStatus}</td><td>{event.processingStatus}{event.lastError && <><br/><small>{event.lastError}</small></>}</td><td>{event.currency} {Number(event.amount || 0).toFixed(2)}</td><td>{event.attemptCount}</td><td>{new Date(event.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>
    </section>
  );
}
