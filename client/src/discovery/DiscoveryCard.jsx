import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Photo } from '../design/ReferenceUI';
import ShellIcon from '../mobile/shell/ShellIcon';
import { useSavedBuffets } from './useSavedBuffets';
import { mealLabel, money } from './query';

export function SaveHeart({ buffet }) {
  const saved = useSavedBuffets();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const id = buffet._id || buffet.id;
  const active = saved.items.some(item => String(item._id || item.id) === String(id));

  async function click() {
    if (!saved.signedIn) {
      navigate('/login', { state: { returnTo: location.pathname + location.search } });
      return;
    }
    setError('');
    if (saved.status === 'error') { saved.retry(); return; }
    try {
      await saved.toggle(buffet);
    } catch {
      setError('Couldn’t update Saved. Try again.');
    }
  }

  return <div className="df-discover-heart">
    <button type="button" aria-pressed={active} aria-label={saved.status === 'error' ? 'Retry loading Saved' : active ? `Remove ${buffet.title} from Saved` : `Save ${buffet.title}`}
      disabled={saved.pending || saved.status === 'loading'} onClick={click}><ShellIcon name="heart" filled={active} /></button>
    {error && <small role="alert">{error}</small>}
  </div>;
}

export default function DiscoveryCard({ buffet, guests, date, compact = false }) {
  const id = buffet._id || buffet.id;
  const city = buffet.location?.city || buffet.hotel?.city || buffet.hotel?.location;
  const amount = buffet.price == null ? NaN : Number(buffet.price);
  const hasPrice = Number.isFinite(amount);
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (guests) params.set('guests', guests);
  const path = `/buffets/${id}${params.size ? '?' + params : ''}`;
  return <article className={`df-discover-card ${compact ? 'is-compact' : ''}`}>
    <Link className="df-discover-photo" to={path} aria-label={`View ${buffet.title}`}>
      <Photo sources={[buffet.thumbnail, buffet.images || [], buffet.hotel?.coverMediaUrl, buffet.hotel?.galleryImages || []]} alt={buffet.title} />
    </Link>
    <SaveHeart buffet={buffet} />
    <div className="df-discover-card-copy">
      <div className="df-discover-card-title"><h2><Link to={path}>{buffet.title}</Link></h2>
        {Number(buffet.totalReviews) > 0 && <span><b aria-hidden="true">★</b> {Number(buffet.averageRating).toFixed(1)} ({buffet.totalReviews})</span>}
      </div>
      {typeof city === 'string' && city && <p><ShellIcon name="pin" />{city}</p>}
      {buffet.category && <p><ShellIcon name="buffet" />{mealLabel(buffet.category)}</p>}
      <div className="df-discover-card-bottom">
        {hasPrice && <div><strong>{money(amount)}</strong> <small>per guest</small></div>}
        <Link className="df-shell-primary" to={path}>View buffet</Link>
      </div>
      {hasPrice && Number(guests) > 0 && <p className="df-discover-estimate"><ShellIcon name="guests" />{guests} {Number(guests) === 1 ? 'guest' : 'guests'} · {money(amount * Number(guests))} estimated</p>}
    </div>
  </article>;
}
