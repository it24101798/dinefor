import React, { useMemo, useState } from "react";
import api from "../../services/api";

const categoryLabels = {
  food: "Food",
  service: "Service",
  ambience: "Ambience",
  value: "Value",
};

function StarRow({ value, size = "text-[18px]" }) {
  const rating = Math.round(Number(value || 0));

  return (
    <div className="flex text-highlight-gold" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`material-symbols-outlined ${size}`}
          style={{
            fontVariationSettings:
              star <= rating ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          star
        </span>
      ))}
    </div>
  );
}

function MediaGallery({ review }) {
  const [active, setActive] = useState(null);
  const media = [
    ...(review.images || []).map((url) => ({
      type: "image",
      url,
    })),
    ...(review.videos || []).map((url) => ({
      type: "video",
      url,
    })),
  ];

  if (!media.length) return null;

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
        {media.slice(0, 8).map((item, index) => (
          <button
            type="button"
            key={`${item.url}-${index}`}
            onClick={() => setActive(item)}
            className="aspect-square rounded-xl overflow-hidden bg-surface-container-high"
          >
            {item.type === "video" ? (
              <video
                src={item.url}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={item.url}
                alt="Customer review"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            )}
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 p-4 grid place-items-center"
          onMouseDown={() => setActive(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white w-11 h-11 rounded-full bg-white/10"
            onClick={() => setActive(null)}
          >
            ×
          </button>

          {active.type === "video" ? (
            <video
              src={active.url}
              controls
              autoPlay
              className="max-w-full max-h-[85vh]"
              onMouseDown={(event) => event.stopPropagation()}
            />
          ) : (
            <img
              src={active.url}
              alt="Review"
              className="max-w-full max-h-[85vh] object-contain"
              onMouseDown={(event) => event.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}

export default function ReviewList({
  reviews = [],
  analytics = null,
  maxDisplay = 5,
  currentUserId = "",
  onRefresh,
}) {
  const [showAll, setShowAll] = useState(false);
  const [reporting, setReporting] = useState(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [message, setMessage] = useState("");

  const summary = useMemo(() => {
    if (analytics) return analytics;

    const totalReviews = reviews.length;
    const averageRating = totalReviews
      ? reviews.reduce(
          (sum, review) => sum + Number(review.rating || 0),
          0
        ) / totalReviews
      : 0;

    return {
      totalReviews,
      averageRating,
      distribution: [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter(
          (review) => Math.round(review.rating) === star
        ).length,
      })),
    };
  }, [analytics, reviews]);

  const voteHelpful = async (review) => {
    try {
      await api.put(`/reviews/${review._id}/helpful`);
      onRefresh?.();
    } catch (error) {
      setMessage(
        error.response?.status === 401
          ? "Sign in to vote on reviews."
          : error.response?.data?.message ||
              "Helpful vote failed."
      );
    }
  };

  const submitReport = async () => {
    try {
      await api.post(`/reviews/${reporting._id}/report`, {
        reason: reportReason,
        details: reportDetails,
      });
      setMessage("Review submitted for moderation.");
      setReporting(null);
      setReportDetails("");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Report could not be submitted."
      );
    }
  };

  if (!reviews.length) {
    return (
      <section className="card-ambient p-8 text-center">
        <span className="material-symbols-outlined text-5xl text-outline">
          rate_review
        </span>
        <h3 className="font-headline-md text-headline-md text-text-deep-green mt-2">
          No verified reviews yet
        </h3>
        <p className="text-on-surface-variant mt-1">
          Reviews from completed reservations will appear here.
        </p>
      </section>
    );
  }

  const displayed = showAll
    ? reviews
    : reviews.slice(0, maxDisplay);

  return (
    <div className="space-y-6">
      <section className="card-ambient p-5 sm:p-6 grid md:grid-cols-[180px_1fr] gap-6">
        <div className="text-center md:text-left">
          <p className="text-5xl font-semibold text-text-deep-green">
            {Number(summary.averageRating || 0).toFixed(1)}
          </p>
          <StarRow value={summary.averageRating} size="text-2xl" />
          <p className="text-on-surface-variant mt-1">
            {summary.totalReviews} verified reviews
          </p>
        </div>

        <div className="space-y-2">
          {(summary.distribution || []).map((item) => {
            const percentage = summary.totalReviews
              ? (item.count / summary.totalReviews) * 100
              : 0;

            return (
              <div
                key={item.star}
                className="grid grid-cols-[36px_1fr_35px] items-center gap-2"
              >
                <span className="text-sm">{item.star}★</span>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-highlight-gold"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-right">
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>

        {summary.categoryAverages && (
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(summary.categoryAverages).map(
              ([key, value]) => (
                <div
                  key={key}
                  className="p-3 rounded-xl bg-surface-container-low text-center"
                >
                  <p className="text-xs text-on-surface-variant">
                    {categoryLabels[key]}
                  </p>
                  <strong className="text-text-deep-green">
                    {Number(value || 0).toFixed(1)}
                  </strong>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {message && (
        <div className="p-3 rounded-xl bg-surface-container-low text-on-surface-variant">
          {message}
        </div>
      )}

      <div className="space-y-4">
        {displayed.map((review) => {
          const hasVoted = (review.helpfulVotes || []).some(
            (id) => String(id) === String(currentUserId)
          );

          return (
            <article
              key={review._id}
              className="card-ambient p-5 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-secondary-container/30 text-secondary grid place-items-center font-semibold shrink-0">
                    {review.user?.avatarUrl ? (
                      <img
                        src={review.user.avatarUrl}
                        alt={review.user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      review.user?.name?.[0]?.toUpperCase() || "G"
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-text-deep-green">
                      {review.user?.name || "DineFor Guest"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <StarRow value={review.rating} />
                      {review.isVerifiedBooking && (
                        <span className="badge-mint inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">
                            verified
                          </span>
                          Verified Booking
                        </span>
                      )}
                      {review.isFeatured && (
                        <span className="badge-gold">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <time className="text-sm text-outline">
                  {new Date(review.createdAt).toLocaleDateString()}
                </time>
              </div>

              {review.title && (
                <h3 className="font-headline-md text-headline-md text-text-deep-green mt-4">
                  {review.title}
                </h3>
              )}

              <p className="font-body-md text-body-md text-on-surface-variant mt-2 whitespace-pre-line">
                {review.comment}
              </p>

              {review.ratings && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {Object.entries(review.ratings)
                    .filter(([, value]) => value)
                    .map(([key, value]) => (
                      <span
                        key={key}
                        className="px-3 py-1.5 rounded-full bg-surface-container-low text-sm"
                      >
                        {categoryLabels[key]} {value}/5
                      </span>
                    ))}
                </div>
              )}

              <MediaGallery review={review} />

              {review.hotelReply?.message && (
                <div className="mt-5 p-4 rounded-xl bg-secondary-container/15 border-l-4 border-secondary">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">
                      business
                    </span>
                    <strong className="text-text-deep-green">
                      Response from the hotel
                    </strong>
                  </div>
                  <p className="text-on-surface-variant mt-2">
                    {review.hotelReply.message}
                  </p>
                  {review.hotelReply.repliedAt && (
                    <p className="text-xs text-outline mt-2">
                      {new Date(
                        review.hotelReply.repliedAt
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => voteHelpful(review)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border ${
                    hasVoted
                      ? "bg-secondary text-white border-secondary"
                      : "border-border-subtle hover:bg-surface-container-low"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    thumb_up
                  </span>
                  Helpful ({review.helpfulVotes?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setReporting(review)}
                  className="text-sm text-on-surface-variant hover:text-error"
                >
                  Report review
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {reviews.length > maxDisplay && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="btn-outline w-full"
        >
          {showAll ? "Show Fewer Reviews" : "Show All Reviews"}
        </button>
      )}

      {reporting && (
        <div
          className="fixed inset-0 z-[130] bg-black/50 p-4 grid place-items-center"
          onMouseDown={() => setReporting(null)}
        >
          <section
            className="w-full max-w-md card-ambient p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 className="font-headline-md text-headline-md text-text-deep-green">
              Report Review
            </h3>
            <p className="text-on-surface-variant mt-1">
              DineFor will review this privately.
            </p>

            <select
              className="form-select w-full mt-4"
              value={reportReason}
              onChange={(event) =>
                setReportReason(event.target.value)
              }
            >
              <option value="spam">Spam</option>
              <option value="abusive">Abusive content</option>
              <option value="irrelevant">Irrelevant</option>
              <option value="privacy">Privacy concern</option>
              <option value="misleading">Misleading</option>
              <option value="other">Other</option>
            </select>

            <textarea
              className="form-textarea w-full mt-3"
              rows="3"
              maxLength={500}
              value={reportDetails}
              onChange={(event) =>
                setReportDetails(event.target.value)
              }
              placeholder="Optional details"
            />

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setReporting(null)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReport}
                className="btn-primary flex-1"
              >
                Submit Report
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
