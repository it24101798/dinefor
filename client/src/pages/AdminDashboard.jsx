import React, { useEffect, useMemo, useState, useCallback } from "react";
import api, { getServerBaseUrl } from "../services/api";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import HomeCMSPanel from "../components/admin/HomeCMSPanel";
import ReviewModerationPanel from "../components/admin/ReviewModerationPanel";
import AdminAnalyticsPanel from "../components/analytics/AdminAnalyticsPanel";
import AdminFinancePanel from "../components/payments/AdminFinancePanel";
import AdminUserManager from "../components/admin/AdminUserManager";

const API_SERVER = getServerBaseUrl();

// ============================================
// SECTION CONFIGURATION
// ============================================
const adminSections = [
  { key: "overview", label: "Overview", icon: "dashboard", path: "/admin" },
  { key: "hotels", label: "Hotel Applications", icon: "domain_verification", path: "/admin/hotels" },
  { key: "users", label: "Users", icon: "group", path: "/admin/users" },
  { key: "featured", label: "Featured Buffets", icon: "restaurant", path: "/admin/featured" },
  { key: "bookings", label: "Bookings", icon: "event_available", path: "/admin/bookings" },
  { key: "homepage", label: "Homepage CMS", icon: "web", path: "/admin/homepage" },
  { key: "reviews", label: "Reviews", icon: "rate_review", path: "/admin/reviews" },
  { key: "analytics", label: "Analytics", icon: "monitoring", path: "/admin/analytics" },
  { key: "finance", label: "Finance", icon: "payments", path: "/admin/finance" },
  { key: "settings", label: "Settings", icon: "settings", path: "/admin/settings" },
];

const statusLabels = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
  need_more_info: "Need More Info",
  hold: "Hold",
};

const bookingStatusLabels = {
  all: "All",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  pending: "Pending",
};

const paymentStatusLabels = {
  all: "All",
  paid: "Paid",
  unpaid: "Unpaid",
  refunded: "Refunded",
  pending: "Pending",
  failed: "Failed",
};

const statusFilters = Object.keys(statusLabels);
const bookingStatusFilters = Object.keys(bookingStatusLabels);
const paymentStatusFilters = Object.keys(paymentStatusLabels);

// ============================================
// HELPER FUNCTIONS
// ============================================
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("dineforUser"));
  } catch {
    return null;
  }
}

