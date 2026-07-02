const categories = [
  { label: "Seafood", value: "seafood", icon: "🦐", hint: "Ocean favourites" },
  { label: "BBQ", value: "bbq", icon: "🔥", hint: "Grill nights" },
  { label: "Lunch", value: "lunch", icon: "🍽️", hint: "Midday offers" },
  { label: "Dinner", value: "dinner", icon: "🌙", hint: "Evening dining" },
  { label: "High Tea", value: "high-tea", icon: "🫖", hint: "Sweet selections" },
  { label: "Brunch", value: "brunch", icon: "🥐", hint: "Weekend style" },
  { label: "Family", value: "family", icon: "👨‍👩‍👧", hint: "Kid friendly" },
  { label: "Luxury", value: "luxury", icon: "✨", hint: "Premium hotels" },
  { label: "Rooftop", value: "rooftop", icon: "🌇", hint: "City views" },
];

function CategoryScroller({ filters, setFilters }) {
  const selectCategory = (item) => {
    if (["family", "luxury", "rooftop"].includes(item.value)) {
      setFilters((prev) => ({
        ...prev,
        query: prev.query === item.value ? "" : item.value,
        category: "all",
      }));
      return;
    }

    setFilters((prev) => ({
      ...prev,
      category: prev.category === item.value ? "all" : item.value,
    }));
  };

  const isActive = (item) => filters.category === item.value || filters.query === item.value;

  return (
    <section className="df-category-strip" aria-label="Popular buffet categories">
      <div className="df-section-heading compact">
        <p className="df-kicker">Popular tastes</p>
        <h2>Browse by experience</h2>
      </div>

      <div className="df-category-row">
        {categories.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`df-category-card ${isActive(item) ? "active" : ""}`}
            onClick={() => selectCategory(item)}
          >
            <span className="df-category-icon">{item.icon}</span>
            <strong>{item.label}</strong>
            <small>{item.hint}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export default CategoryScroller;
