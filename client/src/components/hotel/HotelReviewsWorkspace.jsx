import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

function getReviewImageUrl(image) {
  if (!image) return "";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  const normalizedPath = image.startsWith("/")
    ? image
    : `/${image}`;

  return `${API_ORIGIN}${normalizedPath}`;
}

function HotelReviewsWorkspace({ headers, setMessage }) {
  const [reviews, setReviews] = useState([]);
  const [filters, setFilters] = useState({
    status: "published",
    rating: "all",
  });
  const [replyText, setReplyText] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingReviewId, setSavingReviewId] = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.append(key, value);
      }
    });

    return params.toString();
  }, [filters]);

  const loadReviews = async () => {
    try {
      setLoading(true);

      const endpoint = queryString
        ? `/hotel-portal/reviews?${queryString}`
        : "/hotel-portal/reviews";

      const response = await api.get(endpoint, { headers });

      setReviews(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (error) {
      console.error("Review loading error:", error);

      setMessage?.(
        error.response?.data?.message ||
          "Failed to load reviews."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [queryString]);

  const saveReply = async (reviewId) => {
    const reply = replyText[reviewId]?.trim();

    if (!reply) {
      setMessage?.("Please enter a reply before saving.");
      return;
    }

    try {
      setSavingReviewId(reviewId);

      await api.put(
        `/hotel-portal/reviews/${reviewId}/reply`,
        { reply },
        { headers }
      );

      setReplyText((current) => ({
        ...current,
        [reviewId]: "",
      }));

      setMessage?.("Review reply saved successfully.");
      await loadReviews();
    } catch (error) {
      console.error("Review reply error:", error);

      setMessage?.(
        error.response?.data?.message ||
          "Failed to save reply."
      );
    } finally {
      setSavingReviewId(null);
    }
  };

  return (
    <section className="hotel-panel">
      <div className="hotel-panel-head">
        <div>
          <span className="eyebrow">Guest Reviews</span>

          <h2>Google Business style review workspace</h2>

          <p>
            Read feedback, filter by rating, and reply
            professionally as the hotel.
          </p>
        </div>
      </div>

      <div className="hotel-filter-bar">
        <select
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: event.target.value,
            }))
          }
        >
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
          <option value="all">All</option>
        </select>

        <select
          value={filters.rating}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              rating: event.target.value,
            }))
          }
        >
          <option value="all">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </div>

      {loading ? (
        <p className="muted">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="empty-state">No reviews found.</p>
      ) : (
        <div className="hotel-review-grid">
          {reviews.map((review) => {
            const rating = Math.max(
              0,
              Math.min(5, Number(review.rating || 0))
            );

            return (
              <article
                className="hotel-review-card"
                key={review._id}
              >
                <div className="review-topline">
                  <strong>
                    {review.user?.name || "Guest"}
                  </strong>

                  <span aria-label={`${rating} out of 5 stars`}>
                    {"★".repeat(rating)}
                    {"☆".repeat(5 - rating)}
                  </span>
                </div>

                <small>
                  {review.buffet?.title || "Buffet"} ·{" "}
                  {review.createdAt
                    ? new Date(
                        review.createdAt
                      ).toLocaleDateString()
                    : "-"}
                </small>

                <p>
                  {review.comment || "No written review."}
                </p>

                {Array.isArray(review.images) &&
                  review.images.length > 0 && (
                    <div className="review-media-row">
                      {review.images
                        .slice(0, 4)
                        .map((image, index) => {
                          const imageUrl =
                            getReviewImageUrl(image);

                          if (!imageUrl) return null;

                          return (
                            <img
                              key={`${image}-${index}`}
                              src={imageUrl}
                              alt={`Review upload ${index + 1}`}
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display =
                                  "none";
                              }}
                            />
                          );
                        })}
                    </div>
                  )}

                {review.hotelReply?.message && (
                  <div className="hotel-reply">
                    <strong>Your reply</strong>
                    <p>{review.hotelReply.message}</p>
                  </div>
                )}

                <textarea
                  placeholder="Write a professional reply..."
                  value={replyText[review._id] || ""}
                  onChange={(event) =>
                    setReplyText((current) => ({
                      ...current,
                      [review._id]: event.target.value,
                    }))
                  }
                  maxLength={1000}
                />

                <button
                  type="button"
                  className="mini-btn"
                  disabled={savingReviewId === review._id}
                  onClick={() => saveReply(review._id)}
                >
                  {savingReviewId === review._id
                    ? "Saving..."
                    : "Save Reply"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default HotelReviewsWorkspace;