function hotelStatus(hotel) {
  return hotel?.status || (hotel?.isApproved ? "approved" : "pending");
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function safeDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function formatDateShort(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-LK")}`;
}

function getStatusColor(status) {
  const colors = {
    approved: "approved",
    pending: "pending",
    rejected: "rejected",
    suspended: "suspended",
    need_more_info: "pending",
    hold: "hold",
    confirmed: "approved",
    checked_in: "approved",
    completed: "approved",
    cancelled: "rejected",
    no_show: "rejected",
    paid: "approved",
    unpaid: "pending",
    refunded: "rejected",
    failed: "rejected",
  };
  return colors[status] || "pending";
}

// ============================================
// MAIN COMPONENT
// ============================================
function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const token = user?.token;
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // ============================================
  // STATE
  // ============================================
  // Data states
  const [hotels, setHotels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [buffets, setBuffets] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Filter states
  const [hotelFilter, setHotelFilter] = useState("all");
  const [hotelSearch, setHotelSearch] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [sortBy, setSortBy] = useState("newest");

  // Modal states
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedBuffet, setSelectedBuffet] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [moderationNote, setModerationNote] = useState("");
  const [featuredDays, setFeaturedDays] = useState("7");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Analytics states
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("month");

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchAll = useCallback(async () => {
    if (!token) {
      setMessage("Admin login token missing. Please login again.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setMessageType("info");

      const [
        hotelsRes,
        bookingsRes,
        buffetsRes,
        usersRes,
        reviewsRes,
        paymentsRes,
        analyticsRes,
      ] = await Promise.allSettled([
        api.get(`/hotels`, { headers }),
        api.get(`/bookings`, { headers }),
        api.get(`/buffets`),
        api.get(`/users/admin/all`, { headers }),
        api.get(`/reviews/admin/all`, { headers }),
        api.get(`/payments/admin-finance?period=${analyticsPeriod}&status=all`, { headers }),
        api.get(`/analytics/admin?period=${analyticsPeriod}`, { headers }),
      ]);

      if (hotelsRes.status === "fulfilled") setHotels(Array.isArray(hotelsRes.value.data) ? hotelsRes.value.data : []);
      if (bookingsRes.status === "fulfilled") setBookings(Array.isArray(bookingsRes.value.data) ? bookingsRes.value.data : []);
      if (buffetsRes.status === "fulfilled") setBuffets(Array.isArray(buffetsRes.value.data) ? buffetsRes.value.data : []);
      if (usersRes.status === "fulfilled") setUsers(Array.isArray(usersRes.value.data) ? usersRes.value.data : []);
      if (reviewsRes.status === "fulfilled") setReviews(Array.isArray(reviewsRes.value.data) ? reviewsRes.value.data : []);
      if (paymentsRes.status === "fulfilled") {
        const paymentPayload = paymentsRes.value.data;
        setPayments(Array.isArray(paymentPayload) ? paymentPayload : Array.isArray(paymentPayload?.payments) ? paymentPayload.payments : []);
      }
      if (analyticsRes.status === "fulfilled") setAnalyticsData(analyticsRes.value.data);

      const failed = [hotelsRes, bookingsRes, buffetsRes, usersRes, reviewsRes, paymentsRes].filter(
        (item) => item.status === "rejected"
      );
      if (failed.length) {
        setMessage("Some admin data could not load. Please check backend routes.");
        setMessageType("warning");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Admin dashboard failed to load.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, [token, headers, analyticsPeriod]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ============================================
  // SECTION DETECTION
  // ============================================
  const currentSection = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const section = parts[1] || "overview";
    return adminSections.find((s) => s.key === section) || adminSections[0];
  }, [location.pathname]);

  // ============================================
  // SUMMARY CALCULATIONS
  // ============================================
  const summary = useMemo(() => {
    const activeBookings = bookings.filter((b) => b.bookingStatus !== "cancelled" && b.bookingStatus !== "no_show");
    const confirmedBookings = bookings.filter((b) => b.bookingStatus === "confirmed");
    const checkedInBookings = bookings.filter((b) => b.bookingStatus === "checked_in");
    const completedBookings = bookings.filter((b) => b.bookingStatus === "completed");
    const cancelledBookings = bookings.filter((b) => b.bookingStatus === "cancelled");

    const totalRevenue = activeBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    const pendingRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    const collectedRevenue = checkedInBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0) +
      completedBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

    const pendingHotels = hotels.filter((h) => hotelStatus(h) === "pending");
    const approvedHotels = hotels.filter((h) => hotelStatus(h) === "approved");
    const rejectedHotels = hotels.filter((h) => hotelStatus(h) === "rejected");

    const featuredBuffets = buffets.filter((b) => b.isFeatured);
    const activeBuffets = buffets.filter((b) => b.status !== "inactive");

    const uniqueCustomers = new Set(bookings.map((b) => b.user?._id || b.user?.email).filter(Boolean));

    const totalReviews = reviews.length;
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
      : 0;

    const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pendingPayments = payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const completedPayments = payments.filter((p) => p.status === "paid" || p.status === "completed").reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      hotels: hotels.length,
      pendingHotels: pendingHotels.length,
      approvedHotels: approvedHotels.length,
      rejectedHotels: rejectedHotels.length,
      bookings: bookings.length,
      confirmedBookings: confirmedBookings.length,
      checkedInBookings: checkedInBookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings: cancelledBookings.length,
      customers: uniqueCustomers.size,
      revenue: totalRevenue,
      pendingRevenue: pendingRevenue,
      collectedRevenue: collectedRevenue,
      buffets: buffets.length,
      activeBuffets: activeBuffets.length,
      featuredBuffets: featuredBuffets.length,
      reviews: totalReviews,
      avgRating: avgRating,
      payments: payments.length,
      totalPayments: totalPayments,
      pendingPayments: pendingPayments,
      completedPayments: completedPayments,
    };
  }, [hotels, bookings, buffets, reviews, payments]);

  // ============================================
  // FILTERED DATA
  // ============================================
  const filteredHotels = useMemo(() => {
    let result = [...hotels];

    // Status filter
    if (hotelFilter !== "all") {
      result = result.filter((h) => hotelStatus(h) === hotelFilter);
    }

    // Search filter
    if (hotelSearch.trim()) {
      const q = hotelSearch.toLowerCase().trim();
      result = result.filter((h) =>
        [h.hotelName, h.location, h.city, h.district, h.province, h.owner?.email, h.email, h.application?.applicationNumber]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        break;
      case "name":
        result.sort((a, b) => (a.hotelName || "").localeCompare(b.hotelName || ""));
        break;
      default:
        break;
    }

    return result;
  }, [hotels, hotelFilter, hotelSearch, sortBy]);

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (bookingStatus !== "all") {
      result = result.filter((b) => b.bookingStatus === bookingStatus);
    }

    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase().trim();
      result = result.filter((b) =>
        [b.bookingCode, b.user?.name, b.user?.email, b.buffet?.title, b.buffet?.hotel?.hotelName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (dateRange.start) {
      result = result.filter((b) => new Date(b.selectedDate || b.createdAt) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      result = result.filter((b) => new Date(b.selectedDate || b.createdAt) <= new Date(dateRange.end));
    }

    result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return result;
  }, [bookings, bookingStatus, bookingSearch, dateRange]);

  // ============================================
  // ACTIONS
  // ============================================
  const updateHotelStatus = async (hotelId, action, note = moderationNote) => {
    try {
      const res = await api.put(
        `/hotels/${hotelId}/${action}`,
        { reviewNote: note },
        { headers }
      );
      setMessage(res.data.message || "Hotel updated successfully.");
      setMessageType("success");
      setSelectedHotel(null);
      setModerationNote("");
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || `Hotel ${action} action failed.`);
      setMessageType("error");
    }
  };

  const updateFeaturedBuffet = async (buffetId, isFeatured) => {
    try {
      const until = new Date();
      until.setDate(until.getDate() + Number(featuredDays || 7));

      await api.put(
        `/buffets/${buffetId}/featured`,
        isFeatured ? { isFeatured: true, featuredUntil: until.toISOString() } : { isFeatured: false },
        { headers }
      );
      setMessage(isFeatured ? `Buffet featured for ${featuredDays} days.` : "Featured placement removed.");
      setMessageType("success");
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Featured buffet update failed.");
      setMessageType("error");
    }
  };

  const deleteHotel = async (hotelId) => {
    try {
      await api.delete(`/hotels/${hotelId}`, { headers });
      setMessage("Hotel deleted successfully.");
      setMessageType("success");
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete hotel.");
      setMessageType("error");
    }
  };

  const deleteBooking = async (bookingId) => {
    try {
      await api.delete(`/bookings/${bookingId}`, { headers });
      setMessage("Booking deleted successfully.");
      setMessageType("success");
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete booking.");
      setMessageType("error");
    }
  };

  const deleteReview = async (reviewId) => {
    try {
      await api.delete(`/reviews/${reviewId}`, { headers });
      setMessage("Review deleted successfully.");
      setMessageType("success");
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete review.");
      setMessageType("error");
    }
  };

  const updateReviewStatus = async (reviewId, action) => {
    try {
      await api.put(
        `/reviews/${reviewId}/status`,
        {},
        { headers }
      );
      setMessage(`Review ${action}ed successfully.`);
      setMessageType("success");
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update review.");
      setMessageType("error");
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

  const renderEmpty = (title, text, icon = "inbox") => (
    <div className="text-center py-12">
      <span className="material-symbols-outlined text-5xl text-outline mb-3 block">{icon}</span>
      <h3 className="font-headline-md text-headline-md text-text-deep-green">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
    </div>
  );

  const renderLoading = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-pulse">
          <span className="material-symbols-outlined text-5xl text-secondary mb-3 block">sync</span>
          <p className="font-headline-md text-headline-md text-text-deep-green">Loading admin system...</p>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">Please wait while data loads.</p>
      </div>
    </div>
  );

  // ============================================
  // MODAL RENDERERS
  // ============================================
  const renderHotelModal = () => {
    if (!selectedHotel) return null;
    const h = selectedHotel;
    const app = h.application || {};

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedHotel(null)}>
        <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className={`status-pill ${getStatusColor(hotelStatus(h))}`}>
                {statusLabels[hotelStatus(h)] || hotelStatus(h)}
              </span>
              <h3 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">{h.hotelName}</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{app.applicationNumber || "No application number"}</p>
            </div>
            <button onClick={() => setSelectedHotel(null)} className="text-on-surface-variant hover:text-text-deep-green">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Owner Email</p>
              <p className="font-body-md text-body-md text-text-deep-green">{h.owner?.email || h.email || "-"}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Location</p>
              <p className="font-body-md text-body-md text-text-deep-green">{h.city || h.location || "-"}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Manager</p>
              <p className="font-body-md text-body-md text-text-deep-green">{app.managerName || "-"}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Phone</p>
              <p className="font-body-md text-body-md text-text-deep-green">{app.managerPhone || h.contactNumber || "-"}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Business Name</p>
              <p className="font-body-md text-body-md text-text-deep-green">{app.legalBusinessName || "-"}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">BR Number</p>
              <p className="font-body-md text-body-md text-text-deep-green">{app.businessRegistrationNumber || "-"}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Category</p>
              <p className="font-body-md text-body-md text-text-deep-green">{app.hotelCategory || "-"}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Capacity</p>
              <p className="font-body-md text-body-md text-text-deep-green">{app.buffetCapacity || 0} seats</p>
            </div>
          </div>

          {app.documents?.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-surface-container-low">
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-2">Documents</p>
              <div className="flex flex-wrap gap-2">
                {app.documents.map((doc, i) => (
                  <a key={i} href={doc} target="_blank" rel="noreferrer" className="btn-outline text-sm py-1 px-3">
                    Document {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">Admin Note</p>
            <textarea
              value={moderationNote}
              onChange={(e) => setModerationNote(e.target.value)}
              placeholder="Add a note for the hotel partner..."
              className="form-textarea w-full"
              rows="3"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => updateHotelStatus(h._id, "approve")} className="btn-secondary">Approve</button>
            <button onClick={() => updateHotelStatus(h._id, "request-info")} className="btn-outline">Request Info</button>
            <button onClick={() => updateHotelStatus(h._id, "hold")} className="btn-outline">Hold</button>
            <button onClick={() => updateHotelStatus(h._id, "reject")} className="bg-error/10 text-error px-4 py-2 rounded-full hover:bg-error/20">Reject</button>
            <button
              onClick={() => {
                setDeleteTarget({ type: "hotel", id: h._id, name: h.hotelName });
                setShowDeleteConfirm(true);
              }}
              className="bg-error/10 text-error px-4 py-2 rounded-full hover:bg-error/20"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmModal = () => {
    if (!showDeleteConfirm || !deleteTarget) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
        <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-headline-md text-headline-md text-text-deep-green mb-2">Confirm Delete</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            Are you sure you want to delete this {deleteTarget.type}? <strong>"{deleteTarget.name}"</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-outline flex-1">Cancel</button>
            <button
              onClick={() => {
                if (deleteTarget.type === "hotel") deleteHotel(deleteTarget.id);
                else if (deleteTarget.type === "booking") deleteBooking(deleteTarget.id);
                else if (deleteTarget.type === "review") deleteReview(deleteTarget.id);
              }}
              className="bg-error text-white px-4 py-2 rounded-full hover:bg-error/80 flex-1"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // SECTION RENDERERS
  // ============================================
  const renderOverview = () => (
    <>
      <div className="mb-8">
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Dashboard Overview</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">High-level metrics and recent moderation tasks.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
        <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Hotels</p>
          <p className="font-headline-lg text-headline-lg text-text-deep-green">{summary.hotels}</p>
          <p className="font-label-sm text-label-sm text-secondary">{summary.pendingHotels} pending</p>
        </div>
        <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Bookings</p>
          <p className="font-headline-lg text-headline-lg text-text-deep-green">{summary.bookings}</p>
          <p className="font-label-sm text-label-sm text-secondary">{summary.confirmedBookings} confirmed</p>
        </div>
        <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow bg-gradient-to-br from-surface-container-lowest to-surface-container-low">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Revenue</p>
          <p className="font-headline-md text-headline-md text-highlight-gold">{money(summary.revenue)}</p>
          <p className="font-label-sm text-label-sm text-secondary">Collected: {money(summary.collectedRevenue)}</p>
        </div>
        <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Buffets</p>
          <p className="font-headline-lg text-headline-lg text-text-deep-green">{summary.buffets}</p>
          <p className="font-label-sm text-label-sm text-secondary">{summary.featuredBuffets} featured</p>
        </div>
        <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Customers</p>
          <p className="font-headline-lg text-headline-lg text-text-deep-green">{summary.customers}</p>
        </div>
        <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Reviews</p>
          <p className="font-headline-lg text-headline-lg text-text-deep-green">{summary.reviews}</p>
          <p className="font-label-sm text-label-sm text-secondary">⭐ {summary.avgRating.toFixed(1)} avg</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Hotels */}
        <div className="card-ambient p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Pending Hotel Applications</h3>
            <button
              onClick={() => navigate("/admin/hotels")}
              className="text-label-sm text-label-sm text-secondary hover:underline"
            >
              View All ({summary.pendingHotels})
            </button>
          </div>
          {hotels.filter((h) => hotelStatus(h) === "pending").slice(0, 5).map((h) => (
            <button
              key={h._id}
              onClick={() => setSelectedHotel(h)}
              className="w-full text-left p-3 rounded-xl border border-border-subtle hover:border-secondary transition-all mb-2 hover:bg-surface-container-low"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-label-md text-label-md text-text-deep-green">{h.hotelName}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{h.city || h.location || "Location not added"}</p>
                </div>
                <span className="status-pill pending">Pending</span>
              </div>
            </button>
          ))}
          {!summary.pendingHotels && renderEmpty("No pending hotels", "All hotel applications are currently reviewed.", "check_circle")}
        </div>

        {/* Recent Bookings */}
        <div className="card-ambient p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Recent Bookings</h3>
            <button
              onClick={() => navigate("/admin/bookings")}
              className="text-label-sm text-label-sm text-secondary hover:underline"
            >
              View All ({summary.bookings})
            </button>
          </div>
          {bookings.slice(0, 5).map((b) => (
            <div key={b._id} className="p-3 rounded-xl border border-border-subtle mb-2 hover:bg-surface-container-low transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-label-md text-label-md text-text-deep-green">{b.buffet?.title || "Buffet"}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{b.user?.name || "Customer"} • {formatDateShort(b.selectedDate)}</p>
                </div>
                <span className={`status-pill ${getStatusColor(b.bookingStatus)}`}>{b.bookingStatus}</span>
              </div>
            </div>
          ))}
          {!bookings.length && renderEmpty("No bookings yet", "Bookings will appear here once customers reserve buffets.", "event_busy")}
        </div>
      </div>
    </>
  );

  const renderHotels = () => (
    <>
      <div className="mb-6">
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Hotel Applications</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Approve, reject, hold, suspend, or request more information from hotel partners.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={hotelSearch}
          onChange={(e) => setHotelSearch(e.target.value)}
          placeholder="Search hotel, city, owner email..."
          className="form-input flex-1 min-w-[200px]"
        />
        <select value={hotelFilter} onChange={(e) => setHotelFilter(e.target.value)} className="form-select w-auto">
          {statusFilters.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-select w-auto">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Alphabetical</option>
        </select>
        <button onClick={() => { setHotelSearch(""); setHotelFilter("all"); }} className="btn-outline">Reset</button>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statusFilters.map((status) => (
          <button
            key={status}
            onClick={() => setHotelFilter(status)}
            className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all ${
              hotelFilter === status
                ? "bg-secondary text-surface-cream"
                : "border border-border-subtle hover:border-secondary"
            }`}
          >
            {statusLabels[status]} ({status === "all" ? hotels.length : hotels.filter((h) => hotelStatus(h) === status).length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card-ambient overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Hotel</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Location</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Contact</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHotels.map((h) => (
                <tr key={h._id} className="border-t border-border-subtle hover:bg-surface-container-low/50">
                  <td className="p-4">
                    <p className="font-label-md text-label-md text-text-deep-green">{h.hotelName}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{h.owner?.email || h.email || "-"}</p>
                  </td>
                  <td className="p-4 text-on-surface-variant">{h.city || h.location || "-"}</td>
                  <td className="p-4 text-on-surface-variant">{h.contactNumber || "-"}</td>
                  <td className="p-4"><span className={`status-pill ${getStatusColor(hotelStatus(h))}`}>{statusLabels[hotelStatus(h)] || hotelStatus(h)}</span></td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-3"><button onClick={() => setSelectedHotel(h)} className="text-secondary hover:underline text-sm">Review</button><button onClick={() => navigate(`/admin/partnership/${h._id}`)} className="text-secondary hover:underline text-sm">Compliance</button></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredHotels.length && renderEmpty("No hotels found", "Change the search or status filter to view more hotel applications.")}
      </div>
    </>
  );

  const renderBookings = () => (
    <>
      <div className="mb-6">
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Booking Center</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Search and monitor reservations across all hotels.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={bookingSearch}
          onChange={(e) => setBookingSearch(e.target.value)}
          placeholder="Search code, customer, hotel..."
          className="form-input flex-1 min-w-[200px]"
        />
        <select value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)} className="form-select w-auto">
          {bookingStatusFilters.map((status) => <option key={status} value={status}>{bookingStatusLabels[status]}</option>)}
        </select>
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          className="form-input w-auto"
          placeholder="Start Date"
        />
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          className="form-input w-auto"
          placeholder="End Date"
        />
        <button onClick={() => { setBookingSearch(""); setBookingStatus("all"); setDateRange({ start: "", end: "" }); }} className="btn-outline">Reset</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-surface-container-low text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Total</p>
          <p className="font-headline-md text-headline-md text-text-deep-green">{summary.bookings}</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary-container/10 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Confirmed</p>
          <p className="font-headline-md text-headline-md text-secondary">{summary.confirmedBookings}</p>
        </div>
        <div className="p-3 rounded-xl bg-tertiary-container/10 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Checked In</p>
          <p className="font-headline-md text-headline-md text-tertiary">{summary.checkedInBookings}</p>
        </div>
        <div className="p-3 rounded-xl bg-error/10 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Cancelled</p>
          <p className="font-headline-md text-headline-md text-error">{summary.cancelledBookings}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card-ambient overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Booking</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Customer</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Buffet</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Date</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => (
                <tr key={b._id} className="border-t border-border-subtle hover:bg-surface-container-low/50">
                  <td className="p-4">
                    <p className="font-label-sm text-label-sm text-text-deep-green font-medium">{b.bookingCode}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{b.paymentStatus} / {b.paymentMethod}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-body-md text-body-md text-text-deep-green">{b.user?.name || "-"}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{b.user?.email || ""}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-body-md text-body-md text-text-deep-green">{b.buffet?.title || "-"}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{b.buffet?.hotel?.hotelName || ""}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-body-md text-body-md text-text-deep-green">{formatDateShort(b.selectedDate)}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{b.selectedTimeSlot?.startTime} - {b.selectedTimeSlot?.endTime}</p>
                  </td>
                  <td className="p-4 font-label-md text-label-md text-highlight-gold">{money(b.totalAmount)}</td>
                  <td className="p-4"><span className={`status-pill ${getStatusColor(b.bookingStatus)}`}>{b.bookingStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredBookings.length && renderEmpty("No bookings found", "Try another search or status filter.", "search_off")}
      </div>
    </>
  );

  const renderFeatured = () => (
    <>
      <div className="mb-6">
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Featured Buffets</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Promote selected buffets on feed, listings, and homepage sections.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={featuredDays} onChange={(e) => setFeaturedDays(e.target.value)} className="form-select w-auto">
          <option value="7">7 days</option>
          <option value="14">14 days</option>
          <option value="30">30 days</option>
          <option value="60">60 days</option>
        </select>
        <span className="font-label-sm text-label-sm text-on-surface-variant self-center">
          {summary.featuredBuffets} buffets featured
        </span>
      </div>

      <div className="card-ambient overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Buffet</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Hotel</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Price</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {buffets.map((b) => (
                <tr key={b._id} className="border-t border-border-subtle hover:bg-surface-container-low/50">
                  <td className="p-4">
                    <p className="font-label-md text-label-md text-text-deep-green">{b.title}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{b.category || b.buffetType}</p>
                  </td>
                  <td className="p-4 text-on-surface-variant">{b.hotel?.hotelName || "-"}</td>
                  <td className="p-4 font-label-md text-label-md text-text-deep-green">{money(b.price)}</td>
                  <td className="p-4"><span className={`status-pill ${b.isFeatured ? "approved" : "pending"}`}>{b.isFeatured ? "Featured" : "Normal"}</span></td>
                  <td className="p-4 flex flex-wrap gap-2">
                    {!b.isFeatured && (
                      <button onClick={() => updateFeaturedBuffet(b._id, true)} className="btn-secondary text-sm px-3 py-1">
                        Feature
                      </button>
                    )}
                    {b.isFeatured && (
                      <button onClick={() => updateFeaturedBuffet(b._id, false)} className="btn-outline text-sm px-3 py-1">
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!buffets.length && renderEmpty("No buffets found", "Hotels must create buffets before admin can feature them.", "restaurant")}
      </div>
    </>
  );

  const renderSettings = () => (
    <>
      <div className="mb-6">
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Settings</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">System configuration and controls.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-ambient p-6">
          <h3 className="font-headline-md text-headline-md text-text-deep-green mb-4">General Settings</h3>
          <div className="space-y-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Site Name</p>
              <p className="font-body-md text-body-md text-text-deep-green">DineFor</p>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Mode</p>
              <p className="font-body-md text-body-md text-text-deep-green">Local Development</p>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">API Base URL</p>
              <p className="font-body-md text-body-md text-text-deep-green">{API_SERVER}</p>
            </div>
          </div>
        </div>

        <div className="card-ambient p-6">
          <h3 className="font-headline-md text-headline-md text-text-deep-green mb-4">Payment Settings</h3>
          <div className="space-y-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Payment Method</p>
              <p className="font-body-md text-body-md text-text-deep-green">Pay at hotel</p>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Currency</p>
              <p className="font-body-md text-body-md text-text-deep-green">LKR (Rs.)</p>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Online Payments</p>
              <p className="font-body-md text-body-md text-text-deep-green">Coming soon</p>
            </div>
          </div>
        </div>

        <div className="card-ambient p-6 md:col-span-2">
          <h3 className="font-headline-md text-headline-md text-text-deep-green mb-4">Admin Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={fetchAll} className="btn-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh All Data
            </button>
            <button
              onClick={() => {
                if (window.confirm("Clear all cache? This will reload the dashboard.")) {
                  localStorage.removeItem("adminCache");
                  fetchAll();
                }
              }}
              className="btn-outline flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">clear_all</span>
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-cream pt-20">
        <div className="flex-1 p-6 md:p-8">{renderLoading()}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20">
      <div className="flex min-h-[calc(100vh-5rem)]">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 fixed left-0 top-20 h-[calc(100vh-5rem)] bg-surface-container-lowest border-r border-border-subtle overflow-y-auto">
          <div className="p-6 border-b border-border-subtle">
            <h2 className="font-headline-md text-headline-md text-text-deep-green">Admin</h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Control Center</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="status-pill approved">Admin</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{user?.name || "User"}</span>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {adminSections.map((section) => (
              <NavLink
                key={section.key}
                to={section.path}
                end={section.path === "/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-secondary-container/20 text-secondary font-semibold border-r-4 border-secondary"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-text-deep-green"
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{section.icon}</span>
                <span className="font-label-md text-label-md flex-1">{section.label}</span>
                {section.key === "hotels" && summary.pendingHotels > 0 && (
                  <span className="bg-error text-white text-xs px-2 py-0.5 rounded-full">{summary.pendingHotels}</span>
                )}
                {section.key === "bookings" && summary.confirmedBookings > 0 && (
                  <span className="bg-secondary text-white text-xs px-2 py-0.5 rounded-full">{summary.confirmedBookings}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-border-subtle">
            <button onClick={fetchAll} className="btn-outline w-full flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 md:ml-64 p-4 sm:p-6 md:p-8">
          <nav className="df-mobile-section-tabs md:hidden" aria-label="Admin sections">
            {adminSections.map((section) => (
              <NavLink key={section.key} to={section.path} end={section.path === "/admin"} className={({ isActive }) => `df-mobile-section-tab ${isActive ? "is-active" : ""}`}>
                <span className="material-symbols-outlined">{section.icon}</span><span>{section.label}</span>
              </NavLink>
            ))}
          </nav>
          {renderMessage()}
          {renderHotelModal()}
          {renderDeleteConfirmModal()}

          {currentSection.key === "overview" && renderOverview()}
          {currentSection.key === "hotels" && renderHotels()}
          {currentSection.key === "users" && <AdminUserManager users={users} onChanged={fetchAll} />}
          {currentSection.key === "bookings" && renderBookings()}
          {currentSection.key === "featured" && renderFeatured()}
          {currentSection.key === "settings" && renderSettings()}

          {currentSection.key === "homepage" && <HomeCMSPanel />}
          {currentSection.key === "reviews" && <ReviewModerationPanel />}
          {currentSection.key === "analytics" && <AdminAnalyticsPanel />}
          {currentSection.key === "finance" && <AdminFinancePanel />}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;