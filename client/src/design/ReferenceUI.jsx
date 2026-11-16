import CrewArt from './CrewArt';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toImageUrl } from '../utils/media';
export function Icon({name}) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>; }
export function Ribbon() { return <svg className="rf-ribbon" viewBox="0 0 900 330" fill="none" aria-hidden="true"><path d="M-30 245C120 300 400 50 295 25S190 160 430 170 735 10 940 130" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/></svg>; }
export function Hero({eyebrow,title,description,home=false,character,artwork="/images/home/nila-kavin.png",artAlt="Nila and Kavin enjoying a meal together",children}) { return <section className={`rf-hero ${home?'rf-hero-home':''}`}><div className="rf-hero-copy"><p className="rf-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="rf-lead">{description}</p>{children}</div><div className="rf-art"><div className="rf-arch"/><Ribbon/>{character?<CrewArt role={character}/>:<img src={artwork} alt={artAlt} width="1568" height="1024"/>}</div></section>; }
export function Footer(){return <footer className="rf-footer"><Link className="rf-logo" to="/">DineFor</Link><span>Discover • Reserve • Dine</span><nav aria-label="Footer"><Link to="/feed">Discover</Link><Link to="/listings">Buffets</Link><Link to="/for-hotels">For hotels</Link><Link to="/my-bookings">My bookings</Link></nav></footer>;}
// Try only supplied photos; a failed thumbnail must not hide a valid gallery image.
export function Photo({sources=[],alt='',className='',loading='lazy'}) {
 const [failed,setFailed]=useState([]);
 const urls=[...new Set(sources.flat().map(toImageUrl).filter(Boolean))];
 const src=urls.find(url=>!failed.includes(url));
 return src?<img className={className} src={src} alt={alt} loading={loading} onError={()=>setFailed(previous=>[...previous,src])}/>:<div className={`rf-photo-empty ${className}`}><Icon name="restaurant"/><span>Photo not available</span></div>;
}
export function BuffetTile({ buffet: b, guests = 0, compact = false }) {
 const id = b._id || b.id;
 const amount = Number(b.price);
 const price = Number.isFinite(amount) && amount >= 0 ? amount : null;
 const money = value => 'LKR ' + value.toLocaleString('en-LK', { maximumFractionDigits: 2 });
 const hotel = typeof b.hotel === 'object' ? b.hotel : null;
 const hotelName = hotel?.hotelName || hotel?.name || '';
 const hotelId = hotel?._id || hotel?.id;
 const city = b.location?.city || hotel?.city || hotel?.location?.city;
 const rating = Number(b.averageRating || 0);
 const reviewCount = Number(b.totalReviews || 0);
 return <article className={`rf-card rf-card-refined ${compact ? 'rf-card-compact' : ''}`}>
   <Link className="rf-card-image" to={`/buffets/${id}`} aria-label={`Explore ${b.title || 'buffet'}`}><Photo sources={[b.thumbnail, b.coverImage, b.coverMediaUrl, ...(Array.isArray(b.images) ? b.images : [])]} alt={b.title || 'Buffet experience'} /></Link>
   {b.isFeatured && <span className="rf-card-featured"><Icon name="auto_awesome" /> Featured</span>}
   <div className="rf-card-body">
     <div className="rf-card-type"><Icon name="restaurant_menu" /> {b.category || b.buffetType || 'Buffet experience'}</div>
     <h3><Link to={`/buffets/${id}`}>{b.title || 'Buffet experience'}</Link></h3>
     <div className="rf-card-meta">
      {hotelName && (hotelId ? <Link to={`/hotels/${hotelId}`}><Icon name="hotel" />{hotelName}</Link> : <span><Icon name="hotel" />{hotelName}</span>)}
      {city && <span><Icon name="location_on" />{city}</span>}
      {reviewCount > 0 && <span className="rf-card-rating"><Icon name="star" />{rating.toFixed(1)} ({reviewCount})</span>}
     </div>
     <div className="rf-card-cta-row"><div className="rf-card-value"><small>{price !== null ? 'From' : 'Explore'}</small><strong>{price !== null ? money(price) : 'View buffet'}</strong><small>{price !== null ? 'per guest' : 'See details'}</small></div><Link className="rf-card-view" to={`/buffets/${id}`}>View buffet <Icon name="arrow_forward" /></Link></div>
     {guests > 0 && price !== null && <p className="rf-card-guests">Estimated for {guests} {guests === 1 ? 'guest' : 'guests'}: {money(price * guests)}. Final total is confirmed at checkout.</p>}
   </div>
 </article>;
}
export function ResultsState({loading,error,retry,empty,reset}) {
 if(loading)return <div className="rf-state" role="status"><span className="rf-loader"/>Finding your next favourite…</div>;
 if(error)return <div className="rf-state" role="alert"><h2>We couldn’t load the buffets.</h2><p>Please try again in a moment.</p><button className="rf-button" onClick={retry}>Try again</button></div>;
 if(empty)return <div className="rf-state"><Icon name="restaurant"/><h2>A different taste awaits.</h2><p>No buffets match these choices yet.</p>{reset?<button className="rf-button" onClick={reset}>Clear filters</button>:<Link className="rf-button" to="/listings">Explore buffets</Link>}</div>;
 return null;
}
export function Occasion(){return <section className="rf-occasion"><img src="/images/home/nila-kavin.png" alt="" loading="lazy"/><div><h2>Find your occasion.</h2><p>The right buffet for every moment.</p></div><Link to="/listings?meal=Dinner"><Icon name="favorite_border"/>Date night</Link><Link to="/listings?meal=Lunch"><Icon name="groups"/>Family gathering</Link><Link to="/listings?meal=Brunch"><Icon name="celebration"/>Celebration</Link></section>;}
