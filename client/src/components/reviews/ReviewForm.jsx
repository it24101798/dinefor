import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import MediaUploader from "../MediaUploader";

const ratingFields = [
  ["foodRating", "Food"],
  ["serviceRating", "Service"],
  ["ambienceRating", "Ambience"],
  ["valueRating", "Value"],
];

function Stars({ value, onChange, label }) {
  return (
    <div>
      <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">
        {label}
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => onChange(star)}
            className="w-9 h-9 grid place-items-center rounded-full hover:bg-highlight-gold/10"
            aria-label={`${star} stars for ${label}`}
          >
            <span
              className="material-symbols-outlined text-2xl text-highlight-gold"
              style={{
                fontVariationSettings:
                  star <= value ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              star
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReviewForm({
  buffetId,
  onReviewCreated,
}) {
  const [eligibility, setEligibility] = useState(null);
  const [form, setForm] = useState({
    bookingId: "",
    title: "",
    rating: 5,
    foodRating: 5,
    serviceRating: 5,
    ambienceRating: 5,
    valueRating: 5,
    comment: "",
    images: [],
    videos: [],
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("dineforUser") || "null"
      );
    } catch {
      return null;
    }
  }, []);

  const loadEligibility = useCallback(async () => {
    if (!storedUser?.token || !buffetId) {
      setChecking(false);
      return;
    }

    try {
      setChecking(true);
      const response = await api.get(
        `/reviews/eligibility/${buffetId}`
      );

      setEligibility(response.data);
      setForm((current) => ({
        ...current,
        bookingId:
          current.bookingId ||
          response.data?.bookings?.[0]?._id ||
          "",
      }));
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Review eligibility could not be checked."
      );
    } finally {
      setChecking(false);
    }
  }, [buffetId, storedUser?.token]);

  useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  const addMedia = (data) => {
    const fileUrl = data?.fileUrl;
    const mediaType = data?.mediaType;

    if (!fileUrl) return;

    setForm((current) => {
      if (mediaType === "video") {
        return {
          ...current,
          videos: [...current.videos, fileUrl].slice(0, 2),
        };
      }

      return {
        ...current,
        images: [...current.images, fileUrl].slice(0, 8),
      };
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!form.bookingId) {
      setMessage("Select a completed reservation.");
      return;
    }

    if (form.comment.trim().length < 10) {
      setMessage("Write at least 10 characters about your visit.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/reviews", {
        ...form,
        buffetId,
        comment: form.comment.trim(),
      });

      setMessage(response.data?.message || "Review published.");
      setForm({
        bookingId: "",
        title: "",
        rating: 5,
        foodRating: 5,
        serviceRating: 5,
        ambienceRating: 5,
        valueRating: 5,
        comment: "",
        images: [],
        videos: [],
      });

      await loadEligibility();
      onReviewCreated?.(response.data?.review);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Review could not be submitted."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!storedUser?.token) {
    return (
      <section className="card-ambient p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-secondary">
          login
        </span>
        <h3 className="font-headline-md text-headline-md text-text-deep-green mt-2">
          Sign in to review
        </h3>
        <p className="text-on-surface-variant mt-1">
          Reviews are available to customers with completed reservations.
        </p>
        <a href="/login" className="btn-primary inline-block mt-4">
          Sign In
        </a>
      </section>
    );
  }

  if (checking) {
    return (
      <section className="card-ambient p-6">
        <p className="text-on-surface-variant">
          Checking completed reservations…
        </p>
      </section>
    );
  }

  if (!eligibility?.eligible) {
    return (
      <section className="card-ambient p-6">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-secondary">
            verified_user
          </span>
          <div>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">
              Verified reviews only
            </h3>
            <p className="text-on-surface-variant mt-1">
              {eligibility?.message ||
                "Complete a reservation before reviewing this buffet."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="card-ambient p-5 sm:p-6 space-y-5"
    >
      <div>
        <span className="badge-mint">Verified Booking</span>
        <h3 className="font-headline-md text-headline-md text-text-deep-green mt-2">
          Share Your Experience
        </h3>
        <p className="text-on-surface-variant">
          Your review helps diners choose confidently and helps hotels improve.
        </p>
      </div>

      <label className="font-label-sm text-label-sm text-on-surface-variant block">
        Completed reservation
        <select
          className="form-select w-full mt-1"
          value={form.bookingId}
          onChange={(event) =>
            setForm({
              ...form,
              bookingId: event.target.value,
            })
          }
          required
        >
          {eligibility.bookings.map((booking) => (
            <option key={booking._id} value={booking._id}>
              {booking.bookingCode} —{" "}
              {new Date(booking.selectedDate).toLocaleDateString()}
            </option>
          ))}
        </select>
      </label>

      <Stars
        value={form.rating}
        onChange={(rating) => setForm({ ...form, rating })}
        label="Overall rating"
      />

      <div className="grid sm:grid-cols-2 gap-4">
        {ratingFields.map(([key, label]) => (
          <Stars
            key={key}
            value={form[key]}
            onChange={(value) =>
              setForm({ ...form, [key]: value })
            }
            label={label}
          />
        ))}
      </div>

      <label className="font-label-sm text-label-sm text-on-surface-variant block">
        Review title
        <input
          className="form-input w-full mt-1"
          value={form.title}
          maxLength={120}
          onChange={(event) =>
            setForm({ ...form, title: event.target.value })
          }
          placeholder="A memorable buffet experience"
        />
      </label>

      <label className="font-label-sm text-label-sm text-on-surface-variant block">
        Detailed review
        <textarea
          className="form-textarea w-full mt-1"
          rows="5"
          maxLength={2000}
          value={form.comment}
          onChange={(event) =>
            setForm({ ...form, comment: event.target.value })
          }
          placeholder="What stood out about the food, service, ambience and value?"
          required
        />
        <span className="block text-right text-xs mt-1">
          {form.comment.length}/2000
        </span>
      </label>

      <MediaUploader
        label="Add review photos or short videos"
        accept="image/*,video/mp4,video/webm"
        multiple={false}
        onUpload={addMedia}
      />

      {(form.images.length > 0 || form.videos.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {form.images.map((url) => (
            <div key={url} className="relative aspect-square">
              <img
                src={url}
                alt="Review upload"
                className="w-full h-full rounded-xl object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    images: form.images.filter(
                      (item) => item !== url
                    ),
                  })
                }
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}

          {form.videos.map((url) => (
            <div key={url} className="relative aspect-square">
              <video
                src={url}
                className="w-full h-full rounded-xl object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    videos: form.videos.filter(
                      (item) => item !== url
                    ),
                  })
                }
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white"
                aria-label="Remove video"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div className="p-3 rounded-xl bg-surface-container-low text-on-surface-variant">
          {message}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={loading}
      >
        {loading ? "Publishing Review…" : "Publish Verified Review"}
      </button>
    </form>
  );
}
