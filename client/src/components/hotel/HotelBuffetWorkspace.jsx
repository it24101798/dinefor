import { useEffect, useMemo, useState } from "react";
import api, { resolveMediaUrl } from "../../services/api";
import MediaUploader from "../MediaUploader";

const emptySlot = { startTime: "", endTime: "", totalSeats: "", availableSeats: "" };
const defaultForm = {
  title: "",
  category: "dinner",
  buffetType: "regular",
  description: "",
  price: "",
  scheduleType: "all_days",
  availableFromDate: "",
  availableToDate: "",
  specialDate: "",
  status: "draft",
  thumbnail: "",
  images: [],
  videos: [],
  highlights: [],
  recurringDays: [],
  timeSlots: [emptySlot],
};

const categories = ["breakfast", "lunch", "dinner", "high-tea", "seafood", "bbq", "brunch", "other"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const mediaUrl = (value) => resolveMediaUrl(value) || "";

function HotelBuffetWorkspace({ headers, setMessage, setMessageType, onCreate, onChanged }) {
  const [buffets, setBuffets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", status: "all", category: "all" });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const announce = (text, type = "success") => {
    setMessage?.(text);
    setMessageType?.(type);
  };

  const loadBuffets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.set(key, value);
      });
      const res = await api.get(`/hotel-portal/buffets?${params.toString()}`, { headers });
      setBuffets(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      announce(error.response?.data?.message || "Failed to load buffets.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadBuffets, 180);
    return () => clearTimeout(timer);
  }, [filters.q, filters.status, filters.category]);

  const stats = useMemo(() => ({
    total: buffets.length,
    active: buffets.filter((item) => item.status === "active" || item.isActive).length,
    draft: buffets.filter((item) => item.status === "draft").length,
    paused: buffets.filter((item) => item.status === "paused" || (!item.isActive && item.status !== "draft")).length,
  }), [buffets]);

  const startEdit = (buffet) => {
    setEditing(buffet);
    setForm({
      title: buffet.title || "",
      category: buffet.category || "dinner",
      buffetType: buffet.buffetType || "regular",
      description: buffet.description || "",
      price: buffet.price ?? "",
      scheduleType: buffet.scheduleType || "all_days",
      availableFromDate: toDateInput(buffet.availableFromDate),
      availableToDate: toDateInput(buffet.availableToDate),
      specialDate: toDateInput(buffet.specialDate),
      status: buffet.status || (buffet.isActive ? "active" : "paused"),
      thumbnail: buffet.thumbnail || buffet.images?.[0] || "",
      images: Array.isArray(buffet.images) ? buffet.images : [],
      videos: Array.isArray(buffet.videos) ? buffet.videos : [],
      highlights: Array.isArray(buffet.highlights) ? buffet.highlights : [],
      recurringDays: Array.isArray(buffet.recurringDays) ? buffet.recurringDays : [],
      timeSlots: buffet.timeSlots?.length ? buffet.timeSlots.map((slot) => ({
        startTime: slot.startTime || "",
        endTime: slot.endTime || "",
        totalSeats: slot.totalSeats ?? "",
        availableSeats: slot.availableSeats ?? slot.totalSeats ?? "",
      })) : [emptySlot],
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(defaultForm);
    setSaving(false);
  };

  const updateSlot = (index, field, value) => {
    setForm((current) => ({
      ...current,
      timeSlots: current.timeSlots.map((slot, slotIndex) => slotIndex === index ? { ...slot, [field]: value } : slot),
    }));
  };

  const toggleDay = (day) => {
    setForm((current) => ({
      ...current,
      recurringDays: current.recurringDays.includes(day)
        ? current.recurringDays.filter((item) => item !== day)
        : [...current.recurringDays, day],
    }));
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editing?._id) return;

    const normalizedSlots = form.timeSlots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalSeats: Number(slot.totalSeats),
      availableSeats: Number(slot.availableSeats || slot.totalSeats),
    }));

    if (!form.title.trim()) return announce("Buffet title is required.", "error");
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) return announce("Enter a valid price.", "error");
    if (normalizedSlots.some((slot) => !slot.startTime || !slot.endTime || !Number.isFinite(slot.totalSeats) || slot.totalSeats < 1)) {
      return announce("Every time slot needs start time, end time and seat capacity.", "error");
    }
    if (form.scheduleType === "selected_days" && form.recurringDays.length === 0) return announce("Select at least one recurring day.", "error");
    if (form.scheduleType === "one_day" && !form.specialDate) return announce("Select the special buffet date.", "error");

    try {
      setSaving(true);
      const payload = {
        ...form,
        title: form.title.trim(),
        price: Number(form.price),
        timeSlots: normalizedSlots,
        availableFromDate: form.availableFromDate || null,
        availableToDate: form.availableToDate || null,
        specialDate: form.scheduleType === "one_day" ? form.specialDate || null : null,
        recurringDays: form.scheduleType === "selected_days" ? form.recurringDays : [],
        thumbnail: form.thumbnail || form.images[0] || "",
      };
      await api.put(`/hotel-portal/buffets/${editing._id}`, payload, { headers });
      announce("Buffet updated successfully.");
      closeEdit();
      await loadBuffets();
      onChanged?.();
    } catch (error) {
      announce(error.response?.data?.message || "Failed to update buffet.", "error");
      setSaving(false);
    }
  };

  const changeStatus = async (buffet, status) => {
    try {
      await api.put(`/hotel-portal/buffets/${buffet._id}/status`, { status }, { headers });
      announce(status === "active" ? "Buffet published and visible to customers." : `Buffet moved to ${status}.`);
      await loadBuffets();
      onChanged?.();
    } catch (error) {
      announce(error.response?.data?.message || "Failed to update buffet status.", "error");
    }
  };

  const duplicateBuffet = async (buffet) => {
    try {
      await api.post(`/hotel-portal/buffets/${buffet._id}/duplicate`, {}, { headers });
      announce("Buffet duplicated as a draft.");
      await loadBuffets();
      onChanged?.();
    } catch (error) {
      announce(error.response?.data?.message || "Failed to duplicate buffet.", "error");
    }
  };

  const deleteBuffet = async (buffet) => {
    if (!window.confirm(`Delete “${buffet.title}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/hotel-portal/buffets/${buffet._id}`, { headers });
      announce("Buffet deleted successfully.");
      await loadBuffets();
      onChanged?.();
    } catch (error) {
      announce(error.response?.data?.message || "Failed to delete buffet.", "error");
    }
  };

  return (
    <section className="hf-buffet-workspace">
      <div className="hf-workspace-head">
        <div>
          <span className="eyebrow">Buffet Operations</span>
          <h1>Buffet Management</h1>
          <p>Create, edit, publish, pause and enrich each buffet with premium photo and video content.</p>
        </div>
        <button className="btn-primary" onClick={onCreate}>+ New Buffet</button>
      </div>

      <div className="hf-kpi-grid">
        <article><span>Total</span><strong>{stats.total}</strong></article>
        <article><span>Published</span><strong>{stats.active}</strong></article>
        <article><span>Draft</span><strong>{stats.draft}</strong></article>
        <article><span>Paused</span><strong>{stats.paused}</strong></article>
      </div>

      <div className="hf-filter-row">
        <input className="form-input" placeholder="Search buffets..." value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
        <select className="form-select" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="all">All statuses</option>
          <option value="active">Published</option>
          <option value="draft">Draft</option>
          <option value="paused">Paused</option>
        </select>
        <select className="form-select" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
          <option value="all">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category.replace("-", " ")}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="hf-empty-state">Loading buffet inventory…</div>
      ) : buffets.length === 0 ? (
        <div className="hf-empty-state"><strong>No buffets found</strong><span>Create your first buffet experience to begin accepting reservations.</span></div>
      ) : (
        <div className="hf-buffet-grid">
          {buffets.map((buffet) => {
            const status = buffet.status || (buffet.isActive ? "active" : "paused");
            const cover = mediaUrl(buffet.thumbnail || buffet.images?.[0]);
            return (
              <article className="hf-buffet-card" key={buffet._id}>
                <div className="hf-buffet-cover">
                  {cover ? <img src={cover} alt={buffet.title} /> : <div className="hf-media-placeholder">No cover image</div>}
                  <span className={`hf-status hf-status-${status}`}>{status === "active" ? "Published" : status}</span>
                  {buffet.isFeatured && <span className="hf-featured">Featured</span>}
                </div>
                <div className="hf-buffet-body">
                  <div><span className="eyebrow">{buffet.category?.replace("-", " ")}</span><h2>{buffet.title}</h2></div>
                  <p>{buffet.description || "No description has been added yet."}</p>
                  <div className="hf-buffet-meta"><strong>Rs. {Number(buffet.price || 0).toLocaleString()}</strong><span>{buffet.timeSlots?.length || 0} time slots</span><span>{buffet.images?.length || 0} photos</span><span>{buffet.videos?.length || 0} videos</span></div>
                  <div className="hf-action-row">
                    <button onClick={() => startEdit(buffet)}>Edit & Media</button>
                    {status !== "active" ? <button onClick={() => changeStatus(buffet, "active")}>Publish</button> : <button onClick={() => changeStatus(buffet, "paused")}>Pause</button>}
                    {status !== "draft" && <button onClick={() => changeStatus(buffet, "draft")}>Move to Draft</button>}
                    <button onClick={() => duplicateBuffet(buffet)}>Duplicate</button>
                    <button onClick={() => window.open(`/buffets/${buffet._id}`, "_blank")}>Preview</button>
                    <button className="danger" onClick={() => deleteBuffet(buffet)}>Delete</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={closeEdit}>
          <form className="hf-editor-modal" onSubmit={saveEdit} onClick={(event) => event.stopPropagation()}>
            <div className="hf-editor-head"><div><span className="eyebrow">Edit Buffet</span><h2>{editing.title}</h2><p>Update content, availability, media and visibility in one place.</p></div><button type="button" onClick={closeEdit}>×</button></div>

            <div className="hf-editor-grid">
              <label>Title<input className="form-input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
              <label>Price<input className="form-input" type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
              <label>Category<select className="form-select" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category} value={category}>{category.replace("-", " ")}</option>)}</select></label>
              <label>Visibility<select className="form-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Draft</option><option value="active">Published</option><option value="paused">Paused</option></select></label>
              <label>Buffet Type<select className="form-select" value={form.buffetType} onChange={(event) => setForm({ ...form, buffetType: event.target.value })}><option value="regular">Regular</option><option value="special">Special</option></select></label>
              <label>Schedule<select className="form-select" value={form.scheduleType} onChange={(event) => setForm({ ...form, scheduleType: event.target.value })}><option value="all_days">All days</option><option value="selected_days">Selected days</option><option value="one_day">One day</option><option value="custom">Custom</option></select></label>
              <label className="span-2">Description<textarea className="form-textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <label>Available From<input className="form-input" type="date" value={form.availableFromDate} onChange={(event) => setForm({ ...form, availableFromDate: event.target.value })} /></label>
              <label>Available To<input className="form-input" type="date" value={form.availableToDate} onChange={(event) => setForm({ ...form, availableToDate: event.target.value })} /></label>
              {form.scheduleType === "one_day" && <label>Special Date<input className="form-input" type="date" value={form.specialDate} onChange={(event) => setForm({ ...form, specialDate: event.target.value })} /></label>}
              <label className="span-2">Highlights<input className="form-input" value={form.highlights.join(", ")} onChange={(event) => setForm({ ...form, highlights: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Live cooking, Ocean view, Premium desserts" /></label>
            </div>

            {form.scheduleType === "selected_days" && <div className="hf-day-grid">{days.map((day) => <label key={day}><input type="checkbox" checked={form.recurringDays.includes(day)} onChange={() => toggleDay(day)} /> {day}</label>)}</div>}

            <section className="hf-editor-section"><div><span className="eyebrow">Time Slots</span><h3>Seating and service windows</h3></div>{form.timeSlots.map((slot, index) => <div className="hf-slot-row" key={index}><input className="form-input" type="time" value={slot.startTime} onChange={(event) => updateSlot(index, "startTime", event.target.value)} /><input className="form-input" type="time" value={slot.endTime} onChange={(event) => updateSlot(index, "endTime", event.target.value)} /><input className="form-input" type="number" min="1" placeholder="Total seats" value={slot.totalSeats} onChange={(event) => updateSlot(index, "totalSeats", event.target.value)} /><button type="button" onClick={() => setForm({ ...form, timeSlots: form.timeSlots.filter((_, slotIndex) => slotIndex !== index) })} disabled={form.timeSlots.length === 1}>Remove</button></div>)}<button type="button" className="btn-outline" onClick={() => setForm({ ...form, timeSlots: [...form.timeSlots, emptySlot] })}>+ Add time slot</button></section>

            <section className="hf-editor-section"><div><span className="eyebrow">Media Studio</span><h3>Photos and videos</h3></div><div className="hf-media-upload-grid"><div><h4>Cover image</h4><MediaUploader accept="image/*" label="Upload cover image" onUpload={(data) => setForm((current) => ({ ...current, thumbnail: data.fileUrl, images: [data.fileUrl, ...current.images.filter((item) => item !== data.fileUrl)] }))} /></div><div><h4>Gallery images</h4><MediaUploader multiple accept="image/*" label="Upload gallery images" onUpload={(items) => setForm((current) => ({ ...current, images: [...current.images, ...items.map((item) => item.fileUrl)] }))} /></div><div><h4>Buffet videos</h4><MediaUploader multiple accept="video/*" label="Upload videos" onUpload={(items) => setForm((current) => ({ ...current, videos: [...current.videos, ...items.map((item) => item.fileUrl)] }))} /></div></div>
              <div className="hf-media-preview-grid">{form.images.map((image) => <figure key={image}><img src={mediaUrl(image)} alt="Buffet media" /><button type="button" onClick={() => setForm({ ...form, images: form.images.filter((item) => item !== image), thumbnail: form.thumbnail === image ? "" : form.thumbnail })}>Remove</button></figure>)}{form.videos.map((video) => <figure key={video}><video src={mediaUrl(video)} controls /><button type="button" onClick={() => setForm({ ...form, videos: form.videos.filter((item) => item !== video) })}>Remove</button></figure>)}</div>
            </section>

            <div className="modal-footer"><button type="button" className="btn-outline" onClick={closeEdit}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Buffet"}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}

export default HotelBuffetWorkspace;
