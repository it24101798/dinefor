import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SaveHeart } from '../../discovery/DiscoveryCard';
import CrewArt from '../../design/CrewArt';
import { Photo } from '../../design/ReferenceUI';
import ShellIcon from '../shell/ShellIcon';
import './mobile-discovery-home.css';

const cityOptions = ['Colombo', 'Galle', 'Kandy', 'Negombo', 'Bentota'];
const guestOptions = Array.from({ length: 20 }, (_, index) => index + 1);

function SearchField({ icon, label, children }) {
  return <label className="dfm-full-field">
    <ShellIcon name={icon} />
    <span><span className="dfm-field-label">{label}</span>{children}</span>
    {icon !== 'calendar' && <ShellIcon name="down" />}
  </label>;
}

export default function MobileDiscoveryHome({ buffets, loading, error, onRetry }) {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('2');
  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

  function search(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [name, value] of new FormData(event.currentTarget)) {
      if (value) params.set(name, value);
    }
    navigate(`/listings?${params}`);
  }

  return <main className="dfm-home">
    <section className="dfm-welcome" aria-labelledby="dfm-welcome-title">
      <div className="dfm-welcome-copy"><h1 id="dfm-welcome-title">Good food.<br />Great company.</h1><p>Discover • Reserve • Dine</p></div>
      <div className="dfm-welcome-art">
        <svg viewBox="0 0 400 130" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 20C100 4 124 122 218 108S327 33 410 23v24C328 55 312 124 219 136S95 30-10 47Z" fill="#a8ebd8"/><path d="M-10 24C99 10 124 128 218 115S328 39 410 29" fill="none" stroke="#74d9c1" strokeWidth="5"/></svg>
        <img className="dfm-couple" src="/images/home/nila-kavin.png" alt="Nila and Kavin sharing a meal" width="1568" height="1003" fetchPriority="high" />
      </div>
    </section>

    <form className="dfm-search-panel" onSubmit={search} aria-label="Find a buffet">
      <SearchField icon="pin" label="Location"><select name="location" value={location} onChange={event => setLocation(event.target.value)}>
        <option value="">Anywhere in Sri Lanka</option>{cityOptions.map(city => <option key={city}>{city}</option>)}
      </select></SearchField>
      <SearchField icon="calendar" label="Date"><span className={`dfm-date ${date ? 'has-value' : ''}`}>
        <span aria-hidden="true">Any date</span><input name="date" type="date" min={today} onInput={event => setDate(event.currentTarget.value)} aria-label="Dining date" />
      </span></SearchField>
      <SearchField icon="guests" label="Guests"><select name="guests" value={guests} onChange={event => setGuests(event.target.value)}>
        {guestOptions.map(count => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}
      </select></SearchField>
      <button className="df-shell-primary" type="submit">Find a buffet <ShellIcon name="arrow" /></button>
    </form>

    <div className="dfm-home-sections">
      <section className="dfm-occasion" aria-labelledby="dfm-occasion-title">
        <h2 id="dfm-occasion-title">Discover by occasion</h2>
        <div className="dfm-occasion-list">
          <Link to="/listings?meal=Dinner"><ShellIcon name="heart" />Date night</Link>
          <Link to="/listings?meal=Lunch"><ShellIcon name="guests" />Family celebration</Link>
        </div>
      </section>

      <section className="dfm-popular" aria-labelledby="dfm-popular-title">
        <div className="dfm-section-heading"><h2 id="dfm-popular-title">Popular near you</h2><Link to="/listings">See all <ShellIcon name="right" /></Link></div>
        {loading && <div className="dfm-message" role="status">Finding buffet experiences…</div>}
        {error && <div className="dfm-message" role="alert">We couldn’t load buffets. <button type="button" onClick={onRetry}>Try again</button></div>}
        {!loading && !error && !buffets.length && <div className="dfm-message">No buffets are listed yet.</div>}
        {!loading && !error && buffets.length > 0 && <div className="dfm-cards">
          {buffets.slice(0, 8).map(buffet => {
            const id = buffet._id || buffet.id;
            const price = buffet.price == null || buffet.price === '' ? NaN : Number(buffet.price);
            const city = buffet.location?.city || buffet.hotel?.city || buffet.hotel?.location?.city;
            return <article className="dfm-buffet-card" key={id}>
              <Link className="dfm-card-link" to={`/buffets/${id}`} aria-label={`View ${buffet.title || 'buffet'}`}>
                <div className="dfm-card-media"><Photo sources={[buffet.thumbnail, buffet.coverImage, buffet.coverMediaUrl, buffet.images || [], buffet.gallery || [], buffet.hotel?.coverImage]} alt={buffet.title || 'Buffet'} /></div>
                <div className="dfm-card-body">
                  <h3>{buffet.title || 'Buffet experience'}</h3>
                  <div className="dfm-card-meta">
                    <div>
                      {(buffet.category || buffet.buffetType) && <p><ShellIcon name="buffet" />{buffet.category || buffet.buffetType}</p>}
                      {city && <p><ShellIcon name="pin" />{city}</p>}
                    </div>
                    {Number.isFinite(price) && price >= 0 && <div className="dfm-card-price"><strong>LKR {price.toLocaleString('en-LK', { maximumFractionDigits: 2 })}</strong><small>per guest</small></div>}
                  </div>
                </div>
              </Link>
              <SaveHeart buffet={buffet} />
            </article>;
          })}
        </div>}
      </section>

      <section className="dfm-chef-note">
        <CrewArt role="chef" />
        <div><h2>Chef’s recommendation</h2><p>Explore seafood buffets and discover a new favourite.</p></div>
      </section>
      <Link className="df-shell-primary" to="/listings">Explore all buffets <ShellIcon name="arrow" /></Link>
    </div>
  </main>;
}
