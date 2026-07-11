import React, { useState } from "react";
import api from "../../services/api";

function ReviewForm({ buffetId, hotelId, onReviewCreated }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem("dineforUser") || "null");

  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files) return;

    const filePromises = Array.from(files).map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then((results) => {
      setImages((prev) => [...prev, ...results]);
    });
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!storedUser?.token) {
      setMessage("Please login to leave a review.");
      return;
    }

    if (!comment.trim()) {
      setMessage("Please write a review comment.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        rating,
        comment: comment.trim(),
        images,
        buffetId,
        hotelId,
      };

      await api.post("/reviews", payload, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });

      setMessage("✅ Review submitted successfully!");
      setIsSubmitted(true);
      setComment("");
      setRating(5);
      setImages([]);

      if (onReviewCreated) onReviewCreated();

      setTimeout(() => {
        setIsSubmitted(false);
        setMessage("");
      }, 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-6 rounded-xl bg-secondary-container/20 border border-secondary/30 text-center">
        <span className="material-symbols-outlined text-4xl text-secondary mb-2 block">check_circle</span>
        <h4 className="font-headline-md text-headline-md text-text-deep-green">Thank You!</h4>
        <p className="font-body-md text-body-md text-on-surface-variant">Your review has been submitted.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl border border-border-subtle bg-surface-container-lowest">
      <div>
        <h3 className="font-headline-md text-headline-md text-text-deep-green">Write a Review</h3>
        <p className="font-label-sm text-label-sm text-on-surface-variant">Share your experience</p>
      </div>

      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-2">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{
                  fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0",
                  color: star <= rating ? "#D4AF37" : "#c3c8c1",
                }}
              >
                star
              </span>
            </button>
          ))}
          <span className="font-label-md text-label-md text-on-surface-variant ml-2">{rating}/5</span>
        </div>
      </div>

      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Comment *</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe your experience..."
          className="form-textarea w-full"
          rows="4"
          required
        />
      </div>

      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Photos (optional)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="form-input w-full"
        />
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {images.map((img, idx) => (
              <div key={idx} className="relative">
                <img src={img} alt={`Upload ${idx + 1}`} className="w-16 h-16 rounded-lg object-cover border border-border-subtle" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-white flex items-center justify-center text-xs hover:bg-error/80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            message.includes("success") || message.includes("✅")
              ? "bg-secondary-container/30 text-secondary"
              : "bg-error/10 text-error"
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-text-deep-green border-t-transparent" />
            Submitting...
          </>
        ) : (
          "Submit Review"
        )}
      </button>

      {!storedUser?.token && (
        <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
          Please <a href="/login" className="text-secondary hover:underline">login</a> to leave a review.
        </p>
      )}
    </form>
  );
}

export default ReviewForm;