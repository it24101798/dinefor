import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import MapView from '../components/map/MapView';
import DiscoveryCard from '../discovery/DiscoveryCard';
import { CityOptions, FilterDialog } from '../discovery/Filters';
import { readFilters, searchParamsFor } from '../discovery/query';
import { ResultsState } from '../design/ReferenceUI';
import ShellIcon from '../mobile/shell/ShellIcon';
import '../components/map/ExploreMap.css';

export default function ExploreMap() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const signature = searchParamsFor(filters).toString();
  const [term, setTerm] = useState(filters.query || filters.location);
  const [draft, setDraft] = useState(filters);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState('map');
  const [selected, setSelected] = useState(null);
  const [position, setPosition] = useState(null);
  const [geoStatus, setGeoStatus] = useState('');
  const filterButton = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const request = new URLSearchParams(signature);
    const current = readFilters(request);
    setTerm(current.query || current.location);
    setData(null);
    setError(false);
    setSelected(null);
    request.set('view', 'map');
    api.get('/discovery/search', { params: request, signal: controller.signal }).then(({ data }) => {
      if (!Array.isArray(data?.data)) throw new Error('Unexpected map response');
      if (!controller.signal.aborted) setData(data.data);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [signature, attempt]);

  const hotels = useMemo(() => data?.map(row => row.hotel) || [], [data]);
  const metaByHotel = useMemo(() => Object.fromEntries((data || []).map(({ hotel, buffet, count }) => [
    hotel._id, { matchingBuffets: [buffet], minPrice: buffet.price, count, mealLabel: buffet.category },
  ])), [data]);

  function locate() {
    if (!navigator.geolocation) { setGeoStatus('Location is unavailable. Search for a town instead.'); return; }
    setGeoStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setPosition([coords.latitude, coords.longitude]);
      setGeoStatus('Map centred on your location.');
      setSelected(null);
      setView('map');
    }, () => setGeoStatus('Couldn’t use your location. Search for a town instead.'), { timeout: 10000 });
  }

  function search(event) {
    event.preventDefault();
    setParams(searchParamsFor({ ...filters, location: '', query: term.trim() }));
  }

  function close() {
    setOpen(false);
    requestAnimationFrame(() => filterButton.current?.focus());
  }

  return <main className="df-discover-page df-buffet-map"><div className="df-discover-wrap">
    <h1>Explore buffets near you</h1>
    <form className="df-discover-search" onSubmit={search}>
      <ShellIcon name="search" /><input aria-label="Search restaurants or a location" placeholder="Search restaurants or a location" value={term} maxLength={120} onChange={e => setTerm(e.target.value)} />
      <button type="submit" aria-label="Search map"><ShellIcon name="arrow" /></button>
    </form>
    <CityOptions />
    <div className="df-discover-pills df-map-tools">
      <button type="button" disabled={geoStatus === 'Finding your location…'} onClick={locate}><ShellIcon name="pin" /> Use my location</button>
      <button type="button" ref={filterButton} onClick={() => { setDraft(filters); setOpen(true); }}>Filters</button>
      <Link to={`/listings?${signature}`}>List results</Link>
      <Link to="/saved" aria-label="Saved places"><ShellIcon name="heart" /></Link>
    </div>
    {geoStatus && <p className="df-discover-note" role="status">{geoStatus}</p>}
    <ResultsState loading={!data && !error} error={error} retry={() => setAttempt(value => value + 1)} />
    {data && !data.length && <section className="df-map-empty">
      <img src="/images/characters/buffet-search.png" alt="" />
      <h2>Find buffets near you</h2><p>{signature ? 'No mapped buffets match your filters.' : 'Search for a town or allow location access.'}</p>
      <button type="button" className="df-shell-secondary" onClick={locate}>Use my location</button>
      {signature && <button type="button" className="df-shell-primary" onClick={() => setParams({})}>Clear filters</button>}
    </section>}
    {data?.length > 0 && <>
      <div className="df-discover-pills df-map-view-toggle" aria-label="Map results view">
        <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>Map</button>
        <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
      </div>
      <div className="df-buffet-map-layout">
        <div className={`df-buffet-map-results ${view === 'list' ? 'is-visible' : ''}`}>
          {(data || []).map(({ buffet, hotel }) => <div key={hotel._id}><DiscoveryCard buffet={buffet} compact date={filters.date} guests={filters.guests} /><button type="button" className="df-shell-secondary" onClick={() => { setSelected(hotel); setView('map'); }}>Show on map</button></div>)}
        </div>
        <div className={`df-buffet-map-canvas ${view === 'map' ? 'is-visible' : ''}`}><MapView hotels={hotels} metaByHotel={metaByHotel} selectedHotel={selected} onSelectHotel={setSelected} position={position} visible={view === 'map'} date={filters.date} guests={filters.guests} /></div>
      </div>
    </>}
  </div>{open && <FilterDialog value={draft} update={(key, value) => setDraft(previous => ({ ...previous, [key]: value }))} clear={() => setDraft(readFilters(new URLSearchParams()))} onClose={close} submit={event => { event.preventDefault(); setParams(searchParamsFor(draft)); close(); }} />}</main>;
}
