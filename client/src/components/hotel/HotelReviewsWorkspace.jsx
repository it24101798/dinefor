import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";

export default function HotelReviewsWorkspace({
  headers,
  setMessage,
}) {
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [filters, setFilters] = useState({
    status: "all",
    rating: "all",
  });
  const [replyText, setReplyText] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "all") params.set(key, value);
    });

    return params.toString();
  }, [filters]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/reviews/hotel-workspace/me${query ? `?${query}` : ""}`,
        { headers }
      );
      setReviews(response.data?.reviews || []);
      setAnalytics(response.data?.analytics || {});
    } catch (error) {
      setMessage?.(
        error.response?.data?.message ||
          "Failed to load hotel reviews."
      );
    } finally {
      setLoading(false);
    }
  }, [headers, query, setMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const saveReply = async (review) => {
    const message =
      replyText[review._id]?.trim() ||
      review.hotelReply?.message ||
      "";

    if (!message) {
      setMessage?.("Write a reply before saving.");
      return;
    }

    try {
      setSavingId(review._id);
      await api.put(
        `/reviews/${review._id}/reply`,
        { message },
        { headers }
      );
      setMessage?.("Hotel reply saved.");
      setReplyText((current) => ({
        ...current,
        [review._id]: "",
      }));
      await load();
    } catch (error) {
      setMessage?.(
        error.response?.data?.message ||
          "Reply could not be saved."
      );
    } finally {
      setSavingId("");
    }
  };

  return (
    <section className="hotel-panel">
      <div className="hotel-panel-head">
        <div>
          <span className="eyebrow">Reputation</span>
          <h2>Guest Reviews & Replies</h2>
          <p>
            Track verified feedback, rating distribution and hotel response performance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          ["Average Rating", Number(analytics.averageRating || 0).toFixed(1)],
          ["Published", analytics.publishedReviews || 0],
          ["Response Rate", `${analytics.responseRate || 0}%`],
          ["Reports", analytics.pendingReports || 0],
        ].map(([label, value]) => (
          <div key={label} className="card-ambient p-4 text-center">
            <strong className="text-2xl text-text-deep-green">
              {value}
            </strong>
            <p className="text-sm text-on-surface-variant">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="hotel-filter-bar">
        <select
          value={filters.status}
          onChange={(event) =>
            setFilters({
              ...filters,
              status: event.target.value,
            })
          }
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="pending">Pending moderation</option>
          <option value="hidden">Hidden</option>
        </select>

        <select
          value={filters.rating}
          onChange={(event) =>
            setFilters({
              ...filters,
              rating: event.target.value,
            })
          }
        >
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={rating}>
              {rating} stars
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="muted">Loading reviews…</p>
      ) : reviews.length ? (
        <div className="hotel-review-grid">
          {reviews.map((review) => (
            <article className="hotel-review-card" key={review._id}>
              <div className="review-topline">
                <div>
                  <strong>{review.user?.name || "Guest"}</strong>
                  <p>
                    {"★".repeat(Math.round(review.rating))}
                    {"☆".repeat(5 - Math.round(review.rating))}
                  </p>
                </div>

                <span className={`status ${review.status}`}>
                  {review.status}
                </span>
              </div>

              <small>
                {review.buffet?.title || "Buffet"} ·{" "}
                {new Date(review.createdAt).toLocaleDateString()}
              </small>

              {review.title && <h3>{review.title}</h3>}
              <p>{review.comment}</p>

              <div className="flex flex-wrap gap-2">
                <span className="badge-mint">Verified Booking</span>
                <span className="badge">
                  {review.helpfulVotes?.length || 0} helpful
                </span>
              </div>

              {review.images?.length > 0 && (
                <div className="review-media-row">
                  {review.images.slice(0, 4).map((image) => (
                    <img
                      src={image}
                      alt="Review"
                      key={image}
                      loading="lazy"
                    />
                  ))}
                </div>
              )}

              {review.hotelReply?.message && (
                <div className="hotel-reply">
                  <strong>Your public reply</strong>
                  <p>{review.hotelReply.message}</p>
                </div>
              )}

              <textarea
                placeholder="Write a professional response…"
                maxLength={1200}
                value={
                  replyText[review._id] ??
                  review.hotelReply?.message ??
                  ""
                }
                onChange={(event) =>
                  setReplyText({
                    ...replyText,
                    [review._id]: event.target.value,
                  })
                }
              />

              <button
                type="button"
                className="mini-btn"
                disabled={savingId === review._id}
                onClick={() => saveReply(review)}
              >
                {savingId === review._id
                  ? "Saving…"
                  : review.hotelReply?.message
                    ? "Update Reply"
                    : "Publish Reply"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">No reviews match these filters.</p>
      )}
    </section>
  );
}
