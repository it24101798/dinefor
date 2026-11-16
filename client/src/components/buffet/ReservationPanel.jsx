import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import AvailabilityDateStrip from '../booking/AvailabilityDateStrip';
import { money } from '../../discovery/query';

export const sriLankaToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

export default function ReservationPanel({ buffet, date, guests, initialSlot, onDate, onGuests, onContinue }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [slotId, setSlotId] = useState(initialSlot || '');
  const [attempt, setAttempt] = useState(0);
  const [checking, setChecking] = useState(false);
  const sequence = useRef(0);
  const today = sriLankaToday();
  const start = buffet.availableFromDate?.slice(0, 10) || today;
  const fixedDate = buffet.specialDate?.slice(0, 10);
  const min = fixedDate || (start > today ? start : today);
  const max = fixedDate || buffet.availableToDate?.slice(0, 10);
  const active = result?.date === date ? result.data : null;
  const limit = Number(active?.reservationPolicy?.maxGuestsPerBooking || buffet.maxGuestsPerBooking || 20);
  const slots = active?.slots || [];
  const fits = slot => active?.isAvailableDate !== false && !slot.isClosed && Number(slot.availableSeats) >= guests && guests <= limit;
  const selected = slots.find(slot => slot._id === slotId && fits(slot)) || slots.find(fits);

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    setError('');
    setResult(null);
    api.get(`/bookings/availability/${buffet._id}`, { params: { date }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setResult({ date, data }); })
      .catch(() => { if (!controller.signal.aborted) setError('Couldn’t check seats. Try again.'); });
    return () => controller.abort();
  }, [buffet._id, date, attempt]);

  useEffect(() => () => { sequence.current += 1; }, []);

  function changeDate(value) {
    setSlotId('');
    onDate(value);
  }

  async function submit(event) {
    event.preventDefault();
    if (!selected || checking) return;
    const request = ++sequence.current;
    setChecking(true);
    setError('');
    try {
      const { data } = await api.get(`/bookings/availability/${buffet._id}`, { params: { date } });
      if (request !== sequence.current) return;
      setResult({ date, data });
      const latest = data.slots?.find(slot => slot._id === selected._id);
      if (data.isAvailableDate === false || !latest || latest.isClosed || !(Number(latest.availableSeats) >= guests)
        || guests > Number(data.reservationPolicy?.maxGuestsPerBooking || limit)) {
        setError('Availability changed. Choose an available session and try again.');
        return;
      }
      onContinue(latest);
    } catch {
      if (request === sequence.current) setError('Couldn’t verify seats. Try again.');
    } finally {
      if (request === sequence.current) setChecking(false);
    }
  }

  return <form className="df06-reservation" onSubmit={submit}>
    <h2>Reserve this buffet</h2>
    <p><strong>{money(buffet.price)}</strong> / guest</p>
    <fieldset disabled={checking}>
      <label>Dining date<input type="date" value={date} min={min} max={max} readOnly={Boolean(fixedDate)} onChange={event => changeDate(event.target.value)} required /></label>
      {!fixedDate && <AvailabilityDateStrip buffetId={buffet._id} selectedDate={date} guests={guests} days={7} onSelect={changeDate} />}
      {!active && date && !error && <p role="status">Checking live seats…</p>}
      {!active && error && <button type="button" className="df-shell-secondary" onClick={() => setAttempt(value => value + 1)}>Retry availability</button>}
      {active && <div role="group" aria-label="Time slots" className="df06-slots">
        {slots.map(slot => <button type="button" key={slot._id} disabled={!fits(slot)} aria-pressed={selected?._id === slot._id} onClick={() => setSlotId(slot._id)}>
          <strong>{slot.startTime} – {slot.endTime}</strong>
          <small>{slot.isClosed ? 'Closed' : Number(slot.availableSeats) <= 0 ? 'Sold out' : fits(slot) ? `${slot.availableSeats} seats` : 'Too few seats'}</small>
        </button>)}
        {!slots.length && <p>{active.message || 'No sessions on this date.'}</p>}
      </div>}
      <div className="df06-party"><strong>Guests</strong><div>
        <button type="button" aria-label="Fewer guests" disabled={guests <= 1} onClick={() => onGuests(guests - 1)}>−</button>
        <output aria-live="polite">{guests}</output>
        <button type="button" aria-label="More guests" disabled={guests >= limit} onClick={() => onGuests(guests + 1)}>+</button>
      </div></div>
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <div className="df06-total"><span>Estimated total</span><strong>{money(buffet.price * guests)}</strong></div>
    <button type="submit" className="df-shell-primary" disabled={!selected || checking}>{checking ? 'Checking seats…' : 'Continue to booking'}</button>
    <p className="df06-hint">Your reservation is confirmed after you complete checkout.</p>
  </form>;
}
