import { useEffect, useState } from "react";
import axios from "axios";
import MediaUploader from "../MediaUploader";

function HomeCMSPanel() {
  const [settings, setSettings] = useState({
    heroTitle: "",
    heroSubtitle: "",
    heroMediaType: "image",
    heroMediaUrl: "",
    videoMuted: true,
    themeMode: "dark",
    featuredSectionTitle: "",
    popularSectionTitle: "",
  });

  const [message, setMessage] = useState("");

  const storedUser = JSON.parse(localStorage.getItem("dineforUser"));
  const token = storedUser?.token;

  const fetchSettings = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/site-settings");
      setSettings(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setSettings({
      ...settings,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const saveSettings = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.put(
        "http://localhost:5000/api/site-settings",
        settings,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(res.data.message || "Homepage updated successfully ✅");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update homepage");
    }
  };

  return (
    <section className="panel cms-panel reveal">
      <div className="section-header">
        <span className="eyebrow">Homepage CMS</span>
        <h2>Control DineFor Home Page</h2>
        <p className="muted">
          Update hero title, subtitle, image/video, theme, and featured section
          without editing code.
        </p>
      </div>

      <form onSubmit={saveSettings} className="form-grid">
        <input
          name="heroTitle"
          placeholder="Hero Title"
          value={settings.heroTitle || ""}
          onChange={handleChange}
        />

        <select
          name="themeMode"
          value={settings.themeMode || "dark"}
          onChange={handleChange}
        >
          <option value="dark">Dark Theme</option>
          <option value="light">Light Theme</option>
        </select>

        <textarea
          name="heroSubtitle"
          placeholder="Hero Subtitle"
          value={settings.heroSubtitle || ""}
          onChange={handleChange}
          className="span-2"
        />

        <select
          name="heroMediaType"
          value={settings.heroMediaType || "image"}
          onChange={handleChange}
        >
          <option value="image">Hero Image</option>
          <option value="video">Hero Video</option>
        </select>

        <input
          name="heroMediaUrl"
          placeholder="Hero Media URL"
          value={settings.heroMediaUrl || ""}
          onChange={handleChange}
        />

        <div className="span-2">
          <MediaUploader
            onUpload={(data) => {
              setSettings({
                ...settings,
                heroMediaUrl: data.fileUrl,
                heroMediaType: data.mediaType,
              });
            }}
          />
        </div>

        <label className="check-row span-2">
          <input
            type="checkbox"
            name="videoMuted"
            checked={Boolean(settings.videoMuted)}
            onChange={handleChange}
          />
          Start hero video muted
        </label>

        <input
          name="featuredSectionTitle"
          placeholder="Featured Section Title"
          value={settings.featuredSectionTitle || ""}
          onChange={handleChange}
        />

        <input
          name="popularSectionTitle"
          placeholder="Popular Section Title"
          value={settings.popularSectionTitle || ""}
          onChange={handleChange}
        />

        <button className="btn primary" type="submit">
          Save Homepage Settings
        </button>
      </form>

      {message && <p className="success-text">{message}</p>}
    </section>
  );
}

export default HomeCMSPanel;
