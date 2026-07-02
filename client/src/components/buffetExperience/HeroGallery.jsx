import { useMemo, useState } from "react";

const fallbackImages = [
  "https://images.unsplash.com/photo-1555244162-803834f70033",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de",
];

function HeroGallery({ buffet }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const media = useMemo(() => {
    const images = Array.isArray(buffet?.images) && buffet.images.length ? buffet.images : fallbackImages;
    const videos = Array.isArray(buffet?.videos) ? buffet.videos : [];
    return [
      ...images.map((url) => ({ type: "image", url })),
      ...videos.map((url) => ({ type: "video", url })),
    ];
  }, [buffet]);

  const active = media[activeIndex] || media[0];

  return (
    <section className="df-buffet-hero-gallery">
      <div className="df-main-media" onClick={() => setLightboxOpen(true)} role="button" tabIndex={0}>
        {active?.type === "video" ? (
          <video src={active.url} autoPlay muted loop playsInline />
        ) : (
          <img src={active?.url} alt={buffet?.title || "DineFor buffet"} />
        )}
        <div className="df-media-gradient" />
        <button className="df-gallery-count" type="button">View all media · {media.length}</button>
      </div>

      <div className="df-gallery-strip">
        {media.slice(0, 5).map((item, index) => (
          <button
            type="button"
            key={`${item.url}-${index}`}
            className={index === activeIndex ? "df-thumb active" : "df-thumb"}
            onClick={() => setActiveIndex(index)}
          >
            {item.type === "video" ? <video src={item.url} muted playsInline /> : <img src={item.url} alt="Buffet preview" />}
            {item.type === "video" && <span>▶</span>}
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <div className="df-lightbox" onClick={() => setLightboxOpen(false)}>
          <button className="df-lightbox-close" type="button">×</button>
          <div className="df-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {active?.type === "video" ? (
              <video src={active.url} autoPlay controls />
            ) : (
              <img src={active?.url} alt="Buffet fullscreen" />
            )}
            <div className="df-lightbox-nav">
              <button type="button" onClick={() => setActiveIndex((activeIndex - 1 + media.length) % media.length)}>Previous</button>
              <button type="button" onClick={() => setActiveIndex((activeIndex + 1) % media.length)}>Next</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default HeroGallery;
