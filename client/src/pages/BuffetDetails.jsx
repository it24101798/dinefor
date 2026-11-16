import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import useResponsive from '../hooks/useResponsive';
import { Photo, Ribbon } from '../design/ReferenceUI';
import CrewArt from '../design/CrewArt';
import ShellIcon from '../mobile/shell/ShellIcon';
import { SaveHeart } from '../discovery/DiscoveryCard';
import { mealLabel, money } from '../discovery/query';
import { toImageUrl } from '../utils/media';
import GalleryLightbox from '../components/shared/GalleryLightbox';
import ReservationPanel, { sriLankaToday } from '../components/buffet/ReservationPanel';
import RelatedBuffets from '../components/buffet/RelatedBuffets';
import ReviewForm from '../components/reviews/ReviewForm';
import ReviewList from '../components/reviews/ReviewList';
import '../components/buffet/buffet-details.css';

const sections = [['details', 'Details'], ['menu', 'Menu'], ['reviews', 'Reviews']];
const dateKey = value => typeof value === 'string' ? value.slice(0, 10) : '';
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function Gallery({ photos, title, index, select, open }) {
  return <section className="df06-gallery" aria-label="Buffet photos">
    {photos.length ? <button type="button" className="df06-cover" onClick={() => open(index)} aria-label="Open buffet photo gallery">
      <Photo sources={[photos[index]]} alt={title} loading="eager" />
      <span className="df06-photo-count">{index + 1} / {photos.length}</span>
    </button> : <div className="df06-cover"><Photo alt={title} /></div>}
    {photos.length > 1 && <div className="df06-thumbs">{photos.slice(0, 4).map((photo, number) => (
      <button type="button" key={photo} aria-label={`Show photo ${number + 1}`} aria-pressed={index === number} onClick={() => select(number)}>
        <Photo sources={[photo]} alt="" />
      </button>
    ))}</div>}
  </section>;
}

function Reviews({ buffetId, returnTo }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setData(null);
    api.get(`/reviews/buffet/${buffetId}`, { signal: controller.signal })
      .then(({ data }) => {
        const response = Array.isArray(data) ? { reviews: data } : data;
        if (!Array.isArray(response?.reviews)) throw new Error('Invalid reviews response');
        if (!controller.signal.aborted) setData(response);
      }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [buffetId, attempt]);

  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
  const total = reviews.length;
  const average = total ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total : 0;
  return <section className="df06-review-panel">
    <header><h2>Guest reviews</h2>
      {user?.role === 'customer'
        ? <button type="button" className="df06-text-button" aria-expanded={showForm} onClick={() => setShowForm(value => !value)}>{showForm ? 'Hide review form' : 'Write a review'}</button>
        : !user && <Link className="df06-text-button" to="/login" state={{ returnTo }}>Sign in to review</Link>}
    </header>
    {showForm && <ReviewForm buffetId={buffetId} onReviewCreated={() => { setShowForm(false); setAttempt(value => value + 1); }} />}
    {!data && !error && <p role="status">Loading reviews…</p>}
    {error && <p role="alert">Couldn’t load reviews. <button type="button" className="df06-text-button" onClick={() => setAttempt(value => value + 1)}>Try again</button></p>}
    {data && (total ? <>
      <div className="df06-review-score">
        <div><strong>{average.toFixed(1)}</strong><span>out of 5 · {total} {total === 1 ? 'review' : 'reviews'}</span></div>
        <div>{[5, 4, 3, 2, 1].map(star => {
          const percent = Math.round(100 * reviews.filter(review => Math.round(Number(review.rating)) === star).length / total);
          return <div key={star} className="df06-rating-row"><span>{star} <b aria-hidden="true">★</b></span><progress aria-label={`${star}-star reviews`} value={percent} max="100" /><span>{percent}%</span></div>;
        })}</div>
      </div>
      <ReviewList reviews={reviews} />
    </> : <p>No published reviews yet.</p>)}
  </section>;
}

