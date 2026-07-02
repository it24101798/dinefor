import { useEffect, useState } from "react";
import axios from "axios";
import MediaUploader from "../components/MediaUploader";
import { useAuth } from "../context/AuthContext";

function ClientProfile() {
  const { token, user, login } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [profile, setProfile] = useState({ name: "", phone: "", city: "", avatarUrl: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/users/me", { headers });
      setProfile(res.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put("http://localhost:5000/api/users/me", profile, { headers });
      setProfile(res.data.user);
      login({ ...user, ...res.data.user, token });
      setMessage(res.data.message || "Profile updated successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update profile.");
    }
  };

  const updateAvatar = async (data) => {
    const updated = { ...profile, avatarUrl: data.fileUrl };
    setProfile(updated);
    const res = await axios.put("http://localhost:5000/api/users/me", updated, { headers });
    setMessage(res.data.message || "Avatar updated.");
  };

  if (loading) return <main className="profile-page"><p className="muted">Loading client profile...</p></main>;

  return (
    <main className="profile-page client-profile-page">
      <section className="page-hero compact reveal-card">
        <span className="eyebrow">Client Center</span>
        <h1>My DineFor Profile</h1>
        <p>Manage the details used on reservations, bills, QR check-ins, and saved dining experiences.</p>
      </section>

      {message && <p className={message.toLowerCase().includes("failed") ? "error-text page-message" : "success-text page-message"}>{message}</p>}

      <section className="panel client-profile-grid">
        <div className="client-avatar-card">
          <div className="client-avatar-preview">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.name} /> : <span>{profile.name?.charAt(0) || "U"}</span>}
          </div>
          <h2>{profile.name}</h2>
          <p>{profile.email}</p>
          <MediaUploader accept="image/*" label="Upload profile photo" onUpload={updateAvatar} />
        </div>

        <form className="profile-form" onSubmit={updateProfile}>
          <div className="section-header"><span className="eyebrow">Personal Details</span><h2>Reservation Contact Details</h2></div>
          <label>Name<input value={profile.name || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
          <label>Email<input value={profile.email || ""} disabled /></label>
          <label>Phone<input value={profile.phone || ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="07X XXX XXXX" /></label>
          <label>City<input value={profile.city || ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="Colombo" /></label>
          <button className="btn primary" type="submit">Save Profile</button>
        </form>
      </section>
    </main>
  );
}

export default ClientProfile;
