import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import FeedCard from "../components/FeedCard";
import SkeletonCard from "../components/shared/SkeletonCard";

const formatDate = (value) => {
  if (!value) return "Not selected";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function CustomerDashboard() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get("/customer/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load customer dashboard.");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchDashboard();
  }, [token]);

  if (loading) {
    return (
      <main className="df-customer-page">
        <SkeletonCard />
        <SkeletonCard />
      </main>
    );
  }

  if (message) {
    return <main className="df-customer-page"><section className="df-empty-state">{message}</section></main>;
  }

  const stats = data?.stats || {};
  const upcoming = data?.upcomingReservations || [];
  const savedBuffets = data?.savedBuffets || [];
  const savedHotels = data?.savedHotels || [];
  const recent = data?.recentlyViewed || [];
  const notifications = data?.notifications || [];
  const recommended = data?.recommendedBuffets || [];

  return (
    <main className="df-customer-page">
      <section className="df-customer-hero">
        <div>
          <span className="eyebrow">Customer Center</span>
          <h1>Hello {data?.user?.name || user?.name || "Guest"} 👋</h1>
          <p>Manage your reservations, saved buffets, favourite hotels and recent activity from one clean dashboard.</p>
        </div>
        <div className="customer-hero-actions"><Link className="btn primary" to="/feed">Discover Buffets</Link><Link className="btn secondary" to="/payments">Payment History</Link></div>
      </section>

      <section className="df-customer-stats">
        <div><span>Upcoming</span><strong>{stats.upcomingReservations || 0}</strong></div>
        <div><span>Total bookings</span><strong>{stats.totalReservations || 0}</strong></div>
        <div><span>Saved buffets</span><strong>{stats.savedBuffets || 0}</strong></div>
        <div><span>Favourite hotels</span><strong>{stats.savedHotels || 0}</strong></div>
      </section>

      <section className="df-dashboard-grid-two">
        <div className="df-dashboard-panel">
          <div className="df-section-head"><span className="eyebrow">Reservations</span><h2>Upcoming reservations</h2></div>
          {upcoming.length === 0 ? <p className="muted">No upcoming reservations yet.</p> : upcoming.map((booking) => (
            <Link className="df-reservation-mini" to="/my-bookings" key={booking._id}>
              <strong>{booking.buffet?.title || "Buffet Reservation"}</strong>
              <span>{formatDate(booking.selectedDate)} • {booking.selectedTimeSlot?.startTime} - {booking.selectedTimeSlot?.endTime}</span>
              <em>{booking.seats} seats • {booking.bookingStatus}</em>
            </Link>
          ))}
        </div>

        <div className="df-dashboard-panel">
          <div className="df-section-head"><span className="eyebrow">Alerts</span><h2>Notifications</h2></div>
          {notifications.length === 0 ? <p className="muted">No notifications yet.</p> : notifications.slice(0, 6).map((item) => (
            <div className={item.isRead ? "df-notification" : "df-notification unread"} key={item._id}>
              <strong>{item.title}</strong>
              <span>{item.message}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="df-dashboard-panel">
        <div className="df-section-head"><span className="eyebrow">Saved</span><h2>Saved buffet experiences</h2></div>
        {savedBuffets.length === 0 ? <p className="muted">Save buffet cards to build your dining wishlist.</p> : <div className="feed-grid masonry-lite">{savedBuffets.slice(0, 4).map((buffet) => <FeedCard key={buffet._id} buffet={buffet} />)}</div>}
      </section>

      <section className="df-dashboard-grid-two">
        <div className="df-dashboard-panel">
          <div className="df-section-head"><span className="eyebrow">Hotels</span><h2>Favourite hotels</h2></div>
          {savedHotels.length === 0 ? <p className="muted">Favourite hotels will appear here.</p> : savedHotels.map((hotel) => (
            <Link className="df-hotel-mini" to={`/hotels/${hotel._id}`} key={hotel._id}>
              <img src={hotel.logo || hotel.coverMediaUrl || hotel.galleryImages?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945"} alt={hotel.hotelName} />
              <div><strong>{hotel.hotelName}</strong><span>📍 {hotel.city || hotel.location}</span></div>
            </Link>
          ))}
        </div>

        <div className="df-dashboard-panel">
          <div className="df-section-head"><span className="eyebrow">History</span><h2>Recently viewed</h2></div>
          {recent.length === 0 ? <p className="muted">Hotels and buffets you view will appear here.</p> : recent.slice(0, 8).map((entry, index) => (
            <Link className="df-history-row" to={entry.itemType === "hotel" ? `/hotels/${entry.item?._id}` : `/buffets/${entry.item?._id}`} key={`${entry.item?._id}-${index}`}>
              <span>{entry.itemType === "hotel" ? "🏨" : "🍽"}</span>
              <strong>{entry.item?.hotelName || entry.item?.title || "Recently viewed item"}</strong>
              <em>{formatDate(entry.viewedAt)}</em>
            </Link>
          ))}
        </div>
      </section>

      <section className="df-dashboard-panel">
        <div className="df-section-head"><span className="eyebrow">Recommended</span><h2>Buffets you may like</h2></div>
        <div className="feed-grid masonry-lite">
          {recommended.slice(0, 6).map((buffet) => <FeedCard key={buffet._id} buffet={buffet} />)}
        </div>
      </section>
    </main>
  );
}

export default CustomerDashboard;