function LocationAndPolicy({ buffet }) {
  const hotel = buffet.hotel;
  const town = buffet.location?.city || hotel?.city || hotel?.location;
  const address = buffet.location?.address || hotel?.address;
  const policy = hotel?.cancellationPolicy;
  const location = [hotel?.hotelName, town].filter(Boolean).join(', ');
  return <>
    {(location || address) && <section className="df06-info"><ShellIcon name="pin" /><div><h2>Location & directions</h2>
      {location && <p>{location}</p>}{address && address !== town && <p>{address}</p>}
      {hotel?._id && <Link to={`/hotels/${hotel._id}`}>View hotel and map →</Link>}
      {!hotel?._id && town && <Link to={`/explore-map?location=${encodeURIComponent(town)}`}>Explore the map →</Link>}
    </div></section>}
    <details className="df06-policy"><summary><ShellIcon name="calendar" /> Cancellation policy</summary>
      <div>{policy && Number.isFinite(policy.freeCancellationHours)
        ? <p>The hotel’s advance cancellation window is {policy.freeCancellationHours} hours before your session. Your booking’s cancellation quote will show the applicable refund before you confirm.</p>
        : <p>Review the cancellation terms in checkout before you book. For an existing booking, open My bookings to see its cancellation options.</p>}</div>
    </details>
  </>;
}

function ReserveDialog({ children, close }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    const previous = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className="df06-reserve-dialog" aria-label="Reserve a buffet" onCancel={event => { event.preventDefault(); close(); }}>
    <div><button type="button" aria-label="Close reservation" className="df06-close" onClick={close}><ShellIcon name="close" /></button>{children}</div>
  </dialog>;
}

