import { useState } from "react";
import api from "../../services/api";
import MediaUploader from "../MediaUploader";

function BuffetCreator({ hotel, headers, onCreated, setMessage }) {
  const [formData, setFormData] = useState({
    title: "",
    buffetType: "regular",
    scheduleType: "all_days",
    category: "dinner",
    description: "",
    price: "",
    availableFromDate: "",
    availableToDate: "",
    specialDate: "",
    videosText: "",
  });
  const [recurringDays, setRecurringDays] = useState([]);
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [coverMedia, setCoverMedia] = useState("");
  const [timeSlots, setTimeSlots] = useState([{ startTime: "", endTime: "", totalSeats: "" }]);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const toggleDay = (day) => setRecurringDays(recurringDays.includes(day) ? recurringDays.filter((d) => d !== day) : [...recurringDays, day]);
  const handleSlotChange = (i, field, value) => setTimeSlots(timeSlots.map((s, index) => (index === i ? { ...s, [field]: value } : s)));
  const addTimeSlot = () => setTimeSlots([...timeSlots, { startTime: "", endTime: "", totalSeats: "" }]);
  const removeTimeSlot = (i) => timeSlots.length > 1 && setTimeSlots(timeSlots.filter((_, index) => index !== i));

  const createBuffet = async (e) => {
    e.preventDefault();
    if (!hotel) return setMessage("Hotel profile not loaded yet.");

    try {
      const urlVideos = formData.videosText.split(",").map((u) => u.trim()).filter(Boolean);
      const formattedSlots = timeSlots.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        totalSeats: Number(slot.totalSeats),
        availableSeats: Number(slot.totalSeats),
      }));

      await api.post(
        "/buffets",
        {
          hotel: hotel._id,
          title: formData.title,
          buffetType: formData.buffetType,
          scheduleType: formData.scheduleType,
          category: formData.category,
          description: formData.description,
          price: Number(formData.price),
          recurringDays: formData.scheduleType === "selected_days" ? recurringDays : [],
          availableFromDate: formData.buffetType === "regular" ? formData.availableFromDate : null,
          availableToDate: formData.buffetType === "regular" ? formData.availableToDate : null,
          specialDate: formData.buffetType === "special" ? formData.specialDate : null,
          thumbnail: coverMedia || images[0] || "",
          images,
          videos: [...videos, ...urlVideos],
          status: "active",
          timeSlots: formattedSlots,
        },
        { headers }
      );

      setMessage("Buffet created successfully ✅");
      setFormData({ title: "", buffetType: "regular", scheduleType: "all_days", category: "dinner", description: "", price: "", availableFromDate: "", availableToDate: "", specialDate: "", videosText: "" });
      setRecurringDays([]);
      setImages([]);
      setVideos([]);
      setCoverMedia("");
      setTimeSlots([{ startTime: "", endTime: "", totalSeats: "" }]);
      onCreated();
    } catch (error) {
      console.log(error);
      setMessage(error.response?.data?.message || "Failed to create buffet.");
    }
  };

  return (
    <section className="panel reveal-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Buffets</span>
          <h2>Create Buffet</h2>
        </div>
      </div>

      <form onSubmit={createBuffet} className="form-grid">
        <input name="title" placeholder="Buffet Title" value={formData.title} onChange={handleChange} required />
        <select name="buffetType" value={formData.buffetType} onChange={handleChange}>
          <option value="regular">Regular Buffet</option>
          <option value="special">Special Buffet</option>
        </select>
        <select name="category" value={formData.category} onChange={handleChange}>
          <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="high-tea">High Tea</option><option value="seafood">Seafood</option><option value="bbq">BBQ</option><option value="brunch">Brunch</option><option value="other">Other</option>
        </select>
        <input name="price" type="number" placeholder="Price" value={formData.price} onChange={handleChange} required />
        <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} className="span-2" />

        {formData.buffetType === "regular" && (
          <>
            <select name="scheduleType" value={formData.scheduleType} onChange={handleChange}>
              <option value="all_days">All Days</option><option value="selected_days">Selected Days</option><option value="custom">Custom</option>
            </select>
            <input type="date" name="availableFromDate" value={formData.availableFromDate} onChange={handleChange} />
            <input type="date" name="availableToDate" value={formData.availableToDate} onChange={handleChange} />
            {formData.scheduleType === "selected_days" && (
              <div className="span-2 day-grid">
                {days.map((day) => (
                  <label key={day}><input type="checkbox" checked={recurringDays.includes(day)} onChange={() => toggleDay(day)} /> {day}</label>
                ))}
              </div>
            )}
          </>
        )}

        {formData.buffetType === "special" && <input type="date" name="specialDate" value={formData.specialDate} onChange={handleChange} required />}

        <div className="span-2 upload-row">
          <div>
            <h3>Upload Buffet Photos / Videos</h3>
            <MediaUploader
              label="Upload cover image or video"
              accept="image/*,video/mp4,video/webm"
              onUpload={(data) => {
                if (data.mediaType === "video") {
                  setVideos((prev) => [...prev, data.fileUrl]);
                  if (!coverMedia) setCoverMedia(data.fileUrl);
                } else {
                  setImages((prev) => [...prev, data.fileUrl]);
                  if (!coverMedia) setCoverMedia(data.fileUrl);
                }
              }}
            />
            <p className="text-sm text-on-surface-variant mt-2">The first uploaded item becomes the buffet cover. You can change it below.</p>
          </div>
          <div className="uploaded-list">
            <h3>Uploaded Media</h3>
            <p>{images.length} image(s), {videos.length} video(s)</p>
            {(images.length > 0 || videos.length > 0) && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[...images, ...videos].map((url) => (
                  <button key={url} type="button" onClick={() => setCoverMedia(url)} className={`rounded-xl overflow-hidden border-2 ${coverMedia === url ? "border-secondary" : "border-transparent"}`}>
                    {videos.includes(url) ? <video src={url} muted className="w-full h-20 object-cover" /> : <img src={url} alt="Buffet media" className="w-full h-20 object-cover" />}
                  </button>
                ))}
              </div>
            )}
            <textarea name="videosText" placeholder="Optional external video URLs separated by commas" value={formData.videosText} onChange={handleChange} />
          </div>
        </div>

        <div className="span-2">
          <h3>Time Slots</h3>
          {timeSlots.map((slot, i) => (
            <div className="slot-row" key={i}>
              <input placeholder="Start Time" value={slot.startTime} onChange={(e) => handleSlotChange(i, "startTime", e.target.value)} required />
              <input placeholder="End Time" value={slot.endTime} onChange={(e) => handleSlotChange(i, "endTime", e.target.value)} required />
              <input type="number" placeholder="Total Seats" value={slot.totalSeats} onChange={(e) => handleSlotChange(i, "totalSeats", e.target.value)} required />
              <button type="button" className="btn danger" onClick={() => removeTimeSlot(i)}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn secondary" onClick={addTimeSlot}>+ Add Time Slot</button>
        </div>

        <button className="btn primary">Create Buffet</button>
      </form>
    </section>
  );
}

export default BuffetCreator;
