import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import MediaUploader from "../components/MediaUploader";

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
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editor, setEditor] = useState(emptyEditor);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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

  return (
    <main className="min-h-screen bg-surface-cream pt-24 sm:pt-28 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <span className="badge-gold">My Contribution</span>
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">
          My Reviews
        </h1>
        <p className="text-on-surface-variant">
          Manage verified feedback you shared after dining.
        </p>

        {message && (
          <div className="mt-5 p-3 rounded-xl bg-surface-container-low text-on-surface-variant">
            {message}
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {[
            ["Reviews", analytics.totalReviews || 0],
            ["Helpful Votes", analytics.helpfulReceived || 0],
            [
              "Average Given",
              Number(analytics.averageRatingGiven || 0).toFixed(1),
            ],
            ["Photos Shared", analytics.photosShared || 0],
          ].map(([label, value]) => (
            <div key={label} className="card-ambient p-4 text-center">
              <strong className="text-2xl text-text-deep-green">
                {value}
              </strong>
              <p className="text-sm text-on-surface-variant">
                {label}
              </p>
            </div>
          ))}
        </section>

        {loading ? (
          <div className="mt-6 grid md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="card-ambient h-64 animate-pulse"
              />
            ))}
          </div>
        ) : reviews.length ? (
          <div className="mt-6 grid md:grid-cols-2 gap-5">
            {reviews.map((review) => (
              <article
                key={review._id}
                className="card-ambient p-5 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-secondary text-sm font-semibold">
                      {review.hotel?.hotelName || "Hotel"}
                    </p>
                    <h2 className="font-headline-md text-headline-md text-text-deep-green">
                      {review.buffet?.title || "Buffet"}
                    </h2>
                  </div>

                  <span className="badge-mint">
                    {review.rating}/5
                  </span>
                </div>

                {review.title && (
                  <h3 className="font-semibold text-text-deep-green mt-4">
                    {review.title}
                  </h3>
                )}
                <p className="text-on-surface-variant mt-2 line-clamp-4">
                  {review.comment}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="badge-mint">
                    Verified Booking
                  </span>
                  <span className="px-3 py-1 rounded-full bg-surface-container-low text-sm">
                    {review.helpfulVotes?.length || 0} helpful
                  </span>
                  {review.hotelReply?.message && (
                    <span className="px-3 py-1 rounded-full bg-secondary-container/20 text-secondary text-sm">
                      Hotel replied
                    </span>
                  )}
                </div>

                {review.images?.length > 0 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto">
                    {review.images.slice(0, 4).map((image) => (
                      <img
                        key={image}
                        src={image}
                        alt="Review"
                        className="w-20 h-20 rounded-xl object-cover shrink-0"
                      />
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditor(review)}
                    className="btn-outline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(review)}
                    className="px-4 py-2 rounded-full border border-error/30 text-error hover:bg-error/10"
                  >
                    Delete
                  </button>
                  <Link
                    to={`/buffets/${review.buffet?._id}`}
                    className="btn-secondary"
                  >
                    View Buffet
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="card-ambient p-10 text-center mt-6">
            <span className="material-symbols-outlined text-5xl text-outline">
              reviews
            </span>
            <h2 className="font-headline-md text-headline-md text-text-deep-green mt-3">
              No reviews written yet
            </h2>
            <p className="text-on-surface-variant mt-2">
              Complete a buffet reservation to publish a verified review.
            </p>
            <Link to="/my-bookings" className="btn-primary inline-block mt-5">
              View My Bookings
            </Link>
          </section>
        )}
      </div>

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
    </main>
  );
}
