import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const iconByType = {
  booking: "event_available",
  review: "rate_review",
  offer: "local_offer",
  reminder: "notifications_active",
  system: "info",
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/notifications");
      setNotifications(response.data?.notifications || []);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => !item.isRead);
    }

    if (filter === "read") {
      return notifications.filter((item) => item.isRead);
    }

    return notifications;
  }, [filter, notifications]);

  const unreadCount = notifications.filter(
    (item) => !item.isRead
  ).length;

  const markRead = async (notification) => {
    if (notification.isRead) return;

    setNotifications((items) =>
      items.map((item) =>
        item._id === notification._id
          ? { ...item, isRead: true }
          : item
      )
    );

    try {
      await api.put(`/notifications/${notification._id}/read`);
    } catch {
      await load();
    }
  };

  const markAllRead = async () => {
    setNotifications((items) =>
      items.map((item) => ({ ...item, isRead: true }))
    );

    try {
      await api.put("/notifications/read-all");
    } catch {
      await load();
    }
  };

  const remove = async (id) => {
    const previous = notifications;
    setNotifications((items) =>
      items.filter((item) => item._id !== id)
    );

    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      setNotifications(previous);
    }
  };

  const clearRead = async () => {
    const previous = notifications;
    setNotifications((items) =>
      items.filter((item) => !item.isRead)
    );

    try {
      await api.delete("/notifications/clear-read");
    } catch {
      setNotifications(previous);
    }
  };

  return (
    <main className="min-h-screen bg-surface-cream pt-24 sm:pt-28 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="badge-gold">Customer Updates</span>
            <h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">
              Notifications
            </h1>
            <p className="text-on-surface-variant">
              Booking updates, reminders and important DineFor messages.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unreadCount}
              className="btn-outline"
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={clearRead}
              className="btn-secondary"
            >
              Clear read
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-5 p-3 rounded-xl bg-error/10 text-error">
            {message}
          </div>
        )}

        <div className="flex gap-2 mt-6 overflow-x-auto hide-scrollbar">
          {[
            ["all", `All (${notifications.length})`],
            ["unread", `Unread (${unreadCount})`],
            [
              "read",
              `Read (${notifications.length - unreadCount})`,
            ],
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
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="card-ambient h-28 animate-pulse"
              />
            ))}
          </div>
        ) : visible.length ? (
          <div className="mt-6 space-y-3">
            {visible.map((notification) => (
              <article
                key={notification._id}
                className={`card-ambient p-4 sm:p-5 flex gap-4 ${
                  notification.isRead
                    ? "opacity-75"
                    : "border-secondary/30"
                }`}
              >
                <div
                  className={`w-11 h-11 shrink-0 rounded-full grid place-items-center ${
                    notification.isRead
                      ? "bg-surface-container-high text-on-surface-variant"
                      : "bg-secondary-container/30 text-secondary"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {iconByType[notification.type] || "info"}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <h2 className="font-label-md text-label-md text-text-deep-green">
                        {notification.title}
                      </h2>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                        {notification.message}
                      </p>
                    </div>

                    {!notification.isRead && (
                      <span className="badge-mint self-start">
                        New
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="font-label-sm text-label-sm text-outline">
                      {formatTime(notification.createdAt)}
                    </span>

                    {notification.link && (
                      <Link
                        to={notification.link}
                        onClick={() => markRead(notification)}
                        className="text-secondary font-label-sm text-label-sm hover:underline"
                      >
                        View details
                      </Link>
                    )}

                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={() => markRead(notification)}
                        className="text-secondary font-label-sm text-label-sm hover:underline"
                      >
                        Mark read
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => remove(notification._id)}
                      className="text-error font-label-sm text-label-sm hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="card-ambient p-10 text-center mt-6">
            <span className="material-symbols-outlined text-5xl text-outline">
              notifications_off
            </span>
            <h2 className="font-headline-md text-headline-md text-text-deep-green mt-3">
              No notifications here
            </h2>
            <p className="text-on-surface-variant mt-2">
              New booking updates and reminders will appear here.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
