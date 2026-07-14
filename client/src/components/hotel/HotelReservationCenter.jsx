import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const API = "http://localhost:5000/api";

function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function statusLabel(status) {
  return String(status || "confirmed").replaceAll("_", " ");
}

function ReservationTimeline({ booking }) {
  const timeline = booking?.statusTimeline || [];
  const fallback = [
    { status: "confirmed", note: "Reservation created.", at: booking?.createdAt },
    booking?.checkedInAt && { status: "checked_in", note: "Guest checked in.", at: booking.checkedInAt },
    booking?.completedAt && { status: "completed", note: "Reservation completed.", at: booking.completedAt },
    booking?.cancelledAt && { status: "cancelled", note: "Reservation cancelled.", at: booking.cancelledAt },
  ].filter(Boolean);
  const items = timeline.length ? timeline : fallback;

  return (
    <div className="reservation-timeline">
      {items.map((item, index) => (
        <div className="timeline-item" key={`${item.status}-${item.at}-${index}`}>
          <span className={`timeline-dot ${item.status}`}></span>
          <div>
            <strong>{statusLabel(item.status)}</strong>
            <small>{item.at ? new Date(item.at).toLocaleString() : "-"}</small>
            {item.note && <p>{item.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function OperationColumn({ title, bookings, onAction }) {
  return (
    <section className="ops-column">
      <div className="ops-column-head">
        <h3>{title}</h3>
        <span>{bookings.length}</span>
      </div>
      {bookings.length === 0 ? (
        <p className="empty-state compact">No reservations.</p>
      ) : (
        bookings.slice(0, 8).map((booking) => (
          <article className="ops-booking-card" key={booking._id}>
            <div className="ops-card-top">
              <strong>{booking.user?.name || "Guest"}</strong>
              <span className={`status-pill ${booking.bookingStatus}`}>{statusLabel(booking.bookingStatus)}</span>
            </div>
            <p>{booking.buffet?.title || "Buffet"}</p>
            <small>{fmtDate(booking.selectedDate)} • {booking.selectedTimeSlot?.startTime} - {booking.selectedTimeSlot?.endTime}</small>
            <div className="ops-meta-row">
              <span>{booking.seats} seat(s)</span>
              <span>{fmtMoney(booking.totalAmount)}</span>
            </div>
            <div className="ops-actions">
              {booking.bookingStatus === "confirmed" && <button onClick={() => onAction(booking._id, { bookingStatus: "checked_in" })}>Check In</button>}
              {booking.bookingStatus === "checked_in" && <button onClick={() => onAction(booking._id, { bookingStatus: "dining" })}>Start Dining</button>}
              {["checked_in", "dining", "confirmed"].includes(booking.bookingStatus) && <button onClick={() => onAction(booking._id, { bookingStatus: "completed", paymentStatus: booking.paymentStatus === "unpaid" ? "paid" : booking.paymentStatus })}>Complete</button>}
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function HotelReservationCenter({ headers, setMessage }) {
  const [bookings, setBookings] = useState([]);
  const [ops, setOps] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("operations");
  const [filters, setFilters] = useState({ range: "all", status: "all", paymentStatus: "all", q: "" });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") params.append(key, value);
    });
    return params.toString();
  }, [filters]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const [bookingsRes, opsRes, calendarRes] = await Promise.all([
        api.get(`${API}/hotel-portal/reservations?${queryString}`, { headers }),
        api.get(`${API}/hotel-portal/reservation-operations`, { headers }),
        api.get(`${API}/hotel-portal/reservation-calendar`, { headers }),
      ]);
      setBookings(bookingsRes.data || []);
      setOps(opsRes.data || null);
      setCalendar(calendarRes.data || []);
    } catch (error) {
      setMessage?.(error.response?.data?.message || "Failed to load reservations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, [queryString]);

  const updateBooking = async (bookingId, patch) => {
    try {
      await api.put(`${API}/bookings/${bookingId}/status`, patch, { headers });
      setMessage?.("Reservation updated successfully ✅");
      loadBookings();
    } catch (error) {
      setMessage?.(error.response?.data?.message || "Failed to update reservation.");
    }
  };

  const expireOpenBookings = async () => {
    try {
      const res = await api.put(`${API}/bookings/expire-open`, {}, { headers });
      setMessage?.(res.data?.message || "Open reservations checked for expiry.");
      loadBookings();
    } catch (error) {
      setMessage?.(error.response?.data?.message || "Failed to expire open bookings.");
    }
  };

  const exportCsv = () => {
    const rows = [["Code", "Customer", "Email", "Buffet", "Date", "Time", "Seats", "Status", "Payment", "Amount"]];
    bookings.forEach((booking) => rows.push([
      booking.bookingCode,
      booking.user?.name || "",
      booking.user?.email || "",
      booking.buffet?.title || "",
      fmtDate(booking.selectedDate),
      `${booking.selectedTimeSlot?.startTime || ""}-${booking.selectedTimeSlot?.endTime || ""}`,
      booking.seats,
      booking.bookingStatus,
      booking.paymentStatus,
      booking.totalAmount,
    ]));
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "dinefor-hotel-reservations.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="hotel-panel reservation-ops-panel">
      <div className="hotel-panel-head">
        <div>
          <span className="eyebrow">Reservation Operations</span>
          <h2>Manage QR, check-ins, calendar and guest lifecycle</h2>
          <p>Run today's buffet operations from one control center: check-in guests, complete bookings, export lists, and monitor status flow.</p>
        </div>
        <div className="reservation-toolbar">
          <button className="mini-btn" onClick={expireOpenBookings}>Expire Passed Slots</button>
          <button className="mini-btn" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="reservation-ops-stats">
        <div><span>Total</span><strong>{ops?.stats?.total || 0}</strong></div>
        <div><span>Today</span><strong>{ops?.stats?.today || 0}</strong></div>
        <div><span>Upcoming</span><strong>{ops?.stats?.upcoming || 0}</strong></div>
        <div><span>Checked In</span><strong>{ops?.stats?.checkedIn || 0}</strong></div>
        <div><span>Completed</span><strong>{ops?.stats?.completed || 0}</strong></div>
        <div><span>Revenue</span><strong>{fmtMoney(ops?.stats?.revenue || 0)}</strong></div>
      </div>

      <div className="reservation-tabs">
        <button className={activeTab === "operations" ? "active" : ""} onClick={() => setActiveTab("operations")}>Operations Board</button>
        <button className={activeTab === "calendar" ? "active" : ""} onClick={() => setActiveTab("calendar")}>Calendar</button>
        <button className={activeTab === "table" ? "active" : ""} onClick={() => setActiveTab("table")}>All Reservations</button>
      </div>

      {activeTab === "operations" && (
        <div className="reservation-ops-board">
          <OperationColumn title="Today" bookings={ops?.operational?.today || []} onAction={updateBooking} />
          <OperationColumn title="Checked In / Dining" bookings={ops?.operational?.checkedIn || []} onAction={updateBooking} />
          <OperationColumn title="Upcoming" bookings={ops?.operational?.upcoming || []} onAction={updateBooking} />
          <OperationColumn title="Completed" bookings={ops?.operational?.completed || []} onAction={updateBooking} />
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="reservation-calendar-grid">
          {calendar.length === 0 ? <p className="empty-state">No reservations in the upcoming calendar range.</p> : calendar.map((day) => (
            <article className="reservation-day-card" key={day.dateKey}>
              <div className="day-card-head">
                <strong>{new Date(day.dateKey).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</strong>
                <span>{day.reservations} booking(s)</span>
              </div>
              <div className="day-card-metrics">
                <span>{day.seats} seats</span>
                <span>{fmtMoney(day.revenue)}</span>
              </div>
              <div className="day-status-row">
                {Object.entries(day.byStatus || {}).map(([status, count]) => <small key={status}>{statusLabel(status)}: {count}</small>)}
              </div>
            </article>
          ))}
        </div>
      )}

      {activeTab === "table" && (
        <>
          <div className="hotel-filter-bar">
            <input placeholder="Search guest, buffet or code" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
            <select value={filters.range} onChange={(e) => setFilters({ ...filters, range: e.target.value })}>
              <option value="all">All dates</option><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="week">Next 7 days</option><option value="month">Next month</option>
            </select>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="checked_in">Checked in</option><option value="dining">Dining</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No-show</option><option value="expired">Expired</option>
            </select>
            <select value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}>
              <option value="all">All payment</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="refunded">Refunded</option>
            </select>
          </div>

          {loading ? <p className="muted">Loading reservations...</p> : bookings.length === 0 ? <p className="empty-state">No reservations found for these filters.</p> : (
            <div className="hotel-table-wrap">
              <table className="hotel-table">
                <thead><tr><th>Guest</th><th>Buffet</th><th>Date/Time</th><th>Seats</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking._id}>
                      <td><strong>{booking.user?.name || "Guest"}</strong><span>{booking.user?.email || booking.bookingCode}</span></td>
                      <td>{booking.buffet?.title || "-"}</td>
                      <td>{fmtDate(booking.selectedDate)}<span>{booking.selectedTimeSlot?.startTime} - {booking.selectedTimeSlot?.endTime}</span></td>
                      <td>{booking.seats}</td>
                      <td><select value={booking.bookingStatus} onChange={(e) => updateBooking(booking._id, { bookingStatus: e.target.value })}><option value="confirmed">Confirmed</option><option value="checked_in">Checked in</option><option value="dining">Dining</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No-show</option><option value="expired">Expired</option></select></td>
                      <td><select value={booking.paymentStatus} onChange={(e) => updateBooking(booking._id, { paymentStatus: e.target.value })}><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select></td>
                      <td><button className="mini-btn" onClick={() => setSelectedBooking(booking)}>Timeline</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selectedBooking && (
        <div className="reservation-modal-backdrop" onClick={() => setSelectedBooking(null)}>
          <div className="reservation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hotel-panel-head compact">
              <div><span className={`status-pill ${selectedBooking.bookingStatus}`}>{statusLabel(selectedBooking.bookingStatus)}</span><h3>{selectedBooking.bookingCode}</h3><p>{selectedBooking.user?.name || "Guest"} • {selectedBooking.buffet?.title || "Buffet"}</p></div>
              <button className="mini-btn" onClick={() => setSelectedBooking(null)}>Close</button>
            </div>
            <div className="booking-info-grid upgraded">
              <p><strong>Date</strong><span>{fmtDate(selectedBooking.selectedDate)}</span></p>
              <p><strong>Slot</strong><span>{selectedBooking.selectedTimeSlot?.startTime} - {selectedBooking.selectedTimeSlot?.endTime}</span></p>
              <p><strong>Seats</strong><span>{selectedBooking.seats}</span></p>
              <p><strong>Total</strong><span>{fmtMoney(selectedBooking.totalAmount)}</span></p>
            </div>
            <ReservationTimeline booking={selectedBooking} />
          </div>
        </div>
      )}
    </section>
  );
}

export default HotelReservationCenter;
