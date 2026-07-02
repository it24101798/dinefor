import { useState } from "react";
import axios from "axios";
import MediaUploader from "../MediaUploader";

const ratingLabels = { 5: "Excellent", 4: "Good", 3: "Average", 2: "Poor", 1: "Bad" };

function ReviewForm({ buffetId, onReviewCreated }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitReview = async (e) => {
    e.preventDefault();
    setMessage("");

    const storedUser = JSON.parse(localStorage.getItem("dineforUser"));
    if (!storedUser?.token) {
      setMessage("Please login to review this buffet.");
      return;
    }

    if (comment.trim().length < 5 && images.length === 0 && videos.length === 0) {
      setMessage("Please add a short comment, photo, or video.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(
        "http://localhost:5000/api/reviews",
        { buffetId, rating: Number(rating), comment: comment.trim(), images, videos },
        { headers: { Authorization: `Bearer ${storedUser.token}` } }
      );

      setMessage(res.data.message || "Review added successfully.");
      setComment("");
      setRating(5);
      setImages([]);
      setVideos([]);
      onReviewCreated?.();
    } catch (error) {
      setMessage(error.response?.data?.message || "Review failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleRating = hoverRating || rating;

  return (
    <form onSubmit={submitReview} className="google-review-form beach-review-form">
      <div className="review-form-head">
        <span className="eyebrow">Customer Experience</span>
        <h3>Rate this buffet</h3>
        <p className="muted">Guests and approved hotel users can browse and review like a normal customer.</p>
      </div>

      <div className="star-rating-row" onMouseLeave={() => setHoverRating(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" className={star <= visibleRating ? "star-btn active" : "star-btn"} onMouseEnter={() => setHoverRating(star)} onClick={() => setRating(star)} aria-label={`${star} star rating`}>★</button>
        ))}
        <strong>{ratingLabels[visibleRating]}</strong>
      </div>

      <textarea className="google-review-textarea" placeholder="Share your experience: food quality, service, atmosphere, value..." value={comment} onChange={(e) => setComment(e.target.value)} rows="5" maxLength="1200" />
      <small className="muted-text">{comment.length}/1200 characters</small>

      <div className="review-media-upload-grid">
        <div className="google-photo-upload">
          <div><h4>Add photos</h4><p className="muted">Photos build trust like Google Maps.</p></div>
          <MediaUploader multiple accept="image/*" label="+ Add review photos" onUpload={(data) => data.mediaType === "image" && setImages((prev) => [...prev, data.fileUrl].slice(0, 8))} />
        </div>

        <div className="google-photo-upload">
          <div><h4>Add videos</h4><p className="muted">Short buffet clips make the feed feel alive.</p></div>
          <MediaUploader multiple accept="video/*" label="+ Add review videos" onUpload={(data) => data.mediaType === "video" && setVideos((prev) => [...prev, data.fileUrl].slice(0, 4))} />
        </div>
      </div>

      {(images.length > 0 || videos.length > 0) && (
        <div className="review-photo-preview-grid">
          {images.map((image) => (
            <div className="review-photo-preview" key={image}><img src={image} alt="Review preview" /><button type="button" onClick={() => setImages((prev) => prev.filter((item) => item !== image))}>×</button></div>
          ))}
          {videos.map((video) => (
            <div className="review-photo-preview" key={video}><video src={video} controls /><button type="button" onClick={() => setVideos((prev) => prev.filter((item) => item !== video))}>×</button></div>
          ))}
        </div>
      )}

      <button className="btn primary wide" disabled={submitting}>{submitting ? "Publishing..." : "Publish Review"}</button>

      {message && <p className={message.toLowerCase().includes("failed") || message.toLowerCase().includes("login") || message.toLowerCase().includes("please") ? "error-text" : "success-text"}>{message}</p>}
    </form>
  );
}

export default ReviewForm;
