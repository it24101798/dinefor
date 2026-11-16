import React, { useCallback, useEffect, useRef } from "react";
import { PLACEHOLDER_IMAGE, onImageError } from "../../utils/media";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Accessible full-screen photo viewer: dialog semantics, Escape, arrow keys,
// focus trap, scroll lock and focus restoration to the element that opened it.
export default function GalleryLightbox({ images = [], index = 0, onIndexChange, onClose, title = "Buffet" }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const count = images.length;
  const safeIndex = count ? Math.min(Math.max(index, 0), count - 1) : 0;

  const go = useCallback(
    (delta) => {
      if (count > 1) onIndexChange((safeIndex + delta + count) % count);
    },
    [count, safeIndex, onIndexChange]
  );

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      } else if (event.key === "ArrowRight") {
        go(1);
      } else if (event.key === "ArrowLeft") {
        go(-1);
      } else if (event.key === "Tab") {
        const nodes = dialogRef.current ? Array.from(dialogRef.current.querySelectorAll(FOCUSABLE)) : [];
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement;
        if (!dialogRef.current.contains(active)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, go]);

  return (
    <div
      className="df-lightbox-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="df-lightbox-dialog" role="dialog" aria-modal="true" aria-label={`${title} photo gallery`}>
        <button ref={closeRef} type="button" className="df-lightbox-close" aria-label="Close photo gallery" onClick={onClose}>
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>

        <img
          key={safeIndex}
          className="df-lightbox-image"
          src={images[safeIndex] || PLACEHOLDER_IMAGE}
          alt={`${title}, photo ${safeIndex + 1} of ${Math.max(count, 1)}`}
          onError={onImageError}
        />

        {count > 1 && (
          <>
            <button type="button" className="df-lightbox-nav is-prev" aria-label="Previous photo" onClick={() => go(-1)}>
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            <button type="button" className="df-lightbox-nav is-next" aria-label="Next photo" onClick={() => go(1)}>
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
            <div className="df-lightbox-footer">
              <p className="df-lightbox-count" aria-live="polite">{safeIndex + 1} / {count}</p>
              <div className="df-lightbox-dots">
                {images.map((_, dot) => (
                  <button
                    key={dot}
                    type="button"
                    className={dot === safeIndex ? "is-current" : ""}
                    aria-label={`Show photo ${dot + 1}`}
                    aria-current={dot === safeIndex ? "true" : undefined}
                    onClick={() => onIndexChange(dot)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
