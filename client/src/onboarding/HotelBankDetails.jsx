import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { problem, route } from "./onboardingApi";
import "./onboarding.css";

export default function HotelBankDetails() {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api.get(route + "/bank", { signal: controller.signal }).then(({ data }) => setDetails(data)).catch(error => {
      if (!controller.signal.aborted) setError(problem(error));
    });
    return () => controller.abort();
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(route + "/bank", new FormData(form));
      setDetails(data);
      form.reset();
      setNotice("Bank change submitted for review.");
    } catch (error) { setError(problem(error)); }
    finally { setBusy(false); }
  }

  return <main className="df11 df11-narrow">
    <Link className="df11-back" to="/hotel-partnership">← Partnership</Link>
    <header className="df11-hero"><div><h1>Settlement account</h1><p>Your verified account stays in use until DineFor approves a change.</p></div></header>
    {error && <p className="df11-error" role="alert">{error}</p>}
    {notice && <p className="df11-notice" role="status">{notice}</p>}
    {details ? <>
      <section className="df11-card df11-form"><h2>Current verified account</h2><p>{details.bank} · {details.branch}</p><p>{details.holder} · ending in {details.last4}</p></section>
      {details.request?.status === "pending" ? <p className="df11-notice">Change under review. The current account remains active.</p>
        : <form className="df11-card df11-form" onSubmit={submit}>
          <h2>Request a change</h2>
          {details.request && <p>Previous request {details.request.status}.</p>}
          <label>Account holder<input name="holder" maxLength={180} required /></label>
          <label>Bank<input name="bank" maxLength={180} required /></label>
          <label>Branch<input name="branch" maxLength={180} required /></label>
          <div className="df11-grid">
            <label>Account number<input type="password" inputMode="numeric" autoComplete="off" name="bankNumber" required maxLength={32} /></label>
            <label>Confirm account number<input type="password" inputMode="numeric" autoComplete="off" name="bankConfirmation" required maxLength={32} /></label>
          </div>
          <label>New bank evidence (up to 5 MB)<input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required /></label>
          <p>DineFor will verify the evidence and contact the existing authorised representative before approving the request.</p>
          <button className="df11-button" disabled={busy} type="submit">{busy ? "Submitting…" : "Submit bank change"}</button>
        </form>}
    </> : !error && <p role="status">Loading settlement details…</p>}
  </main>;
}
