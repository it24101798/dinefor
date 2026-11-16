import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../services/api";
import MediaUploader from "../components/MediaUploader";
import AccountLayout from "../design/AccountLayout";
import { Icon, Photo } from "../design/ReferenceUI";

const emptyEditor = {
  title: "",
  rating: 5,
  foodRating: 5,
  serviceRating: 5,
  ambienceRating: 5,
  valueRating: 5,
  comment: "",
  images: [],
  videos: [],
};

export default function MyReviews() {
  const { state } = useLocation();
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editor, setEditor] = useState(emptyEditor);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/reviews/my");
      setReviews(response.data?.reviews || []);
      setAnalytics(response.data?.analytics || {});
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not load your reviews."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEditor = (review) => {
    setEditing(review);
    setEditor({
      title: review.title || "",
      rating: review.rating || 5,
      foodRating: review.ratings?.food || 5,
      serviceRating: review.ratings?.service || 5,
      ambienceRating: review.ratings?.ambience || 5,
      valueRating: review.ratings?.value || 5,
      comment: review.comment || "",
      images: review.images || [],
      videos: review.videos || [],
    });
  };

  const addMedia = (data) => {
    if (!data?.fileUrl) return;

    setEditor((current) =>
      data.mediaType === "video"
        ? {
            ...current,
            videos: [...current.videos, data.fileUrl].slice(0, 2),
          }
        : {
            ...current,
            images: [...current.images, data.fileUrl].slice(0, 8),
          }
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage("");

    try {
      await api.put(`/reviews/${editing._id}/my-review`, editor);
      setEditing(null);
      setMessage("Review updated successfully.");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Review could not be updated."
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (review) => {
    if (
      !window.confirm(
        `Delete your review for ${review.buffet?.title || "this buffet"}?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/reviews/${review._id}/my-review`);
      setMessage("Review deleted.");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Review could not be deleted."
      );
    }
  };

  const filteredReviews = reviews.filter((review) => {
    const text = [review.title, review.comment, review.buffet?.title, review.hotel?.hotelName].filter(Boolean).join(" ").toLowerCase();
    const matchesText = text.includes(query.trim().toLowerCase());
    const matchesFilter = reviewFilter === "all" ||
      (reviewFilter === "photos" && (review.images?.length || review.videos?.length)) ||
      (reviewFilter === "replies" && review.hotelReply?.message);
    return matchesText && matchesFilter;
  });

  return (
    <AccountLayout title="Your dining stories." description="Revisit your buffet experiences, share moments, and manage your verified reviews." className="rf-my-reviews" artwork="/images/characters/account-concierge.png">
      <div className="rf-reviews-heading">
        <div><span className="rf-eyebrow">YOUR CONTRIBUTIONS</span><h2 className="rf-account-title">My reviews</h2><p>Real experiences help other guests discover their next favourite buffet.</p></div>
        <Link to="/my-bookings" className="rf-button"><Icon name="calendar_month"/> My bookings</Link>
      </div>
      {state?.reviewPublished && !message && <p className="rf-review-notice" role="status">Your verified review was published.</p>}
      {message && <div className="rf-review-notice" role="status">{message}<button type="button" onClick={() => setMessage("")} aria-label="Dismiss message"><Icon name="close"/></button></div>}
      <section className="rf-review-stats" aria-label="Your review statistics">
        {[
          ["Reviews", analytics.totalReviews ?? reviews.length, "rate_review"],
          ["Helpful votes", analytics.helpfulReceived ?? 0, "thumb_up"],
          ["Average given", Number(analytics.averageRatingGiven || 0).toFixed(1), "star"],
          ["Photos shared", analytics.photosShared ?? 0, "photo_library"],
        ].map(([label, value, icon]) => <div className="rf-review-stat" key={label}><Icon name={icon}/><strong>{value}</strong><span>{label}</span></div>)}
      </section>
      <section className="rf-reviews-panel" aria-label="Your published reviews">
        <div className="rf-reviews-toolbar">
          <label className="rf-review-search"><Icon name="search"/><span className="sr-only">Search reviews</span><input type="search" placeholder="Search hotels, buffets, or your reviews" value={query} onChange={(e) => setQuery(e.target.value)}/></label>
          <label className="rf-review-filter"><span className="sr-only">Filter reviews</span><select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)}><option value="all">All reviews</option><option value="photos">With photos or videos</option><option value="replies">Hotel replied</option></select></label>
        </div>
        {loading ? <div className="rf-review-loading" role="status"><span className="rf-loader"/>Loading your reviews…</div> : filteredReviews.length > 0 ? (
          <div className="rf-review-grid">
            {filteredReviews.map((review) => <article className="rf-review-entry" key={review._id}>
              <div className="rf-review-entry-top"><div className="rf-review-mark"><Icon name="restaurant"/></div><div className="rf-review-identity"><span>{review.hotel?.hotelName || "Hotel experience"}</span><h3>{review.buffet?.title || "Buffet experience"}</h3></div><span className="rf-review-score"><Icon name="star"/>{Number(review.rating || 0).toFixed(1)}</span></div>
              {review.title && <h4 className="rf-review-entry-title">{review.title}</h4>}
              <p className="rf-review-comment">{review.comment || "No written comment provided."}</p>
              <div className="rf-review-pills"><span><Icon name="verified"/> Verified review</span><span><Icon name="thumb_up"/> {review.helpfulVotes?.length || 0} helpful</span>{review.hotelReply?.message && <span><Icon name="forum"/> Hotel replied</span>}</div>
              {review.images?.length > 0 && <div className="rf-review-photos">{review.images.slice(0,3).map((src,index)=><Photo sources={[src]} alt={`Review photo ${index + 1}`} key={`${src}-${index}`}/>)}</div>}
              {review.hotelReply?.message && <div className="rf-review-hotel-reply"><strong>Response from the hotel</strong><p>{review.hotelReply.message}</p></div>}
              <div className="rf-review-entry-actions"><button type="button" className="rf-review-edit" onClick={() => openEditor(review)}><Icon name="edit"/> Edit review</button><button type="button" className="rf-review-delete" onClick={() => remove(review)}><Icon name="delete_outline"/> Delete</button>{review.buffet?._id && <Link to={`/buffets/${review.buffet._id}`} className="rf-review-view">View buffet <Icon name="arrow_forward"/></Link>}</div>
            </article>)}
          </div>
        ) : <div className="rf-review-empty"><Icon name={reviews.length ? "search_off" : "rate_review"}/><h3>{reviews.length ? "No matching reviews" : "Your stories start after dining"}</h3><p>{reviews.length ? "Try another search or choose a different filter." : "After your buffet experience, you can share a verified review here."}</p>{reviews.length ? <button type="button" className="rf-button" onClick={() => {setQuery("");setReviewFilter("all");}}>Clear filters</button> : <Link to="/my-bookings" className="rf-button">View my bookings <Icon name="arrow_forward"/></Link>}</div>}
      </section>

      {editing && (
        <div
          className="fixed inset-0 z-[140] bg-black/50 p-4 grid place-items-center"
          onMouseDown={() => setEditing(null)}
        >
          <section
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto card-ambient p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md text-text-deep-green">
                Edit Review
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="w-10 h-10 rounded-full hover:bg-surface-container-low"
              >
                ×
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              {[
                ["rating", "Overall"],
                ["foodRating", "Food"],
                ["serviceRating", "Service"],
                ["ambienceRating", "Ambience"],
                ["valueRating", "Value"],
              ].map(([key, label]) => (
                <label key={key} className="text-sm">
                  {label}
                  <select
                    className="form-select w-full mt-1"
                    value={editor[key]}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        [key]: Number(event.target.value),
                      })
                    }
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value}/5
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <input
              className="form-input w-full mt-4"
              value={editor.title}
              onChange={(event) =>
                setEditor({
                  ...editor,
                  title: event.target.value,
                })
              }
              placeholder="Review title"
            />

            <textarea
              className="form-textarea w-full mt-4"
              rows="6"
              value={editor.comment}
              onChange={(event) =>
                setEditor({
                  ...editor,
                  comment: event.target.value,
                })
              }
            />

            <div className="mt-4">
              <MediaUploader
                label="Add another photo or video"
                accept="image/*,video/mp4,video/webm"
                multiple={false}
                onUpload={addMedia}
              />
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4">
              {editor.images.map((image) => (
                <button
                  type="button"
                  key={image}
                  className="relative aspect-square"
                  onClick={() =>
                    setEditor({
                      ...editor,
                      images: editor.images.filter(
                        (item) => item !== image
                      ),
                    })
                  }
                  title="Remove photo"
                >
                  <img
                    src={image}
                    alt="Review"
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <span className="absolute top-1 right-1 bg-black/70 text-white w-6 h-6 rounded-full">
                    ×
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? "Saving…" : "Save Review"}
              </button>
            </div>
          </section>
        </div>
      )}
    </AccountLayout>
  );
}
