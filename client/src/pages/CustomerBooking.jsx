import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import AccountLayout from "../design/AccountLayout";
import { Icon } from "../design/ReferenceUI";
import CrewArt from "../design/CrewArt";
import { Action, BookingCard, bookingLabel, bookingPath, dateInColombo, directionsUrl } from "../bookings/bookingDisplay";
import { Cancellation, Reschedule } from "../bookings/BookingChanges";
import { makeBookingQr } from "../bookings/bookingQr";
import BookingReview from "../bookings/BookingReview";
import "../bookings/bookings.css";

const calendarStatuses = ["confirmed", "checked_in", "dining"];

function Heading({ title, description, role, icon }) {
  return <header className={`df10-heading${role ? " df10-with-art" : ""}`}>
    <div>{icon && <span className="df10-hero-icon"><Icon name={icon} /></span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {role === "couple" ? <img src="/images/home/nila-kavin.png" alt="" /> : role && <CrewArt role={role} />}
  </header>;
}

function EntryPass({ booking }) {
  const code = booking.passAvailable ? booking.bookingCode : "";
  const [qr, setQr] = useState(null);

  useEffect(() => {
    let active = true;
    if (code) makeBookingQr(code)
      .then(url => { if (active) setQr({ code, url }); })
      .catch(() => { if (active) setQr({ code, url: "" }); });
    return () => { active = false; };
  }, [code]);

  if (!code) return <div className="df10-card df10-empty">
    <h2>{["checked_in", "dining", "completed"].includes(booking.bookingStatus) ? "This pass has been used" : "Entry pass unavailable"}</h2>
    <Action icon="receipt_long" to={bookingPath(booking)}>View booking status</Action>
  </div>;

  return <div className="df10-qr">
    {qr?.code === code && qr.url ? <img src={qr.url} alt="Reservation QR code for hotel check-in" width="256" height="256" />
      : qr?.code === code ? <p role="status">Show the booking code at reception.</p> : <p role="status">Generating your entry pass…</p>}
    <span>Booking code</span><strong>{code}</strong>
    <p>Show your pass at hotel reception.</p>
  </div>;
}

function BookingJourney({ screen, id }) {
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const polling = ["details", "pass"].includes(screen) && (!booking || ["pending", "confirmed", "checked_in", "dining"].includes(booking.bookingStatus));

  useEffect(() => {
    let controller;
    async function load() {
      if (controller) return;
      controller = new AbortController();
      try {
        const { data } = await api.get(`/bookings/my-bookings/${encodeURIComponent(id)}`, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setBooking(data);
          setError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error.response?.data?.message || "We couldn’t load this booking.");
      } finally { controller = null; }
    }
    load();
    const timer = polling ? window.setInterval(load, 12000) : undefined;
    return () => { controller?.abort(); window.clearInterval(timer); };
  }, [id, polling, attempt]);

  async function downloadCalendar() {
    if (calendarBusy) return;
    setCalendarBusy(true);
    setNotice("");
    try {
      const { data } = await api.get(`/bookings/my-bookings/${booking._id}/calendar`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dinefor-${booking._id}.ics`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setNotice("We couldn’t download your calendar event. Try again.");
    } finally {
      setCalendarBusy(false);
    }
  }

  function finish(message) {
    setNotice(message);
    setPanel("");
    setAttempt(value => value + 1);
  }

  if (!booking) return <AccountLayout className="df10-account" showBanner={false}>
    <Action icon="arrow_back" to="/my-bookings">My bookings</Action>
    <Heading title="View booking" />
    {error ? <div className="df10-panel"><p role="alert">{error}</p><Action icon="refresh" onClick={() => setAttempt(value => value + 1)}>Try again</Action></div>
      : <p role="status">Loading your booking…</p>}
  </AccountLayout>;

  const path = bookingPath(booking);
  const directions = directionsUrl(booking.buffet?.hotel);
  const confirmed = booking.bookingStatus === "confirmed";
  const checkedIn = ["checked_in", "dining"].includes(booking.bookingStatus);
  const completed = booking.bookingStatus === "completed";
  const sandbox = booking.paymentMethod === "sandbox";
  const paymentStatusPath = booking.payment?.gateway === "sandbox" ? `/payment/status/${booking.payment._id}`
    : booking.payment?.gateway === "payhere" && booking.payment?.gatewayOrderId ? `/payment/return?order_id=${encodeURIComponent(booking.payment.gatewayOrderId)}` : "/payments";
  const directionsAction = directions && <Action icon="location_on" to={directions}>Get directions</Action>;
  const passAction = booking.passAvailable && <Action primary icon="qr_code_2" to={path + "/pass"}>View entry pass</Action>;
  const helpAction = <Action icon="support_agent" to="/help">Need help?</Action>;
  const reviewAction = booking.canReview && <Action primary icon="star" to={path + "/review"}>Rate your experience</Action>;
  const bookAgain = booking.buffet?._id && <Action icon="refresh" to={`/buffets/${booking.buffet._id}`}>Book again</Action>;

  return <AccountLayout className="df10-account df10-booking-page" showBanner={false}>
    <div className="df10-flow">
      <Action icon="arrow_back" to={screen === "details" ? "/my-bookings" : path}>{screen === "details" ? "My bookings" : "View booking"}</Action>
      {notice && <p className="df10-notice" role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {sandbox && <p className="df10-notice">Sandbox reservation · No real payment</p>}
      {screen === "manage" ? <>
        <Heading title="Manage booking" role="host" />
        <BookingCard booking={booking} compact />
        {panel === "cancel" ? <Cancellation booking={booking} onClose={() => setPanel("")} onDone={finish} />
          : panel === "reschedule" ? <Reschedule booking={booking} onClose={() => setPanel("")} onDone={finish} />
          : <div className="df10-actions">
            {passAction}{directionsAction}
            {booking.canReschedule && booking.buffet && <Action icon="event" onClick={() => setPanel("reschedule")}>Reschedule</Action>}
            {booking.canCancel && <Action danger icon="cancel" onClick={() => setPanel("cancel")}>Cancel booking</Action>}
            {booking.paymentStatus === "pending" && booking.paymentMode !== "pay_at_hotel" && <Action icon="payments" to={paymentStatusPath}>Check payment status</Action>}
            {booking.refundStatus && booking.refundStatus !== "none" && <Action icon="receipt_long" to="/payments">View refund status</Action>}
            {helpAction}
          </div>}
      </> : screen === "pass" ? <>
        <Heading title="Your entry pass" />
        <BookingCard booking={booking} compact />
        <EntryPass booking={booking} />
        {directionsAction}{helpAction}
      </> : screen === "review" ? <>
        <Heading title="How was your dining moment?" description={booking.buffet ? `Share your experience at ${booking.buffet.title}.` : undefined} />
        <BookingCard booking={booking} compact />
        {booking.canReview ? <BookingReview booking={booking} /> : <div className="df10-card df10-empty">
          <p>{completed ? "This booking is unavailable for a new review." : "You can leave a review after dining is completed."}</p>
          <Action icon="rate_review" to="/my-reviews">My reviews</Action>
        </div>}
      </> : <>
        <Heading title={confirmed ? "You’re booked!" : bookingLabel(booking.bookingStatus)}
          description={confirmed ? "Your buffet reservation is confirmed." : checkedIn ? "You’re all set at the hotel. Enjoy your dining moment." : completed ? "Hope you enjoyed every bite." : undefined}
          role={checkedIn ? "host" : confirmed || completed ? "couple" : undefined}
          icon={confirmed || checkedIn ? "check_circle" : undefined} />
        <BookingCard booking={booking} />
        <div className="df10-actions">
          {passAction}{reviewAction}
          {completed && !booking.canReview && <Action icon="rate_review" to="/my-reviews">My reviews</Action>}
          {completed && bookAgain}
          {!completed && <Action icon="settings" to={path + "/manage"}>Manage booking</Action>}
          {booking.bookingStatus === "pending" && booking.paymentMode !== "pay_at_hotel" && booking.paymentStatus === "pending" && <Action primary icon="payments" to={paymentStatusPath}>Check payment status</Action>}
          {calendarStatuses.includes(booking.bookingStatus) && <Action icon="event_available" onClick={downloadCalendar} disabled={calendarBusy}>{calendarBusy ? "Preparing calendar…" : "Add to calendar"}</Action>}
          {!completed && directionsAction}{helpAction}
        </div>
        {booking.statusTimeline?.length > 0 && <details className="df10-card df10-timeline"><summary>Booking timeline</summary>
          <ol>{booking.statusTimeline.map((event, index) => <li key={index}>{bookingLabel(event.status)} · {dateInColombo(event.at, true)}</li>)}</ol>
        </details>}
      </>}
    </div>
  </AccountLayout>;
}

export default function CustomerBooking({ screen = "details" }) {
  const { id } = useParams();
  return <BookingJourney key={`${id}:${screen}`} id={id} screen={screen} />;
}
