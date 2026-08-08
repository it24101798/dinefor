import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function FavoriteBuffetButton({
  buffetId,
  defaultSaved = false,
  compact = true,
  className = "",
  onChange,
}) {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [saved, setSaved] = useState(Boolean(defaultSaved));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSaved(Boolean(defaultSaved));
  }, [defaultSaved]);

  const toggle = useCallback(
    async (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();

      if (!isLoggedIn) {
        navigate("/login");
        return;
      }

      if (!buffetId || busy) return;

      const previous = saved;
      setSaved(!previous);
      setBusy(true);

      try {
        const response = await api.put(
          `/users/saved-buffets/${buffetId}`
        );

        const nextSaved = Boolean(response.data?.saved);
        setSaved(nextSaved);
        onChange?.(nextSaved);
      } catch (error) {
        setSaved(previous);
        window.alert(
          error.response?.data?.message ||
            "Failed to update saved buffet."
        );
      } finally {
        setBusy(false);
      }
    },
    [buffetId, busy, isLoggedIn, navigate, onChange, saved]
  );

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={
          saved ? "Remove buffet from favorites" : "Save buffet"
        }
        aria-pressed={saved}
        className={[
          "absolute top-3 right-3 z-10 w-11 h-11 rounded-full",
          "grid place-items-center backdrop-blur-md shadow-sm",
          "border transition-all active:scale-95",
          saved
            ? "bg-secondary text-surface-cream border-secondary"
            : "bg-surface-cream/90 text-text-deep-green border-surface-cream/60 hover:bg-surface-cream",
          busy ? "opacity-60 cursor-wait" : "",
          className,
        ].join(" ")}
      >
        <span
          className="material-symbols-outlined text-[22px]"
          style={{
            fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          favorite
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      className={[
        saved ? "btn-primary" : "btn-outline",
        "inline-flex items-center justify-center gap-2",
        className,
      ].join(" ")}
    >
      <span
        className="material-symbols-outlined text-[18px]"
        style={{
          fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0",
        }}
      >
        favorite
      </span>
      {busy ? "Saving…" : saved ? "Saved" : "Save Buffet"}
    </button>
  );
}

export default FavoriteBuffetButton;
