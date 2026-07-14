import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const getStatusColor = (status) => {
  const colors = {
    confirmed: "approved",
    checked_in: "approved",
    completed: "approved",
    cancelled: "rejected",
    no_show: "rejected",
    pending: "pending",
    expired: "rejected",
    too_early: "pending",
    valid: "approved",
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
    expired: "⏰ Expired",
    too_early: "⏳ Too Early",
    valid: "✅ Valid",
  };
  return labels[status] || status;
};

// ============================================
// MAIN COMPONENT
// ============================================
function BookingCheckIn() {
  const { code } = useParams();
  const navigate = useNavigate();

  // ============================================
  // STATE
  // ============================================
  const [booking, setBooking] = useState(null);
  const [validation, setValidation] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);

  const storedUser = JSON.parse(localStorage.getItem("dineforUser") || "null");
  const headers = { Authorization: `Bearer ${storedUser?.token}` };

  // ============================================
  // FETCH BOOKING
  // ============================================
  const fetchBooking = useCallback(async () => {
    if (!code) {
      setMessage("No booking code provided.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const res = await api.get(`${API_BASE}/api/bookings/verify/${code}`, { headers });
      setBooking(res.data.booking);
      setValidation(res.data.validation);

      // Calculate time remaining for check-in window
      if (res.data.booking?.selectedDate && res.data.booking?.selectedTimeSlot) {
        const bookingDateTime = new Date(
          `${res.data.booking.selectedDate}T${res.data.booking.selectedTimeSlot.startTime}:00`
        );
        const now = new Date();
        const diffMs = bookingDateTime - now;
        if (diffMs > 0) {
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setTimeRemaining({ hours: diffHrs, minutes: diffMins });
        } else {
          setTimeRemaining(null);
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Booking verification failed.";
      setMessage(errorMsg);
      setMessageType("error");
      setBooking(null);
      setValidation(null);
    } finally {
      setLoading(false);
    }
  }, [code, headers]);

  useEffect(() => {
    fetchBooking();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchBooking, 30000);
    return () => clearInterval(interval);
  }, [fetchBooking]);

  // ============================================
  // HANDLERS
  // ============================================
  const claimBooking = async () => {
    if (!booking) return;

    setCheckingIn(true);
    try {
      const res = await api.put(
        `${API_BASE}/api/bookings/${booking._id}/check-in`,
        {},
        { headers }
      );
      setMessage(res.data.message || "✅ Booking checked in successfully!");
      setMessageType("success");
      setShowConfirm(false);
      await fetchBooking();
      setTimeout(() => navigate("/hotel/check-in"), 2000);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Check-in failed.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setCheckingIn(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!booking) return;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      `${window.location.origin}/check-in/${booking.bookingCode}`
    )}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>DineFor - Check-In ${booking.bookingCode}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', Arial, sans-serif; background: #f5f3ef; padding: 40px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 24px; padding: 40px; border: 1px solid #e5e1d8; box-shadow: 0 8px 30px rgba(26,48,33,0.04); }
          .header { border-bottom: 2px solid #e5e1d8; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
          .header h1 { font-family: 'Playfair Display', serif; color: #1A3021; font-size: 28px; }
          .qr { text-align: center; margin: 24px 0; padding: 24px; background: #fbf9f5; border-radius: 16px; }
          .qr img { width: 180px; height: 180px; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
          .detail { padding: 12px; background: #fbf9f5; border-radius: 12px; }
          .detail label { font-size: 11px; text-transform: uppercase; color: #737972; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
          .detail value { font-size: 16px; font-weight: 600; color: #1A3021; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e1d8; font-size: 12px; color: #737972; text-align: center; }
          @media print { body { background: white; padding: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍽️ DineFor</h1>
            <span class="status ${booking.bookingStatus}">${getStatusLabel(booking.bookingStatus)}</span>
          </div>
          <h2 style="font-size: 20px; color: #1A3021; margin-bottom: 4px;">${booking.buffet?.title || "Buffet Reservation"}</h2>
          <p style="color: #434843; margin-bottom: 16px;">${booking.buffet?.hotel?.hotelName || "Hotel"}</p>
          <div class="qr">
            <img src="${qrUrl}" alt="QR Code" />
            <p style="margin-top: 12px; font-size: 14px; color: #434843;">
              <strong>${booking.bookingCode}</strong>
            </p>
          </div>
          <div class="details">
            <div class="detail"><label>Date</label><value>${formatDate(booking.selectedDate)}</value></div>
            <div class="detail"><label>Time</label><value>${booking.selectedTimeSlot?.startTime} - ${booking.selectedTimeSlot?.endTime}</value></div>
            <div class="detail"><label>Seats</label><value>${booking.seats} guest${booking.seats > 1 ? "s" : ""}</value></div>
            <div class="detail"><label>Total</label><value>${formatCurrency(booking.grandTotal || booking.totalAmount)}</value></div>
          </div>
          <div class="footer">
            Generated by DineFor • ${new Date().toLocaleString()}
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dinefor-checkin-${booking.bookingCode}.html`;
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

  const renderLoading = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-pulse">
          <span className="material-symbols-outlined text-5xl text-secondary mb-3 block">sync</span>
          <p className="font-headline-md text-headline-md text-text-deep-green">Verifying booking...</p>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">Please wait while we check the QR code.</p>
      </div>
    </div>
  );

  const renderTimeRemaining = () => {
    if (!timeRemaining) return null;

    const { hours, minutes } = timeRemaining;
    if (hours > 0) {
      return (
        <div className="p-3 rounded-xl bg-secondary-container/10 border border-secondary/30 text-center">
          <p className="font-label-sm text-label-sm text-secondary">Check-in opens in</p>
          <p className="font-headline-md text-headline-md text-secondary">
            {hours}h {minutes}m
          </p>
        </div>
      );
    }
    if (minutes > 0) {
      return (
        <div className="p-3 rounded-xl bg-secondary-container/10 border border-secondary/30 text-center">
          <p className="font-label-sm text-label-sm text-secondary">Check-in opens in</p>
          <p className="font-headline-md text-headline-md text-secondary">{minutes} minutes</p>
        </div>
      );
    }
    return null;
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (loading) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          {renderLoading()}
        </div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">qr_code_2</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Booking Not Found</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              {message || "The booking you're looking for doesn't exist or has been removed."}
            </p>
            <Link to="/" className="btn-primary inline-flex items-center gap-2 mt-6">
              Go Home
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
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green">QR Check-In</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Verify and claim guest booking
          </p>
        </div>

        {renderMessage()}

        {/* Booking Card */}
        <div className="card-ambient p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Booking Found
                </span>
                <span className={`status-pill ${getStatusColor(booking.bookingStatus)}`}>
                  {getStatusLabel(booking.bookingStatus)}
                </span>
              </div>
              <h2 className="font-headline-md text-headline-md text-text-deep-green">
                {booking.bookingCode}
              </h2>
              <p className="font-body-md text-body-md text-text-deep-green">
                {booking.buffet?.title || "Buffet Reservation"}
              </p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {booking.buffet?.hotel?.hotelName || "Hotel"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-body-md text-body-md text-text-deep-green">
                {booking.user?.name || "Guest"}
              </p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {booking.user?.email || "No email"}
              </p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {booking.seats} seats • {formatDate(booking.selectedDate)}
              </p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {booking.selectedTimeSlot?.startTime} - {booking.selectedTimeSlot?.endTime}
              </p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center my-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                `${window.location.origin}/check-in/${booking.bookingCode}`
              )}`}
              alt="QR Code"
              className="w-36 h-36 bg-white p-2 rounded-xl border border-border-subtle"
            />
          </div>

          {/* Time Remaining */}
          {renderTimeRemaining()}

          {/* Validation Status */}
          {validation && (
            <div className={`p-3 rounded-xl text-sm ${
              validation.canCheckIn
                ? "bg-secondary-container/20 text-secondary border border-secondary/30"
                : "bg-error/10 text-error border border-error/20"
            }`}>
              <p className="font-body-md text-body-md">
                {validation.canCheckIn
                  ? "✅ This booking is ready for check-in"
                  : `⛔ ${validation.reason || "This QR is not claimable"}`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border-subtle">
            {validation?.canCheckIn ? (
              <>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={checkingIn}
                  className="btn-secondary flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {checkingIn ? "Processing..." : "Claim QR & Check In"}
                </button>
                <button
                  onClick={handleDownload}
                  className="btn-outline flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Download
                </button>
              </>
            ) : (
              <span className="status-pill rejected">
                {booking.qrUsed
                  ? "QR Already Used"
                  : `Booking ${booking.bookingStatus}`}
              </span>
            )}
            <button
              onClick={handlePrint}
              className="btn-outline flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              Print
            </button>
            <Link
              to="/hotel/check-in"
              className="btn-outline flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Desk
            </Link>
          </div>
        </div>

        {/* Confirm Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
            <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-headline-md text-headline-md text-text-deep-green mb-2">Confirm Check-In</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                Are you sure you want to check in <strong>{booking.user?.name || "Guest"}</strong>?
                <br />
                <span className="text-sm text-on-surface-variant">
                  Booking: {booking.bookingCode} • {booking.seats} seats
                </span>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="btn-outline flex-1">Cancel</button>
                <button
                  onClick={claimBooking}
                  disabled={checkingIn}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  {checkingIn ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-text-deep-green border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Check-In"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default BookingCheckIn;