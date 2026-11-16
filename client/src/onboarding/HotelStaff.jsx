import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { route, problem } from "./onboardingApi";
import "./onboarding.css";

export function HotelStaffDesk() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const { logout } = useAuth();
  return <main className="df11 df11-narrow">
    <header className="df11-hero"><div><h1>Hotel check-in desk</h1><p>Scan the guest’s QR using your device camera or enter their booking code here.</p></div></header>
    <form className="df11-card df11-form" onSubmit={e => { e.preventDefault(); if (code.trim()) navigate(`/check-in/${encodeURIComponent(code.trim().toUpperCase())}`); }}>
      <label>Booking code<input value={code} onChange={e => setCode(e.target.value)} maxLength={80} required /></label>
      <button className="df11-button" type="submit">Look up booking</button>
    </form>
    <button type="button" className="df11-button secondary" onClick={() => { logout(); navigate("/"); }}>Sign out</button>
  </main>;
}

export function HotelStaffInvitation() {
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("invitation");
    if (value) {
      setToken(value);
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
  }, []);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(route + "/staff-accept", {}, { headers: { "X-Hotel-Invitation": token } });
      setNotice(data.message);
      setToken("");
    } catch (error) { setError(problem(error)); }
    finally { setBusy(false); }
  }

  return <main className="df11 df11-narrow">
    <header className="df11-hero"><div><h1>Hotel staff invitation</h1><p>Accept the invitation to set up a separate account for your hotel’s check-in desk.</p></div></header>
    {error && <p className="df11-error" role="alert">{error}</p>}
    {notice ? <section className="df11-card df11-form"><p role="status">{notice}</p><Link className="df11-button" to="/forgot-password">Set my password</Link></section>
      : token ? <button className="df11-button" disabled={busy} type="button" onClick={accept}>{busy ? "Setting up…" : "Accept staff invitation"}</button>
        : <p>Open the invitation from your work email. If you already accepted it, <Link to="/forgot-password">set your password</Link> or <Link to="/login">sign in</Link>.</p>}
  </main>;
}

export default function HotelStaff() {
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async signal => {
    try {
      const { data } = await api.get(route + "/staff", { signal });
      if (!signal?.aborted) setStaff(data);
    } catch (error) { if (!signal?.aborted) setError(problem(error)); }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, []);

  async function change(path, body, form) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(route + path, body);
      setNotice(data.message);
      form?.reset();
      await load();
    } catch (error) { setError(problem(error)); }
    finally { setBusy(false); }
  }

  return <main className="df11 df11-narrow">
    <Link className="df11-back" to="/hotel-partnership">← Partnership</Link>
    <header className="df11-hero"><div><h1>Staff invitations</h1><p>Give staff individual access to this hotel’s check-in desk.</p></div></header>
    {error && <p className="df11-error" role="alert">{error}</p>}
    {notice && <p className="df11-notice" role="status">{notice}</p>}
    <form className="df11-card df11-form" onSubmit={e => { e.preventDefault(); change("/staff", Object.fromEntries(new FormData(e.currentTarget)), e.currentTarget); }}>
      <label>Staff name<input name="name" maxLength={100} required /></label>
      <label>Work email<input name="email" type="email" maxLength={254} required /></label>
      <button className="df11-button" type="submit" disabled={busy}>Send staff invitation</button>
    </form>
    <section className="df11-card df11-form"><h2>Invited staff</h2>
      {staff?.length ? <ul className="df11-items">{staff.map(item => <li key={item._id}><strong>{item.name}</strong><span>{item.email} · {item.status}</span>
        {item.status !== "revoked" && <button type="button" className="df11-button danger" disabled={busy} onClick={() => change(`/staff/${item._id}/revoke`, {})}>Revoke access</button>}</li>)}</ul>
        : <p>{staff ? "No staff invitations yet." : "Loading invited staff…"}</p>}
    </section>
  </main>;
}
