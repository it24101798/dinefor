import React, { useState } from "react";

function ReviewList({ reviews = [], maxDisplay = 5 }) {
  const [showAll, setShowAll] = useState(false);

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="material-symbols-outlined text-4xl text-outline mb-2 block">rate_review</span>
        <p className="font-body-md text-body-md text-on-surface-variant">No reviews yet.</p>
      </div>
    );
  }

  const displayedReviews = showAll ? reviews : reviews.slice(0, maxDisplay);

  return (
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
                  className="material-symbols-outlined text-[18px]"
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

          {review.images && review.images.length > 0 && (
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
        </div>
      ))}

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