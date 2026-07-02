import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const getHeaders = () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("dineforUser"));
    return { Authorization: `Bearer ${storedUser?.token}` };
  } catch {
    return {};
  }
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

function BookingCheckIn() {
  const { code } = useParams();
  const [booking, setBooking] = useState(null);
  const [validation, setValidation] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/bookings/verify/${code}`, { headers: getHeaders() });
      setBooking(res.data.booking);
      setValidation(res.data.validation);
    } catch (error) {
      setMessage(error.response?.data?.message || "Booking QR verification failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [code]);

  const claimBooking = async () => {
    try {
      const res = await axios.put(`${API_URL}/bookings/${booking._id}/check-in`, {}, { headers: getHeaders() });
      setMessage(res.data.message || "Booking checked in successfully.");
      setBooking(res.data.booking);
      setValidation(res.data.validation);
    } catch (error) {
      setMessage(error.response?.data?.message || "Check-in failed.");
    }
  };

  return (
    <main className="page-shell checkin-page">
      <section className="page-hero compact">
        <span className="eyebrow">QR Check-In</span>
        <h1>Booking Verification</h1>
        <p>Hotel staff can verify and claim a guest booking once. After check-in, the QR cannot be reused.</p>
      </section>

      {loading && <section className="panel"><h2>Checking QR...</h2></section>}
      {message && <p className={message.toLowerCase().includes("failed") || message.toLowerCase().includes("cannot") || message.toLowerCase().includes("expired") ? "error-text page-message" : "success-text page-message"}>{message}</p>}

      {booking && (
        <section className="panel checkin-card">
          <div className="section-heading">
            <div>
              <span className={`status ${validation?.state || booking.bookingStatus}`}>{validation?.label || booking.bookingStatus}</span>
              <h2>{booking.buffet?.title || "Buffet Reservation"}</h2>
              <p className="muted">{booking.buffet?.hotel?.hotelName || "Hotel"}</p>
            </div>
            <strong className="big-code">{booking.bookingCode}</strong>
          </div>

          <div className="booking-info-grid upgraded">
            <p><strong>Guest</strong><span>{booking.user?.name || "Guest"}</span></p>
            <p><strong>Email</strong><span>{booking.user?.email || "-"}</span></p>
            <p><strong>Date</strong><span>{formatDate(booking.selectedDate)}</span></p>
            <p><strong>Slot</strong><span>{booking.selectedTimeSlot?.startTime} - {booking.selectedTimeSlot?.endTime}</span></p>
            <p><strong>Seats</strong><span>{booking.seats}</span></p>
            <p><strong>Payment</strong><span>{booking.paymentStatus} / {booking.paymentMethod}</span></p>
            <p><strong>Booking Status</strong><span>{booking.bookingStatus}</span></p>
            <p><strong>QR Used</strong><span>{booking.qrUsed ? `Yes - ${formatDate(booking.qrUsedAt)}` : "No"}</span></p>
          </div>

          <div className="booking-action-bar">
            <button className="btn success" disabled={!validation?.canCheckIn} onClick={claimBooking}>
              Claim QR & Mark Checked-In
            </button>
            <button className="btn secondary" onClick={fetchBooking}>Refresh</button>
          </div>

          {!validation?.canCheckIn && <p className="muted">Reason: {validation?.reason || "This QR is currently not claimable."}</p>}
        </section>
      )}
    </main>
  );
}

export default BookingCheckIn;
