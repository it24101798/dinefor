import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const APP_URL = import.meta.env.VITE_CLIENT_URL || "http://localhost:5173";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const buildQrUrl = (booking) => `${APP_URL}/check-in/${booking.bookingCode}`;
const getQrImage = (booking) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(buildQrUrl(booking))}`;

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const storedUser = JSON.parse(localStorage.getItem("dineforUser"));
  const token = storedUser?.token;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/bookings/my-bookings`, { headers });
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const cancelBooking = async (bookingId) => {
    const confirmed = window.confirm("Cancel this booking? Seats will be released back to the buffet.");
    if (!confirmed) return;

    try {
      const res = await axios.put(`${API_URL}/bookings/my-bookings/${bookingId}/cancel`, {}, { headers });
      setMessage(res.data.message);
      fetchBookings();
    } catch (error) {
      setMessage(error.response?.data?.message || "Cancel failed.");
    }
  };

  const downloadBill = (booking) => {
    const qrSrc = getQrImage(booking);
    const fileName = `${booking.bookingCode || "dinefor-booking"}-reservation-bill.html`;
    const hotelName = booking.buffet?.hotel?.hotelName || "Hotel";
    const buffetTitle = booking.buffet?.title || "Buffet Reservation";
    const billHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>DineFor Reservation Bill - ${booking.bookingCode}</title>
<style>
  *{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:#eef8f8;color:#08202b;padding:24px}.bill{max-width:850px;margin:auto;background:#fffdf7;border:1px solid #e6c98f;border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(6,36,45,.18)}.top{background:linear-gradient(135deg,#045b6f 0%,#18b6c7 46%,#f4d7a1 100%);padding:30px;color:white;position:relative}.brand{font-size:18px;font-weight:900;letter-spacing:.06em}.top h1{margin:18px 0 6px;font-size:38px;color:#fff}.code{font-size:20px;font-weight:900;color:#ffe9b8}.body{padding:28px}.notice{background:#fff6dc;border:1px solid #f1d28e;border-radius:18px;padding:16px;margin-bottom:22px;font-weight:700;color:#6b4b06}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.item{background:#f8fafc;border:1px solid #dce8ea;border-radius:16px;padding:15px;min-height:74px}.item strong{display:block;color:#057083;font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px}.item span{font-size:18px;font-weight:800}.qrbox{display:grid;grid-template-columns:240px 1fr;gap:22px;align-items:center;margin-top:24px;padding:22px;border:2px dashed #18b6c7;border-radius:22px;background:#effdff}.qrbox img{width:220px;height:220px;background:#fff;border-radius:20px;padding:12px}.qrbox h2{margin:0 0 10px}.rules{margin-top:22px;background:#f1f5f9;border-radius:18px;padding:18px}.rules li{margin:8px 0}.footer{padding:18px 28px;background:#062430;color:#b6e4e8;font-size:13px}.total{font-size:22px;color:#045b6f}@media(max-width:700px){.grid,.qrbox{grid-template-columns:1fr}.qrbox{text-align:center}.qrbox img{margin:auto}.top h1{font-size:30px}}
</style>
</head>
<body>
  <div class="bill">
    <div class="top">
      <div class="brand">DINEFOR</div>
      <h1>Reservation Bill</h1>
      <div class="code">${booking.bookingCode}</div>
    </div>
    <div class="body">
      <div class="notice">Show this bill QR at the hotel entrance. The QR is unique, one-time use, and hotel staff will claim it during check-in.</div>
      <div class="grid">
        <div class="item"><strong>Hotel</strong><span>${hotelName}</span></div>
        <div class="item"><strong>Buffet</strong><span>${buffetTitle}</span></div>
        <div class="item"><strong>Date</strong><span>${formatDate(booking.selectedDate)}</span></div>
        <div class="item"><strong>Time Slot</strong><span>${booking.selectedTimeSlot?.startTime || ""} - ${booking.selectedTimeSlot?.endTime || ""}</span></div>
        <div class="item"><strong>Seats</strong><span>${booking.seats}</span></div>
        <div class="item"><strong>Invoice</strong><span>${booking.invoiceNumber || "Pending"}</span></div>
        <div class="item"><strong>Subtotal</strong><span>Rs. ${booking.subtotal || booking.totalAmount}</span></div>
        <div class="item"><strong>Discount</strong><span>Rs. ${booking.discountAmount || 0}</span></div>
        <div class="item"><strong>Total</strong><span class="total">Rs. ${booking.grandTotal || booking.totalAmount}</span></div>
        <div class="item"><strong>Payment</strong><span>${booking.paymentStatus} / ${booking.paymentMethod || "pay_at_hotel"}</span></div>
        <div class="item"><strong>Status</strong><span>${booking.bookingStatus}</span></div>
      </div>
      <div class="qrbox">
        <img src="${qrSrc}" alt="Booking QR" />
        <div>
          <h2>Hotel Check-In QR</h2>
          <p>Scan or open this QR to verify guest details and claim attendance. Once claimed, this QR cannot be reused.</p>
          <p><strong>Direct check-in link:</strong><br/>${buildQrUrl(booking)}</p>
        </div>
      </div>
      <div class="rules">
        <strong>Important Rules</strong>
        <ul>
          <li>Bring this bill as a saved file, screenshot, or printed copy.</li>
          <li>The QR can be claimed only near the reservation time.</li>
          <li>After buffet date/time passes, the QR becomes invalid.</li>
          <li>Cancellation and refund rules depend on hotel and DineFor policy.</li>
        </ul>
      </div>
    </div>
    <div class="footer">Generated by DineFor. Keep this bill safely until the reservation is completed.</div>
  </div>
</body>
</html>`;

    const blob = new Blob([billHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const upcomingBookings = bookings.filter((b) => !["cancelled", "no_show"].includes(b.bookingStatus));
  const historyBookings = bookings.filter((b) => ["cancelled", "no_show", "completed", "checked_in"].includes(b.bookingStatus));

  const renderBooking = (booking) => {
    const qrSrc = getQrImage(booking);
    const isFinal = ["cancelled", "checked_in", "completed", "no_show"].includes(booking.bookingStatus) || booking.qrUsed;

    return (
      <article className="booking-card booking-confirmation-card card-hover" key={booking._id}>
        <img className="booking-cover" src={booking.buffet?.images?.[0] || "https://images.unsplash.com/photo-1555244162-803834f70033"} alt={booking.buffet?.title || "DineFor booking"} />

        <div className="booking-card-body">
          <div className="booking-card-top">
            <div>
              <p className="eyebrow">{booking.buffet?.hotel?.hotelName || "Hotel"}</p>
              <h2>{booking.buffet?.title || "Buffet Reservation"}</h2>
              <p className="muted">Save the bill and show this unique QR code when you arrive at the hotel.</p>
            </div>
            <span className={`status ${booking.bookingStatus}`}>{booking.bookingStatus}</span>
          </div>

          <div className="booking-confirmation-layout">
            <div className="booking-info-grid upgraded">
              <p><strong>Date</strong><span>{formatDate(booking.selectedDate)}</span></p>
              <p><strong>Slot</strong><span>{booking.selectedTimeSlot?.startTime} - {booking.selectedTimeSlot?.endTime}</span></p>
              <p><strong>Seats</strong><span>{booking.seats}</span></p>
              <p><strong>Invoice</strong><span>{booking.invoiceNumber || "Pending"}</span></p>
              <p><strong>Subtotal</strong><span>Rs. {booking.subtotal || booking.totalAmount}</span></p>
              <p><strong>Discount</strong><span>Rs. {booking.discountAmount || 0}</span></p>
              <p><strong>Total</strong><span>Rs. {booking.grandTotal || booking.totalAmount}</span></p>
              <p><strong>Payment</strong><span>{booking.paymentStatus} / {booking.paymentMethod || "pay_at_hotel"}</span></p>
              <p><strong>Code</strong><span>{booking.bookingCode}</span></p>
              <p><strong>QR Status</strong><span>{booking.qrUsed ? "Used / Claimed" : "Not used"}</span></p>
              <p><strong>Check-in</strong><span>{booking.checkedInAt ? formatDate(booking.checkedInAt) : "Pending"}</span></p>
            </div>

            <aside className={`booking-qr-card ${isFinal ? "qr-muted" : ""}`}>
              <img src={qrSrc} alt={`QR code for booking ${booking.bookingCode}`} />
              <strong>{booking.bookingCode}</strong>
              <span>{isFinal ? "QR Locked" : "Unique QR Check-In"}</span>
            </aside>
          </div>

          <div className="booking-action-bar">
            <button className="btn warning" onClick={() => downloadBill(booking)}>Save Invoice + QR</button>
            {!isFinal && booking.paymentStatus !== "paid" && (
              <button className="btn danger" onClick={() => cancelBooking(booking._id)}>Cancel Booking</button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="page-shell my-bookings-page beach-bookings-page">
      <section className="page-hero compact">
        <span className="eyebrow">Client Dashboard</span>
        <h1>My Bookings</h1>
        <p>Download your reservation bill, keep your QR code, and track hotel check-in status.</p>
      </section>

      {message && <p className="page-message success-text">{message}</p>}

      {loading ? (
        <h2>Loading bookings...</h2>
      ) : bookings.length === 0 ? (
        <section className="panel"><p>No bookings found.</p></section>
      ) : (
        <>
          <section className="section-heading"><div><span className="eyebrow">Active</span><h2>Upcoming Reservations</h2></div></section>
          <div className="booking-list">{upcomingBookings.length === 0 ? <p>No active bookings.</p> : upcomingBookings.map(renderBooking)}</div>

          {historyBookings.length > 0 && (
            <>
              <section className="section-heading"><div><span className="eyebrow">History</span><h2>Used / Completed / Cancelled</h2></div></section>
              <div className="booking-list muted-list">{historyBookings.map(renderBooking)}</div>
            </>
          )}
        </>
      )}
    </main>
  );
}

export default MyBookings;
