import React, { useEffect, useRef } from 'react';
import ShellIcon from '../mobile/shell/ShellIcon';
import { cities, meals } from './query';

function Choices({ name, values, value, setValue }) {
  const selected = value.split(',');
  return <fieldset><legend>{name}</legend><div className="df-discover-pills">
    {values.map(item => <label key={item}>
      <input type="checkbox" checked={selected.includes(item)} onChange={event => setValue(
        event.target.checked ? [...selected.filter(Boolean), item].join(',') : selected.filter(value => value !== item).join(',')
      )} />{item}
    </label>)}
  </div></fieldset>;
}

export function FilterFields({ value, update }) {
  return <>
    <fieldset><legend>Meal</legend><div className="df-discover-pills">{meals.map(([key, label]) =>
      <button key={key} type="button" aria-pressed={value.meal === key} onClick={() => update('meal', value.meal === key ? '' : key)}>{label}</button>
    )}</div></fieldset>
    <label>Location<input list="df-discover-cities" placeholder="Anywhere in Sri Lanka" value={value.location} onChange={e => update('location', e.target.value)} /></label>
    <fieldset><legend>Budget per guest · LKR</legend><div className="df-discover-pair">
      <label>Minimum<input type="number" min="0" value={value.minPrice} placeholder="Any" onChange={e => update('minPrice', e.target.value)} /></label>
      <label>Maximum<input type="number" min={value.minPrice || 0} value={value.maxPrice} placeholder="Any" onChange={e => update('maxPrice', e.target.value)} /></label>
    </div></fieldset>
    <Choices name="Dietary" values={['Halal', 'Vegetarian']} value={value.diet} setValue={next => update('diet', next)} />
    <p className="df-discover-note">Dietary information is supplied by hotels. Confirm your needs with the hotel.</p>
    <Choices name="Amenities" values={['Parking', 'Accessible']} value={value.amenities} setValue={next => update('amenities', next)} />
    <label>Guest rating<select value={value.minRating} onChange={e => update('minRating', e.target.value)}><option value="">Any rating</option><option value="4">4+</option><option value="4.5">4.5+</option></select></label>
    <div className="df-discover-pair">
      <label>Date<input type="date" value={value.date} onInput={e => update('date', e.target.value)} onChange={e => update('date', e.target.value)} /></label>
      <label>Guests<input type="number" min="1" max="100" value={value.guests} placeholder="Any" onChange={e => update('guests', e.target.value)} /></label>
    </div>
  </>;
}

export function CityOptions() {
  return <datalist id="df-discover-cities">{cities.map(city => <option key={city} value={city} />)}</datalist>;
}

export function FilterDialog({ value, update, clear, submit, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = previous; };
  }, []);
  return <dialog className="df-discover-dialog" ref={dialog} aria-labelledby="discover-filter-heading" onCancel={event => { event.preventDefault(); onClose(); }}>
    <form onSubmit={submit}>
      <header><h2 id="discover-filter-heading">Filters</h2><button type="button" className="df-discover-icon-button" aria-label="Close filters" onClick={onClose}><ShellIcon name="close" /></button></header>
      <div className="df-discover-fields"><FilterFields value={value} update={update} /></div>
      <footer><button className="df-shell-secondary" type="button" onClick={clear}>Clear all</button><button className="df-shell-primary" type="submit">Show buffets</button></footer>
    </form>
  </dialog>;
}
