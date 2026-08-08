import React, { useEffect } from "react";

export default function MobileBottomSheet({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="df-mobile-sheet-shell" role="dialog" aria-modal="true" aria-label={title || "Dialog"}>
      <button type="button" className="df-mobile-sheet-backdrop" onClick={onClose} aria-label="Close dialog" />
      <section className="df-mobile-sheet-panel">
        <div className="df-mobile-sheet-handle" aria-hidden="true" />
        <header className="df-mobile-sheet-header">
          <h2>{title}</h2>
          <button type="button" className="df-mobile-icon-button" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="df-mobile-sheet-content">{children}</div>
        {footer ? <footer className="df-mobile-sheet-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
