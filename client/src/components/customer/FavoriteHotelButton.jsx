import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function FavoriteHotelButton({
  hotelId,
  defaultSaved = false,
  compact = false,
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

      if (!hotelId || busy) return;

      const previous = saved;
      setSaved(!previous);
      setBusy(true);

      try {
        const response = await api.put(
          `/customer/saved-hotels/${hotelId}`
        );

        const nextSaved = Boolean(response.data?.saved);
        setSaved(nextSaved);
        onChange?.(nextSaved);
      } catch (error) {
        setSaved(previous);
        window.alert(
          error.response?.data?.message ||
            "Failed to update saved hotel."
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, hotelId, isLoggedIn, navigate, onChange, saved]
  );

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={
          saved ? "Remove hotel from favorites" : "Save hotel"
        }
        aria-pressed={saved}
        className={[
          "w-11 h-11 rounded-full grid place-items-center",
          "border transition-all active:scale-95",
          saved
            ? "bg-secondary text-surface-cream border-secondary"
            : "bg-surface-container-lowest text-text-deep-green border-border-subtle",
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
      {busy ? "Saving…" : saved ? "Saved Hotel" : "Save Hotel"}
    </button>
  );
}

export default FavoriteHotelButton;
