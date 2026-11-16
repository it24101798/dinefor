import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Photo } from '../design/ReferenceUI';
import CrewArt from '../design/CrewArt';
import { money } from '../discovery/query';
import './reservation-details.css';

const formatLocal = value => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

function newCheckoutKey() {
  // getRandomValues also works when a phone opens the local Vite server over HTTP.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function ReservationJourney({ buffetId, selectedDate, slotId, seats }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [checkoutKey] = useState(() => location.state?.checkoutKey || (globalThis.crypto?.randomUUID?.() ?? newCheckoutKey()));
  const previous = location.state?.guestDetails;
  const [guestDetails, setGuest] = useState(previous || { name: user?.name || '', email: user?.email || '', phone: user?.phone || '', bookingForSomeoneElse: false });
  const [requests, setRequests] = useState(location.state?.specialRequests || { additionalNotes: '', dietaryNotes: '', shareDietary: false });
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [review, setReview] = useState(location.state?.review === true);
  const [accepted, setAccepted] = useState(false);
  const selection = { buffetId, selectedDate, slotId, seats };
  const editUrl = buffetId ? `/buffets/${encodeURIComponent(buffetId)}?${new URLSearchParams({ date: selectedDate, guests: seats, slot: slotId, reserve: '1' })}` : '/listings';

  useEffect(() => {
    if (!buffetId || !selectedDate || !slotId || !Number.isInteger(seats) || seats < 1) {
      setError('Select a buffet, dining date and session to continue.');
      return;
    }
    const controller = new AbortController();
    setError('');
    setQuote(null);
    api.post('/bookings/quote', { buffetId, selectedDate, slotId, seats }, { signal: controller.signal })
      .then(({ data }) => {
        if (!data?.buffet?._id || !data.slot || typeof data.totals?.grandTotal !== 'number' || !data.cancellation?.advanceCutoff) throw new Error('Invalid quote');
        if (!controller.signal.aborted) setQuote(data);
      }).catch(error => {
        if (!controller.signal.aborted) setError(error.response?.data?.message || 'Could not check your reservation. Try again.');
      });
    return () => controller.abort();
  }, [buffetId, selectedDate, slotId, seats, attempt]);

  const updateGuest = (key, value) => setGuest(current => ({ ...current, [key]: value }));
  const updateRequest = (key, value) => setRequests(current => ({ ...current, [key]: value }));
  function toReview(event) {
    event.preventDefault();
    if (!guestDetails.name.trim() || !/^\+?[\d ()-]+$/.test(guestDetails.phone.trim()) || guestDetails.phone.replace(/\D/g, '').length < 7) {
      setError('Enter a guest name and valid phone number.');
      return;
    }
    if (requests.dietaryNotes.trim() && !requests.shareDietary) {
      setError('Allow the hotel to read the dietary note or remove it.');
      return;
    }
    setError('');
    setReview(true);
    setAccepted(false);
    navigate(location.pathname + location.search, { replace: true, state: { guestDetails, specialRequests: requests, review: true, checkoutKey } });
    window.scrollTo(0, 0);
  }

  function checkout(event) {
    event.preventDefault();
    if (!accepted || !quote) return;
    navigate('/booking-summary' + location.search, { state: { reservation: {
      ...selection, ...quote, guestDetails, specialRequests: requests, acceptedCancellationPolicy: true, checkoutKey,
    } } });
  }

  return <main className="df08"><div className="df08-wrap">
    <Link className="df08-edit" to={editUrl} state={{ guestDetails, specialRequests: requests }}>← Edit selection</Link>
    <h1>{review ? 'Review reservation' : 'Guest details'}</h1>
    <ol className="df08-progress" aria-label="Reservation progress">
      {['Guest details', 'Review', 'Payment'].map((label, index) => <li key={label} aria-current={index === (review ? 1 : 0) ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}
    </ol>
    {error && <p className="df08-notice" role="alert">{error}</p>}
    {!quote && !error && <p role="status">Checking your reservation…</p>}
    {!quote && error && buffetId && slotId && <button type="button" className="df-shell-secondary" onClick={() => setAttempt(value => value + 1)}>Check again</button>}
    {quote && <>
      <article className="df08-buffet">
        <div><Photo sources={[quote.buffet.thumbnail, quote.buffet.images || []]} alt={quote.buffet.title} /></div>
        <section><h2>{quote.buffet.title}</h2><p>{quote.buffet.hotel?.hotelName}</p><p>{quote.buffet.hotel?.city}</p></section>
      </article>
      {review ? <form className="df08-form" onSubmit={checkout}>
        <dl className="df08-review">
          <div><dt>Date</dt><dd>{selectedDate}</dd></div>
          <div><dt>Session</dt><dd>{quote.slot.startTime} – {quote.slot.endTime}</dd></div>
          <div><dt>Guests</dt><dd>{seats}</dd></div>
          <div><dt>Booking name</dt><dd>{guestDetails.name}</dd></div>
          <div><dt>Email</dt><dd>{guestDetails.email}</dd></div>
          <div><dt>Phone</dt><dd>{guestDetails.phone}</dd></div>
          {requests.additionalNotes.trim() && <div><dt>Special request</dt><dd>{requests.additionalNotes.trim()}</dd></div>}
          {requests.dietaryNotes.trim() && <div><dt>Dietary note</dt><dd>{requests.dietaryNotes.trim()} · shared with hotel</dd></div>}
        </dl>
        <button type="button" className="df08-edit" onClick={() => setReview(false)}>Edit guest details</button>
        <div className="df08-total"><strong>Total before discounts</strong><strong>{money(quote.totals.grandTotal)}</strong></div>
        <section className="df08-notice">
          <h2>Cancellation policy</h2>
          <p>Advance cancellation window ends <strong>{formatLocal(quote.cancellation.advanceCutoff)}</strong> Sri Lanka time.</p>
          <p>After that, the hotel’s late refund rate is {quote.cancellation.lateRefundPercent}% of the paid amount until {formatLocal(quote.cancellation.lateCutoff)} Sri Lanka time, then {quote.cancellation.lastMinuteRefundPercent}% before the session.</p>
        </section>
        <label className="df08-check"><input type="checkbox" required checked={accepted} onChange={event => setAccepted(event.target.checked)} />I have read and accept the cancellation policy.</label>
        <button type="submit" className="df-shell-primary" disabled={!accepted}>Continue to payment</button>
        <small>Seats are reserved when you confirm at checkout, subject to availability.</small>
      </form> : <form className="df08-form" onSubmit={toReview}>
        <label>Full name<input required maxLength={100} autoComplete="name" value={guestDetails.name} onChange={e => updateGuest('name',e.target.value)} /></label>
        <label>Email<input required type="email" maxLength={254} autoComplete="email" value={guestDetails.email} onChange={e => updateGuest('email',e.target.value)} /></label>
        <label>Mobile<input required type="tel" maxLength={25} autoComplete="tel" value={guestDetails.phone} onChange={e => updateGuest('phone',e.target.value)} /></label>
        <label className="df08-check"><input type="checkbox" checked={guestDetails.bookingForSomeoneElse} onChange={e => updateGuest('bookingForSomeoneElse',e.target.checked)} />Booking for someone else</label>
        {guestDetails.bookingForSomeoneElse && <p>Enter the attending guest’s details with their permission.</p>}
        <label>Special requests (optional)<textarea rows={3} maxLength={500} value={requests.additionalNotes} placeholder="Seating preferences or occasion" onChange={e => updateRequest('additionalNotes',e.target.value)} /></label>
        <details className="df08-dietary"><summary>Dietary needs?</summary>
          <label>Dietary note (optional)<textarea rows={3} maxLength={500} value={requests.dietaryNotes} onChange={e => updateRequest('dietaryNotes',e.target.value)} /></label>
          <label className="df08-check"><input type="checkbox" checked={requests.shareDietary} onChange={e => updateRequest('shareDietary',e.target.checked)} />Share this dietary note with the hotel.</label>
        </details>
        <aside className="df08-chef"><CrewArt role="chef" /><div><strong>Have a special request?</strong><p>The hotel may need to confirm it separately.</p></div></aside>
        <button type="submit" className="df-shell-primary">Review reservation</button>
      </form>}
    </>}
  </div></main>;
}

export default function ReservationDetails() {
  const [params] = useSearchParams();
  return <ReservationJourney key={params.toString()} buffetId={params.get('buffet') || ''} selectedDate={params.get('date') || ''} slotId={params.get('slot') || ''} seats={Number(params.get('guests'))} />;
}
