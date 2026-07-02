import { useMemo, useState } from "react";
import { getDiscoverySuggestions } from "../../services/discoveryService";

function SearchBar({ filters, setFilters, buffets = [], onSearch }) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(
    () => getDiscoverySuggestions(buffets, filters.query),
    [buffets, filters.query]
  );

  const groupedSuggestions = useMemo(() => {
    const groups = { Buffets: [], Hotels: [], Cities: [], Categories: [] };

    suggestions.forEach((item) => {
      const normalized = String(item).toLowerCase();
      const isHotel = buffets.some((buffet) => String(buffet.hotel?.hotelName || "").toLowerCase() === normalized);
      const isCity = buffets.some((buffet) => {
        const city = buffet.location?.city || buffet.hotel?.city || buffet.hotel?.location || "";
        return String(city).toLowerCase() === normalized;
      });
      const isCategory = buffets.some((buffet) => String(buffet.category || buffet.buffetType || "").toLowerCase() === normalized);

      if (isHotel) groups.Hotels.push(item);
      else if (isCity) groups.Cities.push(item);
      else if (isCategory) groups.Categories.push(item);
      else groups.Buffets.push(item);
    });

    return Object.entries(groups).filter(([, values]) => values.length > 0);
  }, [suggestions, buffets]);

  const update = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const selectSuggestion = (value) => {
    update("query", value);
    setFocused(false);
    if (onSearch) onSearch();
  };

  return (
    <section className="stitch-search-card">
      <div className="stitch-search-field main">
        <span className="stitch-search-icon">⌕</span>
        <div>
          <label>Cuisine / Hotel</label>
          <input
            value={filters.query}
            onChange={(e) => update("query", e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            placeholder="Seafood, Cinnamon Grand..."
          />
        </div>

        {focused && groupedSuggestions.length > 0 && (
          <div className="stitch-suggestion-popover">
            {groupedSuggestions.map(([group, values]) => (
              <div className="stitch-suggestion-group" key={group}>
                <p>{group}</p>
                {values.map((item) => (
                  <button key={`${group}-${item}`} type="button" onMouseDown={() => selectSuggestion(item)}>
                    <span>🔎</span>
                    {item}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="stitch-search-divider" />

      <div className="stitch-search-field">
        <span className="stitch-search-icon">📍</span>
        <div>
          <label>Location</label>
          <input
            value={filters.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Colombo"
          />
        </div>
      </div>

      <div className="stitch-search-divider" />

      <div className="stitch-search-field">
        <span className="stitch-search-icon">📅</span>
        <div>
          <label>Date</label>
          <input type="date" value={filters.date} onChange={(e) => update("date", e.target.value)} />
        </div>
      </div>

      <div className="stitch-search-divider" />

      <div className="stitch-search-field guests">
        <span className="stitch-search-icon">👥</span>
        <div>
          <label>Guests</label>
          <input
            type="number"
            min="1"
            value={filters.guests}
            onChange={(e) => update("guests", e.target.value)}
          />
        </div>
      </div>

      <button className="stitch-primary-btn stitch-search-btn" type="button" onClick={onSearch}>
        Search →
      </button>
    </section>
  );
}

export default SearchBar;
