import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const isPastBooking = (booking) => {
  if (!booking?.selectedDate) return false;
  const selected = new Date(booking.selectedDate);
  const endText = booking.selectedTimeSlot?.endTime || "23:59";
  const match12 = String(endText).match(/^(\d{1,2})(?::(\d{2}))?\s*(A\.?M\.?|P\.?M\.?)$/i);
  const match24 = String(endText).match(/^(\d{1,2})(?::(\d{2}))$/);
  let h = 23;
  let m = 59;

  if (match12) {
    h = Number(match12[1]);
    m = Number(match12[2] || 0);
    const period = match12[3].toUpperCase();
    if (period.startsWith("P") && h !== 12) h += 12;
    if (period.startsWith("A") && h === 12) h = 0;
  } else if (match24) {
    h = Number(match24[1]);
    m = Number(match24[2] || 0);
  }

  selected.setHours(h, m, 0, 0);
  return new Date() > selected;
};

function CheckInDesk({ bookings = [], onChanged, setMessage }) {
  const [code, setCode] = useState("");
  const [found, setFound] = useState(null);
  const [validation, setValidation] = useState(null);
  const [localMessage, setLocalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const headers = getHeaders();

  const checkedInHistory = useMemo(() => {
    return [...bookings]
      .filter((b) => b.qrUsed || b.bookingStatus === "checked_in" || b.bookingStatus === "completed")
      .sort((a, b) => new Date(b.checkedInAt || b.updatedAt || 0) - new Date(a.checkedInAt || a.updatedAt || 0));
  }, [bookings]);

  const activeToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return bookings.filter((b) => {
      const bookingDate = b.selectedDate ? new Date(b.selectedDate).toISOString().slice(0, 10) : "";
      return bookingDate === today && !["cancelled", "no_show", "completed"].includes(b.bookingStatus);
    });
  }, [bookings]);

  const expiredCandidates = useMemo(() => {
    return bookings.filter((b) => !b.qrUsed && !["cancelled", "no_show", "completed", "checked_in"].includes(b.bookingStatus) && isPastBooking(b));
  }, [bookings]);

  const searchCode = async (manualCode = code) => {
    const cleanCode = String(manualCode || "").trim();
    if (!cleanCode) {
      setLocalMessage("Enter or paste a booking code first.");
      return;
    }

    try {
      setLoading(true);
      setLocalMessage("");
      const res = await axios.get(`${API_URL}/bookings/verify/${encodeURIComponent(cleanCode)}`, { headers });
      setFound(res.data.booking);
      setValidation(res.data.validation);
      setMessage?.("Booking loaded for verification.");
    } catch (error) {
      setFound(null);
      setValidation(null);
      setLocalMessage(error.response?.data?.message || "Could not find this booking code.");
    } finally {
      setLoading(false);
    }
  };

  const claimFound = async () => {
    if (!found?._id) return;

    try {
      setLoading(true);
      const res = await axios.put(`${API_URL}/bookings/${found._id}/check-in`, {}, { headers });
      setFound(res.data.booking);
      setValidation(res.data.validation);
      setLocalMessage(res.data.message || "QR claimed successfully.");
      onChanged?.();
    } catch (error) {
      setLocalMessage(error.response?.data?.message || "QR claim failed.");
    } finally {
      setLoading(false);
    }
  };

  const markNoShow = async (bookingId) => {
    try {
      await axios.put(`${API_URL}/bookings/${bookingId}/status`, { bookingStatus: "no_show" }, { headers });
      setMessage?.("Booking marked as no-show.");
      onChanged?.();
    } catch (error) {
      setMessage?.(error.response?.data?.message || "No-show update failed.");
    }
  };

  return (
    <section className="panel reveal-card checkin-desk-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Hotel QR Desk</span>
          <h2>Check-In Scanner & Manual Claim</h2>
          <p className="muted">Use the customer bill QR or paste the booking code. Each QR can be claimed only once and becomes invalid after the buffet time.</p>
        </div>
      </div>

      <div className="checkin-desk-grid">
        <div className="checkin-search-card">
          <h3>Manual Booking Code Search</h3>
          <p className="muted">Paste the code from the bill, for example: DF-1781708240728-1333.</p>
          <div className="code-search-row">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter booking code" />
            <button className="btn primary" disabled={loading} onClick={() => searchCode()}>Verify</button>
          </div>
          <div className="scanner-placeholder">
            <strong>QR Scanner Flow</strong>
            <span>For MVP, the QR opens the secure claim page directly. Later we can connect a live camera scanner using browser camera permissions.</span>
          </div>
          {localMessage && <p className={localMessage.toLowerCase().includes("failed") || localMessage.toLowerCase().includes("could") || localMessage.toLowerCase().includes("only") ? "error-text" : "success-text"}>{localMessage}</p>}
        </div>

        <div className="checkin-summary-card">
          <div><span>Today Active</span><strong>{activeToday.length}</strong></div>
          <div><span>Checked-In</span><strong>{checkedInHistory.length}</strong></div>
          <div><span>Expired / Need Review</span><strong>{expiredCandidates.length}</strong></div>
        </div>
      </div>

      {found && (
        <div className="found-booking-card">
          <div className="section-heading slim">
            <div>
              <span className={`status ${validation?.state || found.bookingStatus}`}>{validation?.label || found.bookingStatus}</span>
              <h3>{found.buffet?.title || "Buffet Reservation"}</h3>
              <p className="muted">{found.buffet?.hotel?.hotelName || "Hotel"}</p>
            </div>
            <strong className="big-code small-code">{found.bookingCode}</strong>
          </div>

          <div className="booking-info-grid upgraded">
            <p><strong>Guest</strong><span>{found.user?.name || "Guest"}</span></p>
            <p><strong>Email</strong><span>{found.user?.email || "-"}</span></p>
            <p><strong>Date</strong><span>{formatDate(found.selectedDate)}</span></p>
            <p><strong>Slot</strong><span>{found.selectedTimeSlot?.startTime} - {found.selectedTimeSlot?.endTime}</span></p>
            <p><strong>Seats</strong><span>{found.seats}</span></p>
            <p><strong>Total</strong><span>Rs. {found.totalAmount}</span></p>
            <p><strong>Payment</strong><span>{found.paymentStatus} / {found.paymentMethod}</span></p>
            <p><strong>QR Used</strong><span>{found.qrUsed ? "Yes" : "No"}</span></p>
          </div>

          <div className="booking-action-bar">
            <button className="btn success" disabled={!validation?.canCheckIn || loading} onClick={claimFound}>Claim QR & Check-In</button>
            <Link className="btn secondary" to={`/check-in/${found.bookingCode}`}>Open Full Claim Page</Link>
          </div>

          {!validation?.canCheckIn && <p className="muted">Reason: {validation?.reason || "This QR is currently locked."}</p>}
        </div>
      )}

      <div className="checkin-history-grid">
        <section className="mini-panel">
          <h3>Check-In History</h3>
          {checkedInHistory.length === 0 ? <p className="muted">No checked-in guests yet.</p> : (
            <div className="compact-list">
              {checkedInHistory.slice(0, 10).map((b) => (
                <div className="compact-list-item" key={b._id}>
                  <div><strong>{b.user?.name || "Guest"}</strong><span>{b.buffet?.title || "Buffet"}</span></div>
                  <div><span>{formatDate(b.checkedInAt || b.updatedAt)}</span><strong>{b.bookingCode}</strong></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mini-panel">
          <h3>Expired / No-Show Review</h3>
          {expiredCandidates.length === 0 ? <p className="muted">No expired open reservations found.</p> : (
            <div className="compact-list">
              {expiredCandidates.slice(0, 10).map((b) => (
                <div className="compact-list-item" key={b._id}>
                  <div><strong>{b.user?.name || "Guest"}</strong><span>{formatDate(b.selectedDate)} • {b.selectedTimeSlot?.startTime}</span></div>
                  <button className="btn secondary small" onClick={() => markNoShow(b._id)}>Mark No-show</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default CheckInDesk;
