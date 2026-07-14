import { useEffect, useState } from "react";
import api from "../../services/api";

const API = "http://localhost:5000/api";

function HotelReviewsWorkspace({ headers, setMessage }) {
  const [reviews, setReviews] = useState([]);
  const [filters, setFilters] = useState({ status: "published", rating: "all" });
  const [replyText, setReplyText] = useState({});
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => value && value !== "all" && params.append(key, value));
      const res = await api.get(`${API}/hotel-portal/reviews?${params.toString()}`, { headers });
      setReviews(res.data || []);
    } catch (error) {
      setMessage?.(error.response?.data?.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReviews(); }, [filters.status, filters.rating]);

  const saveReply = async (reviewId) => {
    try {
      await api.put(`${API}/hotel-portal/reviews/${reviewId}/reply`, { reply: replyText[reviewId] }, { headers });
      setReplyText({ ...replyText, [reviewId]: "" });
      setMessage?.("Review reply saved successfully ✅");
      loadReviews();
    } catch (error) {
      setMessage?.(error.response?.data?.message || "Failed to save reply.");
    }
  };

  return (
    <section className="hotel-panel">
      <div className="hotel-panel-head">
        <div><span className="eyebrow">Guest Reviews</span><h2>Google Business style review workspace</h2><p>Read feedback, filter by rating, and reply professionally as the hotel.</p></div>
      </div>

      <div className="hotel-filter-bar">
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="published">Published</option><option value="hidden">Hidden</option><option value="all">All</option>
        </select>
        <select value={filters.rating} onChange={(e) => setFilters({ ...filters, rating: e.target.value })}>
          <option value="all">All ratings</option><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option>
        </select>
      </div>

      {loading ? <p className="muted">Loading reviews...</p> : reviews.length === 0 ? <p className="empty-state">No reviews found.</p> : (
        <div className="hotel-review-grid">
          {reviews.map((review) => (
            <article className="hotel-review-card" key={review._id}>
              <div className="review-topline"><strong>{review.user?.name || "Guest"}</strong><span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div>
              <small>{review.buffet?.title || "Buffet"} · {new Date(review.createdAt).toLocaleDateString()}</small>
              <p>{review.comment || "No written review."}</p>
              {review.images?.length > 0 && <div className="review-media-row">{review.images.slice(0, 4).map((img) => <img key={img} src={img.startsWith("http") ? img : `http://localhost:5000${img}`} alt="review" />)}</div>}
              {review.hotelReply?.message && <div className="hotel-reply"><strong>Your reply</strong><p>{review.hotelReply.message}</p></div>}
              <textarea placeholder="Write a professional reply..." value={replyText[review._id] || ""} onChange={(e) => setReplyText({ ...replyText, [review._id]: e.target.value })} />
              <button className="mini-btn" onClick={() => saveReply(review._id)}>Save Reply</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default HotelReviewsWorkspace;
