import { Icon, Photo } from "../design/ReferenceUI";

export const money = (amount) => new Intl.NumberFormat("en-LK", {
  style: "currency", currency: "LKR", currencyDisplay: "code", minimumFractionDigits: 0,
}).format(Number(amount || 0));

const dateLabel = (value) => new Intl.DateTimeFormat("en-LK", {
  timeZone: "Asia/Colombo", weekday: "short", day: "numeric", month: "short", year: "numeric",
}).format(new Date(value));

function timeLabel(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time || "");
  if (!match) return time || "";
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
}

export default function CheckoutSummary({ reservation, total }) {
  const { buffet, selectedDate, slot, seats } = reservation;
  if (!buffet) return null;
  const location = [buffet.hotel?.hotelName, buffet.hotel?.city].filter(Boolean).join(", ");
  return <section className="df09-card df09-summary" aria-label="Order summary">
    <div className="df09-summary-main">
      <Photo sources={[buffet.thumbnail, buffet.images || []]} alt="" />
      <div>
        <h2>{buffet.title}</h2>
        {location && <p>{location}</p>}
        <ul>
          {buffet.category && <li><Icon name="restaurant" />{buffet.category}</li>}
          {selectedDate && <li><Icon name="calendar_month" />{dateLabel(selectedDate)}</li>}
          {slot?.startTime && <li><Icon name="schedule" />{timeLabel(slot.startTime)}</li>}
          <li><Icon name="group" />{seats} {seats === 1 ? "guest" : "guests"}</li>
        </ul>
      </div>
    </div>
    <div className="df09-total"><span><strong>Total</strong> (final, inclusive)</span><strong>{money(total)}</strong></div>
  </section>;
}
