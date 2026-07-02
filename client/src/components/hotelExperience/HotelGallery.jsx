import { useState } from "react";

function HotelGallery({ gallery = [] }) {
  const [active, setActive] = useState(null);
  const visible = gallery.slice(0, 6);

  return (
    <section className="df-hotel-section">
      <div className="df-section-head">
        <span className="eyebrow">Gallery</span>
        <h2>Photos & videos</h2>
      </div>

      {gallery.length === 0 ? (
        <div className="df-empty-state">No hotel media uploaded yet.</div>
      ) : (
        <div className="df-gallery-grid">
          {visible.map((item, index) => (
            <button key={`${item.url}-${index}`} className="df-gallery-item" type="button" onClick={() => setActive(item)}>
              {item.type === "video" ? <video src={item.url} muted playsInline /> : <img src={item.url} alt="Hotel gallery" />}
              {index === 5 && gallery.length > 6 ? <span>+{gallery.length - 6} more</span> : null}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="df-lightbox" role="button" tabIndex={0} onClick={() => setActive(null)}>
          <button type="button" className="df-lightbox-close" onClick={() => setActive(null)}>×</button>
          {active.type === "video" ? <video src={active.url} controls autoPlay /> : <img src={active.url} alt="Preview" />}
        </div>
      )}
    </section>
  );
}

export default HotelGallery;
