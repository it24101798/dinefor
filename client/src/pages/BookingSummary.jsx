import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { Icon } from "../design/ReferenceUI";
import CrewArt from "../design/CrewArt";
import CheckoutSummary, { money } from "./CheckoutSummary";
import "./checkout.css";

export default function BookingSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const reservation = location.state?.reservation;
  const valid = Boolean(reservation?.guestDetails && reservation.totals && reservation.checkoutKey);
  const hotelId = valid ? reservation.buffet.hotel?._id : null;
  const lock = useRef(false);
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState("");
  const [reload, setReload] = useState(0);
  const [coupon, setCoupon] = useState("");
  const [preview, setPreview] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setOptionsError("");
    api.get("/payments/options", { params: { hotelId }, signal: controller.signal })
      .then(({ data }) => setOptions(data))
      .catch(() => {
        if (!controller.signal.aborted) setOptionsError("Payment options could not be loaded.");
      });
    return () => controller.abort();
  }, [hotelId, valid, reload]);

  const reviewPath = location.search ? "/reserve" + location.search : "/feed";
  const reviewState = reservation && { guestDetails: reservation.guestDetails, specialRequests: reservation.specialRequests, review: true, checkoutKey: reservation.checkoutKey };
  if (!valid) return <main className="df09 df09-result"><h1>Review your reservation</h1><p>Check your guest details and total before continuing to payment.</p><Link className="df09-primary" to={reviewPath} state={reviewState}>{location.search ? "Return to reservation" : "Find a buffet"}</Link></main>;

  const total = preview?.grandTotal ?? reservation.totals.grandTotal;
  async function applyCoupon() {
    if (!coupon.trim() || couponBusy || sending) return;
    setCouponBusy(true);
    setCouponError("");
    try {
      const { data } = await api.post("/coupons/validate", {
        code: coupon.trim(), buffetId: reservation.buffetId, seats: reservation.seats,
      });
      if (typeof data.totals?.grandTotal !== "number") throw new Error("Invalid coupon quote");
      setPreview(data.totals);
    } catch (error) {
      setPreview(null);
      setCouponError(error.response?.data?.message || "Could not apply this coupon.");
    } finally {
      setCouponBusy(false);
    }
  }

  async function confirm(event) {
    event.preventDefault();
    if (lock.current || couponBusy || !accepted || !options?.sandboxAvailable) return;
    lock.current = true;
    setSending(true);
    setError("");
    try {
      const { data } = await api.post("/bookings", {
        buffetId: reservation.buffetId, selectedDate: reservation.selectedDate,
        slotId: reservation.slotId, seats: reservation.seats,
        guestDetails: reservation.guestDetails, specialRequests: reservation.specialRequests,
        acceptedCancellationPolicy: true, expectedTotal: total,
        couponCode: preview ? coupon.trim() : "", paymentMode: "full_payment",
      }, { headers: { "Idempotency-Key": reservation.checkoutKey } });
      navigate(`/payment/status/${data.paymentId}`, { replace: true });
    } catch (error) {
      const existingPayment = error.response?.data?.paymentId;
      if (existingPayment) navigate(`/payment/status/${existingPayment}`, { replace: true });
      else setError(error.response?.data?.message || "We could not verify your request. Try again from this screen to recover the same payment hold.");
    } finally {
      lock.current = false;
      setSending(false);
    }
  }

  return <main className="df09">
    <Link className="df09-back" to={reviewPath} state={reviewState}><Icon name="arrow_back" /> Reservation review</Link>
    <header className="df09-hero">
      <div><h1>Choose how to pay</h1><p>Review your total before continuing to payment.</p></div>
      <CrewArt role="chef" />
    </header>
    <form className="df09-checkout-grid" onSubmit={confirm}>
      <div className="df09-stack">
        <CheckoutSummary reservation={reservation} total={total} />
        <section className="df09-card df09-guest">
          <div><h2>Booking guest</h2><p>{reservation.guestDetails.name}</p></div>
          <Link to={reviewPath} state={{ ...reviewState, review: false }}>Edit guest details</Link>
        </section>
        <details className="df09-card df09-details">
          <summary>Have a coupon?</summary>
          <div className="df09-coupon">
            <input aria-label="Coupon code" placeholder="Coupon code" maxLength={64} value={coupon} disabled={couponBusy || sending} onChange={event => { setCoupon(event.target.value.toUpperCase()); setPreview(null); setCouponError(""); }} />
            <button className="df09-secondary" type="button" disabled={!coupon.trim() || couponBusy || sending} onClick={applyCoupon}>{couponBusy ? "Checking…" : "Apply"}</button>
          </div>
          {couponError && <p className="df09-warning" role="alert">{couponError}</p>}
          {preview && <p role="status">Coupon applied. You saved {money(preview.discountAmount)}.</p>}
        </details>
      </div>
      <div className="df09-stack">
        <section className="df09-method" aria-label="Payment method">
          <Icon name="lock" /><div><h2>Pay securely online</h2><p>Due now {money(total)}</p></div>
          <Icon name="check_circle" />
        </section>
        {optionsError ? <div className="df09-warning" role="alert">{optionsError} <button type="button" onClick={() => setReload(value => value + 1)}>Try again</button></div>
          : !options ? <p role="status">Loading payment options…</p>
          : options.sandboxAvailable ? <p className="df09-test">Sandbox checkout · No real payment</p>
          : <p className="df09-warning">Online checkout is currently unavailable.</p>}
        <label className="df09-terms"><input type="checkbox" required checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>I accept the <Link to={reviewPath} state={reviewState}>cancellation and change terms</Link> shown in the reservation review.</span></label>
        {error && <p className="df09-warning" role="alert">{error}</p>}
        <button className="df09-primary" type="submit" disabled={!accepted || !options?.sandboxAvailable || couponBusy || sending}>{sending ? "Holding your seats…" : "Continue to payment"} <Icon name="arrow_forward" /></button>
        <Link to="/payments" className="df09-text-link">Payment history</Link>
      </div>
    </form>
  </main>;
}
