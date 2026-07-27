import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1555244162-803834f70033?w=1600&fit=crop";

export default function HeroMediaCarousel({ settings = {} }) {
  const videoRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(settings.videoMuted !== false);
  const [failed, setFailed] = useState({});

  const items = useMemo(() => {
    const active = (Array.isArray(settings.heroMediaItems) ? settings.heroMediaItems : [])
      .filter((item) => item?.isActive !== false && item?.url)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    if (active.length) return active;
    return [{ type: settings.heroMediaType === "video" ? "video" : "image", url: settings.heroMediaUrl || settings.fallbackHeroImage || DEFAULT_IMAGE, posterUrl: settings.fallbackHeroImage || DEFAULT_IMAGE, alt: "DineFor premium buffet experience" }];
  }, [settings]);

  useEffect(() => { setIndex((current) => Math.min(current, Math.max(0, items.length - 1))); }, [items.length]);
  useEffect(() => { setMuted(settings.videoMuted !== false); }, [settings.videoMuted]);

  const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const current = items[index] || items[0];
  const duration = Math.min(30000, Math.max(2500, Number(settings.heroSlideDuration) || 6000));

  useEffect(() => {
    if (items.length <= 1 || settings.heroAutoplay === false || paused || reducedMotion || current?.type === "video") return undefined;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % items.length), duration);
    return () => window.clearTimeout(timer);
  }, [current?.type, duration, items.length, paused, reducedMotion, settings.heroAutoplay]);

  const go = (next) => setIndex((next + items.length) % items.length);
  const fallback = settings.fallbackHeroImage || DEFAULT_IMAGE;

  return (
    <div className="home-hero-media" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {items.map((item, itemIndex) => {
        const active = itemIndex === index;
        const broken = failed[itemIndex];
        return (
          <div key={item._id || `${item.url}-${itemIndex}`} className={`home-hero-slide ${active ? "is-active" : ""}`} aria-hidden={!active}>
            {item.type === "video" && !broken ? (
              <video
                ref={active ? videoRef : null}
                src={item.url}
                poster={item.posterUrl || fallback}
                muted={muted}
                autoPlay={active && !reducedMotion}
                playsInline
                loop={items.length === 1}
                preload={active ? "metadata" : "none"}
                onEnded={() => items.length > 1 && go(index + 1)}
                onError={() => setFailed((value) => ({ ...value, [itemIndex]: true }))}
              />
            ) : (
              <img
                src={broken ? fallback : item.url}
                alt={item.alt || "DineFor premium buffet experience"}
                loading={itemIndex === 0 ? "eager" : "lazy"}
                onError={() => setFailed((value) => ({ ...value, [itemIndex]: true }))}
              />
            )}
          </div>
        );
      })}

      {current?.type === "video" && (
        <button type="button" className="home-hero-mute" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Unmute hero video" : "Mute hero video"}>
          <span className="material-symbols-outlined">{muted ? "volume_off" : "volume_up"}</span>
        </button>
      )}

      {items.length > 1 && (
        <>
          <button type="button" className="home-hero-nav is-prev" onClick={() => go(index - 1)} aria-label="Previous hero media"><span className="material-symbols-outlined">chevron_left</span></button>
          <button type="button" className="home-hero-nav is-next" onClick={() => go(index + 1)} aria-label="Next hero media"><span className="material-symbols-outlined">chevron_right</span></button>
          <div className="home-hero-dots" role="tablist" aria-label="Hero media">
            {items.map((_, dotIndex) => <button key={dotIndex} type="button" className={dotIndex === index ? "is-active" : ""} onClick={() => setIndex(dotIndex)} aria-label={`Show slide ${dotIndex + 1}`} />)}
          </div>
        </>
      )}
    </div>
  );
}
