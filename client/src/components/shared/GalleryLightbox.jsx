import React, { useEffect, useRef } from 'react';
import { Photo } from '../../design/ReferenceUI';

export default function GalleryLightbox({ images, index, onIndexChange, onClose, title }) {
  const dialog = useRef(null);
  const count = images.length;
  const go = offset => onIndexChange((index + offset + count) % count);

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    const previous = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previous;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={dialog} className="df06-lightbox" aria-label={`${title} photo gallery`}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (count > 1 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        go(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }}>
    <header><span aria-live="polite">{count ? index + 1 : 0} / {count}</span>
      <button type="button" autoFocus onClick={onClose} aria-label="Close photo gallery">×</button>
    </header>
    <Photo key={index} sources={[images[index]]} alt={`${title}, photo ${index + 1}`} loading="eager" />
    {count > 1 && <footer>
      <button type="button" onClick={() => go(-1)} aria-label="Previous photo">←</button>
      <button type="button" onClick={() => go(1)} aria-label="Next photo">→</button>
    </footer>}
  </dialog>;
}
