import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import CrewArt from "../../design/CrewArt";
import { PasswordRecoveryForm } from "../../pages/ForgotPassword";
import { Action } from "../../bookings/bookingDisplay";
import "../../bookings/bookings.css";

const topics = [
  ["Booking changes", "Open Manage booking to see available rescheduling and cancellation options. The hotel’s policy determines the deadlines.", "/my-bookings", "My bookings"],
  ["Payments", "If payment is pending, use Payment History to check its status before attempting payment again.", "/payments", "Payment History"],
  ["Refund status", "Review the estimated refund before cancelling. After cancellation, track your refund in Payment History.", "/payments", "Track a refund"],
  ["QR entry", "Open the entry pass for a confirmed reservation and show the QR or booking code at hotel reception.", "/my-bookings", "Find your entry pass"],
];

export default function CustomerHelp() {
  const { hash } = useLocation();
  const privacy = useRef(null);
  useEffect(() => {
    if (hash !== "#privacy") return;
    const frame = window.requestAnimationFrame(() => privacy.current?.scrollIntoView());
    return () => window.cancelAnimationFrame(frame);
  }, [hash]);
  return <main className="df10-help">
    <Action icon="arrow_back" to="/customer">Account</Action>
    <header className="df10-heading df10-with-art">
      <div><h1>How can we help?</h1><p>Find answers, contact support, or recover your account.</p></div>
      <CrewArt role="assistant" />
    </header>
    <h2>Frequently asked questions</h2>
    {topics.map(([title, answer, path, label]) => <details key={title} className="df10-card">
      <summary>{title}</summary><p>{answer}</p><Link to={path}>{label}</Link>
    </details>)}
    <a className="df10-action df10-primary" href="mailto:info@dinefor.com">Contact support</a>
    <section className="df10-card df10-panel" id="privacy" ref={privacy}><h2>Privacy & account deletion</h2><p>Email support from your registered address to request account deletion or ask about your personal data.</p>
      <a className="df10-action" href="mailto:info@dinefor.com?subject=DineFor%20privacy%20request">Send a privacy request</a>
    </section>
    <section className="df10-card df10-panel"><h2>Forgot your password?</h2><p>Request a verification code by email to reset your password.</p>
      <PasswordRecoveryForm />
    </section>
  </main>;
}
