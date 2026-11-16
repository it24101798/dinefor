import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import CrewArt from "../design/CrewArt";

function Stars({ name, label, value, onChange }) {
  return <fieldset className="df10-stars">
    <legend>{label}</legend>
    <div>
      {[1, 2, 3, 4, 5].map(star => <label key={star} className={star <= value ? "is-filled" : ""}>
        <input className="sr-only" type="radio" name={name} value={star} checked={star === value} onChange={() => onChange(star)} aria-label={`${label}: ${star} out of 5`} required />
        <span aria-hidden="true">★</span>
      </label>)}
    </div>
  </fieldset>;
}

export default function BookingReview({ booking }) {
  const [ratings, setRatings] = useState({ rating: 0, foodRating: 0, serviceRating: 0, valueRating: 0 });
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const uploads = useRef(new Map());
  const lock = useRef(false);
  const navigate = useNavigate();

  function selectPhotos(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (photos.length + files.length > 5 || files.some(file => !["image/jpeg", "image/png"].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setError("Choose up to five JPG or PNG photos, each 10 MB or smaller.");
      return;
    }
    setPhotos(current => [...current, ...files]);
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (lock.current || Object.values(ratings).some(rating => !rating)) return;
    if (comment.trim().length < 10) return setError("Write at least 10 characters about your dining experience.");
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const images = [];
      for (const file of photos) {
        if (!uploads.current.has(file)) {
          const form = new FormData();
          form.append("media", file);
          const { data } = await api.post("/uploads", form, { headers: { "Content-Type": "multipart/form-data" } });
          if (data.mediaType !== "image" || typeof data.fileUrl !== "string") throw new Error("The photo could not be uploaded.");
          uploads.current.set(file, data.fileUrl);
        }
        images.push(uploads.current.get(file));
      }
      await api.post("/reviews", { buffetId: booking.buffet._id, bookingId: booking._id, ...ratings, comment: comment.trim(), images });
      navigate("/my-reviews", { replace: true, state: { reviewPublished: true } });
    } catch (error) {
      if (error.response?.status === 409) navigate("/my-reviews", { replace: true });
      else setError(error.response?.data?.message || error.message || "We couldn’t submit your review.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <form className="df10-card df10-panel" onSubmit={submit} aria-label="Review your dining experience">
    <div className="df10-rating-stack">{[["rating", "Overall"], ["foodRating", "Food"], ["serviceRating", "Service"], ["valueRating", "Value"]].map(([key, label]) => (
      <Stars key={key} name={key} label={label} value={ratings[key]} onChange={rating => setRatings(current => ({ ...current, [key]: rating }))} />
    ))}</div>
    <label>Write your review<textarea required minLength={10} maxLength={500} rows={4} value={comment} placeholder="Share what you loved about your dining experience…" onChange={event => setComment(event.target.value)} /></label>
    <p className="df10-counter">{comment.length} / 500</p>
    <label>Add photos (optional)<input type="file" accept="image/jpeg,image/png" multiple disabled={busy || photos.length >= 5} onChange={selectPhotos} /></label>
    <p>Up to five JPG or PNG photos.</p>
    {photos.length > 0 && <ul className="df10-upload-list">{photos.map((file, index) => <li key={index}><span>{file.name}</span><button type="button" disabled={busy} aria-label={`Remove ${file.name}`} onClick={() => setPhotos(items => items.filter((_, position) => index !== position))}>Remove</button></li>)}</ul>}
    {error && <p role="alert">{error}</p>}
    <div className="df10-review-submit"><button className="df10-action df10-primary" disabled={busy} type="submit">{busy ? "Submitting review…" : "Submit review"}</button><CrewArt role="chef" /></div>
  </form>;
}
