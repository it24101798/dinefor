import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import HotelProfileSettings from "../components/hotel/HotelProfileSettings";
import HotelMediaManager from "../components/hotel/HotelMediaManager";
import BuffetCreator from "../components/hotel/BuffetCreator";
import CheckInDesk from "../components/hotel/CheckInDesk";
import HotelAnalyticsPanel from "../components/analytics/HotelAnalyticsPanel";
import HotelFinancePanel from "../components/payments/HotelFinancePanel";
import HotelPortalOverview from "../components/hotel/HotelPortalOverview";
import HotelReservationCenter from "../components/hotel/HotelReservationCenter";
import HotelBuffetWorkspace from "../components/hotel/HotelBuffetWorkspace";
import HotelReviewsWorkspace from "../components/hotel/HotelReviewsWorkspace";
import "../styles-bundle18-hotel-portal.css";

const API = "http://localhost:5000/api";

const hotelSections = [
  ["overview", "Overview", "/hotel"],
  ["reservations", "Reservations", "/hotel/reservations"],
  ["buffets", "Buffets", "/hotel/buffets"],
  ["create", "Create Buffet", "/hotel/create"],
  ["media", "Media Library", "/hotel/media"],
  ["reviews", "Reviews", "/hotel/reviews"],
  ["analytics", "Analytics", "/hotel/analytics"],
  ["finance", "Finance", "/hotel/finance"],
  ["check-in", "QR Desk", "/hotel/check-in"],
  ["profile", "Profile", "/hotel/profile"],
  ["settings", "Settings", "/hotel/settings"],
];

function safeStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("dineforUser")) || null;
  } catch {
    return null;
  }
}

function HotelDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const section = useMemo(() => {
    const last = location.pathname.split("/").filter(Boolean).pop();
    return last === "hotel" ? "overview" : last || "overview";
  }, [location.pathname]);

  const storedUser = safeStoredUser();
  const token = storedUser?.token;
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [hotel, setHotel] = useState(null);
  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [myBuffets, setMyBuffets] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [summaryRes, bookingsRes, buffetsRes] = await Promise.allSettled([
        axios.get(`${API}/hotel-portal/summary`, { headers }),
        axios.get(`${API}/hotel-portal/reservations`, { headers }),
        axios.get(`${API}/hotel-portal/buffets`, { headers }),
      ]);

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value.data);
        setHotel(summaryRes.value.data?.hotel || null);
      } else {
        const fallbackHotel = await axios.get(`${API}/hotels/my-hotel`, { headers });
        setHotel(fallbackHotel.data);
      }

      if (bookingsRes.status === "fulfilled") setBookings(bookingsRes.value.data || []);
      if (buffetsRes.status === "fulfilled") setMyBuffets(buffetsRes.value.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load hotel portal. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const goSection = (target) => navigate(target === "overview" ? "/hotel" : `/hotel/${target}`);

  const renderContent = () => {
    if (loading) {
      return <section className="hotel-panel"><p className="muted">Loading hotel portal...</p></section>;
    }

    if (section === "overview") return <HotelPortalOverview summary={summary} onNavigate={goSection} />;
    if (section === "reservations") return <HotelReservationCenter headers={headers} setMessage={setMessage} />;
    if (section === "buffets") return <HotelBuffetWorkspace headers={headers} setMessage={setMessage} onCreate={() => goSection("create")} />;
    if (section === "reviews") return <HotelReviewsWorkspace headers={headers} setMessage={setMessage} />;
    if (section === "analytics") return <HotelAnalyticsPanel />;
    if (section === "finance") return <HotelFinancePanel />;
    if (section === "profile" || section === "settings") {
      return (
        <HotelProfileSettings
          hotel={hotel}
          headers={headers}
          onUpdated={(updatedHotel, msg) => {
            setHotel(updatedHotel);
            setMessage(msg || "Hotel profile updated successfully ✅");
            fetchAll();
          }}
        />
      );
    }
    if (section === "media") {
      return (
        <HotelMediaManager
          hotel={hotel}
          headers={headers}
          onUpdated={(updatedHotel, msg) => {
            setHotel(updatedHotel);
            setMessage(msg || "Hotel media updated successfully ✅");
            fetchAll();
          }}
        />
      );
    }
    if (section === "create") return <BuffetCreator hotel={hotel} headers={headers} onCreated={() => { fetchAll(); goSection("buffets"); }} setMessage={setMessage} />;
    if (section === "check-in") return <CheckInDesk bookings={bookings} onChanged={fetchAll} setMessage={setMessage} />;

    return <HotelPortalOverview summary={summary} onNavigate={goSection} />;
  };

  return (
    <main className="hotel-portal-v2">
      <aside className="hotel-portal-sidebar">
        <div className="hotel-brand-card">
          {hotel?.logo ? <img src={hotel.logo.startsWith("http") ? hotel.logo : `http://localhost:5000${hotel.logo}`} alt="hotel logo" /> : <div className="hotel-logo-fallback">DF</div>}
          <div><span className="eyebrow">Hotel Portal</span><h3>{hotel?.hotelName || "Hotel Workspace"}</h3><small>{hotel?.status || "loading"}</small></div>
        </div>

        <nav>
          {hotelSections.map(([key, label, path]) => <NavLink key={key} to={path} end={path === "/hotel"}>{label}</NavLink>)}
        </nav>
      </aside>

      <section className="hotel-portal-main">
        <section className="hotel-portal-hero">
          <div>
            <span className="eyebrow">Hotel Partner Workspace</span>
            <h1>{hotelSections.find(([key]) => key === section)?.[1] || "Hotel Portal"}</h1>
            <p>Manage your profile, buffet inventory, guest reservations, media, reviews and analytics from one professional workspace.</p>
          </div>
          <div className="hotel-hero-actions">
            <button onClick={() => goSection("create")}>+ Create Buffet</button>
            <button onClick={() => goSection("reservations")}>Reservations</button>
          </div>
        </section>

        {message && <p className={message.toLowerCase().includes("failed") ? "error-text page-message" : "success-text page-message"}>{message}</p>}
        {renderContent()}
      </section>
    </main>
  );
}

export default HotelDashboard;
