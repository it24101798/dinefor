import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const statusStyle = {
  pending: "bg-highlight-gold/15 text-highlight-gold",
  confirmed: "bg-secondary-container/30 text-secondary",
  checked_in: "bg-primary-container/15 text-primary",
  dining: "bg-primary-container/15 text-primary",
  completed: "bg-secondary-container/30 text-secondary",
  cancelled: "bg-error/10 text-error",
  no_show: "bg-error/10 text-error",
  expired: "bg-surface-container-high text-on-surface-variant",
};

const formatDate = (value) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));

const parseDateTime = (dateValue, timeText) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const value = String(timeText || "").trim();
  const twelve = value.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(A\.?M\.?|P\.?M\.?)$/i
  );
  const twentyFour = value.match(/^(\d{1,2}):(\d{2})$/);

  let hours = 12;
  let minutes = 0;

  if (twelve) {
    hours = Number(twelve[1]);
    minutes = Number(twelve[2] || 0);
    const period = twelve[3].toUpperCase();
    if (period.startsWith("P") && hours !== 12) hours += 12;
    if (period.startsWith("A") && hours === 12) hours = 0;
  } else if (twentyFour) {
    hours = Number(twentyFour[1]);
    minutes = Number(twentyFour[2]);
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
};

const getCountdown = (booking) => {
  if (
    ["cancelled", "completed", "no_show", "expired"].includes(
      booking.bookingStatus
    )
  ) {
    return "";
  }

  const start = parseDateTime(
    booking.selectedDate,
    booking.selectedTimeSlot?.startTime
  );
  if (!start) return "";

  const difference = start.getTime() - Date.now();

  if (difference <= 0) return "Reservation time reached";

  const days = Math.floor(difference / 86400000);
  const hours = Math.floor((difference % 86400000) / 3600000);
  const minutes = Math.floor((difference % 3600000) / 60000);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

const escapeIcs = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");

const toIcsDate = (date) =>
  date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const downloadCalendar = (booking) => {
  const start = parseDateTime(
    booking.selectedDate,
    booking.selectedTimeSlot?.startTime
  );
  const end =
    parseDateTime(
      booking.selectedDate,
      booking.selectedTimeSlot?.endTime
    ) || new Date(start.getTime() + 2 * 60 * 60 * 1000);

  if (!start) return;

  const hotelName =
    booking.buffet?.hotel?.hotelName || "DineFor Hotel";
  const title = booking.buffet?.title || "DineFor Buffet";

  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DineFor//Reservation//EN",
    "BEGIN:VEVENT",
    `UID:${booking._id}@dinefor.com`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `LOCATION:${escapeIcs(hotelName)}`,
    `DESCRIPTION:${escapeIcs(
      `DineFor booking ${booking.bookingCode}. Guests: ${booking.seats}.`
    )}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dinefor-${booking.bookingCode}.ics`;
  link.click();
  URL.revokeObjectURL(url);
};

function Timeline({ booking }) {
  const defaultTimeline = [
    {
      status: "confirmed",
      note: "Reservation confirmed.",
      at: booking.createdAt,
    },
  ];

  const timeline =
    booking.statusTimeline?.length > 0
      ? booking.statusTimeline
      : defaultTimeline;

  return (
    <div className="space-y-4">
      {timeline.map((entry, index) => (
        <div
          key={`${entry.status}-${entry.at}-${index}`}
          className="flex gap-3"
        >
          <div className="flex flex-col items-center">
            <span className="w-3 h-3 rounded-full bg-secondary mt-1" />
            {index < timeline.length - 1 && (
              <span className="w-px flex-1 bg-border-subtle mt-1" />
            )}
          </div>
          <div className="pb-4">
            <p className="font-semibold capitalize text-text-deep-green">
              {String(entry.status || "").replaceAll("_", " ")}
            </p>
            <p className="text-sm text-on-surface-variant">
              {entry.note || "Booking status updated."}
            </p>
            {entry.at && (
              <p className="text-xs text-outline mt-1">
                {new Date(entry.at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [, forceCountdownRefresh] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/bookings/my-bookings");
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to load bookings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(
      () => forceCountdownRefresh((value) => value + 1),
      60000
    );
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();

    return bookings.filter((booking) => {
      const date = new Date(booking.selectedDate);
      const finalStatus = [
        "completed",
        "cancelled",
        "no_show",
        "expired",
      ].includes(booking.bookingStatus);

      if (filter === "upcoming") {
        return !finalStatus && date >= new Date(now.toDateString());
      }

      if (filter === "history") {
        return finalStatus || date < new Date(now.toDateString());
      }

      return true;
    });
  }, [bookings, filter]);

  const cancel = async (booking) => {
    const confirmed = window.confirm(
      `Cancel booking ${booking.bookingCode}?`
    );
    if (!confirmed) return;

    try {
      const response = await api.put(
        `/bookings/my-bookings/${booking._id}/cancel`
      );
      setMessage(response.data?.message || "Booking cancelled.");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Booking could not be cancelled."
      );
    }
  };

  return (
    <main className="min-h-screen bg-surface-cream pt-24 sm:pt-28 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div>
          <span className="badge-gold">Reservations</span>
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">
            My Bookings
          </h1>
          <p className="text-on-surface-variant">
            Track upcoming reservations, status history and calendar details.
          </p>
        </div>

        {message && (
          <div className="mt-5 p-3 rounded-xl bg-secondary-container/20 text-secondary">
            {message}
          </div>
        )}

        <div className="flex gap-2 mt-6 overflow-x-auto hide-scrollbar">
          {[
            ["upcoming", "Upcoming"],
            ["history", "History"],
            ["all", "All"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setFilter(value)}
              className={`chip ${
                filter === value ? "chip-active" : ""
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-5 mt-6">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="card-ambient h-72 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid md:grid-cols-2 gap-5 mt-6">
            {filtered.map((booking) => {
              const hotel =
                booking.buffet?.hotel?.hotelName || "Hotel";
              const title =
                booking.buffet?.title || "Buffet Reservation";
              const countdown = getCountdown(booking);
              const canCancel = ![
                "cancelled",
                "checked_in",
                "completed",
                "no_show",
                "expired",
              ].includes(booking.bookingStatus);

              return (
                <article
                  key={booking._id}
                  className="card-ambient p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                        {hotel}
                      </p>
                      <h2 className="font-headline-md text-headline-md text-text-deep-green mt-1">
                        {title}
                      </h2>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        statusStyle[booking.bookingStatus] ||
                        statusStyle.pending
                      }`}
                    >
                      {String(booking.bookingStatus).replaceAll(
                        "_",
                        " "
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="p-3 rounded-xl bg-surface-container-low">
                      <p className="text-xs text-on-surface-variant">
                        Date
                      </p>
                      <p className="font-semibold">
                        {formatDate(booking.selectedDate)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-container-low">
                      <p className="text-xs text-on-surface-variant">
                        Time
                      </p>
                      <p className="font-semibold">
                        {booking.selectedTimeSlot?.startTime} -{" "}
                        {booking.selectedTimeSlot?.endTime}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-container-low">
                      <p className="text-xs text-on-surface-variant">
                        Guests
                      </p>
                      <p className="font-semibold">{booking.seats}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-container-low">
                      <p className="text-xs text-on-surface-variant">
                        Total
                      </p>
                      <p className="font-semibold">
                        Rs.{" "}
                        {Number(
                          booking.grandTotal ||
                            booking.totalAmount ||
                            0
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {countdown && (
                    <div className="mt-4 p-3 rounded-xl bg-highlight-gold/10 text-highlight-gold flex items-center gap-2">
                      <span className="material-symbols-outlined">
                        timer
                      </span>
                      <span className="font-semibold">{countdown}</span>
                    </div>
                  )}

                  <div className="mt-4 text-sm text-on-surface-variant">
                    <p>
                      Booking code:{" "}
                      <strong className="text-text-deep-green">
                        {booking.bookingCode}
                      </strong>
                    </p>
                    <p>
                      Payment:{" "}
                      <strong className="capitalize">
                        {booking.paymentStatus}
                      </strong>
                    </p>
                  </div>

                  <div className="mt-auto pt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(booking)}
                      className="btn-outline"
                    >
                      Timeline
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadCalendar(booking)}
                      className="btn-secondary inline-flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        calendar_add_on
                      </span>
                      Add to Calendar
                    </button>

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => cancel(booking)}
                        className="px-4 py-2 rounded-full border border-error/30 text-error hover:bg-error/10"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <section className="card-ambient p-10 text-center mt-6">
            <span className="material-symbols-outlined text-5xl text-outline">
              event_busy
            </span>
            <h2 className="font-headline-md text-headline-md text-text-deep-green mt-3">
              No bookings found
            </h2>
            <p className="text-on-surface-variant mt-2">
              Your buffet reservations will appear here.
            </p>
          </section>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={() => setSelected(null)}
        >
          <section
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-surface-container-lowest rounded-2xl shadow-ambient-lg p-6"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-secondary text-sm font-semibold">
                  {selected.bookingCode}
                </p>
                <h2 className="font-headline-md text-headline-md text-text-deep-green">
                  Booking Timeline
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-10 h-10 rounded-full grid place-items-center hover:bg-surface-container-low"
                aria-label="Close timeline"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="mt-6">
              <Timeline booking={selected} />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
