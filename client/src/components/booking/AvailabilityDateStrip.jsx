import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./availability-date-strip.css";

const prettyDay = (dateKey) => {
  if (!dateKey) return { day: "", date: "" };
  const date = new Date(`${dateKey}T00:00:00`);
  return {
    day: date.toLocaleDateString("en-US", { weekday: "short" }),
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
};

export default function AvailabilityDateStrip({
  buffetId,
  selectedDate,
  guests = 1,
  onSelect,
  days = 14,
}) {
  const [calendar, setCalendar] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);

  const from = useMemo(
    () => selectedDate || new Date().toISOString().slice(0, 10),
    [selectedDate]
  );

  useEffect(() => {
    if (!buffetId) return undefined;

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          `/bookings/availability/${buffetId}/calendar`,
          {
            params: { from, days, guests },
            signal: controller.signal,
          }
        );

        setCalendar(Array.isArray(response.data?.dates) ? response.data.dates : []);
        setPolicy(response.data?.reservationPolicy || null);
      } catch (error) {
        if (error?.code !== "ERR_CANCELED") {
          setCalendar([]);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [buffetId, from, days, guests]);

  if (loading && !calendar.length) {
    return <div className="df-availability-strip__loading">Checking upcoming availability…</div>;
  }

  if (!calendar.length) return null;

  return (
    <div className="df-availability-strip-wrap">
      <div className="df-availability-strip-header">
        <span>Quick date availability</span>
        {policy?.instantConfirmation && (
          <small>
            <span className="material-symbols-outlined">bolt</span>
            Instant confirmation
          </small>
        )}
      </div>

      <div className="df-availability-strip" role="list" aria-label="Upcoming buffet availability">
        {calendar.map((item) => {
          const label = prettyDay(item.dateKey);
          const selected = item.dateKey === selectedDate;
          const available = item.canFitGuests && item.totalAvailableSeats > 0;

          return (
            <button
              key={item.dateKey}
              type="button"
              role="listitem"
              disabled={!available}
              onClick={() => onSelect?.(item.dateKey)}
              className={[
                "df-availability-date",
                selected ? "is-selected" : "",
                available ? "is-available" : "is-unavailable",
              ].join(" ")}
            >
              <strong>{label.day}</strong>
              <span>{label.date}</span>
              <small>
                {available
                  ? `${item.totalAvailableSeats} seats`
                  : "Unavailable"}
              </small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
