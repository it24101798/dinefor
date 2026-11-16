import { useEffect, useState } from "react";
import api from "../../services/api";

const money = (value, currency = "LKR") => `${currency} ${Number(value || 0).toLocaleString()}`;

export default function CancellationCasesPanel({ role, headers, refreshKey = 0 }) {
  const [cases, setCases] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/cancellations/${role}`, { headers })
      .then((response) => { setCases(Array.isArray(response.data) ? response.data : []); setError(""); })
      .catch((requestError) => setError(requestError.response?.data?.message || "Cancellation cases could not be loaded."));
  }, [role, headers, refreshKey]);

  return (
    <section className="card-ambient overflow-hidden mt-6">
      <div className="p-5 border-b border-border-subtle"><span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Release 4.7</span><h2 className="font-headline-md text-headline-md text-text-deep-green mt-1">Cancellation, Refund & No-Show Cases</h2><p className="text-sm text-on-surface-variant mt-1">Policy snapshots preserve the decision used when each case was created.</p></div>
      {error ? <p className="p-5 text-error">{error}</p> : (
        <div className="overflow-x-auto"><table className="w-full"><thead className="bg-surface-container-low"><tr><th className="text-left p-4">Booking</th><th className="text-left p-4">Customer</th><th className="text-left p-4">Type</th><th className="text-left p-4">Policy</th><th className="text-left p-4">Refund</th><th className="text-left p-4">Retained</th><th className="text-left p-4">Status</th><th className="text-left p-4">Reason</th></tr></thead>
          <tbody>{cases.length ? cases.map((item) => <tr key={item._id} className="border-t border-border-subtle"><td className="p-4"><strong>{item.booking?.bookingCode || "-"}</strong><br/><small>{new Date(item.createdAt).toLocaleString()}</small></td><td className="p-4">{item.customer?.name || "Customer"}<br/><small>{item.customer?.email || ""}</small></td><td className="p-4 capitalize">{String(item.type || "").replaceAll("_", " ")}</td><td className="p-4 capitalize">{String(item.policyBand || "-").replaceAll("_", " ")}<br/><small>{item.refundPercent || 0}%</small></td><td className="p-4">{money(item.refundableAmount, item.currency)}</td><td className="p-4">{money(item.retainedAmount, item.currency)}</td><td className="p-4"><span className={`status-pill ${item.status}`}>{String(item.status || "").replaceAll("_", " ")}</span></td><td className="p-4 max-w-xs">{item.reason || "-"}</td></tr>) : <tr><td colSpan="8" className="p-6 text-center text-on-surface-variant">No cancellation or no-show cases yet.</td></tr>}</tbody>
        </table></div>
      )}
    </section>
  );
}
