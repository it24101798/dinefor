const categoryOptions = [
  ["all", "All categories"],
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["dinner", "Dinner"],
  ["high-tea", "High Tea"],
  ["seafood", "Seafood"],
  ["bbq", "BBQ"],
  ["brunch", "Brunch"],
  ["luxury", "Luxury"],
  ["family", "Family Friendly"],
  ["other", "Other"],
];

const amenityChips = [
  { label: "Rooftop", value: "rooftop" },
  { label: "Poolside", value: "poolside" },
  { label: "Kids Friendly", value: "kids" },
  { label: "Halal", value: "halal" },
  { label: "Vegan", value: "vegan" },
];

function FilterSidebar({ filters, setFilters, resultCount = 0, onReset, mobileOpen = false, onClose }) {
  const update = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));

  const content = (
    <>
      <div className="stitch-filter-header">
        <div>
          <p className="stitch-kicker">Filters</p>
          <h3>{resultCount} result{resultCount === 1 ? "" : "s"}</h3>
        </div>
        <button type="button" className="stitch-text-btn" onClick={onReset}>Clear all</button>
      </div>

      <div className="stitch-filter-block">
        <h4>Buffet category</h4>
        <div className="stitch-chip-grid">
          {categoryOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`stitch-small-chip ${filters.category === value ? "active" : ""}`}
              onClick={() => update("category", value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="stitch-filter-block">
        <h4>Buffet type</h4>
        <select value={filters.buffetType} onChange={(e) => update("buffetType", e.target.value)}>
          <option value="all">Regular + special</option>
          <option value="regular">Regular buffets</option>
          <option value="special">Special buffets</option>
        </select>
      </div>

      <div className="stitch-filter-block">
        <h4>Price range</h4>
        <div className="stitch-price-grid">
          <input type="number" min="0" value={filters.minPrice} onChange={(e) => update("minPrice", e.target.value)} placeholder="Min" />
          <input type="number" min="0" value={filters.maxPrice} onChange={(e) => update("maxPrice", e.target.value)} placeholder="Max" />
        </div>
      </div>

      <div className="stitch-filter-block">
        <h4>Minimum rating</h4>
        <select value={filters.minRating} onChange={(e) => update("minRating", e.target.value)}>
          <option value="all">Any rating</option>
          <option value="5">★★★★★</option>
          <option value="4">★★★★☆ and above</option>
          <option value="3">★★★☆☆ and above</option>
        </select>
      </div>

      <div className="stitch-filter-block">
        <h4>Experience tags</h4>
        <div className="stitch-chip-grid">
          {amenityChips.map((item) => (
            <button
              key={item.value}
              type="button"
              className="stitch-small-chip"
              onClick={() => update("query", item.label)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <label className="stitch-check-row">
        <input type="checkbox" checked={filters.featuredOnly} onChange={(e) => update("featuredOnly", e.target.checked)} />
        <span>Featured only</span>
      </label>

      <label className="stitch-check-row">
        <input type="checkbox" checked={filters.availableOnly} onChange={(e) => update("availableOnly", e.target.checked)} />
        <span>Available for selected guests</span>
      </label>

      <div className="stitch-mobile-filter-actions">
        <button type="button" className="stitch-outline-btn" onClick={onClose}>Close</button>
        <button type="button" className="stitch-primary-btn" onClick={onClose}>Show results</button>
      </div>
    </>
  );

  return (
    <>
      {mobileOpen && <button className="stitch-filter-backdrop" type="button" onClick={onClose} aria-label="Close filters" />}
      <aside className={`stitch-filter-sidebar ${mobileOpen ? "open" : ""}`}>
        {content}
      </aside>
    </>
  );
}

export default FilterSidebar;
