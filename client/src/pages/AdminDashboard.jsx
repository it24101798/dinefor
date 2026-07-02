import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { NavLink, useLocation } from "react-router-dom";
import HomeCMSPanel from "../components/admin/HomeCMSPanel";
import ReviewModerationPanel from "../components/admin/ReviewModerationPanel";
import AdminAnalyticsPanel from "../components/analytics/AdminAnalyticsPanel";
import AdminFinancePanel from "../components/payments/AdminFinancePanel";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const adminSections = [
  ["overview", "Overview", "/admin"],
  ["hotels", "Hotel Applications", "/admin/hotels"],
  ["featured", "Featured Buffets", "/admin/featured"],
  ["bookings", "Bookings", "/admin/bookings"],
  ["homepage", "Homepage CMS", "/admin/homepage"],
  ["reviews", "Reviews", "/admin/reviews"],
  ["analytics", "Analytics", "/admin/analytics"],
  ["finance", "Finance", "/admin/finance"],
  ["settings", "Settings", "/admin/settings"],
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

const statusFilters = Object.keys(statusLabels);

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

function AdminDashboard() {
  const location = useLocation();
  const section = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[1] || "overview";
  }, [location.pathname]);

  const user = getUser();
  const token = user?.token;
  const headers = { Authorization: `Bearer ${token}` };

  const [hotels, setHotels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [buffets, setBuffets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [hotelFilter, setHotelFilter] = useState("all");
  const [hotelSearch, setHotelSearch] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [moderationNote, setModerationNote] = useState("");
  const [featuredDays, setFeaturedDays] = useState("7");

  const fetchAll = async () => {
    if (!token) {
      setMessage("Admin login token missing. Please login again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const [hotelsRes, bookingsRes, buffetsRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/api/hotels`, { headers }),
        axios.get(`${API_BASE}/api/bookings`, { headers }),
        axios.get(`${API_BASE}/api/buffets`),
      ]);

      if (hotelsRes.status === "fulfilled") setHotels(Array.isArray(hotelsRes.value.data) ? hotelsRes.value.data : []);
      if (bookingsRes.status === "fulfilled") setBookings(Array.isArray(bookingsRes.value.data) ? bookingsRes.value.data : []);
      if (buffetsRes.status === "fulfilled") setBuffets(Array.isArray(buffetsRes.value.data) ? buffetsRes.value.data : []);

      const failed = [hotelsRes, bookingsRes, buffetsRes].filter((item) => item.status === "rejected");
      if (failed.length) setMessage("Some admin data could not load. Check backend routes and terminal logs.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Admin dashboard failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const updateHotelStatus = async (hotelId, action, note = moderationNote) => {
    try {
      const res = await axios.put(`${API_BASE}/api/hotels/${hotelId}/${action}`, { reviewNote: note }, { headers });
      setMessage(res.data.message || "Hotel updated.");
      setSelectedHotel(null);
      setModerationNote("");
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || `Hotel ${action} action failed.`);
    }
  };

  const updateFeaturedBuffet = async (buffetId, isFeatured) => {
    try {
      const until = new Date();
      until.setDate(until.getDate() + Number(featuredDays || 7));

      await axios.put(
        `${API_BASE}/api/buffets/${buffetId}/featured`,
        isFeatured ? { isFeatured: true, featuredUntil: until.toISOString() } : { isFeatured: false },
        { headers }
      );
      setMessage(isFeatured ? `Buffet featured for ${featuredDays} days.` : "Featured placement removed.");
      await fetchAll();
    } catch (error) {
      setMessage(error.response?.data?.message || "Featured buffet update failed.");
    }
  };

  const summary = useMemo(() => {
    const activeBookings = bookings.filter((booking) => booking.bookingStatus !== "cancelled");
    return {
      hotels: hotels.length,
      pendingHotels: hotels.filter((hotel) => hotelStatus(hotel) === "pending").length,
      customers: new Set(bookings.map((booking) => booking.user?._id || booking.user?.email).filter(Boolean)).size,
      bookings: bookings.length,
      revenue: activeBookings.reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0),
      reviews: hotels.reduce((sum, hotel) => sum + Number(hotel.totalReviews || 0), 0),
      buffets: buffets.length,
      featured: buffets.filter((buffet) => buffet.isFeatured).length,
    };
  }, [hotels, bookings, buffets]);

  const filteredHotels = hotels.filter((hotel) => {
    const statusMatch = hotelFilter === "all" || hotelStatus(hotel) === hotelFilter;
    const q = hotelSearch.trim().toLowerCase();
    const searchMatch = !q || [hotel.hotelName, hotel.location, hotel.city, hotel.district, hotel.province, hotel.owner?.email, hotel.application?.applicationNumber]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
    return statusMatch && searchMatch;
  });

  const filteredBookings = bookings.filter((booking) => {
    const statusMatch = bookingStatus === "all" || booking.bookingStatus === bookingStatus;
    const q = bookingSearch.trim().toLowerCase();
    const bookingText = [
      booking.bookingCode,
      booking.user?.name,
      booking.user?.email,
      booking.buffet?.title,
      booking.buffet?.hotel?.hotelName,
      booking.selectedTimeSlot?.startTime,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return statusMatch && (!q || bookingText.includes(q));
  });

  const renderShell = (content) => (
    <main className="admin-suite-page">
      <aside className="admin-sidebar-v2">
        <span className="eyebrow">Admin</span>
        <h2>Control Center</h2>
        <nav>
          {adminSections.map(([key, label, path]) => (
            <NavLink key={key} to={path} end={path === "/admin"} className={({ isActive }) => (isActive ? "admin-side-link active" : "admin-side-link")}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="admin-workspace-v2">
        {message && <div className="admin-alert-v2">{message}</div>}
        {content}
      </section>

      {selectedHotel && renderHotelModal(selectedHotel)}
    </main>
  );

  const renderEmpty = (title, text) => (
    <div className="admin-empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );

  const renderOverview = () => renderShell(
    <>
      <div className="admin-page-title-v2">
        <div>
          <span className="eyebrow">Release 0.9 Admin System</span>
          <h1>Admin Overview</h1>
          <p>Operate hotels, bookings, homepage, featured placements, reviews, and analytics from one dashboard.</p>
        </div>
        <button className="btn secondary" onClick={fetchAll}>Refresh</button>
      </div>

      <div className="admin-stat-grid-v2">
        <div><span>Hotels</span><strong>{summary.hotels}</strong><small>{summary.pendingHotels} pending</small></div>
        <div><span>Bookings</span><strong>{summary.bookings}</strong><small>All reservations</small></div>
        <div><span>Revenue</span><strong>{money(summary.revenue)}</strong><small>Pay-at-hotel value</small></div>
        <div><span>Buffets</span><strong>{summary.buffets}</strong><small>{summary.featured} featured</small></div>
      </div>

      <div className="admin-two-col-v2">
        <section className="admin-card-v2">
          <h2>Pending Hotel Applications</h2>
          {hotels.filter((hotel) => hotelStatus(hotel) === "pending").slice(0, 5).map((hotel) => (
            <button key={hotel._id} type="button" className="admin-list-row-v2" onClick={() => setSelectedHotel(hotel)}>
              <div><strong>{hotel.hotelName}</strong><span>{hotel.city || hotel.location || "Location not added"}</span></div>
              <span className="status-pill pending">Pending</span>
            </button>
          ))}
          {!summary.pendingHotels && renderEmpty("No pending hotels", "All hotel applications are currently reviewed.")}
        </section>

        <section className="admin-card-v2">
          <h2>Recent Bookings</h2>
          {bookings.slice(0, 5).map((booking) => (
            <div key={booking._id} className="admin-list-row-v2">
              <div><strong>{booking.buffet?.title || "Buffet"}</strong><span>{booking.user?.name || "Customer"} • {safeDate(booking.selectedDate)}</span></div>
              <span className="status-pill approved">{booking.bookingStatus}</span>
            </div>
          ))}
          {!bookings.length && renderEmpty("No bookings yet", "Bookings will appear here once customers reserve buffets.")}
        </section>
      </div>
    </>
  );

  const renderHotels = () => renderShell(
    <>
      <div className="admin-page-title-v2">
        <div>
          <span className="eyebrow">Hotel Moderation</span>
          <h1>Hotel Applications</h1>
          <p>Approve, reject, hold, suspend, or request more information from hotel partners.</p>
        </div>
      </div>

      <div className="admin-toolbar-v2">
        <input value={hotelSearch} onChange={(e) => setHotelSearch(e.target.value)} placeholder="Search hotel, city, owner email, application no." />
        <select value={hotelFilter} onChange={(e) => setHotelFilter(e.target.value)}>
          {statusFilters.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
        </select>
        <button className="btn secondary" onClick={fetchAll}>Refresh</button>
      </div>

      <div className="admin-status-tabs-v2">
        {statusFilters.map((status) => (
          <button key={status} className={hotelFilter === status ? "active" : ""} onClick={() => setHotelFilter(status)}>
            {statusLabels[status]} <span>{status === "all" ? hotels.length : hotels.filter((hotel) => hotelStatus(hotel) === status).length}</span>
          </button>
        ))}
      </div>

      <div className="admin-table-v2">
        <div className="admin-table-head-v2 hotel-head"><span>Hotel</span><span>Location</span><span>Application</span><span>Status</span><span>Actions</span></div>
        {filteredHotels.map((hotel) => (
          <div key={hotel._id} className="admin-table-row-v2 hotel-row">
            <span><strong>{hotel.hotelName}</strong><small>{hotel.owner?.email || hotel.email || "No email"}</small></span>
            <span>{[hotel.city, hotel.district, hotel.province].filter(Boolean).join(", ") || hotel.location || "-"}</span>
            <span>{hotel.application?.applicationNumber || "-"}</span>
            <span className={`status-pill ${hotelStatus(hotel)}`}>{statusLabels[hotelStatus(hotel)] || hotelStatus(hotel)}</span>
            <span className="admin-action-row-v2">
              <button onClick={() => setSelectedHotel(hotel)}>View</button>
              {hotelStatus(hotel) !== "approved" && <button onClick={() => updateHotelStatus(hotel._id, "approve", "Approved after admin review.")}>Approve</button>}
              {hotelStatus(hotel) !== "need_more_info" && <button onClick={() => updateHotelStatus(hotel._id, "request-info", "Please update missing/incorrect application details.")}>More Info</button>}
              {hotelStatus(hotel) !== "hold" && <button onClick={() => updateHotelStatus(hotel._id, "hold", "Application temporarily placed on hold.")}>Hold</button>}
            </span>
          </div>
        ))}
      </div>
      {!filteredHotels.length && renderEmpty("No hotels found", "Change the search or status filter to view more hotel applications.")}
    </>
  );

  const renderHotelModal = (hotel) => {
    const app = hotel.application || {};
    return (
      <div className="admin-modal-backdrop-v2" onClick={() => setSelectedHotel(null)}>
        <section className="admin-modal-card-v2" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal-top-v2">
            <div>
              <span className={`status-pill ${hotelStatus(hotel)}`}>{statusLabels[hotelStatus(hotel)] || hotelStatus(hotel)}</span>
              <h2>{hotel.hotelName}</h2>
              <p>{app.applicationNumber || "No application number"}</p>
            </div>
            <button className="btn secondary" onClick={() => setSelectedHotel(null)}>Close</button>
          </div>

          <div className="admin-modal-scroll-v2">
            <div className="application-grid-v2">
              <div><span>Owner Email</span><strong>{hotel.owner?.email || hotel.email || "-"}</strong></div>
              <div><span>Business Name</span><strong>{app.legalBusinessName || "-"}</strong></div>
              <div><span>BR Number</span><strong>{app.businessRegistrationNumber || "-"}</strong></div>
              <div><span>Category</span><strong>{app.hotelCategory || "-"}</strong></div>
              <div><span>Province</span><strong>{hotel.province || "-"}</strong></div>
              <div><span>District</span><strong>{hotel.district || "-"}</strong></div>
              <div><span>City</span><strong>{hotel.city || "-"}</strong></div>
              <div><span>Manager</span><strong>{app.managerName || "-"}</strong></div>
              <div><span>Manager Phone</span><strong>{app.managerPhone || "-"}</strong></div>
              <div><span>Bank</span><strong>{app.bankName || "-"}</strong></div>
              <div><span>Account No.</span><strong>{app.accountNumber || "-"}</strong></div>
              <div><span>Capacity</span><strong>{app.buffetCapacity || 0} seats</strong></div>
            </div>

            <div className="admin-note-box-v2"><strong>Applicant Note</strong><p>{app.applicantNote || "No note."}</p></div>
            <div className="admin-note-box-v2"><strong>Admin Review Note</strong><p>{app.reviewNote || "No review note yet."}</p></div>

            {!!app.documents?.length && (
              <div className="admin-doc-list-v2">
                <strong>Documents</strong>
                {app.documents.map((doc) => <a key={doc} href={doc} target="_blank" rel="noreferrer">Open document</a>)}
              </div>
            )}

            <textarea value={moderationNote} onChange={(e) => setModerationNote(e.target.value)} placeholder="Admin note to hotel partner" />
            <div className="admin-action-row-v2 modal-actions">
              <button onClick={() => updateHotelStatus(hotel._id, "approve")}>Approve</button>
              <button onClick={() => updateHotelStatus(hotel._id, "request-info")}>Request More Info</button>
              <button onClick={() => updateHotelStatus(hotel._id, "hold")}>Hold</button>
              <button onClick={() => updateHotelStatus(hotel._id, "reject")}>Reject</button>
              <button onClick={() => updateHotelStatus(hotel._id, "suspend")}>Suspend</button>
              <button onClick={() => updateHotelStatus(hotel._id, "reopen")}>Reopen</button>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderFeatured = () => renderShell(
    <>
      <div className="admin-page-title-v2"><div><span className="eyebrow">Revenue Foundation</span><h1>Featured Buffets</h1><p>Promote selected buffets on feed, listings, and homepage sections.</p></div></div>
      <div className="admin-toolbar-v2"><select value={featuredDays} onChange={(e) => setFeaturedDays(e.target.value)}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div>
      <div className="admin-table-v2">
        <div className="admin-table-head-v2 buffet-head"><span>Buffet</span><span>Hotel</span><span>Price</span><span>Status</span><span>Actions</span></div>
        {buffets.map((buffet) => (
          <div key={buffet._id} className="admin-table-row-v2 buffet-row">
            <span><strong>{buffet.title}</strong><small>{buffet.category || buffet.buffetType}</small></span>
            <span>{buffet.hotel?.hotelName || "-"}</span><span>{money(buffet.price)}</span>
            <span className={`status-pill ${buffet.isFeatured ? "approved" : "pending"}`}>{buffet.isFeatured ? "Featured" : "Normal"}</span>
            <span className="admin-action-row-v2"><button onClick={() => updateFeaturedBuffet(buffet._id, true)}>Feature</button><button onClick={() => updateFeaturedBuffet(buffet._id, false)}>Remove</button></span>
          </div>
        ))}
      </div>
      {!buffets.length && renderEmpty("No buffets found", "Hotels must create buffets before admin can feature them.")}
    </>
  );

  const renderBookings = () => renderShell(
    <>
      <div className="admin-page-title-v2"><div><span className="eyebrow">Reservation Operations</span><h1>Booking Center</h1><p>Search and monitor reservations across all hotels.</p></div></div>
      <div className="admin-toolbar-v2"><input value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Search code, customer, hotel, buffet" /><select value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}><option value="all">All Status</option><option value="confirmed">Confirmed</option><option value="checked_in">Checked In</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No Show</option></select><button className="btn secondary" onClick={() => window.print()}>Print</button></div>
      <div className="admin-table-v2">
        <div className="admin-table-head-v2 booking-head"><span>Booking</span><span>Customer</span><span>Buffet</span><span>Date/Slot</span><span>Total</span><span>Status</span></div>
        {filteredBookings.map((booking) => (
          <div key={booking._id} className="admin-table-row-v2 booking-row"><span><strong>{booking.bookingCode}</strong><small>{booking.paymentStatus} / {booking.paymentMethod}</small></span><span>{booking.user?.name || "-"}<small>{booking.user?.email || ""}</small></span><span>{booking.buffet?.title || "-"}<small>{booking.buffet?.hotel?.hotelName || ""}</small></span><span>{safeDate(booking.selectedDate)}<small>{booking.selectedTimeSlot?.startTime} - {booking.selectedTimeSlot?.endTime}</small></span><span>{money(booking.totalAmount)}</span><span className="status-pill approved">{booking.bookingStatus}</span></div>
        ))}
      </div>
      {!filteredBookings.length && renderEmpty("No bookings found", "Try another search or status filter.")}
    </>
  );

  const renderHomepage = () => renderShell(<><div className="admin-page-title-v2"><div><span className="eyebrow">Homepage Control</span><h1>Homepage CMS</h1><p>Manage homepage hero and marketplace text. Media library upgrades are planned for the next CMS sprint.</p></div></div><HomeCMSPanel /></>);
  const renderReviews = () => renderShell(<><div className="admin-page-title-v2"><div><span className="eyebrow">Trust & Quality</span><h1>Review Moderation</h1><p>Moderate customer reviews and uploaded review photos.</p></div></div><ReviewModerationPanel /></>);
  const renderAnalytics = () => renderShell(<><div className="admin-page-title-v2"><div><span className="eyebrow">Business Intelligence</span><h1>Analytics</h1><p>Monitor revenue, bookings, hotels, and buffet performance.</p></div></div><AdminAnalyticsPanel /></>);
  const renderFinance = () => renderShell(<><div className="admin-page-title-v2"><div><span className="eyebrow">Payments & Commission</span><h1>Finance Dashboard</h1><p>Monitor payment records, platform commission, hotel earnings and pending pay-at-hotel collections.</p></div></div><AdminFinancePanel /></>);
  const renderSettings = () => renderShell(<><div className="admin-page-title-v2"><div><span className="eyebrow">System</span><h1>Settings</h1><p>Prepared for production configuration, OAuth, email, SMTP, theme, and maintenance controls.</p></div></div><div className="admin-card-v2"><h2>Current MVP Settings Scope</h2><div className="application-grid-v2"><div><span>Site Name</span><strong>DineFor</strong></div><div><span>Mode</span><strong>Local Development</strong></div><div><span>Payments</span><strong>Pay at hotel</strong></div><div><span>OAuth</span><strong>Coming soon</strong></div></div></div></>);

  if (loading) return renderShell(<div className="admin-loading-v2"><h2>Loading admin system...</h2><p>Please wait while DineFor loads hotels, bookings and buffets.</p></div>);

  if (section === "hotels") return renderHotels();
  if (section === "featured") return renderFeatured();
  if (section === "bookings") return renderBookings();
  if (section === "homepage") return renderHomepage();
  if (section === "reviews") return renderReviews();
  if (section === "analytics") return renderAnalytics();
  if (section === "finance") return renderFinance();
  if (section === "settings") return renderSettings();
  return renderOverview();
}

export default AdminDashboard;
