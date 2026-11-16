import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { Icon } from "../design/ReferenceUI";
import CrewArt from "../design/CrewArt";
import CheckoutSummary, { money } from "./CheckoutSummary";
import "./checkout.css";

const statuses = {
  confirming: { title: "We are confirming your payment", icon: "lock", label: "Pending", description: "Do not pay again while we check." },
  failed: { title: "Payment not completed", icon: "error", label: "Unsuccessful", description: "Your reservation is not confirmed yet." },
  expired: { title: "Payment window expired", icon: "timer_off", label: "Expired", description: "Start a new reservation to check current availability." },
  confirmed: { title: "Payment confirmed", icon: "verified", label: "Confirmed", description: "View My bookings for the latest reservation status." },
  ready: { title: "Your payment is ready", icon: "lock", label: "Ready", description: "Continue to secure checkout to finish the payment." },
  refunded: { title: "Payment refunded", icon: "receipt_long", label: "Refunded", description: "See Payment history for your refund details." },
  partially_refunded: { title: "Payment partly refunded", icon: "receipt_long", label: "Partly refunded", description: "See Payment history for your refund details." },
};

function HoldTimer({ expiresAt, serverTime, receivedAt }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!expiresAt || !serverTime) return null;
  const elapsed = Math.max(0, now - receivedAt);
  const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.parse(serverTime) - elapsed) / 1000));
  if (!seconds) return <p className="df09-timer"><Icon name="schedule" /> Checking the seat hold…</p>;
  return <p className="df09-timer"><Icon name="schedule" /> Seats held for <time dateTime={`PT${seconds}S`}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</time></p>;
}

function openGateway(checkout) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.redirectUrl;
  for (const [name, value] of Object.entries(checkout.formFields || {})) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value ?? "");
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

function PaymentStatus({ endpoint, sandbox }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const inFlight = useRef(false);
  const readRequest = useRef(null);
  const getStatus = useCallback(async (signal) => {
    if (inFlight.current || (readRequest.current && !readRequest.current.signal?.aborted)) return;
    const request = { signal };
    readRequest.current = request;
    try {
      const { data } = await api.get(endpoint, { signal });
      if (signal?.aborted || readRequest.current !== request) return;
      setError("");
      setResult({ ...data, receivedAt: Date.now() });
    } catch (error) {
      if (!signal?.aborted && readRequest.current === request) setError(error.response?.data?.message || "Could not check the payment. Try checking the status again.");
    } finally {
      if (readRequest.current === request) readRequest.current = null;
    }
  }, [endpoint]);

  useEffect(() => {
    const controller = new AbortController();
    getStatus(controller.signal);
    return () => controller.abort();
  }, [getStatus]);
  useEffect(() => {
    if (!["confirming", "failed", "ready"].includes(result?.state)) return;
    const controller = new AbortController();
    const timer = window.setInterval(() => getStatus(controller.signal), 4000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [getStatus, result?.state]);

  async function act(action) {
    if (inFlight.current || working || !result) return;
    readRequest.current = null;
    inFlight.current = true;
    setWorking(true);
    setError("");
    try {
      if (sandbox) {
        const { data } = await api.post(endpoint, { action, attempt: result.attempt });
        setResult({ ...data, receivedAt: Date.now() });
      } else {
        const { data } = await api.post(`/payments/${result.paymentId}/initiate`);
        openGateway(data.checkout);
        return;
      }
    } catch (error) {
      setError(error.response?.data?.message || "Could not continue payment. Check its status before trying again.");
    } finally {
      inFlight.current = false;
      setWorking(false);
    }
  }

  const state = result?.state || "confirming";
  const screen = result ? statuses[state] || statuses.confirming : {
    title: error ? "Payment status unavailable" : "Checking payment status",
    icon: "lock", description: "Check your payment status before taking any further action.",
  };
  const canRetry = (sandbox && state === "failed") || (!sandbox && result?.canRetry);
  return <main className={`df09 df09-result df09-state-${state}`}>
    <Link className="df09-back" to="/payments"><Icon name="arrow_back" /> Payment history</Link>
    {sandbox && <p className="df09-test">Sandbox checkout · No real payment</p>}
    <div className="df09-status-intro" aria-live="polite">
      <span className="df09-status-icon"><Icon name={screen.icon} /></span>
      <h1>{screen.title}</h1>
      {result && state !== "failed" && <div className="df09-amount"><span>Amount</span><strong>{money(result.amount)}</strong></div>}
      {result && state !== "failed" && <p className="df09-pill">{screen.label}</p>}
      <p className={state === "failed" ? "df09-warning" : ""}>{screen.description}</p>
    </div>
    {state === "failed" && result?.reservation && <CheckoutSummary reservation={result.reservation} total={result.amount} />}
    {result && ["confirming", "failed", "ready"].includes(state) && <HoldTimer key={result.expiresAt} {...result} />}
    {["confirming", "failed"].includes(state) && <div className="df09-result-art"><CrewArt role={state === "failed" ? "host" : "assistant"} /></div>}
    {error && <p className="df09-warning" role="alert">{error}</p>}
    {canRetry && <button type="button" className="df09-primary" disabled={working} onClick={() => act("retry")}>{state === "ready" ? "Continue to secure payment" : "Retry payment"}</button>}
    {!["confirmed", "refunded", "partially_refunded"].includes(state) && <button type="button" className={canRetry ? "df09-secondary" : "df09-primary"} disabled={working} onClick={() => getStatus()}>Check payment status</button>}
    {state === "confirmed" && <Link className="df09-primary" to={result?.bookingId ? `/bookings/${result.bookingId}` : "/my-bookings"}>{result?.bookingId ? "View booking" : "My bookings"}</Link>}
    {state === "expired" && <Link className="df09-secondary" to={result?.reservation?.buffet?._id ? `/buffets/${result.reservation.buffet._id}` : "/listings"}>Start a new reservation</Link>}
    <Link className="df09-text-link" to="/help">Get help</Link>
    {sandbox && state === "confirming" && result && <details className="df09-card df09-details df09-test-controls">
      <summary>Sandbox simulation controls</summary>
      <p>Choose a test outcome for this payment attempt.</p>
      <div><button type="button" className="df09-secondary" disabled={working} onClick={() => act("fail")}>Simulate failure</button><button type="button" className="df09-secondary" disabled={working} onClick={() => act("success")}>Simulate success</button></div>
    </details>}
  </main>;
}

export default function PaymentGatewayResult() {
  const { paymentId } = useParams();
  const [search] = useSearchParams();
  const orderId = search.get("order_id");
  const endpoint = paymentId ? `/payments/checkout/${encodeURIComponent(paymentId)}`
    : orderId ? `/payments/return-status/${encodeURIComponent(orderId)}` : "";
  if (!endpoint) return <main className="df09 df09-result"><h1>Find your payment</h1><p>Open Payment history to see your payment status.</p><Link to="/payments" className="df09-primary">Payment history</Link></main>;
  return <PaymentStatus key={endpoint} endpoint={endpoint} sandbox={Boolean(paymentId)} />;
}
