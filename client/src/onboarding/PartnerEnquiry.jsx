import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import CrewArt from "../design/CrewArt";
import { route, problem } from "./onboardingApi";
import "./onboarding.css";

export default function PartnerEnquiry() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  async function send(event) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const details = Object.fromEntries(new FormData(event.currentTarget));
      const { data } = await api.post(route + "/enquiries", details);
      setStatus(data.message);
    } catch (error) { setError(problem(error)); }
    finally { setSending(false); }
  }

  return <main className="df11 df11-narrow">
    <Link className="df11-back" to="/for-hotels">← For hotels</Link>
    <header className="df11-hero"><div><h1>Partner with DineFor</h1><p>Tell us about your hotel and its dining experiences. If it’s a fit, we’ll email you an invitation to apply.</p></div><CrewArt role="host" /></header>
    {status ? <p className="df11-notice" role="status">{status}</p> : <form className="df11-card df11-form" onSubmit={send}>
      <label>Hotel name<input name="hotelName" maxLength={180} required /></label>
      <label>Your name<input name="contactName" autoComplete="name" maxLength={180} required /></label>
      <label>Work email<input type="email" name="email" autoComplete="email" maxLength={254} required /></label>
      <label>Work phone (optional)<input type="tel" name="phone" autoComplete="tel" maxLength={24} /></label>
      <label>Tell us about your buffet (optional)<textarea name="message" rows="4" maxLength={1200} /></label>
      <p>Use this form for contact and buffet information. Document uploads are available after invitation.</p>
      {error && <p role="alert" className="df11-error">{error}</p>}
      <button className="df11-button" type="submit" disabled={sending}>{sending ? "Sending…" : "Send enquiry"}</button>
    </form>}
    <Link to="/hotel-invitation">Already invited? Resume your application</Link>
  </main>;
}