function BuffetDetailPage({ id }) {
  const { user } = useAuth();
  const { isDesktop } = useResponsive();
  const location = useLocation();
  const navigate = useNavigate();
  const requested = new URLSearchParams(location.search);
  const [buffet, setBuffet] = useState(null);
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState(1);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [reserve, setReserve] = useState(requested.get('reserve') === '1');
  const recorded = useRef('');

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    api.get(`/buffets/${encodeURIComponent(id)}`, { signal: controller.signal }).then(({ data }) => {
      if (!data?._id) throw new Error('Missing buffet');
      if (controller.signal.aborted) return;
      const params = new URLSearchParams(location.search);
      const requestedDate = params.get('date');
      const party = Number(params.get('guests'));
      const today = sriLankaToday();
      const start = dateKey(data.availableFromDate);
      const end = dateKey(data.availableToDate);
      const earliest = start > today ? start : today;
      const desiredDate = validDate(requestedDate) && requestedDate >= earliest && (!end || requestedDate <= end)
        ? requestedDate : earliest;
      setDate(dateKey(data.specialDate) || desiredDate);
      setGuests(Number.isInteger(party) && party > 0 ? Math.min(party, data.maxGuestsPerBooking || 20) : 1);
      setBuffet(data);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [id, attempt, location.search]);

  useEffect(() => {
    if (!user?.token || !buffet?._id || recorded.current === buffet._id) return;
    recorded.current = buffet._id;
    api.put(`/discovery/recently-viewed/${buffet._id}`).catch(() => {});
  }, [user?.token, buffet?._id]);

  function continueToCheckout(slot) {
    if (!user) {
      const query = new URLSearchParams({ date, guests: String(guests), slot: slot._id, reserve: '1' });
      navigate('/login', { state: { returnTo: `${location.pathname}?${query}` } });
      return;
    }
    const query = new URLSearchParams({ buffet: buffet._id, date, slot: slot._id, guests: String(guests) });
    navigate(`/reserve?${query}`, { state: location.state });
  }

  if (!buffet) return <main className="df06-page"><div className="df06-wrap">
    {error && <p role="alert">This buffet couldn’t be loaded. <Link to="/listings">Browse buffets</Link> <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></p>}
    {!error && <p role="status">Loading buffet details…</p>}
  </div></main>;

  const hotel = buffet.hotel;
  const city = buffet.location?.city || hotel?.city || hotel?.location;
  const photos = [...new Set([buffet.thumbnail, ...(buffet.images || []), hotel?.coverMediaUrl, ...(hotel?.galleryImages || [])].map(toImageUrl).filter(Boolean))];
  const highlights = (buffet.highlights || []).filter(item => typeof item === 'string' && item.trim());
  const amenities = (hotel?.amenities || []).filter(item => typeof item === 'string' && item.trim());
  const booking = <ReservationPanel buffet={buffet} date={date} guests={guests} initialSlot={requested.get('slot')} onDate={setDate} onGuests={setGuests} onContinue={continueToCheckout} />;
  const openGallery = number => { setGalleryIndex(number); setLightbox(true); };

  return <main className="df06-page">
    <div className="df06-wrap">
      <div className="df06-toolbar"><Link to="/listings"><ShellIcon name="right" /> All buffets</Link><SaveHeart buffet={buffet} /></div>
      <div className="df06-layout">
        <div className="df06-main">
          <Gallery photos={photos} title={buffet.title} index={galleryIndex} select={setGalleryIndex} open={openGallery} />
          <header className="df06-title">
            <h1>{buffet.title}</h1>
            <div className="df06-facts">
              {buffet.totalReviews > 0 && <span><b aria-hidden="true">★</b> {Number(buffet.averageRating || 0).toFixed(1)} ({buffet.totalReviews} {buffet.totalReviews === 1 ? 'review' : 'reviews'})</span>}
              {city && <span><ShellIcon name="pin" />{city}</span>}
              {buffet.category && <span><ShellIcon name="buffet" />{mealLabel(buffet.category)} buffet</span>}
            </div>
          </header>
          <nav className="df06-section-links" aria-label="On this page">
            {sections.map(([key, label]) => <a key={key} href={`#buffet-${key}`}>{label}</a>)}
          </nav>
          <section className="df06-content-section" id="buffet-details" aria-labelledby="buffet-details-title">
            <h2 id="buffet-details-title">About this buffet</h2>
            {buffet.description && <p className="df06-description">{buffet.description}</p>}
            {amenities.length > 0 && <ul className="df06-amenities">{amenities.map((label, index) => <li key={index}>{label}</li>)}</ul>}
            <div className="df06-couple"><Ribbon /><img src="/images/home/nila-kavin.png" alt="" loading="lazy" /></div>
            <LocationAndPolicy buffet={buffet} />
          </section>
          <section className="df06-content-section" id="buffet-menu" aria-labelledby="buffet-menu-title">
            <div className="df06-menu-heading"><div><h2 id="buffet-menu-title">Buffet menu</h2><p>Menu highlights supplied by the hotel.</p></div><CrewArt role="chef" /></div>
            {highlights.length ? <ul className="df06-menu">{highlights.map((item, index) => <li key={index}><ShellIcon name="buffet" />{item}</li>)}</ul> : <p>The hotel hasn’t published menu highlights for this buffet.</p>}
            <details className="df06-policy"><summary>Dietary information</summary><p>Menu items may change. Check allergens and dietary needs with the hotel before booking.</p></details>
          </section>
          <div className="df06-content-section" id="buffet-reviews">
            <Reviews buffetId={buffet._id} returnTo={location.pathname + location.search} />
          </div>
          <RelatedBuffets buffetId={buffet._id} city={typeof city === 'string' ? city : ''} category={buffet.category} date={date} guests={guests} />
        </div>
        {isDesktop && <aside className="df06-desktop-booking">{booking}</aside>}
      </div>
    </div>
    {!isDesktop && <div className="df06-booking-bar">
      <div><strong>{money(buffet.price)}</strong><small> per guest</small></div>
      <button type="button" className="df-shell-primary" onClick={() => setReserve(true)}>Reserve</button>
    </div>}
    {reserve && !isDesktop && <ReserveDialog close={() => setReserve(false)}>{booking}</ReserveDialog>}
    {lightbox && <GalleryLightbox title={buffet.title} images={photos} index={galleryIndex} onIndexChange={setGalleryIndex} onClose={() => setLightbox(false)} />}
  </main>;
}

export default function BuffetDetails() {
  const { id } = useParams();
  return <BuffetDetailPage key={id} id={id} />;
}
