import React, { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';

function FieldIcon({ type }) {
  const paths = {
    location: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    date: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18"/></>,
    meal: <><path d="M4 2v6c0 4 6 4 6 0V2M7 2v20M17 22V2c-4 4-4 10 0 10"/></>,
    guests: <><circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 4a3 3 0 0 1 0 6M19 14a5 5 0 0 1 3 5v2"/></>
  };
  return <span className="dfh-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg></span>;
}

export default function HomeSearch({ initial = {}, onSearch }) {
  const navigate = useNavigate();
  const citiesId = useId();
  const [search, setSearch] = useState({ location: '', date: '', meal: '', guests: '', ...initial });
  const update = (key) => (event) => setSearch((value) => ({ ...value, [key]: event.target.value }));
  const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  function submit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    Array.from(new FormData(event.currentTarget).entries()).forEach(([key, value]) => { if (String(value).trim()) params.set(key, String(value).trim()); });
    if (onSearch) onSearch(Object.fromEntries(params)); else navigate(`/listings?${params}`);
  }
  return <form className="dfh-search rf-search" onSubmit={submit} aria-label="Find a buffet">
    <label><FieldIcon type="location" /><span>Location<input name="location" value={search.location} onChange={update('location')} placeholder="Any location" autoComplete="off" list={citiesId} /></span></label>
    <datalist id={citiesId}>{['Colombo', 'Galle', 'Kandy', 'Negombo', 'Bentota'].map((city) => <option key={city} value={city} />)}</datalist>
    <label><FieldIcon type="date" /><span>Date<span className={`df-date-field ${search.date ? "has-value" : ""}`}><span className="df-date-hint" aria-hidden="true">Any date</span><input aria-label="Date" name="date" type="date" min={today} value={search.date} onChange={update('date')} /></span></span></label>
    <label><FieldIcon type="meal" /><span>Meal<select name="meal" value={search.meal} onChange={update('meal')}><option value="">Any meal</option>{['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'High Tea', 'Seafood', 'Weekend Buffet', 'BBQ'].map((meal) => <option key={meal}>{meal}</option>)}</select></span></label>
    <label><FieldIcon type="guests" /><span>Guests<input name="guests" type="number" min="1" max="20" placeholder="Any guests" value={search.guests} onChange={update('guests')} /></span></label>
    <button className="dfh-button" type="submit">Find a buffet <span aria-hidden="true">→</span></button>
  </form>;
}
