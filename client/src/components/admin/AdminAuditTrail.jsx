import { useEffect, useState } from "react";
import api from "../../services/api";

const dateFormat = new Intl.DateTimeFormat("en-LK", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo",
});
const label = (value) => String(value || "").replaceAll("_", " ");

export default function AdminAuditTrail({ headers }) {
  const [action, setAction] = useState("");
  const [filters, setFilters] = useState({ action: "", page: 1, refresh: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setResult(null);
    api.get("/activity-logs", {
      headers,
      params: { action: filters.action || undefined, page: filters.page, limit: 25 },
      signal: controller.signal,
    }).then(({ data }) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch((error) => {
      if (!controller.signal.aborted) setError(error.response?.data?.message || "The audit trail could not be loaded.");
    });
    return () => controller.abort();
  }, [headers, filters]);

  const search = (event) => {
    event.preventDefault();
    setFilters((current) => ({ action: action.trim(), page: 1, refresh: current.refresh + 1 }));
  };

  return (
    <section className="card-ambient df-admin-audit" aria-label="Audit trail">
      <form className="df-admin-audit-filters" onSubmit={search}>
        <label>Action
          <input type="search" className="form-input" placeholder="Search by action" maxLength={100}
            value={action} onChange={(event) => setAction(event.target.value)} />
        </label>
        <button className="btn-primary" type="submit">Search</button>
        <button className="btn-outline" type="button"
          onClick={() => setFilters((current) => ({ ...current, refresh: current.refresh + 1 }))}>Refresh logs</button>
      </form>
      {error ? <p role="alert">{error}</p> : !result ? <p role="status">Loading audit events…</p> : <>
        {!result.logs.length ? <p>No events match these filters.</p> : (
          <ul className="df-admin-audit-events">
            {result.logs.map((entry) => (
              <li key={entry._id}>
                <div><strong>{label(entry.action)}</strong><p>{entry.message || label(entry.entityType)}</p></div>
                <div><span>{entry.actor?.name || label(entry.actorRole) || "System"}</span>
                  {entry.createdAt && <time dateTime={entry.createdAt}>{dateFormat.format(new Date(entry.createdAt))}</time>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <nav className="df-admin-audit-pages" aria-label="Audit pages">
          <button className="btn-outline" type="button" disabled={result.pagination.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</button>
          <span>{result.pagination.total} events · Page {result.pagination.page} of {Math.max(1, result.pagination.pages)}</span>
          <button className="btn-outline" type="button" disabled={result.pagination.page >= result.pagination.pages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button>
        </nav>
      </>}
    </section>
  );
}
