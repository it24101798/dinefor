import { useEffect, useState } from "react";
import api from "../../services/api";
import MediaUploader from "../MediaUploader";

const defaults = {
  heroTitle: "", heroSubtitle: "", heroMediaType: "image", heroMediaUrl: "",
  heroMediaItems: [], heroAutoplay: true, heroSlideDuration: 6000, videoMuted: true,
  fallbackHeroImage: "", themeMode: "dark", featuredSectionTitle: "", popularSectionTitle: "",
};

export default function HomeCMSPanel() {
  const [settings, setSettings] = useState(defaults);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/site-settings").then((res) => setSettings({ ...defaults, ...res.data, heroMediaItems: Array.isArray(res.data?.heroMediaItems) ? res.data.heroMediaItems : [] })).catch(() => setMessage("Could not load homepage settings."));
  }, []);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setSettings((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const addMedia = (upload) => {
    const uploads = Array.isArray(upload) ? upload : [upload];
    setSettings((current) => ({
      ...current,
      heroMediaItems: [
        ...(current.heroMediaItems || []),
        ...uploads.map((item, offset) => ({ type: item.mediaType === "video" ? "video" : "image", url: item.fileUrl, posterUrl: "", alt: "DineFor buffet experience", sortOrder: current.heroMediaItems.length + offset, isActive: true })),
      ],
    }));
  };

  const updateItem = (index, patch) => setSettings((current) => ({ ...current, heroMediaItems: current.heroMediaItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  const removeItem = (index) => setSettings((current) => ({ ...current, heroMediaItems: current.heroMediaItems.filter((_, itemIndex) => itemIndex !== index).map((item, order) => ({ ...item, sortOrder: order })) }));
  const move = (index, direction) => setSettings((current) => {
    const items = [...current.heroMediaItems];
    const next = index + direction;
    if (next < 0 || next >= items.length) return current;
    [items[index], items[next]] = [items[next], items[index]];
    return { ...current, heroMediaItems: items.map((item, order) => ({ ...item, sortOrder: order })) };
  });

  const save = async (event) => {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const res = await api.put("/site-settings", settings);
      setSettings({ ...defaults, ...(res.data.settings || settings) });
      setMessage(res.data.message || "Homepage updated successfully.");
    } catch (error) { setMessage(error.response?.data?.message || "Failed to update homepage."); }
    finally { setSaving(false); }
  };

  return (
    <section className="panel cms-panel reveal admin-feature-panel">
      <div className="section-header"><span className="eyebrow">Homepage CMS</span><h2>Control DineFor Home Page</h2><p className="muted">Manage hero copy, images, videos and slideshow behavior without editing code.</p></div>
      <form onSubmit={save} className="form-grid admin-cms-form">
        <input name="heroTitle" placeholder="Hero title" value={settings.heroTitle || ""} onChange={change} />
        <select name="themeMode" value={settings.themeMode || "dark"} onChange={change}><option value="dark">Dark Theme</option><option value="light">Light Theme</option></select>
        <textarea name="heroSubtitle" placeholder="Hero subtitle" value={settings.heroSubtitle || ""} onChange={change} className="span-2" />
        <select name="heroMediaType" value={settings.heroMediaType || "image"} onChange={change}><option value="image">Single image</option><option value="video">Single video</option><option value="carousel">Image slideshow</option><option value="mixed">Mixed slideshow</option></select>
        <input name="heroMediaUrl" placeholder="Legacy/single hero media URL" value={settings.heroMediaUrl || ""} onChange={change} />
        <input name="fallbackHeroImage" placeholder="Fallback hero image URL" value={settings.fallbackHeroImage || ""} onChange={change} />
        <div className="span-2"><MediaUploader multiple maxFiles={8} maxSizeMb={500} uploadEndpoint="/uploads/hero" label="Upload hero images or videos" onUpload={addMedia} /></div>
        <div className="span-2 space-y-3">
          {(settings.heroMediaItems || []).map((item, index) => (
            <div key={item._id || `${item.url}-${index}`} className="card-ambient p-3 flex flex-col md:flex-row gap-3 items-start md:items-center">
              {item.type === "video" ? <video src={item.url} poster={item.posterUrl} muted className="w-28 h-20 rounded-lg object-cover" /> : <img src={item.url} alt={item.alt || "Hero media"} className="w-28 h-20 rounded-lg object-cover" />}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                <input value={item.alt || ""} onChange={(e) => updateItem(index, { alt: e.target.value })} placeholder="Accessible alt text" />
                {item.type === "video" && <input value={item.posterUrl || ""} onChange={(e) => updateItem(index, { posterUrl: e.target.value })} placeholder="Video poster URL" />}
                <label className="check-row"><input type="checkbox" checked={item.isActive !== false} onChange={(e) => updateItem(index, { isActive: e.target.checked })} /> Active</label>
              </div>
              <div className="flex gap-2"><button type="button" className="btn-outline" onClick={() => move(index, -1)} disabled={index === 0}>↑</button><button type="button" className="btn-outline" onClick={() => move(index, 1)} disabled={index === settings.heroMediaItems.length - 1}>↓</button><button type="button" className="btn-outline" onClick={() => removeItem(index)}>Remove</button></div>
            </div>
          ))}
        </div>
        <label className="check-row"><input type="checkbox" name="heroAutoplay" checked={Boolean(settings.heroAutoplay)} onChange={change} /> Autoplay slideshow</label>
        <label className="check-row"><input type="checkbox" name="videoMuted" checked={Boolean(settings.videoMuted)} onChange={change} /> Start videos muted</label>
        <label>Slide duration (ms)<input type="number" min="2500" max="30000" step="500" name="heroSlideDuration" value={settings.heroSlideDuration || 6000} onChange={change} /></label>
        <input name="featuredSectionTitle" placeholder="Featured section title" value={settings.featuredSectionTitle || ""} onChange={change} />
        <input name="popularSectionTitle" placeholder="Popular section title" value={settings.popularSectionTitle || ""} onChange={change} />
        <button className="btn primary admin-save-button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Homepage Settings"}</button>
      </form>
      {message && <p className="success-text">{message}</p>}
    </section>
  );
}
