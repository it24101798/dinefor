import { Link } from "react-router-dom";
import { Icon, Photo } from "../design/ReferenceUI";
import { money } from "../pages/CheckoutSummary";

const labels = {
  pending: "Pending", confirmed: "Confirmed", checked_in: "Checked in", dining: "Dining in progress",
  completed: "Dining completed", cancelled: "Cancelled", no_show: "No show", expired: "Expired",
};

export const bookingLabel = status => labels[status] || "Status unavailable";
export const bookingPath = booking => `/bookings/${booking._id}`;
export const bookingTotal = booking => booking.grandTotal ?? booking.totalAmount;
export const sriLankaToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Colombo" }).format(new Date());
export function dateInColombo(value, includeTime = false) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo", dateStyle: "medium", ...(includeTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

export function directionsUrl(hotel) {
  const { latitude, longitude } = hotel?.mapLocation || {};
  const address = [hotel?.hotelName, hotel?.location, hotel?.city].filter(Boolean).join(", ");
  const destination = Number.isFinite(latitude) && Number.isFinite(longitude) ? `${latitude},${longitude}` : address;
  return destination ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination })}` : "";
}

export function paymentLabel(booking) {
  if (booking.paymentStatus === "refunded") return "Refunded";
  if (booking.paymentStatus === "partially_refunded") return "Partly refunded";
  if (booking.paymentMethod === "sandbox" && booking.paymentStatus === "paid") return "Test payment confirmed";
  if (booking.paymentMode === "pay_at_hotel") return booking.paymentStatus === "paid" ? "Paid at hotel" : "Pay at hotel";
  if (booking.paymentStatus === "paid") return "Paid online";
  if (booking.paymentStatus === "partially_paid") return "Deposit paid";
  return booking.paymentStatus === "pending" ? "Payment pending" : "See Payment History";
}

export function Action({ to, icon, children, danger = false, primary = false, ...props }) {
  const className = `df10-action${primary ? " df10-primary" : danger ? " df10-danger" : ""}`;
  const content = <><Icon name={icon} /><span>{children}</span></>;
  if (to?.startsWith("https://")) return <a className={className} href={to} target="_blank" rel="noreferrer" {...props}>{content}</a>;
  if (to) return <Link className={className} to={to} {...props}>{content}</Link>;
  return <button type="button" className={className} {...props}>{content}</button>;
}

export function BookingCard({ booking, children, compact = false }) {
  const { buffet, bookingStatus, seats } = booking;
  return <article className={`df10-card df10-booking${compact ? " df10-compact" : ""}`}>
    <div className="df10-photo">
      <Photo sources={[buffet?.thumbnail, buffet?.images || []]} alt="" />
      <span className={`df10-pill df10-${bookingStatus}`}>{bookingLabel(bookingStatus)}</span>
    </div>
    <div className="df10-card-content">
      <h2>{buffet?.title || "Buffet reservation"}</h2>
      <p>{[buffet?.hotel?.hotelName, buffet?.hotel?.city].filter(Boolean).join(", ")}</p>
      <ul className="df10-facts">
        <li><Icon name="calendar_month" />{dateInColombo(booking.selectedDate)}</li>
        {booking.selectedTimeSlot?.startTime && <li><Icon name="schedule" />{booking.selectedTimeSlot.startTime}</li>}
        <li><Icon name="group" />{seats} {seats === 1 ? "guest" : "guests"}</li>
      </ul>
      <div className="df10-payment"><span><Icon name="payments" /> {paymentLabel(booking)}</span><strong>{money(bookingTotal(booking))}</strong></div>
      {children && <div className="df10-actions">{children}</div>}
    </div>
  </article>;
}
