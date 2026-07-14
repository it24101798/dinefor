import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const APP_URL = import.meta.env.VITE_CLIENT_URL || "http://localhost:5173";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "short", 
    day: "numeric" 
  });
};

const formatTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
};

const getStatusColor = (status) => {
  const colors = {
    confirmed: "approved",
    checked_in: "approved",
    completed: "approved",
    cancelled: "rejected",
    no_show: "rejected",
    pending: "pending",
    paid: "approved",
    unpaid: "pending",
    refunded: "rejected",
  };
  return colors[status] || "pending";
};

const getStatusLabel = (status) => {
  const labels = {
    confirmed: "✅ Confirmed",
    checked_in: "🔄 Checked In",
    completed: "✅ Completed",
    cancelled: "❌ Cancelled",
    no_show: "🚫 No Show",
    pending: "⏳ Pending",
    paid: "💳 Paid",
    unpaid: "💰 Unpaid",
    refunded: "↩️ Refunded",
  };
  return labels[status] || status;
};

const buildQrUrl = (booking) => `${APP_URL}/check-in/${booking.bookingCode}`;
const getQrImage = (booking) => 
  `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(buildQrUrl(booking))}`;

// ============================================
// MAIN COMPONENT
// ============================================
function MyBookings() {
  const navigate = useNavigate();
  
  // ============================================
  // STATE
  // ============================================
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem("dineforUser") || "null");
  const token = storedUser?.token;
  const headers = { Authorization: `Bearer ${token}` };

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchBookings = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const res = await api.get(`${API_BASE}/api/bookings/my-bookings`, { headers });
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to load bookings.";
      setMessage(errorMsg);
      setMessageType("error");
      
      if (error.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ============================================
  // COMPUTED DATA
  // ============================================
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Filter by status
    if (activeFilter !== "all") {
      result = result.filter((b) => b.bookingStatus === activeFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((b) =>
        [b.bookingCode, b.buffet?.title, b.buffet?.hotel?.hotelName, b.user?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return result;
  }, [bookings, activeFilter, searchQuery]);

  const upcomingBookings = useMemo(() => {
    return filteredBookings.filter(
      (b) => !["cancelled", "no_show", "completed", "checked_in"].includes(b.bookingStatus)
    );
  }, [filteredBookings]);

  const historyBookings = useMemo(() => {
    return filteredBookings.filter(
      (b) => ["cancelled", "no_show", "completed", "checked_in"].includes(b.bookingStatus)
    );
  }, [filteredBookings]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) => b.bookingStatus === "confirmed").length;
    const completed = bookings.filter((b) => b.bookingStatus === "completed").length;
    const cancelled = bookings.filter((b) => b.bookingStatus === "cancelled").length;
    const checkedIn = bookings.filter((b) => b.bookingStatus === "checked_in").length;
    const totalSpent = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

    return { total, confirmed, completed, cancelled, checkedIn, totalSpent };
  }, [bookings]);

  // ============================================
  // HANDLERS
  // ============================================
  const cancelBooking = async () => {
    if (!cancelTarget) return;

    setCancelling(true);
    try {
      const res = await api.put(
        `${API_BASE}/api/bookings/my-bookings/${cancelTarget}/cancel`,
        {},
        { headers }
      );
      setMessage(res.data.message || "Booking cancelled successfully.");
      setMessageType("success");
      setShowCancelModal(false);
      setCancelTarget(null);
      await fetchBookings();
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to cancel booking.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setCancelling(false);
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
  <title>DineFor - ${booking.bookingCode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Inter', Arial, sans-serif; 
      background: #f5f3ef; 
      padding: 40px 20px; 
      color: #1b1c1a;
    }
    .bill {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      padding: 40px;
      border: 1px solid #e5e1d8;
      box-shadow: 0 8px 30px rgba(26, 48, 33, 0.04);
    }
    .header {
      border-bottom: 2px solid #e5e1d8;
      padding-bottom: 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      font-family: 'Playfair Display', serif;
      color: #1A3021;
      font-size: 28px;
    }
    .header .code {
      font-size: 14px;
      color: #737972;
      background: #f5f3ef;
      padding: 8px 16px;
      border-radius: 8px;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .status.confirmed { background: #aff0d8; color: #07513f; }
    .status.checked_in { background: #aff0d8; color: #07513f; }
    .status.completed { background: #cfe9d2; color: #0a2012; }
    .status.cancelled { background: #ffdad6; color: #93000a; }
    .status.pending { background: #ffe088; color: #574500; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 20px 0;
    }
    .grid-item {
      padding: 12px;
      background: #fbf9f5;
      border-radius: 12px;
    }
    .grid-item label {
      font-size: 11px;
      text-transform: uppercase;
      color: #737972;
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 4px;
    }
    .grid-item value {
      font-size: 16px;
      font-weight: 600;
      color: #1A3021;
    }
    .qr-section {
      text-align: center;
      margin: 24px 0;
      padding: 24px;
      background: #fbf9f5;
      border-radius: 16px;
      border: 2px dashed #e5e1d8;
    }
    .qr-section img {
      width: 180px;
      height: 180px;
      background: white;
      padding: 12px;
      border-radius: 12px;
    }
    .qr-section p {
      margin-top: 12px;
      font-size: 14px;
      color: #434843;
    }
    .total {
      font-size: 24px;
      font-weight: 700;
      color: #D4AF37;
      text-align: right;
      padding: 16px 0;
      border-top: 2px solid #e5e1d8;
      margin-top: 16px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e5e1d8;
      font-size: 12px;
      color: #737972;
      text-align: center;
    }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; }
      .header { flex-direction: column; gap: 12px; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="bill">
    <div class="header">
      <h1>🍽️ DineFor</h1>
      <span class="code">${booking.bookingCode}</span>
    </div>
    
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div>
        <h2 style="font-size: 20px; color: #1A3021;">${buffetTitle}</h2>
        <p style="color: #434843;">${hotelName}</p>
      </div>
      <span class="status ${booking.bookingStatus}">${getStatusLabel(booking.bookingStatus)}</span>
    </div>

    <div class="grid">
      <div class="grid-item">
        <label>Date</label>
        <value>${formatDate(booking.selectedDate)}</value>
      </div>
      <div class="grid-item">
        <label>Time Slot</label>
        <value>${booking.selectedTimeSlot?.startTime} - ${booking.selectedTimeSlot?.endTime}</value>
      </div>
      <div class="grid-item">
        <label>Seats</label>
        <value>${booking.seats} guest${booking.seats > 1 ? "s" : ""}</value>
      </div>
      <div class="grid-item">
        <label>Invoice</label>
        <value>${booking.invoiceNumber || "Pending"}</value>
      </div>
      <div class="grid-item">
        <label>Payment</label>
        <value>${booking.paymentStatus} / ${booking.paymentMethod || "pay_at_hotel"}</value>
      </div>
      <div class="grid-item">
        <label>QR Status</label>
        <value>${booking.qrUsed ? "Used ✅" : "Active 🔓"}</value>
      </div>
    </div>

    <div class="qr-section">
      <img src="${qrSrc}" alt="QR Code" />
      <p><strong>Scan this QR at the hotel for check-in</strong></p>
      <p style="font-size: 12px; margin-top: 4px;">${buildQrUrl(booking)}</p>
    </div>

    <div class="total">
      Total: Rs. ${(booking.grandTotal || booking.totalAmount || 0).toLocaleString()}
    </div>

    <div class="footer">
      Generated by DineFor • ${new Date().toLocaleString()}
    </div>
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

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderMessage = () => {
    if (!message) return null;

    const styles = {
      success: "bg-secondary-container/30 text-secondary border border-secondary/30",
      error: "bg-error/10 text-error border border-error/20",
      warning: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30",
      info: "bg-primary-container/10 text-primary border border-primary-container/20",
    };

    return (
      <div className={`p-4 rounded-xl text-sm font-medium mb-6 ${styles[messageType] || styles.info}`}>
        {message}
        <button
          onClick={() => setMessage("")}
          className="float-right text-inherit opacity-70 hover:opacity-100"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    );
  };

  const renderBookingCard = (booking) => {
    const isActive = !["cancelled", "no_show", "completed", "checked_in"].includes(booking.bookingStatus);
    const qrSrc = getQrImage(booking);

    return (
      <div key={booking._id} className="card-ambient overflow-hidden hover:shadow-ambient-lg transition-shadow">
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-48 h-48 md:h-auto relative">
            <img
              src={booking.buffet?.images?.[0] || "https://images.unsplash.com/photo-1555244162-803834f70033?w=300&h=300&fit=crop"}
              alt={booking.buffet?.title || "Buffet"}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2">
              <span className={`status-pill ${getStatusColor(booking.bookingStatus)}`}>
                {booking.bookingStatus}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  {booking.buffet?.hotel?.hotelName || "Hotel"}
                </p>
                <h3 className="font-headline-md text-headline-md text-text-deep-green">
                  {booking.buffet?.title || "Buffet Reservation"}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    {formatDate(booking.selectedDate)}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    {booking.selectedTimeSlot?.startTime} - {booking.selectedTimeSlot?.endTime}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    {booking.seats} guests
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-headline-md text-headline-md text-highlight-gold">
                  Rs. {Number(booking.grandTotal || booking.totalAmount || 0).toLocaleString()}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {booking.bookingCode}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border-subtle">
              <button
                onClick={() => downloadBill(booking)}
                className="btn-outline text-sm flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Bill
              </button>
              <button
                onClick={() => {
                  setSelectedBooking(booking);
                  setShowQRModal(true);
                }}
                className="btn-outline text-sm flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">qr_code</span>
                QR Code
              </button>
              {isActive && booking.bookingStatus !== "checked_in" && (
                <button
                  onClick={() => {
                    setCancelTarget(booking._id);
                    setShowCancelModal(true);
                  }}
                  className="text-error text-sm flex items-center gap-1 hover:underline"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Cancel
                </button>
              )}
              {booking.bookingStatus === "confirmed" && (
                <Link
                  to={`/check-in/${booking.bookingCode}`}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  Check In
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MODALS
  // ============================================
  const renderQRModal = () => {
    if (!showQRModal || !selectedBooking) return null;

    const qrSrc = getQrImage(selectedBooking);

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQRModal(false)}>
        <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md text-text-deep-green">QR Code</h3>
            <button onClick={() => setShowQRModal(false)} className="text-on-surface-variant hover:text-text-deep-green">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="text-center">
            <img
              src={qrSrc}
              alt="QR Code"
              className="w-48 h-48 mx-auto bg-white p-2 rounded-xl border border-border-subtle"
            />
            <p className="font-label-md text-label-md text-text-deep-green mt-3">{selectedBooking.bookingCode}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {selectedBooking.buffet?.title}
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {formatDate(selectedBooking.selectedDate)} • {selectedBooking.selectedTimeSlot?.startTime}
            </p>
            <button
              onClick={() => downloadBill(selectedBooking)}
              className="btn-secondary w-full mt-4 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download Bill
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCancelModal = () => {
    if (!showCancelModal) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCancelModal(false)}>
        <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-headline-md text-headline-md text-text-deep-green mb-2">Cancel Booking</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            Are you sure you want to cancel this booking? This action cannot be undone and your seats will be released.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowCancelModal(false)} className="btn-outline flex-1">Keep Booking</button>
            <button
              onClick={cancelBooking}
              disabled={cancelling}
              className="bg-error text-white px-4 py-2 rounded-full hover:bg-error/80 flex-1"
            >
              {cancelling ? "Cancelling..." : "Cancel Booking"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (!token) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">lock</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Please Login</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              You need to be logged in to view your bookings.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2 mt-6">
              Login
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green">My Bookings</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            View and manage all your reservations
          </p>
        </div>

        {renderMessage()}
        {renderQRModal()}
        {renderCancelModal()}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-surface-container-low text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Total</p>
            <p className="font-headline-md text-headline-md text-text-deep-green">{stats.total}</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary-container/10 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Confirmed</p>
            <p className="font-headline-md text-headline-md text-secondary">{stats.confirmed}</p>
          </div>
          <div className="p-3 rounded-xl bg-primary-container/10 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Checked In</p>
            <p className="font-headline-md text-headline-md text-primary">{stats.checkedIn}</p>
          </div>
          <div className="p-3 rounded-xl bg-tertiary-container/10 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Completed</p>
            <p className="font-headline-md text-headline-md text-tertiary">{stats.completed}</p>
          </div>
          <div className="p-3 rounded-xl bg-error/10 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Total Spent</p>
            <p className="font-headline-md text-headline-md text-highlight-gold">Rs. {stats.totalSpent.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {["all", "confirmed", "pending", "checked_in", "completed", "cancelled"].map((status) => (
              <button
                key={status}
                onClick={() => setActiveFilter(status)}
                className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all ${
                  activeFilter === status
                    ? "bg-secondary text-surface-cream"
                    : "border border-border-subtle hover:border-secondary"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== "all" && (
                  <span className="ml-1 text-xs opacity-70">
                    ({bookings.filter((b) => b.bookingStatus === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookings..."
              className="form-input w-full"
            />
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-ambient h-48 animate-pulse bg-surface-container-low" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">event_busy</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">No bookings found</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              {searchQuery || activeFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "Start exploring buffets and make your first reservation!"}
            </p>
            <Link to="/feed" className="btn-primary inline-flex items-center gap-2 mt-4">
              Browse Buffets
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingBookings.length > 0 && (
              <div>
                <h3 className="font-headline-md text-headline-md text-text-deep-green mb-3">Upcoming</h3>
                {upcomingBookings.map(renderBookingCard)}
              </div>
            )}
            {historyBookings.length > 0 && (
              <div>
                <h3 className="font-headline-md text-headline-md text-text-deep-green mb-3">History</h3>
                {historyBookings.map(renderBookingCard)}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default MyBookings;