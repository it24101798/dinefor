import { useEffect, useState } from "react";
import axios from "axios";

function ReviewModerationPanel() {
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const storedUser = JSON.parse(localStorage.getItem("dineforUser"));
  const headers = { Authorization: `Bearer ${storedUser?.token}` };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/reviews/admin/all", { headers });
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not load reviews. Check reviewRoutes.js.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const updateStatus = async (reviewId, status) => {
    try {
      const res = await axios.put(
        `http://localhost:5000/api/reviews/${reviewId}/status`,
        { status },
        { headers }
      );
      setMessage(res.data.message || "Review updated.");
      fetchReviews();
    } catch (error) {
      setMessage(error.response?.data?.message || "Review action failed.");
    }
  };

  const deleteReview = async (reviewId) => {
    try {
      const res = await axios.delete(`http://localhost:5000/api/reviews/${reviewId}`, { headers });
      setMessage(res.data.message || "Review deleted.");
      fetchReviews();
    } catch (error) {
      setMessage(error.response?.data?.message || "Delete failed.");
    }
  };

  return (
    <section className="panel reveal">
      <div className="section-header">
        <span className="eyebrow">Reviews</span>
        <h2>Review Moderation</h2>
        <p className="muted">Show, hide, or remove customer reviews and photos.</p>
      </div>

      {message && <p className={message.includes("failed") || message.includes("Could") ? "error-text" : "success-text"}>{message}</p>}
      {loading && <p className="muted">Loading reviews...</p>}

      {!loading && reviews.length === 0 ? (
        <p>No reviews found yet.</p>
      ) : (
        <div className="admin-review-grid">
          {reviews.map((review) => (
            <article key={review._id} className="admin-review-card">
              <div className="review-topline">
                <div>
                  <h3>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</h3>
                  <p>{review.user?.name || review.user?.email || "Customer"}</p>
                  <small>{review.hotel?.hotelName} • {review.buffet?.title}</small>
                </div>
                <span className={`status ${review.status}`}>{review.status}</span>
              </div>

              <p>{review.comment || "No comment."}</p>

              {review.images?.length > 0 && (
                <div className="admin-review-photos">
                  {review.images.map((image) => <img src={image} alt="Review" key={image} />)}
                </div>
              )}

              <div className="action-row wrap">
                <button className="btn success" onClick={() => updateStatus(review._id, "published")}>Publish</button>
                <button className="btn warning" onClick={() => updateStatus(review._id, "hidden")}>Hide</button>
                <button className="btn danger" onClick={() => deleteReview(review._id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ReviewModerationPanel;
