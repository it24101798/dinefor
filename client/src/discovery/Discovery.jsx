import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import CrewArt from '../design/CrewArt';
import { Footer, ResultsState } from '../design/ReferenceUI';
import ShellIcon from '../mobile/shell/ShellIcon';
import DiscoveryCard from './DiscoveryCard';
import { CityOptions, FilterDialog, FilterFields } from './Filters';
import { mealLabel, meals, readFilters, searchParamsFor } from './query';
import './discovery.css';

const clean = () => readFilters(new URLSearchParams());
const labels = { location: 'Location', meal: 'Meal', minPrice: 'Min LKR', maxPrice: 'Max LKR', minRating: 'Rating', diet: 'Dietary', amenities: 'Amenities', date: 'Date', guests: 'Guests', query: 'Search' };

export default function Discovery({ listings = false }) {
  const [params, setParams] = useSearchParams();
  const applied = readFilters(params);
  const signature = searchParamsFor(applied).toString();
  const page = Math.max(1, Math.trunc(Number(params.get('page'))) || 1);
  const [query, setQuery] = useState(applied.query);
  const [draft, setDraft] = useState(applied);
  const [showFilters, setShowFilters] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const filterButton = useRef(null);

  useEffect(() => {
    setDraft(readFilters(new URLSearchParams(signature)));
    setQuery(new URLSearchParams(signature).get('query') || '');
  }, [signature]);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError(false);
    const request = new URLSearchParams(signature);
    request.set('page', String(page));
    request.set('limit', '12');
    api.get('/discovery/search', { params: request, signal: controller.signal }).then(({ data }) => {
      if (!Array.isArray(data?.data) || !data.pagination) throw new Error('Unexpected discovery response');
      if (!controller.signal.aborted) setResult(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [signature, page, attempt]);

  function apply(values) { setParams(searchParamsFor(values)); }
  function updateDraft(key, value) { setDraft(previous => ({ ...previous, [key]: value })); }
  function closeFilters() {
    setShowFilters(false);
    requestAnimationFrame(() => filterButton.current?.focus());
  }
  function submitFilters(event) {
    event.preventDefault();
    apply(draft);
    if (showFilters) closeFilters();
  }
  function changePage(number) {
    const next = searchParamsFor(applied);
    if (number > 1) next.set('page', String(number));
    setParams(next);
    document.querySelector('.df-discover-toolbar')?.scrollIntoView({ block: 'start' });
  }

  const filtered = Object.entries(labels).filter(([key]) => applied[key]);
  const total = result?.pagination.total;
  return <main className="df-discover-page">
    <div className="df-discover-wrap">
      <section className="df-discover-hero">
        <div><h1>{applied.location ? `Buffets in ${applied.location}` : listings ? 'Find a table worth gathering around.' : 'Something delicious is waiting'}</h1></div>
        {applied.location
          ? <img src="/images/home/nila-kavin.png" alt="" />
          : listings ? <img src="/images/characters/buffet-search.png" alt="" /> : <CrewArt role="chef" />}
      </section>
      <form className="df-discover-search" onSubmit={event => { event.preventDefault(); apply({ ...applied, query: query.trim() }); }}>
        <ShellIcon name="search" /><input aria-label="Search buffets, hotels or locations" placeholder="Search buffets, hotels or locations" value={query} onChange={event => setQuery(event.target.value)} maxLength={120} />
        <button type="submit" aria-label="Search"><ShellIcon name="arrow" /></button>
      </form>
      <CityOptions />
      <div className="df-discover-layout">
        {listings && <form className="df-discover-sidebar" onSubmit={submitFilters}><h2>Filters</h2><div className="df-discover-fields"><FilterFields value={draft} update={updateDraft} /></div><button type="submit" className="df-shell-primary">Show buffets</button><button type="button" className="df-shell-secondary" onClick={() => apply(clean())}>Clear all</button></form>}
        <section className="df-discover-results" aria-label="Buffet results">
          {!filtered.length && <div className="df-discover-pills df-discover-quick">{meals.slice(0, 3).map(([key, label]) => <button type="button" key={key} onClick={() => apply({ ...applied, meal: key })}><ShellIcon name="buffet" />{label}</button>)}</div>}
          {!!filtered.length && <div className="df-discover-pills df-discover-applied">{filtered.map(([key, label]) => <button key={key} type="button" aria-label={`Remove ${label} filter`} onClick={() => apply({ ...applied, [key]: '' })}>{key === 'meal' ? mealLabel(applied[key]) : `${label}: ${applied[key]}`} <ShellIcon name="close" /></button>)}</div>}
          <div className="df-discover-toolbar">
            <label><span>Sort</span><select aria-label="Sort buffets" value={applied.sort || 'recommended'} onChange={event => apply({ ...applied, sort: event.target.value })}>
              <option value="recommended">Recommended</option><option value="popular">Most popular</option><option value="rating">Highest rated</option><option value="price-low">Lowest price</option><option value="price-high">Highest price</option><option value="newest">Newest</option>
            </select></label>
            <button type="button" aria-haspopup="dialog" ref={filterButton} onClick={() => { setDraft(applied); setShowFilters(true); }}>Filters</button>
            <Link to={`/explore-map?${signature}`}><ShellIcon name="pin" />Map<span className="df-map-link-extra"> view</span></Link>
          </div>
          {result && <p className="df-discover-note" aria-live="polite">{total} {total === 1 ? 'buffet' : 'buffets'}{applied.date || applied.guests ? ' · Confirm availability on the buffet page' : ''}</p>}
          <ResultsState loading={!result && !error} error={error} retry={() => setAttempt(count => count + 1)} empty={Boolean(result && !total)} reset={() => apply(clean())} />
          {result && <div className="df-discover-grid">{result.data.map(buffet => <DiscoveryCard key={buffet._id} buffet={buffet} date={applied.date} guests={applied.guests} />)}</div>}
          {result?.pagination.pages > 1 && <nav className="df-discover-pages" aria-label="Results pages">
            <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</button><span>Page {page} of {result.pagination.pages}</span><button type="button" disabled={page >= result.pagination.pages} onClick={() => changePage(page + 1)}>Next</button>
          </nav>}
        </section>
      </div>
      {!listings && <aside className="df-discover-occasion"><h2>Discover by occasion</h2><div className="df-discover-pills"><Link to="/listings?meal=dinner">Date night</Link><Link to="/listings?meal=lunch">Family celebration</Link><Link to="/listings?meal=brunch">Weekend brunch</Link></div></aside>}
      <Footer />
    </div>
    {showFilters && <FilterDialog value={draft} update={updateDraft} clear={() => setDraft(clean())} submit={submitFilters} onClose={closeFilters} />}
  </main>;
}
