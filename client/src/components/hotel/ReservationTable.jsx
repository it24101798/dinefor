import api from "../../services/api";
import { Link } from "react-router-dom";

const getFallbackHeaders = () => {
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

function ReservationTable({ bookings = [], headers, onChanged, setMessage }) {
  const authHeaders = headers || getFallbackHeaders();

  const updateBooking = async (bookingId, payload) => {
    try {
      const res = await api.put(`/bookings/${bookingId}/status`, payload, { headers: authHeaders });
      setMessage?.(res.data.message || "Booking updated successfully ✅");
      onChanged?.();
    } catch (error) {
      setMessage?.(error.response?.data?.message || "Booking update failed.");
    }
  };

  const claimBooking = async (bookingId) => {
    try {
      const res = await api.put(`/bookings/${bookingId}/check-in`, {}, { headers: authHeaders });
      setMessage?.(res.data.message || "QR claimed successfully ✅");
      onChanged?.();
    } catch (error) {
      setMessage?.(error.response?.data?.message || "QR check-in failed.");
    }
  };

  const activeCount = bookings.filter((b) => !["cancelled", "no_show"].includes(b.bookingStatus)).length;
  const paidCount = bookings.filter((b) => b.paymentStatus === "paid").length;
  const checkedInCount = bookings.filter((b) => b.qrUsed || b.bookingStatus === "checked_in" || b.bookingStatus === "completed").length;
  const pendingPayment = bookings.filter((b) => b.paymentStatus !== "paid" && !["cancelled", "no_show"].includes(b.bookingStatus)).length;

  return (
    <section className="panel reveal-card reservation-ops-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Operations</span>
          <h2>Reservation Management</h2>
          <p className="muted">Claim QR attendance, mark payments collected, complete visits, cancel, or mark no-show reservations.</p>
          <Link className="btn secondary small" to="/hotel/check-in">Open QR Desk</Link>
        </div>
      </div>

      <div className="mini-stats-grid reservation-mini-stats">
        <div><span>Total</span><strong>{bookings.length}</strong></div>
        <div><span>Active</span><strong>{activeCount}</strong></div>
        <div><span>Checked-In</span><strong>{checkedInCount}</strong></div>
        <div><span>Paid</span><strong>{paidCount}</strong></div>
        <div><span>Pending Pay</span><strong>{pendingPayment}</strong></div>
      </div>

      {bookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <div className="table-wrap reservation-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Buffet</th>
                <th>Date / Slot</th>
                <th>Seats</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
                <th>QR</th>
                <th>Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const canClaim = !b.qrUsed && ["confirmed", "pending"].includes(b.bookingStatus);
                return (
                  <tr key={b._id}>
                    <td><strong>{b.user?.name || "Guest"}</strong><br /><span className="muted">{b.user?.email || "-"}</span></td>
                    <td>{b.buffet?.title || "-"}</td>
                    <td>{formatDate(b.selectedDate)}<br /><span className="muted">{b.selectedTimeSlot?.startTime} - {b.selectedTimeSlot?.endTime}</span></td>
                    <td>{b.seats}</td>
                    <td>Rs. {b.totalAmount}</td>
                    <td><span className={`status ${b.bookingStatus}`}>{b.bookingStatus}</span></td>
                    <td><span className={`status ${b.paymentStatus}`}>{b.paymentStatus}</span></td>
                    <td><span className={`status ${b.qrUsed ? "used" : "valid"}`}>{b.qrUsed ? "Used" : "Open"}</span></td>
                    <td><strong>{b.bookingCode}</strong><br /><Link to={`/check-in/${b.bookingCode}`}>Open QR Claim</Link></td>
                    <td>
                      <div className="action-row wrap reservation-actions">
                        {canClaim && <button className="btn success" onClick={() => claimBooking(b._id)}>Claim QR</button>}
                        {b.bookingStatus === "pending" && <button className="btn success" onClick={() => updateBooking(b._id, { bookingStatus: "confirmed" })}>Confirm</button>}
                        {b.paymentStatus !== "paid" && !["cancelled", "no_show"].includes(b.bookingStatus) && <button className="btn success" onClick={() => updateBooking(b._id, { paymentStatus: "paid" })}>Paid</button>}
                        {b.paymentStatus === "paid" && b.bookingStatus === "cancelled" && <button className="btn warning" onClick={() => updateBooking(b._id, { paymentStatus: "refunded" })}>Refunded</button>}
                        {!["completed", "cancelled", "no_show"].includes(b.bookingStatus) && <button className="btn primary" onClick={() => updateBooking(b._id, { bookingStatus: "completed" })}>Complete</button>}
                        {!["no_show", "cancelled", "checked_in", "completed"].includes(b.bookingStatus) && <button className="btn secondary" onClick={() => updateBooking(b._id, { bookingStatus: "no_show" })}>No-show</button>}
                        {!["cancelled", "checked_in", "completed"].includes(b.bookingStatus) && <button className="btn danger" onClick={() => updateBooking(b._id, { bookingStatus: "cancelled" })}>Cancel</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default ReservationTable;
