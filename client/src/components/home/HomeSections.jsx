import CrewArt from '../../design/CrewArt';
import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../design/ReferenceUI';

const moments = [
  { icon: 'restaurant', title: 'Discover', description: 'Explore buffet options from participating hotels.' },
  { icon: 'compare_arrows', title: 'Compare', description: 'Choose the meal, destination and price that suit you.' },
  { icon: 'event_available', title: 'Reserve', description: 'Confirm your place through a simple booking journey.' },
];
const categories = [
  { title: 'All buffets', value: '', icon: 'restaurant_menu' },
  { title: 'Breakfast', value: 'Breakfast', icon: 'wb_sunny' },
  { title: 'Lunch', value: 'Lunch', icon: 'lunch_dining' },
  { title: 'Dinner', value: 'Dinner', icon: 'nightlight' },
  { title: 'High Tea', value: 'High Tea', icon: 'local_cafe' },
  { title: 'Seafood', value: 'Seafood', icon: 'set_meal' },
];

export function DiningMoments() {
  return <section className="rf-home-moments" aria-label="Why use DineFor">
    <div><Icon name="explore" /><span><strong>Discover dining experiences</strong><small>Browse hotels and their buffets</small></span></div>
    <div><Icon name="verified_user" /><span><strong>Know what you’re choosing</strong><small>Compare prices and details</small></span></div>
    <div><Icon name="event_available" /><span><strong>Plan your next meal</strong><small>Reserve in a few simple steps</small></span></div>
  </section>;
}

export function DiscoveryCategories({ value, onChange }) {
  return <section className="rf-home-categories" aria-label="Browse by meal type">
    <div className="rf-section-head"><div><span className="rf-section-kicker">WHATEVER YOU'RE CRAVING</span><h2>Find the right kind of buffet.</h2></div></div>
    <div className="rf-home-category-list">{categories.map((item) => <button type="button" key={item.title} className={value === item.value ? 'is-active' : ''} aria-pressed={value === item.value} onClick={() => { onChange(item.value); document.getElementById('home-featured-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><Icon name={item.icon} />{item.title}</button>)}</div>
  </section>;
}

export function HowItWorks() {
  return <section className="rf-home-how" aria-labelledby="home-how-heading"><div className="rf-section-head"><div><span className="rf-section-kicker">DINING, MADE SIMPLE</span><h2 id="home-how-heading">From discovery to dinner.</h2><p>Everything you need to plan a buffet outing, without the back-and-forth.</p></div></div><div className="rf-home-how-grid">{moments.map((item, index) => <article key={item.title}><span className="rf-home-how-number">0{index + 1}</span><Icon name={item.icon}/><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></section>;
}

const destinations = [
  { city: 'Colombo', note: 'City dining', icon: 'location_city' },
  { city: 'Galle', note: 'Coastal flavours', icon: 'beach_access' },
  { city: 'Kandy', note: 'Hill-country dining', icon: 'landscape' },
  { city: 'Negombo', note: 'Seaside experiences', icon: 'waves' },
];
export function CitiesToExplore() {
  return <section className="rf-home-cities" aria-labelledby="home-cities-heading"><div className="rf-home-cities-copy"><span className="rf-section-kicker">EXPLORE SRI LANKA</span><h2 id="home-cities-heading">Great meals start with a place.</h2><p>Explore buffet listings by destination. Options depend on hotels currently available on DineFor.</p><Link className="rf-home-view-all" to="/explore-map">Explore on the map <Icon name="arrow_forward" /></Link></div><div className="rf-home-city-grid">{destinations.map((destination) => <Link key={destination.city} to={`/listings?location=${encodeURIComponent(destination.city)}`}><Icon name={destination.icon}/><span><strong>{destination.city}</strong><small>{destination.note}</small></span><Icon name="arrow_forward"/></Link>)}</div></section>;
}

export function HotelInvitation() {
  return <section className="rf-home-hotel-invite" aria-labelledby="hotel-invite-title"><div className="rf-home-hotel-copy"><span className="rf-section-kicker">FOR HOTELS & RESTAURANTS</span><h2 id="hotel-invite-title">Your buffet deserves more guests.</h2><p>DineFor helps guests discover your buffet offerings alongside the booking channels you already use.</p><div className="rf-home-invite-actions"><Link className="rf-button" to="/for-hotels">Partner with DineFor <Icon name="arrow_forward"/></Link><Link className="rf-home-text-link" to="/hotel-enquiry">Apply as a hotel</Link></div></div><div className="rf-home-hotel-art"><CrewArt role="host"/></div></section>;
}
