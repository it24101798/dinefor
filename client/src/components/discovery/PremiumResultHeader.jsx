function PremiumResultHeader({ count = 0, filters, setFilters, onOpenFilters }) {
  return (
    <div className="df-premium-result-header">
      <div>
        <p className="df-kicker">Curated results</p>
        <h2>{count} Premium Buffet{count === 1 ? "" : "s"}</h2>
        <span>Sorted for availability, rating, and reservation confidence.</span>
      </div>

      <div className="df-result-actions">
        <label className="df-sort-inline">
          <span>Sort</span>
          <select value={filters.sortBy} onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}>
            <option value="recommended">Recommended</option>
            <option value="rating">Highest rated</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="newest">Newest</option>
          </select>
        </label>

        <button className="df-mobile-filter-button" type="button" onClick={onOpenFilters}>
          Filters
        </button>
      </div>
    </div>
  );
}

export default PremiumResultHeader;
