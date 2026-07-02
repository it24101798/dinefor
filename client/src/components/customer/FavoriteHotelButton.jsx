import { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function FavoriteHotelButton({ hotelId, defaultSaved = false }) {
  const { token, isLoggedIn } = useAuth();
  const [saved, setSaved] = useState(defaultSaved);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!isLoggedIn) {
      alert("Please sign in to save hotels.");
      return;
    }

    try {
      setBusy(true);
      const res = await api.put(
        `/customer/saved-hotels/${hotelId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSaved(Boolean(res.data.saved));
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update saved hotel.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className={saved ? "btn secondary saved-active" : "btn secondary"} type="button" onClick={toggle} disabled={busy}>
      {saved ? "♥ Saved" : "♡ Save Hotel"}
    </button>
  );
}

export default FavoriteHotelButton;
