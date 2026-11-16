import { useEffect, useState } from "react";
import AccountLayout from "../design/AccountLayout";
import api from "../services/api";
import { Action, BookingCard, bookingPath, sriLankaToday } from "../bookings/bookingDisplay";
import "../bookings/bookings.css";

function bookingGroup(booking) {
  if (booking.bookingStatus === "cancelled") return "Cancelled";
  if (["completed", "expired", "no_show"].includes(booking.bookingStatus)) return "Past";
  if (!["checked_in", "dining"].includes(booking.bookingStatus)
    && String(booking.selectedDate).slice(0, 10) < sriLankaToday()) return "Past";
  return "Upcoming";
}

export default function MyBookings() {
  const [bookings, setBookings] = useState(null);
  const [tab, setTab] = useState("Upcoming");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    api.get("/bookings/customer-bookings", { signal: controller.signal })
      .then(({ data }) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => {
        if (!controller.signal.aborted) setError("We couldn’t load your bookings.");
      });
    return () => controller.abort();
  }, [attempt]);

  const counts = (bookings || []).reduce((total, booking) => {
    const bucket = bookingGroup(booking);
    total[bucket] = (total[bucket] || 0) + 1;
    return total;
  }, {});
  const filtered = (bookings || []).filter(booking => bookingGroup(booking) === tab);
  if (tab !== "Upcoming") filtered.reverse();

  return <AccountLayout className="df10-account df10-list" title="My bookings" description="View and manage your buffet reservations.">
    <div className="df10-tabs" role="group" aria-label="Filter bookings">
      {["Upcoming", "Past", "Cancelled"].map(label => <button type="button" key={label} aria-pressed={tab === label} onClick={() => setTab(label)}>
        {label}{label === "Upcoming" && bookings ? ` (${counts.Upcoming || 0})` : ""}
      </button>)}
    </div>
    {error ? <section className="df10-card df10-empty"><p role="alert">{error}</p><Action icon="refresh" onClick={() => setAttempt(value => value + 1)}>Try again</Action></section>
      : !bookings ? <p role="status">Loading your bookings…</p>
      : filtered.length ? <div className="df10-list-grid">{filtered.map(booking => (
        <BookingCard booking={booking} key={booking._id}>
          <Action primary icon="receipt_long" to={bookingPath(booking)}>View booking</Action>
          <Action icon="settings" to={bookingPath(booking) + "/manage"}>Manage booking</Action>
        </BookingCard>
      ))}</div>
      : <section className="df10-card df10-empty"><h2>No {tab.toLowerCase()} bookings</h2>
        {tab === "Upcoming" && <Action primary icon="search" to="/listings">Find a buffet</Action>}
      </section>}
  </AccountLayout>;
}
