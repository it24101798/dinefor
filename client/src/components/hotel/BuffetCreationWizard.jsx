import { useRef, useState } from "react";
import api, { resolveMediaUrl } from "../../services/api";
import MediaUploader from "../MediaUploader";

const steps = ["Details", "Media", "Schedule", "Pricing", "Review"];
const categories = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", "high-tea": "High tea",
  seafood: "Seafood", bbq: "BBQ", brunch: "Brunch", other: "Other",
};
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const schedules = { all_days: "Every day", selected_days: "Selected days", one_day: "One date" };
const emptySlot = () => ({ startTime: "", endTime: "", totalSeats: "" });

export default function BuffetCreationWizard({ headers, onCreated }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: "", category: "", buffetType: "regular", description: "", highlights: "",
    thumbnail: "", images: [], videos: [], timeSlots: [emptySlot()],
    scheduleType: "all_days", recurringDays: [], specialDate: "",
    availableFromDate: "", availableToDate: "", price: "",
  });
  const [uploads, setUploads] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const labelRef = useRef(null);
  const savingRef = useRef(false);
  const busy = saving || Object.values(uploads).some(Boolean);
  const cover = resolveMediaUrl(form.thumbnail || form.images[0]);
  const [brokenCover, setBrokenCover] = useState(null);
  const displayPrice = form.price === "" ? "Price to be set" : `LKR ${Number(form.price).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per guest`;

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const change = (event) => set(event.target.name, event.target.value);
  const move = (next) => {
    setError("");
    setStep(next);
    requestAnimationFrame(() => labelRef.current?.focus());
  };
  const uploadState = (key) => (active) => setUploads((current) => ({ ...current, [key]: active }));
  const addFiles = (key, files) =>
    setForm((current) => ({ ...current, [key]: [...new Set([...current[key], ...files.map((file) => file.fileUrl)])] }));

  const submit = async (event) => {
    event.preventDefault();
    if (busy || savingRef.current) return;
    if (step === 0 && !form.title.trim()) return setError("Enter a buffet title.");
    if (step === 2) {
      if (form.scheduleType === "selected_days" && !form.recurringDays.length) return setError("Choose at least one serving day.");
      if (form.availableFromDate && form.availableToDate && form.availableFromDate > form.availableToDate) return setError("The end date must be on or after the start date.");
      if (form.timeSlots.some(({startTime, endTime}) => startTime === endTime)) return setError("Each time slot needs different start and end times.");
    }
    if (step < steps.length - 1) return move(step + 1);
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const oneDay = form.scheduleType === "one_day";
      await api.post("/hotel-portal/buffets", {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        highlights: form.highlights.split(",").map((item) => item.trim()).filter(Boolean),
        price: Number(form.price),
        timeSlots: form.timeSlots.map((slot) => ({
          ...slot, totalSeats: Number(slot.totalSeats), availableSeats: Number(slot.totalSeats),
        })),
        availableFromDate: oneDay ? null : form.availableFromDate || null,
        availableToDate: oneDay ? null : form.availableToDate || null,
        specialDate: oneDay ? form.specialDate : null,
        recurringDays: form.scheduleType === "selected_days" ? form.recurringDays : [],
        status: event.nativeEvent.submitter?.value === "active" ? "active" : "draft",
      }, { headers });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn’t save the buffet. Try again.");
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    onCreated();
  };

  return (
    <div className="df-buffet-wizard">
      <form className="card-ambient df-wizard-form" onSubmit={submit}>
        <ol className="df-wizard-steps" aria-label="Buffet creation steps">
          {steps.map((item, index) => (
            <li key={item} aria-current={step === index ? "step" : undefined}>
              <button type="button" disabled={busy || index >= step} onClick={() => move(index)}>
                <span>{index + 1}</span>{item}
              </button>
            </li>
          ))}
        </ol>
        <h2 tabIndex={-1} ref={labelRef}>{steps[step]}</h2>
        {step === 0 && <>
          <label>Buffet title<input className="form-input" name="title" value={form.title} onChange={change} maxLength={150} required /></label>
          <div className="df-wizard-fields">
            <label>Category<select className="form-select" name="category" value={form.category} onChange={change} required>
              <option value="">Choose a category</option>
              {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Buffet type<select className="form-select" name="buffetType" value={form.buffetType} onChange={change}>
              <option value="regular">Regular</option><option value="special">Special</option>
            </select></label>
          </div>
          <label>Description<textarea className="form-textarea" name="description" value={form.description} onChange={change} rows={4} /></label>
          <label>Highlights, separated by commas<input className="form-input" name="highlights" value={form.highlights} onChange={change} placeholder="Live cooking, seafood, desserts" /></label>
        </>}
        {step === 1 && <>
          <p>Add a cover, gallery photos or videos for guests to see.</p>
          <MediaUploader accept="image/*" label="Upload cover image" hidePreview onUploadState={uploadState("cover")} onUpload={(file) => set("thumbnail", file.fileUrl)} />
          {form.thumbnail && <button type="button" className="btn-outline" onClick={() => set("thumbnail", "")}>Remove cover</button>}
          <MediaUploader multiple accept="image/*" label="Upload gallery images" hidePreview onUploadState={uploadState("images")} onUpload={(files) => addFiles("images", files)} />
          <MediaUploader multiple accept="video/*" label="Upload videos" hidePreview onUploadState={uploadState("videos")} onUpload={(files) => addFiles("videos", files)} />
          {["images", "videos"].map((key) => form[key].length > 0 && (
            <ul key={key} className="df-wizard-media">
              {form[key].map((url, index) => <li key={url}>
                {key === "images" ? <img src={resolveMediaUrl(url)} alt={`Gallery photo ${index + 1}`} /> : <video src={resolveMediaUrl(url)} muted preload="metadata" controls aria-label={`Video ${index + 1}`} />}
                <button type="button" className="btn-outline" onClick={() => set(key, form[key].filter((file) => file !== url))}>Remove {key === "images" ? "photo" : "video"} {index + 1}</button>
              </li>)}
            </ul>
          ))}
        </>}
        {step === 2 && <>
          <label>Serving days<select className="form-select" name="scheduleType" value={form.scheduleType} onChange={change}>
            {Object.entries(schedules).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          {form.scheduleType === "selected_days" && <fieldset className="df-wizard-days">
            <legend>Days of the week</legend>
            {days.map((day) => <label key={day}><input type="checkbox" checked={form.recurringDays.includes(day)}
              onChange={({ target }) => set("recurringDays", target.checked ? [...form.recurringDays, day] : form.recurringDays.filter((item) => item !== day))} />{day}</label>)}
          </fieldset>}
          {form.scheduleType === "one_day" ? <label>Serving date<input type="date" className="form-input" name="specialDate" value={form.specialDate} onChange={change} required /></label> :
            <div className="df-wizard-fields">
              <label>Available from<input type="date" className="form-input" name="availableFromDate" value={form.availableFromDate} onChange={change} /></label>
              <label>Available to<input type="date" className="form-input" name="availableToDate" value={form.availableToDate} min={form.availableFromDate || undefined} onChange={change} /></label>
            </div>}
          {form.timeSlots.map((slot, index) => <fieldset className="df-wizard-slot" key={index}>
            <legend>Time slot {index + 1}</legend>
            <div className="df-wizard-fields">
              {[["startTime", "Start time", "time"], ["endTime", "End time", "time"], ["totalSeats", "Seats", "number"]].map(([key, label, type]) =>
                <label key={key}>{label}<input className="form-input" type={type} min={type === "number" ? 1 : undefined} value={slot[key]} required
                  onChange={({ target }) => set("timeSlots", form.timeSlots.map((item, slotIndex) => slotIndex === index ? { ...item, [key]: target.value } : item))} /></label>)}
            </div>
            {index > 0 && <button type="button" className="btn-outline" onClick={() => set("timeSlots", form.timeSlots.filter((_, slotIndex) => slotIndex !== index))}>Remove time slot {index + 1}</button>}
          </fieldset>)}
          <button type="button" className="btn-outline" onClick={() => set("timeSlots", [...form.timeSlots, emptySlot()])}>Add time slot</button>
        </>}
        {step === 3 && <label>Price per guest (LKR)
          <input className="form-input" type="number" name="price" min="0" step="0.01" value={form.price} onChange={change} required />
        </label>}
        {step === 4 && <dl className="df-wizard-summary">
          <div><dt>Buffet</dt><dd>{form.title} · {categories[form.category]}</dd></div>
          <div><dt>Media</dt><dd>{cover ? "Cover ready" : "No cover"} · {form.images.length} gallery photos · {form.videos.length} videos</dd></div>
          <div><dt>Serving schedule</dt><dd>{form.scheduleType === "one_day" ? form.specialDate : form.scheduleType === "selected_days" ? form.recurringDays.join(", ") : schedules[form.scheduleType]}{form.scheduleType !== "one_day" && (form.availableFromDate || form.availableToDate) && <><br />{form.availableFromDate || "Open start"} to {form.availableToDate || "Open end"}</>}</dd></div>
          <div><dt>Time slots</dt><dd>{form.timeSlots.map((slot, index) => <div key={index}>{slot.startTime}–{slot.endTime} · {slot.totalSeats} seats</div>)}</dd></div>
          <div><dt>Price</dt><dd>{displayPrice}</dd></div>
        </dl>}
        {error && <p role="alert" className="text-error">{error}</p>}
        <div className="df-wizard-actions">
          {step > 0 && <button type="button" className="btn-outline" disabled={busy} onClick={() => move(step - 1)}>Back</button>}
          {step < 4 ? <button type="submit" className="btn-primary" disabled={busy}>Continue</button> :
            <><button type="submit" value="draft" className="btn-outline" disabled={busy}>Save draft</button>
              <button type="submit" value="active" className="btn-primary" disabled={busy}>{saving ? "Saving…" : "Publish buffet"}</button></>}
        </div>
      </form>
      <aside className="card-ambient df-wizard-preview" aria-label="Live buffet preview">
        <p>Guest preview</p>
        <div className="df-wizard-cover" key={cover || ""}>
          {cover && cover !== brokenCover ? <img src={cover} alt="Buffet cover" onError={() => setBrokenCover(cover)} /> : <span className="material-symbols-outlined" aria-hidden="true">restaurant_menu</span>}
        </div>
        {form.category && <span className="df-wizard-category">{categories[form.category]}</span>}
        <h3>{form.title.trim() || "Buffet title"}</h3>
        <p>{form.description.trim() || "Your buffet description will appear here."}</p>
        <strong>{displayPrice}</strong>
      </aside>
    </div>
  );
}
