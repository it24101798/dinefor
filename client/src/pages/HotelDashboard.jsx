import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import BuffetCreator from "../components/hotel/BuffetCreator";
import CheckInDesk from "../components/hotel/CheckInDesk";
import HotelMediaManager from "../components/hotel/HotelMediaManager";
import HotelProfileSettings from "../components/hotel/HotelProfileSettings";
import HotelReviewsWorkspace from "../components/hotel/HotelReviewsWorkspace";
import HotelAnalyticsPanel from "../components/analytics/HotelAnalyticsPanel";
import HotelFinancePanel from "../components/payments/HotelFinancePanel";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// ============================================
// SECTION CONFIGURATION
// ============================================
const hotelSections = [
  { key: "overview", label: "Overview", icon: "dashboard", path: "/hotel" },
  { key: "reservations", label: "Reservations", icon: "event_seat", path: "/hotel/reservations" },
  { key: "buffets", label: "Buffet Management", icon: "restaurant_menu", path: "/hotel/buffets" },
  { key: "create", label: "Create Buffet", icon: "add_circle", path: "/hotel/create" },
  { key: "media", label: "Media Library", icon: "image", path: "/hotel/media" },
  { key: "reviews", label: "Reviews", icon: "rate_review", path: "/hotel/reviews" },
  { key: "analytics", label: "Analytics", icon: "monitoring", path: "/hotel/analytics" },
  { key: "finance", label: "Finance", icon: "payments", path: "/hotel/finance" },
  { key: "check-in", label: "QR Check-In Desk", icon: "qr_code_scanner", path: "/hotel/check-in" },
  { key: "profile", label: "Hotel Profile", icon: "business", path: "/hotel/profile" },
  { key: "settings", label: "Settings", icon: "settings", path: "/hotel/settings" },
];

const bookingStatusLabels = {
  all: "All",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  pending: "Pending",
};

const buffetStatusLabels = {
  all: "All",
  active: "Active",
  inactive: "Inactive",
  draft: "Draft",
  featured: "Featured",
  sold_out: "Sold Out",
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function safeStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("dineforUser")) || null;
  } catch {
    return null;
  }
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getStatusColor(status) {
  const colors = {
    confirmed: "approved",
    checked_in: "approved",
    completed: "approved",
    cancelled: "rejected",
    no_show: "rejected",
    pending: "pending",
    active: "approved",
    inactive: "pending",
    draft: "pending",
    featured: "featured",
    sold_out: "rejected",
  };
  return colors[status] || "pending";
}

