import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const lockedStatus = new Set(["cancelled", "expired", "no_show", "completed"]);

function Capacity({ buffet, today, headers }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    api.get(`/bookings/inventory/${buffet._id}`, {
      headers, params: { from: today, days: 1 }, signal: controller.signal,
    }).then(({ data }) => setResult(data.dates?.[0] || {}))
      .catch(() => { if (!controller.signal.aborted) setResult({ failed: true }); });
    return () => controller.abort();
  }, [buffet._id, today, headers]);

  if (!result) return <small>Checking availability…</small>;
  if (result.failed) return <small>Availability unavailable</small>;
  const capacity = (result.slots || []).reduce((sum, slot) => sum + Number(slot.totalSeats || 0), 0);
  if (!capacity) return <small>No service scheduled today</small>;
  const available = Math.min(capacity, Math.max(0, Number(result.totalAvailableSeats || 0)));
  return (
    <div className="df-partner-capacity">
      <progress value={available} max={capacity} aria-label={`Available seats at ${buffet.title}`} />
      <small>{available} of {capacity} seats available today</small>
    </div>
  );
}

export default function PartnerOverview({ bookings, buffets, headers, today }) {
  const upcoming = bookings
    .filter((booking) => {
      if (lockedStatus.has(booking.bookingStatus) || !booking.selectedDate) return false;
      const diningDate = String(booking.selectedDate).slice(0, 10);
      if (diningDate !== today) return diningDate > today;
      const start = new Date(`${today}T${booking.selectedTimeSlot?.startTime || "23:59"}:00+05:30`);
      return Number.isNaN(start.getTime()) || start > new Date();
    })
    .sort((a, b) => String(a.selectedDate).localeCompare(String(b.selectedDate))
      || String(a.selectedTimeSlot?.startTime || "").localeCompare(String(b.selectedTimeSlot?.startTime || "")))
    .slice(0, 5);
  const active = buffets.filter((buffet) => buffet.status === "active" || (!buffet.status && buffet.isActive));
  const featured = [...active, ...buffets.filter((buffet) => !active.includes(buffet))].slice(0, 5);

  return (
    <div className="df-partner-overview">
      <section className="card-ambient">
        <header><h2>Upcoming reservations</h2><Link to="/hotel/reservations">View reservations</Link></header>
        {upcoming.length ? <ul>{upcoming.map((booking) => (
          <li key={booking._id}>
            <strong>{booking.guestDetails?.name || booking.user?.name || "Guest"}</strong>
            <span>{booking.buffet?.title || "Buffet"} · {booking.seats} guests</span>
            <small>{String(booking.selectedDate).slice(0, 10)} · {booking.selectedTimeSlot?.startTime || "Time pending"} · {booking.bookingCode}</small>
          </li>
        ))}</ul> : <p>No upcoming reservations.</p>}
      </section>
      <section className="card-ambient">
        <header><h2>Your buffets</h2><Link to="/hotel/buffets">Manage buffets</Link></header>
        {featured.length ? <ul>{featured.map((buffet) => (
          <li key={buffet._id}>
            <div className="df-partner-buffet-name"><strong>{buffet.title}</strong><span>{buffet.status || (buffet.isActive ? "active" : "draft")}</span></div>
            {active.includes(buffet) && <Capacity key={today} buffet={buffet} today={today} headers={headers} />}
          </li>
        ))}</ul> : <p><Link to="/hotel/create">Create your first buffet</Link></p>}
      </section>
    </div>
  );
}
