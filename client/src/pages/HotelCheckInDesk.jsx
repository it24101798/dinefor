import { useEffect, useState } from "react";
import axios from "axios";
import CheckInDesk from "../components/hotel/CheckInDesk";

const API_URL = "http://localhost:5000/api";

function HotelCheckInDesk() {
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const getHeaders = () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("dineforUser"));
      return { Authorization: `Bearer ${storedUser?.token}` };
    } catch {
      return {};
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/bookings/hotel-bookings`, { headers: getHeaders() });
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load check-in desk.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  return (
    <main className="dashboard-page compact-dashboard-page">
      <section className="page-hero compact reveal-card dashboard-hero-small">
        <span className="eyebrow">Hotel Operations</span>
        <h1>QR Check-In Desk</h1>
        <p>Verify bills, claim QR attendance, and review expired reservations from one clean hotel staff page.</p>
      </section>
      {message && <p className={message.toLowerCase().includes("failed") ? "error-text page-message" : "success-text page-message"}>{message}</p>}
      {loading ? <section className="panel"><h2>Loading check-in desk...</h2></section> : <CheckInDesk bookings={bookings} onChanged={fetchBookings} setMessage={setMessage} />}
    </main>
  );
}

export default HotelCheckInDesk;