// ============================================
// MAIN COMPONENT
// ============================================
function HotelDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const storedUser = safeStoredUser();
  const token = storedUser?.token;
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // ============================================
  // STATE
  // ============================================
  // Data states
  const [hotel, setHotel] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [buffets, setBuffets] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Filter states
  const [bookingFilter, setBookingFilter] = useState("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [buffetFilter, setBuffetFilter] = useState("all");
  const [buffetSearch, setBuffetSearch] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [sortBy, setSortBy] = useState("newest");

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedBuffet, setSelectedBuffet] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCreateBuffet, setShowCreateBuffet] = useState(false);
  const [showEditBuffet, setShowEditBuffet] = useState(null);

  // Buffet form states
  const [buffetForm, setBuffetForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    buffetType: "regular",
    thumbnail: "",
    images: [],
    timeSlots: [{ startTime: "", endTime: "", totalSeats: "", availableSeats: "" }],
    availableFromDate: "",
    availableToDate: "",
    recurringDays: [],
    scheduleType: "daily",
    isFeatured: false,
    status: "draft",
    specialDate: "",
    highlights: [],
  });

  const [recurringOptions, setRecurringOptions] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });

  // ============================================
  // SECTION DETECTION
  // ============================================
  const currentSection = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const section = parts[1] || "overview";
    return hotelSections.find((s) => s.key === section) || hotelSections[0];
  }, [location.pathname]);

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchAll = useCallback(async () => {
    if (!token) {
      setMessage("Please login to access the hotel dashboard.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setMessageType("info");

      const [
        hotelRes,
        bookingsRes,
        buffetsRes,
        reviewsRes,
        paymentsRes,
        analyticsRes,
      ] = await Promise.allSettled([
        axios.get(`${API_BASE}/api/hotels/my-hotel`, { headers }),
        axios.get(`${API_BASE}/api/hotel-portal/reservations`, { headers }),
        axios.get(`${API_BASE}/api/hotel-portal/buffets`, { headers }),
        axios.get(`${API_BASE}/api/hotel-portal/reviews`, { headers }),
        axios.get(`${API_BASE}/api/hotel-portal/payments`, { headers }),
        axios.get(`${API_BASE}/api/hotel-portal/analytics`, { headers }),
      ]);

      if (hotelRes.status === "fulfilled") setHotel(hotelRes.value.data);
      if (bookingsRes.status === "fulfilled") setBookings(Array.isArray(bookingsRes.value.data) ? bookingsRes.value.data : []);
      if (buffetsRes.status === "fulfilled") setBuffets(Array.isArray(buffetsRes.value.data) ? buffetsRes.value.data : []);
      if (reviewsRes.status === "fulfilled") setReviews(Array.isArray(reviewsRes.value.data) ? reviewsRes.value.data : []);
      if (paymentsRes.status === "fulfilled") setPayments(Array.isArray(paymentsRes.value.data) ? paymentsRes.value.data : []);
      if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value.data);

      const failed = [hotelRes, bookingsRes, buffetsRes, reviewsRes, paymentsRes, analyticsRes].filter(
        (item) => item.status === "rejected"
      );
      if (failed.length) {
        setMessage("Some data could not load. Please refresh.");
        setMessageType("warning");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load hotel portal.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

    const activeBuffets = buffets.filter((b) => b.status === "active");
    const featuredBuffets = buffets.filter((b) => b.isFeatured);
    const draftBuffets = buffets.filter((b) => b.status === "draft");

    const totalReviews = reviews.length;
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
      : 0;

    const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pendingPayments = payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const uniqueCustomers = new Set(bookings.map((b) => b.user?._id || b.user?.email).filter(Boolean));

    return {
      bookings: bookings.length,
      confirmedBookings: confirmedBookings.length,
      checkedInBookings: checkedInBookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings: cancelledBookings.length,
      revenue: totalRevenue,
      pendingRevenue: pendingRevenue,
      collectedRevenue: collectedRevenue,
      buffets: buffets.length,
      activeBuffets: activeBuffets.length,
      featuredBuffets: featuredBuffets.length,
      draftBuffets: draftBuffets.length,
      reviews: totalReviews,
      avgRating: avgRating,
      customers: uniqueCustomers.size,
      payments: payments.length,
      totalPayments: totalPayments,
      pendingPayments: pendingPayments,
    };
  }, [bookings, buffets, reviews, payments]);

  // ============================================
  // FILTERED DATA
  // ============================================
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (bookingFilter !== "all") {
      result = result.filter((b) => b.bookingStatus === bookingFilter);
    }

    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase().trim();
      result = result.filter((b) =>
        [b.bookingCode, b.user?.name, b.user?.email, b.buffet?.title]
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
  }, [bookings, bookingFilter, bookingSearch, dateRange]);

  const filteredBuffets = useMemo(() => {
    let result = [...buffets];

    if (buffetFilter !== "all") {
      result = result.filter((b) => {
        if (buffetFilter === "featured") return b.isFeatured;
        return b.status === buffetFilter;
      });
    }

    if (buffetSearch.trim()) {
      const q = buffetSearch.toLowerCase().trim();
      result = result.filter((b) =>
        [b.title, b.category, b.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    result.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return result;
  }, [buffets, buffetFilter, buffetSearch]);

  // ============================================
  // ACTIONS
  // ============================================
  const updateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(
        `${API_BASE}/api/hotel-portal/bookings/${bookingId}/status`,
        { status },
        { headers }
      );
      setMessage(`Booking status updated to ${status}.`);
      setMessageType("success");
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update booking.");
      setMessageType("error");
    }
  };

  const deleteBooking = async (bookingId) => {
    try {
      await axios.delete(`${API_BASE}/api/hotel-portal/bookings/${bookingId}`, { headers });
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

  const deleteBuffet = async (buffetId) => {
    try {
      await axios.delete(`${API_BASE}/api/hotel-portal/buffets/${buffetId}`, { headers });
      setMessage("Buffet deleted successfully.");
      setMessageType("success");
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete buffet.");
      setMessageType("error");
    }
  };

  const updateBuffetStatus = async (buffetId, status) => {
    try {
      await axios.put(
        `${API_BASE}/api/hotel-portal/buffets/${buffetId}/status`,
        { status },
        { headers }
      );
      setMessage(`Buffet status updated to ${status}.`);
      setMessageType("success");
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update buffet.");
      setMessageType("error");
    }
  };

  const createBuffet = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...buffetForm,
        price: Number(buffetForm.price),
        timeSlots: buffetForm.timeSlots.map(slot => ({
          ...slot,
          totalSeats: Number(slot.totalSeats),
          availableSeats: Number(slot.availableSeats) || Number(slot.totalSeats),
        })),
        recurringDays: Object.keys(recurringOptions).filter(key => recurringOptions[key]),
      };

      await axios.post(`${API_BASE}/api/hotel-portal/buffets`, payload, { headers });
      setMessage("Buffet created successfully!");
      setMessageType("success");
      setShowCreateBuffet(false);
      setBuffetForm({
        title: "",
        description: "",
        price: "",
        category: "",
        buffetType: "regular",
        thumbnail: "",
        images: [],
        timeSlots: [{ startTime: "", endTime: "", totalSeats: "", availableSeats: "" }],
        availableFromDate: "",
        availableToDate: "",
        recurringDays: [],
        scheduleType: "daily",
        isFeatured: false,
        status: "draft",
        specialDate: "",
        highlights: [],
      });
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to create buffet.");
      setMessageType("error");
    }
  };

  const updateBuffet = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...buffetForm,
        price: Number(buffetForm.price),
        timeSlots: buffetForm.timeSlots.map(slot => ({
          ...slot,
          totalSeats: Number(slot.totalSeats),
          availableSeats: Number(slot.availableSeats) || Number(slot.totalSeats),
        })),
        recurringDays: Object.keys(recurringOptions).filter(key => recurringOptions[key]),
      };

      await axios.put(
        `${API_BASE}/api/hotel-portal/buffets/${showEditBuffet}`,
        payload,
        { headers }
      );
      setMessage("Buffet updated successfully!");
      setMessageType("success");
      setShowEditBuffet(null);
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update buffet.");
      setMessageType("error");
    }
  };

  const toggleFeatureBuffet = async (buffetId, isFeatured) => {
    try {
      await axios.put(
        `${API_BASE}/api/hotel-portal/buffets/${buffetId}/feature`,
        { isFeatured },
        { headers }
      );
      setMessage(isFeatured ? "Buffet featured!" : "Buffet unfeatured.");
      setMessageType("success");
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to toggle feature.");
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
          <p className="font-headline-md text-headline-md text-text-deep-green">Loading hotel portal...</p>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">Please wait while data loads.</p>
      </div>
    </div>
  );

  // ============================================
  // MODAL RENDERERS
  // ============================================
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
                if (deleteTarget.type === "booking") deleteBooking(deleteTarget.id);
                else if (deleteTarget.type === "buffet") deleteBuffet(deleteTarget.id);
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

  const renderCreateBuffetModal = () => {
    if (!showCreateBuffet) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateBuffet(false)}>
        <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-lg text-headline-lg text-text-deep-green">Create New Buffet</h3>
            <button onClick={() => setShowCreateBuffet(false)} className="text-on-surface-variant hover:text-text-deep-green">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={createBuffet} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Title *</label>
                <input
                  value={buffetForm.title}
                  onChange={(e) => setBuffetForm({ ...buffetForm, title: e.target.value })}
                  className="form-input w-full"
                  required
                />
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Price (Rs.) *</label>
                <input
                  type="number"
                  value={buffetForm.price}
                  onChange={(e) => setBuffetForm({ ...buffetForm, price: e.target.value })}
                  className="form-input w-full"
                  required
                />
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Category *</label>
                <select
                  value={buffetForm.category}
                  onChange={(e) => setBuffetForm({ ...buffetForm, category: e.target.value })}
                  className="form-select w-full"
                  required
                >
                  <option value="">Select Category</option>
                  <option>Breakfast</option>
                  <option>Lunch</option>
                  <option>Dinner</option>
                  <option>High Tea</option>
                  <option>Seafood</option>
                  <option>BBQ</option>
                  <option>Brunch</option>
                  <option>Weekend Buffet</option>
                </select>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Buffet Type</label>
                <select
                  value={buffetForm.buffetType}
                  onChange={(e) => setBuffetForm({ ...buffetForm, buffetType: e.target.value })}
                  className="form-select w-full"
                >
                  <option value="regular">Regular</option>
                  <option value="special">Special</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Description</label>
              <textarea
                value={buffetForm.description}
                onChange={(e) => setBuffetForm({ ...buffetForm, description: e.target.value })}
                className="form-textarea w-full"
                rows="3"
              />
            </div>

            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Highlights (comma separated)</label>
              <input
                value={buffetForm.highlights.join(", ")}
                onChange={(e) => setBuffetForm({ ...buffetForm, highlights: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                className="form-input w-full"
                placeholder="Fresh seafood, Live cooking, Premium desserts"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Available From</label>
                <input
                  type="date"
                  value={buffetForm.availableFromDate}
                  onChange={(e) => setBuffetForm({ ...buffetForm, availableFromDate: e.target.value })}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Available To</label>
                <input
                  type="date"
                  value={buffetForm.availableToDate}
                  onChange={(e) => setBuffetForm({ ...buffetForm, availableToDate: e.target.value })}
                  className="form-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Time Slots</label>
              {buffetForm.timeSlots.map((slot, index) => (
                <div key={index} className="flex flex-wrap gap-2 mb-2">
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => {
                      const newSlots = [...buffetForm.timeSlots];
                      newSlots[index].startTime = e.target.value;
                      setBuffetForm({ ...buffetForm, timeSlots: newSlots });
                    }}
                    className="form-input flex-1 min-w-[100px]"
                    placeholder="Start"
                  />
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => {
                      const newSlots = [...buffetForm.timeSlots];
                      newSlots[index].endTime = e.target.value;
                      setBuffetForm({ ...buffetForm, timeSlots: newSlots });
                    }}
                    className="form-input flex-1 min-w-[100px]"
                    placeholder="End"
                  />
                  <input
                    type="number"
                    value={slot.totalSeats}
                    onChange={(e) => {
                      const newSlots = [...buffetForm.timeSlots];
                      newSlots[index].totalSeats = e.target.value;
                      setBuffetForm({ ...buffetForm, timeSlots: newSlots });
                    }}
                    className="form-input w-24"
                    placeholder="Seats"
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newSlots = buffetForm.timeSlots.filter((_, i) => i !== index);
                        setBuffetForm({ ...buffetForm, timeSlots: newSlots });
                      }}
                      className="text-error hover:text-error/80"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setBuffetForm({
                  ...buffetForm,
                  timeSlots: [...buffetForm.timeSlots, { startTime: "", endTime: "", totalSeats: "", availableSeats: "" }]
                })}
                className="text-secondary hover:underline text-sm"
              >
                + Add Time Slot
              </button>
            </div>

            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Schedule Type</label>
              <select
                value={buffetForm.scheduleType}
                onChange={(e) => setBuffetForm({ ...buffetForm, scheduleType: e.target.value })}
                className="form-select w-full"
              >
                <option value="daily">Daily</option>
                <option value="selected_days">Selected Days</option>
                <option value="special">Special Date</option>
              </select>
            </div>

            {buffetForm.scheduleType === "selected_days" && (
              <div className="flex flex-wrap gap-3">
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                  <label key={day} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={recurringOptions[day]}
                      onChange={(e) => setRecurringOptions({ ...recurringOptions, [day]: e.target.checked })}
                      className="w-4 h-4 text-secondary focus:ring-secondary rounded"
                    />
                    <span className="font-label-sm text-label-sm text-text-deep-green capitalize">{day}</span>
                  </label>
                ))}
              </div>
            )}

            {buffetForm.scheduleType === "special" && (
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Special Date</label>
                <input
                  type="date"
                  value={buffetForm.specialDate}
                  onChange={(e) => setBuffetForm({ ...buffetForm, specialDate: e.target.value })}
                  className="form-input w-full"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
              <button type="button" onClick={() => setShowCreateBuffet(false)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary">Create Buffet</button>
            </div>
          </form>
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Welcome Back!</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {hotel?.hotelName || "Hotel"} • {formatDate(new Date())}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCreateBuffet(true)} className="btn-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Buffet
            </button>
            <button onClick={() => navigate("/hotel/check-in")} className="btn-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              QR Desk
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
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
          <p className="font-label-sm text-label-sm text-secondary">{summary.activeBuffets} active</p>
        </div>
        <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Featured</p>
          <p className="font-headline-lg text-headline-lg text-highlight-gold">{summary.featuredBuffets}</p>
          <p className="font-label-sm text-label-sm text-secondary">{summary.draftBuffets} draft</p>
        </div>
        <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Reviews</p>
          <p className="font-headline-lg text-headline-lg text-text-deep-green">{summary.reviews}</p>
          <p className="font-label-sm text-label-sm text-secondary">⭐ {summary.avgRating.toFixed(1)} avg</p>
        </div>
        <div className="card-ambient p-4 text-center hover:shadow-ambient-lg transition-shadow">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Customers</p>
          <p className="font-headline-lg text-headline-lg text-text-deep-green">{summary.customers}</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="card-ambient p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Recent Bookings</h3>
            <button
              onClick={() => navigate("/hotel/reservations")}
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
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{b.user?.name || "Guest"} • {formatDate(b.selectedDate)}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{b.bookingCode}</p>
                </div>
                <div className="text-right">
                  <span className={`status-pill ${getStatusColor(b.bookingStatus)}`}>{b.bookingStatus}</span>
                  <p className="font-label-sm text-label-sm text-highlight-gold mt-1">{money(b.totalAmount)}</p>
                </div>
              </div>
            </div>
          ))}
          {!bookings.length && renderEmpty("No bookings yet", "Bookings will appear here once customers reserve.", "event_busy")}
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="card-ambient p-6">
            <h3 className="font-headline-md text-headline-md text-text-deep-green mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowCreateBuffet(true)} className="btn-secondary flex items-center justify-center gap-2 p-4">
                <span className="material-symbols-outlined text-[20px]">add</span>
                Create Buffet
              </button>
              <button onClick={() => navigate("/hotel/check-in")} className="btn-outline flex items-center justify-center gap-2 p-4">
                <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                QR Desk
              </button>
              <button onClick={() => navigate("/hotel/reservations")} className="btn-outline flex items-center justify-center gap-2 p-4">
                <span className="material-symbols-outlined text-[20px]">event_seat</span>
                Reservations
              </button>
              <button onClick={() => navigate("/hotel/profile")} className="btn-outline flex items-center justify-center gap-2 p-4">
                <span className="material-symbols-outlined text-[20px]">settings</span>
                Profile
              </button>
            </div>
          </div>

          {/* Buffet Status */}
          <div className="card-ambient p-6">
            <h3 className="font-headline-md text-headline-md text-text-deep-green mb-4">Buffet Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded-lg bg-surface-container-low">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Active</span>
                <span className="font-label-md text-label-md text-secondary">{summary.activeBuffets}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-surface-container-low">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Featured</span>
                <span className="font-label-md text-label-md text-highlight-gold">{summary.featuredBuffets}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-surface-container-low">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Draft</span>
                <span className="font-label-md text-label-md text-tertiary">{summary.draftBuffets}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-surface-container-low">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Total</span>
                <span className="font-label-md text-label-md text-text-deep-green">{summary.buffets}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderReservations = () => (
    <>
      <div className="mb-6">
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Reservations</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Manage all your buffet reservations.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={bookingSearch}
          onChange={(e) => setBookingSearch(e.target.value)}
          placeholder="Search code, customer, buffet..."
          className="form-input flex-1 min-w-[200px]"
        />
        <select value={bookingFilter} onChange={(e) => setBookingFilter(e.target.value)} className="form-select w-auto">
          {Object.keys(bookingStatusLabels).map((status) => (
            <option key={status} value={status}>{bookingStatusLabels[status]}</option>
          ))}
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
        <button onClick={() => { setBookingSearch(""); setBookingFilter("all"); setDateRange({ start: "", end: "" }); }} className="btn-outline">
          Reset
        </button>
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
                <th className="text-left p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => (
                <tr key={b._id} className="border-t border-border-subtle hover:bg-surface-container-low/50">
                  <td className="p-4">
                    <p className="font-label-sm text-label-sm text-text-deep-green font-medium">{b.bookingCode}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{formatDate(b.createdAt)}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-body-md text-body-md text-text-deep-green">{b.user?.name || "-"}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{b.user?.email || ""}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-body-md text-body-md text-text-deep-green">{b.buffet?.title || "-"}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{b.selectedTimeSlot?.startTime} - {b.selectedTimeSlot?.endTime}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-body-md text-body-md text-text-deep-green">{formatDate(b.selectedDate)}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{b.seats} seats</p>
                  </td>
                  <td className="p-4 font-label-md text-label-md text-highlight-gold">{money(b.totalAmount)}</td>
                  <td className="p-4"><span className={`status-pill ${getStatusColor(b.bookingStatus)}`}>{b.bookingStatus}</span></td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {b.bookingStatus === "confirmed" && (
                        <button
                          onClick={() => updateBookingStatus(b._id, "checked_in")}
                          className="btn-secondary text-xs px-3 py-1"
                        >
                          Check In
                        </button>
                      )}
                      {b.bookingStatus === "checked_in" && (
                        <button
                          onClick={() => updateBookingStatus(b._id, "completed")}
                          className="btn-secondary text-xs px-3 py-1"
                        >
                          Complete
                        </button>
                      )}
                      {!["cancelled", "no_show", "completed"].includes(b.bookingStatus) && (
                        <button
                          onClick={() => updateBookingStatus(b._id, "cancelled")}
                          className="bg-error/10 text-error text-xs px-3 py-1 rounded-full hover:bg-error/20"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setDeleteTarget({ type: "booking", id: b._id, name: b.bookingCode });
                          setShowDeleteConfirm(true);
                        }}
                        className="text-on-surface-variant hover:text-error text-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredBookings.length && renderEmpty("No bookings found", "Try another search or status filter.", "search_off")}
      </div>
    </>
  );

  const renderBuffets = () => (
    <>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Buffet Management</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Create, manage, and promote your buffet offerings.</p>
          </div>
          <button onClick={() => setShowCreateBuffet(true)} className="btn-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Buffet
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={buffetSearch}
          onChange={(e) => setBuffetSearch(e.target.value)}
          placeholder="Search buffets..."
          className="form-input flex-1 min-w-[200px]"
        />
        <select value={buffetFilter} onChange={(e) => setBuffetFilter(e.target.value)} className="form-select w-auto">
          {Object.keys(buffetStatusLabels).map((status) => (
            <option key={status} value={status}>{buffetStatusLabels[status]}</option>
          ))}
        </select>
        <button onClick={() => { setBuffetSearch(""); setBuffetFilter("all"); }} className="btn-outline">Reset</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-surface-container-low text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Total</p>
          <p className="font-headline-md text-headline-md text-text-deep-green">{summary.buffets}</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary-container/10 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Active</p>
          <p className="font-headline-md text-headline-md text-secondary">{summary.activeBuffets}</p>
        </div>
        <div className="p-3 rounded-xl bg-highlight-gold/10 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Featured</p>
          <p className="font-headline-md text-headline-md text-highlight-gold">{summary.featuredBuffets}</p>
        </div>
        <div className="p-3 rounded-xl bg-tertiary-container/10 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Draft</p>
          <p className="font-headline-md text-headline-md text-tertiary">{summary.draftBuffets}</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBuffets.map((b) => (
          <div key={b._id} className="card-ambient-hover overflow-hidden">
            <div className="relative h-48">
              <img
                src={b.thumbnail || b.images?.[0] || "https://images.unsplash.com/photo-1555244162-803834f70033?w=400&h=300&fit=crop"}
                alt={b.title}
                className="w-full h-full object-cover"
              />
              {b.isFeatured && (
                <span className="absolute top-3 left-3 bg-highlight-gold text-text-deep-green px-3 py-1 rounded-full font-label-sm text-label-sm">
                  Featured
                </span>
              )}
              <span className={`absolute top-3 right-3 status-pill ${getStatusColor(b.status)}`}>
                {b.status || "Draft"}
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-headline-md text-headline-md text-text-deep-green">{b.title}</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{b.category}</p>
              <p className="font-headline-md text-headline-md text-highlight-gold mt-2">{money(b.price)}</p>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border-subtle">
                {!b.isFeatured && b.status === "active" && (
                  <button onClick={() => toggleFeatureBuffet(b._id, true)} className="text-highlight-gold text-sm hover:underline">
                    Feature
                  </button>
                )}
                {b.isFeatured && (
                  <button onClick={() => toggleFeatureBuffet(b._id, false)} className="text-on-surface-variant text-sm hover:underline">
                    Unfeature
                  </button>
                )}
                {b.status === "draft" && (
                  <button onClick={() => updateBuffetStatus(b._id, "active")} className="text-secondary text-sm hover:underline">
                    Publish
                  </button>
                )}
                {b.status === "active" && (
                  <button onClick={() => updateBuffetStatus(b._id, "inactive")} className="text-tertiary text-sm hover:underline">
                    Deactivate
                  </button>
                )}
                <button
                  onClick={() => {
                    setDeleteTarget({ type: "buffet", id: b._id, name: b.title });
                    setShowDeleteConfirm(true);
                  }}
                  className="text-error text-sm hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!filteredBuffets.length && renderEmpty("No buffets found", "Create your first buffet to get started.", "restaurant")}
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
            {hotel?.logo ? (
              <img src={hotel.logo} alt={hotel.hotelName} className="w-12 h-12 rounded-full object-cover mb-2" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-surface-cream font-headline-md text-xl mb-2">
                {hotel?.hotelName?.charAt(0) || "H"}
              </div>
            )}
            <h3 className="font-headline-md text-headline-md text-text-deep-green">{hotel?.hotelName || "Hotel Portal"}</h3>
            <span className={`status-pill ${getStatusColor(hotel?.status || "pending")}`}>
              {hotel?.status || "Draft"}
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span className="badge-gold">{summary.activeBuffets} active buffets</span>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {hotelSections.map((section) => (
              <NavLink
                key={section.key}
                to={section.path}
                end={section.path === "/hotel"}
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
                {section.key === "reservations" && summary.confirmedBookings > 0 && (
                  <span className="bg-secondary text-white text-xs px-2 py-0.5 rounded-full">{summary.confirmedBookings}</span>
                )}
                {section.key === "buffets" && summary.draftBuffets > 0 && (
                  <span className="bg-tertiary text-white text-xs px-2 py-0.5 rounded-full">{summary.draftBuffets}</span>
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
        <div className="flex-1 md:ml-64 p-6 md:p-8">
          {renderMessage()}
          {renderDeleteConfirmModal()}
          {renderCreateBuffetModal()}

          {currentSection.key === "overview" && renderOverview()}
          {currentSection.key === "reservations" && renderReservations()}
          {currentSection.key === "buffets" && renderBuffets()}

          {currentSection.key === "create" && (
            <BuffetCreator hotel={hotel} headers={headers} onCreated={fetchAll} setMessage={setMessage} />
          )}

          {currentSection.key === "media" && (
            <HotelMediaManager
              hotel={hotel}
              headers={headers}
              onUpdated={(updatedHotel, successMessage) => {
                if (updatedHotel) setHotel(updatedHotel);
                setMessage(successMessage || "Hotel media updated successfully.");
                setMessageType("success");
                fetchAll();
              }}
            />
          )}

          {currentSection.key === "reviews" && (
            <HotelReviewsWorkspace headers={headers} setMessage={(msg) => { setMessage(msg); setMessageType(msg?.toLowerCase?.().includes("fail") ? "error" : "success"); }} />
          )}

          {currentSection.key === "analytics" && <HotelAnalyticsPanel />}
          {currentSection.key === "finance" && <HotelFinancePanel />}
          {currentSection.key === "check-in" && <CheckInDesk bookings={bookings} onChanged={fetchAll} setMessage={setMessage} />}

          {(currentSection.key === "profile" || currentSection.key === "settings") && (
            <HotelProfileSettings
              hotel={hotel}
              headers={headers}
              onUpdated={(updatedHotel, successMessage) => {
                if (updatedHotel) setHotel(updatedHotel);
                setMessage(successMessage || "Hotel profile updated successfully.");
                setMessageType("success");
                fetchAll();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default HotelDashboard;