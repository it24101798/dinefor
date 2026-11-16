import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function HomeBuffetCard({ buffet }) {
  const [failed, setFailed] = useState(false);
  const id = buffet._id || buffet.id;
  const raw = buffet.thumbnail || buffet.images?.[0];
  const image = typeof raw === 'string' ? raw : raw?.url;
  const price = Number(buffet.price);
  const rating = Number(buffet.averageRating);
  return <article className="dfh-card">
    <Link className="dfh-card-image" to={`/buffets/${id}`} aria-label={`View ${buffet.title || 'buffet'}`}>
      {image && !failed ? <img src={image} alt={buffet.title || 'Hotel buffet'} loading="lazy" onError={() => setFailed(true)} /> : <span className="dfh-image-placeholder">A place at the table<span>Discover this buffet →</span></span>}
      {buffet.isFeatured && <span className="dfh-badge">Featured</span>}
    </Link>
    <div className="dfh-card-body">
      <div className="dfh-card-meta">{buffet.hotel?._id ? <Link to={`/hotels/${buffet.hotel._id}`}>{buffet.hotel.hotelName || 'View hotel'}</Link> : <span>{buffet.location?.city || 'Sri Lanka'}</span>}{rating > 0 && <span>★ {rating.toFixed(1)}{Number(buffet.totalReviews) > 0 ? ` (${buffet.totalReviews})` : ''}</span>}</div>
      <div className="dfh-card-title"><h3><Link to={`/buffets/${id}`}>{buffet.title || 'Buffet experience'}</Link></h3><div className="dfh-price">{Number.isFinite(price) ? `LKR ${price.toLocaleString('en-LK')}` : 'View price'}<small>per guest</small></div></div>
      <p>{[buffet.category, buffet.location?.city].filter(Boolean).join(' · ') || 'Explore the menu and available times'}</p>
      <div className="dfh-card-bottom"><span>Make time for something delicious</span><Link to={`/buffets/${id}`} aria-label={`Explore ${buffet.title || 'buffet'}`}>→</Link></div>
    </div>
  </article>;
}
