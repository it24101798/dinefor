import React, { useState } from "react";
import api from "../../services/api";
import { Link } from "react-router-dom";

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

const getStatusColor = (status) => {
  const colors = {
    confirmed: "approved",
    checked_in: "approved",
    completed: "approved",
    cancelled: "rejected",
    no_show: "rejected",
    pending: "pending",
  };
  return colors[status] || "pending";
};

function CheckInDesk({ bookings = [], onChanged, setMessage }) {
  const [searchCode, setSearchCode] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem("dineforUser") || "null");
  const token = storedUser?.token;
  const headers = { Authorization: `Bearer ${token}` };

  // ============================================
  // HANDLERS
  // ============================================
  const handleSearch = async () => {
    if (!searchCode.trim()) {
      setMessage("Please enter a booking code.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`${API_BASE}/api/bookings/verify/${searchCode.trim()}`, { headers });

      if (res.data.booking) {
        setSelectedBooking(res.data.booking);
        setMessage(`✅ Booking found: ${res.data.booking.bookingCode}`);
      } else {
        setSelectedBooking(null);
        setMessage("No booking found with this code.");
      }
    } catch (error) {
      setSelectedBooking(null);
      setMessage(error.response?.data?.message || "Failed to verify booking.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedBooking) return;

    setCheckingIn(true);
    try {
      const res = await api.put(
        `${API_BASE}/api/bookings/${selectedBooking._id}/check-in`,
        {},
        { headers }
      );
      setMessage(res.data.message || "✅ Check-in successful!");
      setShowConfirmModal(false);
      setSelectedBooking(null);
      setSearchCode("");

      if (onChanged) onChanged();
    } catch (error) {
      setMessage(error.response?.data?.message || "Check-in failed.");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSelection = () => {
    setSelectedBooking(null);
    setSearchCode("");
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderSelectedBooking = () => {
    if (!selectedBooking) return null;
    const b = selectedBooking;
    const isCheckInAllowed = b.bookingStatus === "confirmed" && !b.qrUsed;

    return (
      <div className="card-ambient p-6 border-secondary border-2 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Booking Found
              </span>
              <span className={`status-pill ${getStatusColor(b.bookingStatus)}`}>
                {b.bookingStatus}
              </span>
            </div>
            <h4 className="font-headline-md text-headline-md text-text-deep-green">
              {b.bookingCode}
            </h4>
            <p className="font-body-md text-body-md text-text-deep-green">
              {b.buffet?.title || "Buffet"}
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {b.buffet?.hotel?.hotelName || "Hotel"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-body-md text-body-md text-text-deep-green">
              {b.user?.name || "Guest"}
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {b.user?.email || "No email"}
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {b.seats} seats • {formatDate(b.selectedDate)}
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {b.selectedTimeSlot?.startTime} - {b.selectedTimeSlot?.endTime}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border-subtle">
          {isCheckInAllowed ? (
            <>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={checkingIn}
                className="btn-secondary flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {checkingIn ? "Processing..." : "Claim QR & Check In"}
              </button>
              <Link
                to={`/check-in/${b.bookingCode}`}
                target="_blank"
                className="btn-outline flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">qr_code</span>
                View QR
              </Link>
            </>
          ) : (
            <span className="status-pill rejected">
              {b.qrUsed ? "QR Already Used" : `Booking ${b.bookingStatus}`}
            </span>
          )}
          <button
            onClick={clearSelection}
            className="btn-outline flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">clear</span>
            Clear
          </button>
        </div>
      </div>
    );
  };

  const renderConfirmModal = () => {
    if (!showConfirmModal || !selectedBooking) return null;
    const b = selectedBooking;

    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => setShowConfirmModal(false)}
      >
        <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-headline-md text-headline-md text-text-deep-green mb-2">Confirm Check-In</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            Are you sure you want to check in <strong>{b.user?.name || "Guest"}</strong>?
            <br />
            <span className="text-sm text-on-surface-variant">
              Booking: {b.bookingCode} • {b.seats} seats
              <br />
              Buffet: {b.buffet?.title}
            </span>
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowConfirmModal(false)} className="btn-outline flex-1">
              Cancel
            </button>
            <button
              onClick={handleCheckIn}
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
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="card-ambient p-6">
        <h3 className="font-headline-md text-headline-md text-text-deep-green mb-4">
          QR Check-In
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-4">
          Search for a booking by code or scan the QR code from the guest's bill.
        </p>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
            placeholder="Enter booking code (e.g. DF-2024-001)"
            className="form-input flex-1"
            onKeyPress={handleKeyPress}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
            {loading ? "Searching..." : "Verify"}
          </button>
        </div>

        {/* QR Scanner Placeholder */}
        <div className="mt-4 p-6 rounded-xl border-2 border-dashed border-border-subtle bg-surface-container-low text-center">
          <span className="material-symbols-outlined text-4xl text-outline">qr_code_scanner</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            QR scanner integration coming soon
          </p>
          <p className="font-label-sm text-label-sm text-outline">
            Manually enter the booking code above
          </p>
        </div>
      </div>

      {/* Selected Booking */}
      {renderSelectedBooking()}

      {/* Active Bookings List */}
      <div className="card-ambient p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-md text-headline-md text-text-deep-green">
            Pending Check-Ins
          </h3>
          <span className="badge-gold">
            {bookings.filter((b) => b.bookingStatus === "confirmed" && !b.qrUsed).length} waiting
          </span>
        </div>

        {bookings.filter((b) => b.bookingStatus === "confirmed" && !b.qrUsed).length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            No pending check-ins at the moment.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {bookings
              .filter((b) => b.bookingStatus === "confirmed" && !b.qrUsed)
              .slice(0, 10)
              .map((booking) => (
                <div
                  key={booking._id}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 p-4 rounded-xl border border-border-subtle hover:border-secondary transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setSearchCode(booking.bookingCode);
                  }}
                >
                  <div>
                    <p className="font-label-md text-label-md text-text-deep-green">
                      {booking.bookingCode}
                    </p>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      {booking.user?.name || "Guest"} • {booking.seats} seats
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {booking.buffet?.title} • {booking.buffet?.hotel?.hotelName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {formatDate(booking.selectedDate)}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {booking.selectedTimeSlot?.startTime} - {booking.selectedTimeSlot?.endTime}
                    </p>
                    <span className={`status-pill ${getStatusColor(booking.bookingStatus)} text-xs`}>
                      {booking.bookingStatus}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Recent Check-Ins */}
      {bookings.filter((b) => b.bookingStatus === "checked_in" || b.bookingStatus === "completed").length > 0 && (
        <div className="card-ambient p-6">
          <h3 className="font-headline-md text-headline-md text-text-deep-green mb-4">
            Recent Check-Ins
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bookings
              .filter((b) => b.bookingStatus === "checked_in" || b.bookingStatus === "completed")
              .slice(0, 5)
              .map((booking) => (
                <div
                  key={booking._id}
                  className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low/50"
                >
                  <div>
                    <p className="font-label-sm text-label-sm text-text-deep-green">
                      {booking.bookingCode}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {booking.user?.name || "Guest"} • {booking.seats} seats
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="status-pill approved text-xs">Checked In</span>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {booking.checkedInAt ? formatTime(booking.checkedInAt) : "-"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {renderConfirmModal()}
    </div>
  );
}

export default CheckInDesk;