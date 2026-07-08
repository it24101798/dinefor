import React, { useState } from "react";

function ReviewList({ reviews = [], maxDisplay = 5, showImages = true }) {
  const [showAll, setShowAll] = useState(false);

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="material-symbols-outlined text-4xl text-outline mb-2 block">rate_review</span>
        <p className="font-body-md text-body-md text-on-surface-variant">No reviews yet.</p>
        <p className="font-label-sm text-label-sm text-outline">Be the first to review this experience!</p>
      </div>
    );
  }

  const displayedReviews = showAll ? reviews : reviews.slice(0, maxDisplay);

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(r.rating || 0) === star).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { star, count, percentage };
  });

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="flex flex-col md:flex-row gap-6 p-4 rounded-xl bg-surface-container-low">
        <div className="text-center md:text-left">
          <p className="text-3xl font-bold text-text-deep-green">{averageRating.toFixed(1)}</p>
          <div className="flex items-center gap-1 text-highlight-gold justify-center md:justify-start">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: i < Math.round(averageRating) ? "'FILL' 1" : "'FILL' 0" }}
              >
                star
              </span>
            ))}
          </div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">{reviews.length} reviews</p>
        </div>

        <div className="flex-1 space-y-1">
          {ratingDistribution.map(({ star, percentage }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant w-8">{star}★</span>
              <div className="flex-1 h-2 bg-border-subtle rounded-full overflow-hidden">
                <div className="h-full bg-highlight-gold rounded-full transition-all" style={{ width: `${percentage}%` }} />
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant w-8 text-right">{Math.round(percentage)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {displayedReviews.map((review) => (
          <div
            key={review._id}
            className="p-4 rounded-xl border border-border-subtle bg-surface-container-lowest hover:border-secondary/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-md text-label-md text-text-deep-green">
                  {review.user?.name || "Guest"}
                </span>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1 text-highlight-gold">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="material-symbols-outlined text-[16px]"
                    style={{
                      fontVariationSettings: i < (review.rating || 0) ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    star
                  </span>
                ))}
              </div>
            </div>

            {review.comment && (
              <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
                {review.comment}
              </p>
            )}

            {showImages && review.images && review.images.length > 0 && (
              <div className="flex gap-2 mt-3">
                {review.images.slice(0, 4).map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Review ${idx + 1}`}
                    className="w-16 h-16 rounded-lg object-cover border border-border-subtle"
                  />
                ))}
                {review.images.length > 4 && (
                  <div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center border border-border-subtle">
                    <span className="font-label-sm text-label-sm text-outline">+{review.images.length - 4}</span>
                  </div>
                )}
              </div>
            )}

            {review.booking && (
              <div className="mt-2 pt-2 border-t border-border-subtle">
                <span className="badge-mint text-xs">✓ Verified Booking</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {reviews.length > maxDisplay && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-secondary font-label-md text-label-md hover:underline transition-colors"
        >
          {showAll ? "Show less" : `Show all ${reviews.length} reviews`}
        </button>
      )}
    </div>
  );
}

export default ReviewList;