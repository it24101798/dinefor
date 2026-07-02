import { useMemo, useState } from "react";

function Stars({ rating }) {
  return <span className="review-stars">{[1, 2, 3, 4, 5].map((star) => <span key={star} className={star <= Number(rating) ? "active" : ""}>★</span>)}</span>;
}

function ReviewList({ reviews = [] }) {
  const [tab, setTab] = useState("reviews");

  const media = useMemo(() => {
    const photos = [];
    const videos = [];
    reviews.forEach((review) => {
      review.images?.forEach((image) => photos.push({ src: image, review }));
      review.videos?.forEach((video) => videos.push({ src: video, review }));
    });
    return { photos, videos };
  }, [reviews]);

  if (!reviews.length) {
    return <div className="google-review-empty"><h3>No reviews yet</h3><p>Be the first customer to share photos and a buffet experience.</p></div>;
  }

  return (
    <div className="google-review-list beach-review-list">
      <div className="review-tabs">
        <button className={tab === "reviews" ? "active" : ""} onClick={() => setTab("reviews")}>Reviews ({reviews.length})</button>
        <button className={tab === "photos" ? "active" : ""} onClick={() => setTab("photos")}>Photos ({media.photos.length})</button>
        <button className={tab === "videos" ? "active" : ""} onClick={() => setTab("videos")}>Videos ({media.videos.length})</button>
      </div>

      {tab === "reviews" && reviews.map((review) => (
        <article key={review._id} className="google-review-card">
          <div className="reviewer-avatar">{(review.user?.name || review.user?.email || "G").charAt(0).toUpperCase()}</div>
          <div className="review-content">
            <div className="review-topline">
              <div><h4>{review.user?.name || "DineFor Guest"}</h4><p>{review.buffet?.title || "Buffet Experience"}</p></div>
              {review.isVerifiedBooking && <span className="verified-pill">Verified booking</span>}
            </div>
            <div className="review-rating-line"><Stars rating={review.rating} /><small>{new Date(review.createdAt).toLocaleDateString()}</small></div>
            {review.comment && <p className="review-comment">{review.comment}</p>}
            {(review.images?.length > 0 || review.videos?.length > 0) && (
              <div className="google-review-photos">
                {review.images?.map((image) => <img src={image} alt="Customer review" key={image} />)}
                {review.videos?.map((video) => <video src={video} controls key={video} />)}
              </div>
            )}
          </div>
        </article>
      ))}

      {tab === "photos" && <div className="review-media-grid">{media.photos.length ? media.photos.map(({ src }) => <img src={src} alt="Review upload" key={src} />) : <p className="muted">No photos uploaded yet.</p>}</div>}
      {tab === "videos" && <div className="review-media-grid">{media.videos.length ? media.videos.map(({ src }) => <video src={src} controls key={src} />) : <p className="muted">No videos uploaded yet.</p>}</div>}
    </div>
  );
}

export default ReviewList;
