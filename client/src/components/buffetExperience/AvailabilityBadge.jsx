function AvailabilityBadge({ slot, loading }) {
  if (loading) return <span className="df-availability loading">Checking availability...</span>;
  if (!slot) return <span className="df-availability neutral">Select date & time</span>;

  const left = Number(slot.availableSeats || 0);
  const total = Number(slot.totalSeats || 0);
  const ratio = total > 0 ? left / total : 0;

  if (left <= 0) return <span className="df-availability soldout">Sold out</span>;
  if (ratio <= 0.15) return <span className="df-availability urgent">🔥 Almost full · {left} seats left</span>;
  if (ratio <= 0.35) return <span className="df-availability warning">Trending · {left} seats left</span>;
  return <span className="df-availability available">Available · {left} seats left</span>;
}

export default AvailabilityBadge;
