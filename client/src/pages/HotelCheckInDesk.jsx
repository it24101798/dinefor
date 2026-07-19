import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import CheckInDesk from "../components/hotel/CheckInDesk";


const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

// ============================================
// MAIN COMPONENT
// ============================================
function HotelCheckInDesk() {
  const navigate = useNavigate();

  // ============================================
  // STATE
  // ============================================
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    checkedIn: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
  });

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
      const res = await api.get(`/bookings/hotel-bookings`, { headers });
      const data = Array.isArray(res.data) ? res.data : [];
      setBookings(data);

      // Calculate stats
      setStats({
        total: data.length,
        confirmed: data.filter((b) => b.bookingStatus === "confirmed").length,
        checkedIn: data.filter((b) => b.bookingStatus === "checked_in").length,
        completed: data.filter((b) => b.bookingStatus === "completed").length,
        cancelled: data.filter((b) => b.bookingStatus === "cancelled").length,
        pending: data.filter((b) => b.bookingStatus === "pending").length,
      });
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to load check-in desk.";
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

    if (filterStatus !== "all") {
      result = result.filter((b) => b.bookingStatus === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((b) =>
        [b.bookingCode, b.user?.name, b.user?.email, b.buffet?.title, b.buffet?.hotel?.hotelName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    // Sort by date (soonest first)
    result.sort((a, b) => new Date(a.selectedDate || 0) - new Date(b.selectedDate || 0));

    return result;
  }, [bookings, filterStatus, searchQuery]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleBookingAction = async (bookingId, action) => {
    try {
      const res = await api.put(
        `/bookings/${bookingId}/${action}`,
        {},
        { headers }
      );
      setMessage(res.data.message || `Booking ${action}ed successfully.`);
      setMessageType("success");
      await fetchBookings();
    } catch (error) {
      const errorMsg = error.response?.data?.message || `Failed to ${action} booking.`;
      setMessage(errorMsg);
      setMessageType("error");
    }
  };

  const viewBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetails(true);
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
          <p className="font-headline-md text-headline-md text-text-deep-green">Loading check-in desk...</p>
        </div>
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
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
        <p className="font-label-sm text-label-sm text-on-surface-variant">Cancelled</p>
        <p className="font-headline-md text-headline-md text-error">{stats.cancelled}</p>
      </div>
      <div className="p-3 rounded-xl bg-highlight-gold/10 text-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Pending</p>
        <p className="font-headline-md text-headline-md text-highlight-gold">{stats.pending}</p>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="flex-1 min-w-[200px]">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by code, customer, buffet..."
          className="form-input w-full"
        />
      </div>
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className="form-select w-auto"
      >
        <option value="all">All Status</option>
        <option value="confirmed">Confirmed</option>
        <option value="checked_in">Checked In</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="pending">Pending</option>
        <option value="no_show">No Show</option>
      </select>
      <button
        onClick={fetchBookings}
        className="btn-outline flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">refresh</span>
        Refresh
      </button>
    </div>
  );

  const renderBookingTable = () => (
    <div className="card-ambient overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Booking
              </th>
              <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Customer
              </th>
              <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Buffet
              </th>
              <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Date/Time
              </th>
              <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Seats
              </th>
              <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Status
              </th>
              <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking._id} className="border-t border-border-subtle hover:bg-surface-container-low/50">
                <td className="p-4">
                  <p className="font-label-sm text-label-sm text-text-deep-green font-medium">
                    {booking.bookingCode}
                  </p>
                  <p className="font-label-xs text-label-sm text-on-surface-variant">
                    {formatDate(booking.createdAt)}
                  </p>
                </td>
                <td className="p-4">
                  <p className="font-body-md text-body-md text-text-deep-green">
                    {booking.user?.name || "Guest"}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {booking.user?.email || "No email"}
                  </p>
                </td>
                <td className="p-4">
                  <p className="font-body-md text-body-md text-text-deep-green">
                    {booking.buffet?.title || "N/A"}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {booking.buffet?.hotel?.hotelName || ""}
                  </p>
                </td>
                <td className="p-4">
                  <p className="font-body-md text-body-md text-text-deep-green">
                    {formatDate(booking.selectedDate)}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {booking.selectedTimeSlot?.startTime} - {booking.selectedTimeSlot?.endTime}
                  </p>
                </td>
                <td className="p-4 text-center">
                  <span className="font-label-md text-label-md text-text-deep-green">
                    {booking.seats}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`status-pill ${getStatusColor(booking.bookingStatus)}`}>
                    {booking.bookingStatus}
                  </span>
                  {booking.qrUsed && (
                    <span className="badge-gold text-xs ml-1">QR Used</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => viewBookingDetails(booking)}
                      className="text-secondary hover:underline text-sm"
                    >
                      View
                    </button>
                    {booking.bookingStatus === "confirmed" && !booking.qrUsed && (
                      <button
                        onClick={() => handleBookingAction(booking._id, "check-in")}
                        className="btn-secondary text-xs px-3 py-1"
                      >
                        Check In
                      </button>
                    )}
                    {booking.bookingStatus === "checked_in" && (
                      <button
                        onClick={() => handleBookingAction(booking._id, "complete")}
                        className="btn-secondary text-xs px-3 py-1"
                      >
                        Complete
                      </button>
                    )}
                    {!["cancelled", "no_show", "completed"].includes(booking.bookingStatus) && (
                      <button
                        onClick={() => handleBookingAction(booking._id, "cancel")}
                        className="bg-error/10 text-error text-xs px-3 py-1 rounded-full hover:bg-error/20"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredBookings.length === 0 && (
        <div className="text-center py-8">
          <p className="font-body-md text-body-md text-on-surface-variant">No bookings found.</p>
        </div>
      )}
    </div>
  );

  const renderBookingDetails = () => {
    if (!showDetails || !selectedBooking) return null;
    const b = selectedBooking;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDetails(false)}>
        <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Booking Details</h3>
            <button onClick={() => setShowDetails(false)} className="text-on-surface-variant hover:text-text-deep-green">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Booking Code</p>
              <p className="font-body-md text-body-md text-text-deep-green font-medium">{b.bookingCode}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Status</p>
              <span className={`status-pill ${getStatusColor(b.bookingStatus)}`}>{b.bookingStatus}</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Customer</p>
              <p className="font-body-md text-body-md text-text-deep-green">{b.user?.name || "Guest"}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{b.user?.email || "No email"}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Contact</p>
              <p className="font-body-md text-body-md text-text-deep-green">{b.user?.phone || "No phone"}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Buffet</p>
              <p className="font-body-md text-body-md text-text-deep-green">{b.buffet?.title || "N/A"}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{b.buffet?.hotel?.hotelName || ""}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Date & Time</p>
              <p className="font-body-md text-body-md text-text-deep-green">{formatDate(b.selectedDate)}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {b.selectedTimeSlot?.startTime} - {b.selectedTimeSlot?.endTime}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Seats</p>
              <p className="font-body-md text-body-md text-text-deep-green">{b.seats}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Total Amount</p>
              <p className="font-headline-md text-headline-md text-highlight-gold">
                Rs. {Number(b.grandTotal || b.totalAmount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-border-subtle">
            {b.bookingStatus === "confirmed" && !b.qrUsed && (
              <button
                onClick={() => {
                  handleBookingAction(b._id, "check-in");
                  setShowDetails(false);
                }}
                className="btn-secondary"
              >
                Check In
              </button>
            )}
            {b.bookingStatus === "checked_in" && (
              <button
                onClick={() => {
                  handleBookingAction(b._id, "complete");
                  setShowDetails(false);
                }}
                className="btn-secondary"
              >
                Complete
              </button>
            )}
            {!["cancelled", "no_show", "completed"].includes(b.bookingStatus) && (
              <button
                onClick={() => {
                  handleBookingAction(b._id, "cancel");
                  setShowDetails(false);
                }}
                className="bg-error/10 text-error px-4 py-2 rounded-full hover:bg-error/20"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                window.open(`/check-in/${b.bookingCode}`, "_blank");
              }}
              className="btn-outline"
            >
              View QR
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
              You need to be logged in as a hotel staff to access the check-in desk.
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-text-deep-green">QR Check-In Desk</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Verify bills, claim QR attendance, and manage reservations
              </p>
            </div>
            <Link
              to="/hotel"
              className="btn-outline flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Dashboard
            </Link>
          </div>
        </div>

        {renderMessage()}

        {loading ? (
          renderLoading()
        ) : (
          <>
            {renderStats()}
            {renderFilters()}

            {/* Check-in Desk Component */}
            <div className="mb-6">
              <CheckInDesk
                bookings={bookings}
                onChanged={fetchBookings}
                setMessage={(msg) => {
                  setMessage(msg);
                  setMessageType(msg.includes("success") ? "success" : "info");
                }}
              />
            </div>

            {renderBookingTable()}
            {renderBookingDetails()}
          </>
        )}
      </div>
    </main>
  );
}

export default HotelCheckInDesk;