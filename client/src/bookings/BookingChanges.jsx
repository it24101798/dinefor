import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { money } from "../pages/CheckoutSummary";
import { Action, dateInColombo, sriLankaToday } from "./bookingDisplay";

export function Cancellation({ booking, onClose, onDone }) {
  const [quote, setQuote] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const id = booking._id;

  useEffect(() => {
    const controller = new AbortController();
    api.get(`/cancellations/bookings/${id}/quote`, { signal: controller.signal })
      .then(({ data }) => setQuote(data))
      .catch(() => {
        if (!controller.signal.aborted) setError("We couldn’t load the cancellation quote. Try again.");
      });
    return () => controller.abort();
  }, [id, revision]);

  async function submit(event) {
    event.preventDefault();
    if (lock.current || !quote?.quote.canCustomerCancel) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.put(`/bookings/my-bookings/${id}/cancel`, {
        reason, reasonCode: "plans_changed", expectedRefundAmount: quote.quote.refundableAmount,
        expectedRefundPercent: quote.quote.refundPercent,
      });
      onDone(data.message);
    } catch (error) {
      setError(error.response?.data?.message || "We couldn’t cancel your booking.");
      if (error.response?.status === 409) {
        setQuote(null);
        setRevision(value => value + 1);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <form className="df10-card df10-panel" onSubmit={submit} aria-labelledby="cancel-title">
    <h2 id="cancel-title">Review cancellation</h2>
    {error && <p role="alert">{error}</p>}
    {!quote && !error && <p role="status">Calculating your refund…</p>}
    {!quote && error && <Action icon="refresh" onClick={() => { setError(""); setRevision(value => value + 1); }}>Refresh quote</Action>}
    {quote && <>
      <dl className="df10-policy">
        <div><dt>Estimated refund</dt><dd>{money(quote.quote.refundableAmount)} ({quote.quote.refundPercent}%)</dd></div>
        <div><dt>Amount retained</dt><dd>{money(quote.quote.retainedAmount)}</dd></div>
        {quote.advanceCutoff && <div><dt>Advance refund window ends</dt><dd>{dateInColombo(quote.advanceCutoff, true)}</dd></div>}
        {quote.lateCutoff && <div><dt>Late refund window ends</dt><dd>{dateInColombo(quote.lateCutoff, true)}</dd></div>}
        {quote.startsAt && <div><dt>Online cancellation closes</dt><dd>{dateInColombo(quote.startsAt, true)}</dd></div>}
      </dl>
      <p>Times are shown in Sri Lanka time. Eligible refunds are reviewed after cancellation.</p>
      {!quote.quote.canCustomerCancel && <p>This booking is no longer eligible for online cancellation.</p>}
      {quote.quote.canCustomerCancel && <>
        <label>Reason (optional)<textarea value={reason} maxLength={500} rows={2} onChange={event => setReason(event.target.value)} /></label>
        <button className="df10-action df10-danger" type="submit" disabled={busy}>{busy ? "Cancelling…" : "Confirm cancellation"}</button>
      </>}
    </>}
    <Action icon="arrow_back" onClick={onClose} disabled={busy}>Keep booking</Action>
  </form>;
}

export function Reschedule({ booking, onClose, onDone }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState(null);
  const [slotId, setSlotId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    api.get(`/bookings/availability/${booking.buffet?._id}`, { params: { date }, signal: controller.signal })
      .then(({ data }) => setSlots((data.slots || []).filter(slot => {
        const sameSession = date === String(booking.selectedDate).slice(0, 10) && slot.startTime === booking.selectedTimeSlot?.startTime;
        return !sameSession && !slot.isClosed && slot.availableSeats >= booking.seats;
      })))
      .catch(() => {
        if (!controller.signal.aborted) setError("We couldn’t load times for that date.");
      });
    return () => controller.abort();
  }, [booking, date]);

  async function submit(event) {
    event.preventDefault();
    if (lock.current || !date || !slotId) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.put(`/bookings/my-bookings/${booking._id}/reschedule`, { selectedDate: date, slotId });
      onDone(data.message);
    } catch (error) {
      setError(error.response?.data?.message || "We couldn’t reschedule your booking.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <form className="df10-card df10-panel" onSubmit={submit} aria-labelledby="reschedule-title">
    <h2 id="reschedule-title">Choose another session</h2>
    {booking.rescheduleDeadline && <p>Online changes close {dateInColombo(booking.rescheduleDeadline, true)} Sri Lanka time.</p>}
    <label>New date<input required type="date" min={sriLankaToday()} value={date} disabled={busy} onChange={event => {
      setDate(event.target.value);
      setSlots(null);
      setSlotId("");
      setError("");
    }} /></label>
    {date && !slots && !error && <p role="status">Checking available times…</p>}
    {slots?.length > 0 && <label>New time<select required value={slotId} onChange={event => setSlotId(event.target.value)} disabled={busy}>
      <option value="">Select a time</option>
      {slots.map(slot => <option key={slot._id} value={slot._id}>{slot.startTime} – {slot.endTime}</option>)}
    </select></label>}
    {slots?.length === 0 && <p>No available sessions for this date. Choose another day.</p>}
    {error && <p role="alert">{error}</p>}
    <button className="df10-action df10-primary" type="submit" disabled={busy || !slotId}>{busy ? "Rescheduling…" : "Confirm new session"}</button>
    <Action icon="arrow_back" onClick={onClose} disabled={busy}>Keep current session</Action>
  </form>;
}
