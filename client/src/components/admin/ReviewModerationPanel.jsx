import React, { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

export default function ReviewModerationPanel() {
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [filter, setFilter] = useState("all");
  const [reportedOnly, setReportedOnly] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (reportedOnly) params.set("reported", "true");

      const response = await api.get(
        `/reviews/admin/all${params.toString() ? `?${params}` : ""}`
      );

      setReviews(response.data?.reviews || []);
      setAnalytics(response.data?.analytics || {});
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not load review moderation."
      );
    } finally {
      setLoading(false);
    }
  }, [filter, reportedOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (review, updates) => {
    try {
      await api.put(
        `/reviews/${review._id}/moderation`,
        updates
      );
      setMessage("Review moderation updated.");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Review action failed."
      );
    }
  };

  const remove = async (review) => {
    if (!window.confirm("Permanently delete this review?")) return;

    try {
      await api.delete(`/reviews/${review._id}/admin`);
      setMessage("Review permanently deleted.");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Delete failed."
      );
    }
  };

  return (
    <section className="panel reveal admin-feature-panel">
      <div className="section-header">
        <span className="eyebrow">Trust & Safety</span>
        <h2>Review Moderation</h2>
        <p className="muted">
          Moderate reports, feature trusted reviews and protect customers and hotels.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          ["All", analytics.totalReviews || 0],
          ["Published", analytics.published || 0],
          ["Pending", analytics.pending || 0],
          ["Reported", analytics.reported || 0],
          ["Featured", analytics.featured || 0],
        ].map(([label, value]) => (
          <div key={label} className="card-ambient p-3 text-center">
            <strong className="text-xl">{value}</strong>
            <p className="text-xs text-on-surface-variant">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <select
          className="form-select"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="pending">Pending</option>
          <option value="hidden">Hidden</option>
          <option value="rejected">Rejected</option>
        </select>

        <label className="flex items-center gap-2 p-2">
          <input
            type="checkbox"
            checked={reportedOnly}
            onChange={(event) =>
              setReportedOnly(event.target.checked)
            }
          />
          Reported only
        </label>
      </div>

      {message && <p className="success-text">{message}</p>}
      {loading && <p className="muted">Loading reviews…</p>}

      {!loading && !reviews.length ? (
        <p className="empty-state">No reviews match this filter.</p>
      ) : (
        <div className="admin-review-grid">
          {reviews.map((review) => (
            <article key={review._id} className="admin-review-card">
              <div className="review-topline">
                <div>
                  <h3>
                    {"★".repeat(Math.round(review.rating))}
                    {"☆".repeat(5 - Math.round(review.rating))}
                  </h3>
                  <p>{review.user?.name || "Customer"}</p>
                  <small>
                    {review.hotel?.hotelName} ·{" "}
                    {review.buffet?.title}
                  </small>
                </div>
                <span className={`status ${review.status}`}>
                  {review.status}
                </span>
              </div>

              {review.title && <strong>{review.title}</strong>}
              <p>{review.comment}</p>

              <div className="flex flex-wrap gap-2">
                <span className="badge-mint">Verified Booking</span>
                <span className="badge">
                  {review.helpfulVotes?.length || 0} helpful
                </span>
                <span className="badge">
                  {review.reports?.length || 0} reports
                </span>
                {review.isFeatured && (
                  <span className="badge-gold">Featured</span>
                )}
              </div>

              {review.reports?.length > 0 && (
                <details className="mt-3">
                  <summary>View reports</summary>
                  <ul>
                    {review.reports.map((report) => (
                      <li key={report._id}>
                        {report.reason}:{" "}
                        {report.details || "No details"}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {review.images?.length > 0 && (
                <div className="admin-review-photos">
                  {review.images.slice(0, 6).map((image) => (
                    <img src={image} alt="Review" key={image} />
                  ))}
                </div>
              )}

              <div className="action-row wrap">
                <button
                  className="btn success"
                  onClick={() =>
                    moderate(review, { status: "published" })
                  }
                >
                  Publish
                </button>
                <button
                  className="btn warning"
                  onClick={() =>
                    moderate(review, { status: "hidden" })
                  }
                >
                  Hide
                </button>
                <button
                  className="btn"
                  onClick={() =>
                    moderate(review, {
                      isFeatured: !review.isFeatured,
                    })
                  }
                >
                  {review.isFeatured ? "Unfeature" : "Feature"}
                </button>
                <button
                  className="btn danger"
                  onClick={() => remove(review)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
