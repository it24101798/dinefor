import AvailabilityBadge from "./AvailabilityBadge";

function StickyBookingCard({
  buffet,
  selectedDate,
  setSelectedDate,
  dateWindow,
  availability,
  availabilityLoading,
  availabilitySlots,
  selectedSlotId,
  setSelectedSlotId,
  selectedSlot,
  seats,
  setSeats,
  onReserve,
  message,
}) {
  const price = Number(buffet?.price || 0);
  const total = price * Number(seats || 1);
  const hasSlots = Boolean(availabilitySlots?.length);

  return (
    <aside className="df-sticky-booking-card">
      <div className="df-booking-card-top">
        <span className="df-chip gold">Instant reservation</span>
        <h2>Reserve your buffet</h2>
        <p>Choose date, time and guests. Seats are calculated live for each time slot.</p>
      </div>

      <AvailabilityBadge slot={selectedSlot} loading={availabilityLoading} />

      <div className="df-booking-fields">
        <label>
          <span>Date</span>
          <input
            type="date"
            value={selectedDate}
            min={dateWindow?.min}
            max={dateWindow?.max}
            onChange={(e) => setSelectedDate(e.target.value)}
            readOnly={buffet?.buffetType === "special"}
          />
        </label>

        <label>
          <span>Time slot</span>
          <select value={selectedSlotId} onChange={(e) => setSelectedSlotId(e.target.value)} disabled={!hasSlots || !availability?.isAvailableDate}>
            {!hasSlots && <option value="">No slots for selected date</option>}
            {availabilitySlots.map((slot) => (
              <option key={slot._id} value={slot._id} disabled={Number(slot.availableSeats) <= 0}>
                {slot.startTime} - {slot.endTime} · {slot.availableSeats} left
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Guests</span>
          <input
            type="number"
            min="1"
            max={selectedSlot?.availableSeats || 1}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
          />
        </label>
      </div>

      {availability?.isAvailableDate && (
        <div className="df-slot-grid">
          {availabilitySlots.map((slot) => (
            <button
              type="button"
              key={slot._id}
              className={slot._id === selectedSlotId ? "active" : ""}
              disabled={Number(slot.availableSeats) <= 0}
              onClick={() => setSelectedSlotId(slot._id)}
            >
              <strong>{slot.startTime}</strong>
              <small>{slot.availableSeats}/{slot.totalSeats}</small>
            </button>
          ))}
        </div>
      )}

      {availability && !availability.isAvailableDate && <p className="df-inline-error">{availability.message}</p>}

      <div className="df-price-box">
        <span>Rs. {price.toLocaleString()} × {seats || 1}</span>
        <strong>Rs. {total.toLocaleString()}</strong>
      </div>

      <button className="df-reserve-button" type="button" onClick={onReserve} disabled={!selectedSlot || Number(selectedSlot.availableSeats) <= 0}>
        Reserve Buffet
      </button>

      {message && <p className={message.toLowerCase().includes("success") || message.includes("created") ? "df-inline-success" : "df-inline-error"}>{message}</p>}
    </aside>
  );
}

export default StickyBookingCard;
