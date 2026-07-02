import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import FeedCard from "../components/FeedCard";

function Listings() {
  const [params] = useSearchParams();
  const [buffets, setBuffets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: params.get("location") || "",
    meal: params.get("meal") || "",
    date: params.get("date") || "",
    guests: params.get("guests") || "",
    minPrice: "",
    maxPrice: "",
    rating: "",
    sort: "featured",
  });

  useEffect(() => {
    const fetchBuffets = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/buffets");
        setBuffets(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchBuffets();
  }, []);

  const isDateAvailable = (buffet, selectedDate) => {
    if (!selectedDate) return true;
    const date = new Date(`${selectedDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return true;
    const day = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

    if (buffet.buffetType === "special" && buffet.specialDate) {
      return new Date(buffet.specialDate).toISOString().slice(0, 10) === selectedDate;
    }

    if (buffet.availableFromDate && date < new Date(buffet.availableFromDate)) return false;
    if (buffet.availableToDate && date > new Date(buffet.availableToDate)) return false;
    if (buffet.scheduleType === "selected_days" && buffet.recurringDays?.length) {
      return buffet.recurringDays.includes(day);
    }
    return true;
  };

  const filteredBuffets = useMemo(() => {
    let result = [...buffets];
    if (filters.location) {
      const q = filters.location.toLowerCase();
      result = result.filter((b) => `${b.location?.city || ""} ${b.location?.address || ""} ${b.hotel?.location || ""} ${b.hotel?.city || ""} ${b.hotel?.address || ""}`.toLowerCase().includes(q));
    }
    if (filters.meal) {
      const q = filters.meal.toLowerCase();
      result = result.filter((b) => `${b.category || ""} ${b.title || ""} ${b.description || ""}`.toLowerCase().includes(q));
    }
    if (filters.date) result = result.filter((b) => isDateAvailable(b, filters.date));
    if (filters.guests) {
      const guestCount = Number(filters.guests);
      if (guestCount > 0) result = result.filter((b) => (b.timeSlots || []).some((slot) => Number(slot.availableSeats || 0) >= guestCount));
    }
    if (filters.minPrice) result = result.filter((b) => Number(b.price || 0) >= Number(filters.minPrice));
    if (filters.maxPrice) result = result.filter((b) => Number(b.price || 0) <= Number(filters.maxPrice));
    if (filters.rating) result = result.filter((b) => Number(b.averageRating || 0) >= Number(filters.rating));

    if (filters.sort === "lowest") result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (filters.sort === "highest") result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (filters.sort === "rating") result.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
    if (filters.sort === "seats") result.sort((a, b) => Math.max(...(b.timeSlots || [{ availableSeats: 0 }]).map((s) => Number(s.availableSeats || 0))) - Math.max(...(a.timeSlots || [{ availableSeats: 0 }]).map((s) => Number(s.availableSeats || 0))));
    if (filters.sort === "featured") result.sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || Number(b.averageRating || 0) - Number(a.averageRating || 0));
    return result;
  }, [buffets, filters]);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const resetFilters = () => setFilters({ location: "", meal: "", date: "", guests: "", minPrice: "", maxPrice: "", rating: "", sort: "featured" });

  return (
    <main className="page-shell discovery-page">
      <section className="page-hero compact beach-listing-hero">
        <span className="eyebrow">Discover</span>
        <h1>Buffet Discovery Feed</h1>
        <p>Pinterest-style buffet browsing with smarter filters for date, guests, price, rating, and meal type.</p>
      </section>

      <section className="discovery-filter-bar expanded-discovery-filters">
        <input value={filters.location} onChange={(e) => updateFilter("location", e.target.value)} placeholder="Location / city / hotel" />
        <input type="date" value={filters.date} onChange={(e) => updateFilter("date", e.target.value)} />
        <input type="number" min="1" value={filters.guests} onChange={(e) => updateFilter("guests", e.target.value)} placeholder="Guests" />
        <select value={filters.meal} onChange={(e) => updateFilter("meal", e.target.value)}>
          <option value="">All meals</option>
          <option value="Breakfast">Breakfast</option>
          <option value="Lunch">Lunch</option>
          <option value="Dinner">Dinner</option>
          <option value="Seafood">Seafood</option>
          <option value="BBQ">BBQ</option>
          <option value="High-tea">High Tea</option>
        </select>
        <input type="number" min="0" value={filters.minPrice} onChange={(e) => updateFilter("minPrice", e.target.value)} placeholder="Min price" />
        <input type="number" min="0" value={filters.maxPrice} onChange={(e) => updateFilter("maxPrice", e.target.value)} placeholder="Max price" />
        <select value={filters.rating} onChange={(e) => updateFilter("rating", e.target.value)}>
          <option value="">Any rating</option>
          <option value="5">5 stars</option>
          <option value="4">4+ stars</option>
          <option value="3">3+ stars</option>
        </select>
        <select value={filters.sort} onChange={(e) => updateFilter("sort", e.target.value)}>
          <option value="featured">Featured first</option>
          <option value="lowest">Lowest price</option>
          <option value="highest">Highest price</option>
          <option value="rating">Highest rating</option>
          <option value="seats">Most seats left</option>
        </select>
        <button className="btn secondary" type="button" onClick={resetFilters}>Reset</button>
      </section>

      <div className="discovery-results-line">
        <strong>{filteredBuffets.length}</strong> buffet experiences found
      </div>

      {loading ? <h2>Loading buffets...</h2> : (
        filteredBuffets.length ? <div className="feed-grid masonry-feed">{filteredBuffets.map((buffet) => <FeedCard key={buffet._id} buffet={buffet} />)}</div> : <section className="panel"><h2>No buffets found</h2><p className="muted">Try clearing filters or changing the date, guest count, or price range.</p></section>
      )}
    </main>
  );
}

export default Listings;
