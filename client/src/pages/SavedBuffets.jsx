import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import DiscoveryCard from '../discovery/DiscoveryCard';
import { useSavedBuffets } from '../discovery/useSavedBuffets';
import { Photo, ResultsState } from '../design/ReferenceUI';
import ShellIcon from '../mobile/shell/ShellIcon';

export default function SavedBuffets() {
  const saved = useSavedBuffets();
  const [tab, setTab] = useState('buffets');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [hotels, setHotels] = useState(null);
  const [hotelError, setHotelError] = useState(false);
  const [hotelAttempt, setHotelAttempt] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setHotelError(false);
    api.get('/customer/saved-hotels', { signal: controller.signal }).then(({ data }) => {
      if (!Array.isArray(data)) throw new Error('Invalid hotel list');
      if (!controller.signal.aborted) setHotels(data);
    }).catch(() => {
      if (!controller.signal.aborted) setHotelError(true);
    });
    return () => controller.abort();
  }, [hotelAttempt]);

  async function removeHotel(hotel) {
    setRemoving(true);
    setRemoveError('');
    try {
      const { data } = await api.put(`/customer/saved-hotels/${hotel._id}`);
      if (data?.saved === false) setHotels(previous => previous.filter(item => item._id !== hotel._id));
    } catch {
      setRemoveError('Couldn’t remove this hotel. Try again.');
    } finally {
      setRemoving(false);
    }
  }

  const isBuffets = tab === 'buffets';
  const items = (isBuffets ? saved.items : hotels || []).filter(item =>
    [item.title, item.hotelName, item.city, item.location?.city, item.hotel?.hotelName].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())
  );
  if (isBuffets) items.sort((a, b) => {
    if (sort === 'price-low') return a.price - b.price;
    if (sort === 'price-high') return b.price - a.price;
    if (sort === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
    const order = new Date(b.savedAt || b.createdAt || 0) - new Date(a.savedAt || a.createdAt || 0);
    return sort === 'oldest' ? -order : order;
  });
  return <main className="df-discover-page df-saved-places"><div className="df-discover-wrap">
    <h1><ShellIcon name="heart" />Saved places</h1>
    <p>Your saved buffets and favourite hotels</p>
    <div className="df-discover-pills" aria-label="Saved place type">
      <button type="button" aria-pressed={isBuffets} onClick={() => setTab('buffets')}>Buffets</button>
      <button type="button" aria-pressed={!isBuffets} onClick={() => setTab('hotels')}>Hotels</button>
    </div>
    <label className="df-discover-search"><ShellIcon name="search" /><input aria-label="Search saved places" placeholder="Search saved places" value={query} onChange={event => setQuery(event.target.value)} /></label>
    {isBuffets && <label className="df-discover-saved-sort">Sort <select value={sort} onChange={event => setSort(event.target.value)}>
      <option value="newest">Recently saved</option><option value="oldest">Oldest saved</option>
      <option value="price-low">Lowest price</option><option value="price-high">Highest price</option><option value="rating">Highest rated</option>
    </select></label>}
    {removeError && <p role="alert">{removeError}</p>}
    <ResultsState loading={isBuffets ? saved.status === 'loading' : !hotels && !hotelError}
      error={isBuffets ? saved.status === 'error' : hotelError}
      retry={isBuffets ? saved.retry : () => setHotelAttempt(attempt => attempt + 1)} />
    {!items.length && (isBuffets ? saved.status === 'ready' : hotels && !hotelError) && <div className="rf-state"><h2>{query ? 'No saved places match your search' : 'No saved places yet'}</h2><Link to="/feed" className="df-shell-primary">Discover buffets</Link></div>}
    <div className="df-discover-grid">{items.map(item => isBuffets
      ? <DiscoveryCard key={item._id} buffet={item} compact />
      : <article key={item._id} className="df-discover-card is-compact"><Link className="df-discover-photo" to={`/hotels/${item._id}`}><Photo sources={[item.coverMediaUrl, item.logo, item.galleryImages || []]} alt={item.hotelName} /></Link><div className="df-discover-card-copy"><h2>{item.hotelName}</h2><p>{item.city}</p><Link className="df-shell-primary" to={`/hotels/${item._id}`}>View hotel</Link></div><div className="df-discover-heart"><button type="button" aria-label={`Remove ${item.hotelName} from Saved`} disabled={removing} onClick={() => removeHotel(item)}><ShellIcon name="heart" filled /></button></div></article>
    )}</div>
  </div></main>;
}
