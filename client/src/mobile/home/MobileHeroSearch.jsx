import React from "react";
import "./mobile-hero-search.css";

export default function MobileHeroSearch({ search, onOpen }) {
  const location = search?.location || "Colombo, Galle, Kandy";
  const date = search?.date || "Date";
  const meal = search?.meal || "Meal";
  const guests = Number(search?.guests || 2);

  return (
    <div className="df-mobile-hero-search">
      <button type="button" className="df-mobile-hero-search__primary" onClick={onOpen}>
        <span className="material-symbols-outlined">search</span>
        <span className="df-mobile-hero-search__copy">
          <strong>Where would you like to dine?</strong>
          <small>{location}</small>
        </span>
        <span className="material-symbols-outlined">arrow_forward</span>
      </button>

      <div className="df-mobile-hero-search__meta">
        <button type="button" onClick={onOpen}>
          <span className="material-symbols-outlined">calendar_month</span>
          <span>{date}</span>
        </button>
        <button type="button" onClick={onOpen}>
          <span className="material-symbols-outlined">restaurant</span>
          <span>{meal}</span>
        </button>
        <button type="button" onClick={onOpen}>
          <span className="material-symbols-outlined">group</span>
          <span>{guests} guests</span>
        </button>
      </div>
    </div>
  );
}
