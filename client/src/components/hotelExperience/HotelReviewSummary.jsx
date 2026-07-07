import React from "react";

function HotelReviewSummary({ summary, reviews }) {
  if (!summary || summary.total === 0) {
    return null;
  }

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline-md text-headline-md text-text-deep-green">Reviews</h2>
        <span className="flex items-center gap-1 text-highlight-gold">
          <span className="material-symbols-outlined">star</span>
          {summary.average?.toFixed(1)} ({summary.total})
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews?.slice(0, 4).map((review) => (
          <div key={review._id} className="p-4 rounded-xl border border-border-subtle bg-surface-container-lowest">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-text-deep-green">{review.user?.name || "Guest"}</span>
              <div className="flex items-center gap-1 text-highlight-gold">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: i < (review.rating || 0) ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                ))}
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">{review.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HotelReviewSummary;