import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import FeedCard from "../components/FeedCard";

const defaultSettings = {
  heroTitle: "Discover Sri Lanka's Best Hotel Buffets",
  heroSubtitle: "Find premium lunch, dinner, brunch, seafood nights, and special hotel buffet experiences in one trusted DineFor marketplace.",
  heroMediaType: "image",
  heroMediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
  videoMuted: true,
  themeMode: "dark",
  featuredSectionTitle: "Featured Buffet Experiences",
};

function Home() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(defaultSettings);
  const [muted, setMuted] = useState(true);
  const [buffets, setBuffets] = useState([]);
  const [search, setSearch] = useState({ location: "", date: "", meal: "", guests: 2 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, buffetsRes] = await Promise.allSettled([
          axios.get("http://localhost:5000/api/site-settings"),
          axios.get("http://localhost:5000/api/buffets"),
        ]);
        if (settingsRes.status === "fulfilled") {
          const merged = { ...defaultSettings, ...settingsRes.value.data };
          setSettings(merged);
          setMuted(merged.videoMuted);
        }
        if (buffetsRes.status === "fulfilled") setBuffets(Array.isArray(buffetsRes.value.data) ? buffetsRes.value.data : []);
      } catch {
        setSettings(defaultSettings);
      }
    };
    fetchData();
  }, []);

  const featuredBuffets = useMemo(() => {
    const featured = buffets.filter((buffet) => buffet.isFeatured);
    return (featured.length ? featured : buffets).slice(0, 6);
  }, [buffets]);

  const popularHotels = useMemo(() => {
    const map = new Map();
    buffets.forEach((buffet) => {
      const hotel = buffet.hotel;
      if (hotel?._id && !map.has(hotel._id)) map.set(hotel._id, hotel);
    });
    return Array.from(map.values()).slice(0, 4);
  }, [buffets]);

  const handleSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(search).forEach(([key, value]) => { if (value) params.set(key, value); });
    navigate(`/listings?${params.toString()}`);
  };

  const isLight = settings.themeMode === "light";

  return (
    <main className={isLight ? "home-page light" : "home-page beach-home"}>
      <section className="home-hero beach-hero">
        <div className="hero-media beach-hero-media">
          {settings.heroMediaType === "video" ? (
            <>
              <video src={settings.heroMediaUrl} autoPlay loop muted={muted} playsInline />
              <button className="mute-btn" type="button" onClick={() => setMuted(!muted)}>{muted ? "Muted" : "Sound"}</button>
            </>
          ) : (
            <img src={settings.heroMediaUrl} alt="DineFor beach dining" />
          )}
        </div>

        <div className="hero-overlay beach-hero-overlay">
          <p className="eyebrow">Sand • Sea • Premium Dining</p>
          <h1>{settings.heroTitle}</h1>
          <p>{settings.heroSubtitle}</p>
          <form className="booking-search-bar" onSubmit={handleSearch}>
            <label><span>Location</span><input value={search.location} onChange={(e) => setSearch({ ...search, location: e.target.value })} placeholder="Colombo, Galle, Kandy" /></label>
            <label><span>Date</span><input type="date" value={search.date} onChange={(e) => setSearch({ ...search, date: e.target.value })} /></label>
            <label><span>Meal</span><select value={search.meal} onChange={(e) => setSearch({ ...search, meal: e.target.value })}><option value="">Any</option><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Seafood</option></select></label>
            <label><span>Guests</span><input type="number" min="1" value={search.guests} onChange={(e) => setSearch({ ...search, guests: e.target.value })} /></label>
            <button className="btn primary beach-search-btn" type="submit">Search</button>
          </form>
          <div className="hero-actions compact-actions"><Link to="/feed" className="btn secondary">Discover Feed</Link><Link to="/explore-map" className="btn ghost">Explore Map</Link></div>
        </div>
      </section>

      <section className="home-section beach-section">
        <div className="section-header"><span className="eyebrow">Featured This Week</span><h2>{settings.featuredSectionTitle}</h2><p>Visual buffet cards designed for fast discovery and future paid boosts.</p></div>
        <div className="feed-grid masonry-lite home-featured-feed">{featuredBuffets.map((buffet) => <FeedCard key={buffet._id} buffet={buffet} />)}</div>
      </section>

      <section className="home-section beach-section two-column-home">
        <div className="panel beach-panel">
          <span className="eyebrow">Why DineFor</span><h2>For walk-in guests, tourists, and family dining plans</h2>
          <div className="home-feature-grid compact-feature-grid"><div className="home-feature-card"><h3>Live Slots</h3><p>Reserve real buffet time slots with seat availability.</p></div><div className="home-feature-card"><h3>Verified Reviews</h3><p>Photos, videos, and booking-based trust.</p></div><div className="home-feature-card"><h3>QR Check-In</h3><p>Hotels can verify bills and prevent duplicate usage.</p></div></div>
        </div>
        <div className="panel beach-panel">
          <span className="eyebrow">Popular Hotels</span><h2>Dining partners</h2>
          <div className="popular-hotel-list">{popularHotels.length ? popularHotels.map((hotel) => <Link key={hotel._id} to={`/hotels/${hotel._id}`}><strong>{hotel.hotelName}</strong><span>{hotel.location || hotel.address || "View profile"}</span></Link>) : <p className="muted">Hotels will appear here after buffet listings are added.</p>}</div>
        </div>
      </section>

      <section className="home-section partner-cta beach-partner-cta">
        <span className="eyebrow">For Hotels</span><h2>Fill buffet seats with a visual reservation marketplace.</h2><p>DineFor helps hotels list buffets, manage time slots, verify QR bills, and grow walk-in dining revenue.</p><Link to="/hotel-apply" className="btn primary">Apply as Hotel</Link>
      </section>
    </main>
  );
}

export default Home;
