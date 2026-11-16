import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import MapView from '../components/map/MapView';
import { hotelCoordinates, mapResults } from '../components/map/mapResults';
import CrewArt from '../design/CrewArt';
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
      if (!controller.signal.aborted) setData(mapResults(data.data));
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [signature, attempt]);

  const hotels = useMemo(() => (data || []).map(row => row.hotel).filter(hotelCoordinates), [data]);
  const displayView = hotels.length ? view : 'list';
  const metaByHotel = useMemo(() => Object.fromEntries((data || []).map(({ hotel, buffet, count, price }) => [
    hotel._id, { matchingBuffets: [buffet], minPrice: price, count, mealLabel: buffet.category },
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
    <header className="df-map-intro">
      <div><h1>Explore buffets near you</h1><p>Find a buffet by town, hotel or location.</p></div>
      <CrewArt role="host" />
    </header>
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
      <CrewArt role="assistant" />
      <h2>Find buffets near you</h2><p>{signature ? 'No buffets match your filters.' : 'Search for a town or allow location access.'}</p>
      <button type="button" className="df-shell-secondary" onClick={locate}>Use my location</button>
      {signature && <button type="button" className="df-shell-primary" onClick={() => setParams({})}>Clear filters</button>}
    </section>}
    {data?.length > 0 && <>
      <div className="df-discover-pills df-map-view-toggle" aria-label="Map results view">
        <button type="button" disabled={!hotels.length} aria-pressed={displayView === 'map'} onClick={() => setView('map')}>Map</button>
        <button type="button" aria-pressed={displayView === 'list'} onClick={() => setView('list')}>List</button>
      </div>
      <div className="df-buffet-map-layout">
        <div className={`df-buffet-map-results ${displayView === 'list' ? 'is-visible' : ''}`}>
          {!hotels.length && <p role="status">These hotels don’t have map pins yet. You can still view their buffets.</p>}
          {data.map(({ buffet, hotel }) => <div key={hotel._id}><DiscoveryCard buffet={buffet} compact date={filters.date} guests={filters.guests} />{hotelCoordinates(hotel) && <button type="button" className="df-shell-secondary" onClick={() => { setSelected(hotel); setView('map'); }}>Show on map</button>}</div>)}
        </div>
        {hotels.length > 0 && <div className={`df-buffet-map-canvas ${displayView === 'map' ? 'is-visible' : ''}`}><MapView hotels={hotels} metaByHotel={metaByHotel} selectedHotel={selected} onSelectHotel={setSelected} onShowList={() => setView('list')} position={position} visible={displayView === 'map'} date={filters.date} guests={filters.guests} /></div>}
      </div>
    </>}
  </div>{open && <FilterDialog value={draft} update={(key, value) => setDraft(previous => ({ ...previous, [key]: value }))} clear={() => setDraft(readFilters(new URLSearchParams()))} onClose={close} submit={event => { event.preventDefault(); setParams(searchParamsFor(draft)); close(); }} />}</main>;
}
