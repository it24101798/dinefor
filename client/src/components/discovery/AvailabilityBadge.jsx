import { getTotalAvailableSeats } from "../../services/discoveryService";

function AvailabilityBadge({ buffet, guests = 1 }) {
  const seatsLeft = getTotalAvailableSeats(buffet);
  const isSoldOut = seatsLeft <= 0;
  const isLow = seatsLeft > 0 && seatsLeft <= Math.max(6, Number(guests || 1));

  if (isSoldOut) {
    return <span className="availability-badge sold-out">Sold out</span>;
  }

  if (isLow) {
    return <span className="availability-badge low">Only {seatsLeft} seats left</span>;
  }

  return <span className="availability-badge available">{seatsLeft} seats available</span>;
}

export default AvailabilityBadge;
