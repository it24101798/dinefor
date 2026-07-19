import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import FeedCard from "../components/FeedCard";
import SkeletonCard from "../components/shared/SkeletonCard";


const formatDate = (value) => {
  if (!value) return "Not selected";
  return new Date(value).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  });
};

const formatTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("en-US", { 
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

// ============================================
// MAIN COMPONENT
// ============================================
function CustomerDashboard() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  
  // ============================================
  // STATE
  // ============================================
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [activeTab, setActiveTab] = useState("overview");
  const [showWelcome, setShowWelcome] = useState(true);

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchDashboard = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      
      const res = await api.get("/customer/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setData(res.data);
      
      // Check if user is new (first login)
      const lastLogin = localStorage.getItem("dinefor_last_login");
      if (!lastLogin) {
        setShowWelcome(true);
        localStorage.setItem("dinefor_last_login", new Date().toISOString());
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to load dashboard.";
      setMessage(errorMsg);
      setMessageType("error");
      
      if (error.response?.status === 401) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ============================================
  // COMPUTED DATA
  // ============================================
  const stats = useMemo(() => data?.stats || {}, [data]);
  const upcoming = useMemo(() => data?.upcomingReservations || [], [data]);
  const savedBuffets = useMemo(() => data?.savedBuffets || [], [data]);
  const savedHotels = useMemo(() => data?.savedHotels || [], [data]);
  const recent = useMemo(() => data?.recentlyViewed || [], [data]);
  const notifications = useMemo(() => data?.notifications || [], [data]);
  const recommended = useMemo(() => data?.recommendedBuffets || [], [data]);
  const bookingHistory = useMemo(() => data?.bookingHistory || [], [data]);

  // ============================================
  // HANDLERS
  // ============================================
  const dismissWelcome = () => {
    setShowWelcome(false);
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await api.put(`/customer/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDashboard();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.put("/customer/notifications/read-all", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDashboard();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
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

  const renderEmpty = (title, text, icon = "inbox", action = null) => (
    <div className="text-center py-12">
      <span className="material-symbols-outlined text-5xl text-outline mb-3 block">{icon}</span>
      <h3 className="font-headline-md text-headline-md text-text-deep-green">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
      {action && (
        <Link to={action.to} className="btn-primary inline-flex items-center gap-2 mt-4">
          {action.label}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      )}
    </div>
  );

  const renderLoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-ambient p-4 h-24 animate-pulse bg-surface-container-low" />
        ))}
      </div>
      <SkeletonCard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );

  // ============================================
  // TAB RENDERERS
  // ============================================
  const renderWelcomeBanner = () => {
    if (!showWelcome) return null;

    return (
      <div className="card-ambient p-6 mb-6 bg-gradient-to-r from-secondary-container/20 to-primary-container/10 border-secondary/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-headline-md text-headline-md text-text-deep-green">
              Welcome back, {data?.user?.name || user?.name || "Guest"}! 👋
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Here's what's happening with your dining experiences.
            </p>
          </div>
          <button
            onClick={dismissWelcome}
            className="btn-outline text-sm"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  };

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Upcoming</p>
        <p className="font-headline-lg text-headline-lg text-highlight-gold">{stats.upcomingReservations || 0}</p>
        <p className="font-label-sm text-label-sm text-secondary">Reservations</p>
      </div>
      <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Total Bookings</p>
        <p className="font-headline-lg text-headline-lg text-text-deep-green">{stats.totalReservations || 0}</p>
        <p className="font-label-sm text-label-sm text-on-surface-variant">All time</p>
      </div>
      <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Saved Buffets</p>
        <p className="font-headline-lg text-headline-lg text-text-deep-green">{stats.savedBuffets || 0}</p>
        <p className="font-label-sm text-label-sm text-secondary">Wishlist</p>
      </div>
      <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Favourite Hotels</p>
        <p className="font-headline-lg text-headline-lg text-text-deep-green">{stats.savedHotels || 0}</p>
        <p className="font-label-sm text-label-sm text-secondary">Saved</p>
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <Link to="/feed" className="btn-secondary flex items-center justify-center gap-2 p-4">
        <span className="material-symbols-outlined text-[20px]">search</span>
        Discover
      </Link>
      <Link to="/my-bookings" className="btn-outline flex items-center justify-center gap-2 p-4">
        <span className="material-symbols-outlined text-[20px]">event_seat</span>
        My Bookings
      </Link>
      <Link to="/saved" className="btn-outline flex items-center justify-center gap-2 p-4">
        <span className="material-symbols-outlined text-[20px]">bookmark</span>
        Saved
      </Link>
      <Link to="/profile" className="btn-outline flex items-center justify-center gap-2 p-4">
        <span className="material-symbols-outlined text-[20px]">person</span>
        Profile
      </Link>
    </div>
  );

  const renderUpcomingReservations = () => (
    <div className="card-ambient p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-headline-md text-headline-md text-text-deep-green">
          Upcoming Reservations
        </h2>
        <Link to="/my-bookings" className="text-label-sm text-label-sm text-secondary hover:underline">
          View All
        </Link>
      </div>

      {upcoming.length === 0 ? (
        renderEmpty(
          "No upcoming reservations",
          "Start exploring buffets and make your first reservation!",
          "event_busy",
          { to: "/feed", label: "Browse Buffets" }
        )
      ) : (
        <div className="space-y-3">
          {upcoming.slice(0, 3).map((booking) => (
            <Link
              key={booking._id}
              to="/my-bookings"
              className="block p-4 rounded-xl border border-border-subtle hover:border-secondary transition-all hover:bg-surface-container-low"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <p className="font-label-md text-label-md text-text-deep-green">
                    {booking.buffet?.title || "Buffet Reservation"}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {booking.buffet?.hotel?.hotelName || "Hotel"}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      📅 {formatDate(booking.selectedDate)}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      ⏰ {booking.selectedTimeSlot?.startTime} - {booking.selectedTimeSlot?.endTime}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      👥 {booking.seats} guests
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`status-pill ${getStatusColor(booking.bookingStatus)}`}>
                    {booking.bookingStatus}
                  </span>
                  <p className="font-label-sm text-label-sm text-highlight-gold mt-1">
                    Rs. {Number(booking.totalAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const renderNotifications = () => (
    <div className="card-ambient p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-headline-md text-headline-md text-text-deep-green">
          Notifications
          {notifications.filter(n => !n.isRead).length > 0 && (
            <span className="ml-2 text-xs bg-error text-white px-2 py-0.5 rounded-full">
              {notifications.filter(n => !n.isRead).length} new
            </span>
          )}
        </h2>
        {notifications.length > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="text-label-sm text-label-sm text-secondary hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant text-center py-4">
          No notifications yet.
        </p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {notifications.slice(0, 5).map((item) => (
            <div
              key={item._id}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                !item.isRead
                  ? "border-secondary/30 bg-secondary-container/10 hover:bg-secondary-container/20"
                  : "border-border-subtle hover:bg-surface-container-low"
              }`}
              onClick={() => markNotificationRead(item._id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-label-md text-label-md text-text-deep-green">
                    {item.title}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {item.message}
                  </p>
                  <p className="font-label-xs text-label-sm text-outline mt-1">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
                {!item.isRead && (
                  <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0 mt-2" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSavedBuffets = () => (
    savedBuffets.length > 0 && (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-headline-md text-headline-md text-text-deep-green">
            Saved Buffets
          </h2>
          <Link to="/saved" className="text-label-sm text-label-sm text-secondary hover:underline">
            View All ({savedBuffets.length})
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedBuffets.slice(0, 3).map((buffet) => (
            <FeedCard key={buffet._id} buffet={buffet} />
          ))}
        </div>
      </div>
    )
  );

  const renderRecommended = () => (
    recommended.length > 0 && (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-headline-md text-headline-md text-text-deep-green">
            Recommended for You
          </h2>
          <Link to="/feed" className="text-label-sm text-label-sm text-secondary hover:underline">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommended.slice(0, 3).map((buffet) => (
            <FeedCard key={buffet._id} buffet={buffet} />
          ))}
        </div>
      </div>
    )
  );

  const renderRecentlyViewed = () => (
    recent.length > 0 && (
      <div className="card-ambient p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-headline-md text-headline-md text-text-deep-green">
            Recently Viewed
          </h2>
          <Link to="/recently-viewed" className="text-label-sm text-label-sm text-secondary hover:underline">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {recent.slice(0, 4).map((item) => (
            <Link
              key={item._id}
              to={item.itemType === "hotel" ? `/hotels/${item.item?._id}` : `/buffets/${item.item?._id}`}
              className="p-3 rounded-xl border border-border-subtle hover:border-secondary transition-all text-center"
            >
              <span className="material-symbols-outlined text-3xl text-secondary block mb-2">
                {item.itemType === "hotel" ? "hotel" : "restaurant"}
              </span>
              <p className="font-label-sm text-label-sm text-text-deep-green truncate">
                {item.item?.hotelName || item.item?.title || "Item"}
              </p>
              <p className="font-label-xs text-label-sm text-on-surface-variant">
                {formatDate(item.viewedAt)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    )
  );

  const renderBookingHistory = () => (
    bookingHistory.length > 0 && (
      <div className="card-ambient p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-headline-md text-headline-md text-text-deep-green">
            Booking History
          </h2>
          <Link to="/my-bookings" className="text-label-sm text-label-sm text-secondary hover:underline">
            View All
          </Link>
        </div>
        <div className="space-y-2">
          {bookingHistory.slice(0, 3).map((booking) => (
            <div
              key={booking._id}
              className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 p-3 rounded-xl border border-border-subtle"
            >
              <div>
                <p className="font-label-md text-label-md text-text-deep-green">
                  {booking.buffet?.title || "Buffet"}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {formatDate(booking.selectedDate)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`status-pill ${getStatusColor(booking.bookingStatus)}`}>
                  {booking.bookingStatus}
                </span>
                <p className="font-label-sm text-label-sm text-highlight-gold">
                  Rs. {Number(booking.totalAmount || 0).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  );

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
              You need to be logged in to view your dashboard.
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

  if (loading) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          {renderLoadingSkeleton()}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green">
            Hello {data?.user?.name || user?.name || "Guest"} 👋
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Welcome back to your DineFor dashboard.
          </p>
        </div>

        {renderMessage()}
        {renderWelcomeBanner()}
        {renderStats()}
        {renderQuickActions()}
        {renderUpcomingReservations()}
        {renderNotifications()}
        {renderSavedBuffets()}
        {renderRecommended()}
        {renderRecentlyViewed()}
        {renderBookingHistory()}
      </div>
    </main>
  );
}

export default CustomerDashboard;