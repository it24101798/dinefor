import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import MediaUploader from "../components/MediaUploader";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";


// ============================================
// MAIN COMPONENT
// ============================================
function ClientProfile() {
  const { token, user, login } = useAuth();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  // ============================================
  // STATE
  // ============================================
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    city: "",
    avatarUrl: "",
    bio: "",
    dietaryPreferences: [],
    emergencyContact: "",
    emergencyPhone: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [bookingStats, setBookingStats] = useState(null);

  const dietaryOptions = ["Vegetarian", "Vegan", "Halal", "Gluten-Free", "Dairy-Free", "Nut-Free", "Seafood", "No Restrictions"];

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [profileRes, statsRes] = await Promise.all([
        api.get(`/users/me`, { headers }),
        api.get(`/users/me/stats`, { headers }),
      ]);
      setProfile(profileRes.data);
      setBookingStats(statsRes.data);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to load profile.";
      setMessage(errorMsg);
      setMessageType("error");
      
      if (error.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ============================================
  // HANDLERS
  // ============================================
  const updateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await api.put(`/users/me`, profile, { headers });
      setProfile(res.data.user);
      login({ ...user, ...res.data.user, token });
      setMessage("✅ Profile updated successfully!");
      setMessageType("success");
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to update profile.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const updateAvatar = async (data) => {
    const updated = { ...profile, avatarUrl: data.fileUrl };
    setProfile(updated);
    try {
      const res = await api.put(`/users/me`, updated, { headers });
      setProfile(res.data.user);
      login({ ...user, ...res.data.user, token });
      setMessage("✅ Avatar updated successfully!");
      setMessageType("success");
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to update avatar.";
      setMessage(errorMsg);
      setMessageType("error");
    }
  };

  const toggleDietaryPreference = (option) => {
    setProfile((prev) => {
      const current = prev.dietaryPreferences || [];
      if (current.includes(option)) {
        return { ...prev, dietaryPreferences: current.filter((item) => item !== option) };
      } else {
        return { ...prev, dietaryPreferences: [...current, option] };
      }
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderMessage = () => {
    if (!message) return null;

    const styles = {
      success: "bg-secondary-container/30 text-secondary border border-secondary/30",
      error: "bg-error/10 text-error border border-error/20",
      warning: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30",
      info: "bg-primary-container/10 text-primary border border-primary-container/20",
    };

    return (
      <div className={`p-4 rounded-xl text-sm font-medium mb-6 ${styles[messageType] || styles.info}`}>
        {message}
        <button
          onClick={() => setMessage("")}
          className="float-right text-inherit opacity-70 hover:opacity-100"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    );
  };

  const renderLoading = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-pulse">
          <span className="material-symbols-outlined text-5xl text-secondary mb-3 block">person</span>
          <p className="font-headline-md text-headline-md text-text-deep-green">Loading profile...</p>
        </div>
      </div>
    </div>
  );

  // ============================================
  // TAB RENDERERS
  // ============================================
  const renderPersonalInfo = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Full Name *</label>
          <input
            name="name"
            value={profile.name || ""}
            onChange={handleChange}
            className="form-input w-full"
            required
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Email</label>
          <input
            value={profile.email || ""}
            disabled
            className="form-input w-full bg-surface-container-low cursor-not-allowed"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Phone</label>
          <input
            name="phone"
            value={profile.phone || ""}
            onChange={handleChange}
            placeholder="07X XXX XXXX"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">City</label>
          <input
            name="city"
            value={profile.city || ""}
            onChange={handleChange}
            placeholder="Colombo"
            className="form-input w-full"
          />
        </div>
        <div className="md:col-span-2">
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Bio</label>
          <textarea
            name="bio"
            value={profile.bio || ""}
            onChange={handleChange}
            placeholder="Tell us a little about yourself..."
            className="form-textarea w-full"
            rows="3"
          />
        </div>
      </div>
    </div>
  );

  const renderDietaryPreferences = () => (
    <div className="space-y-4">
      <p className="font-body-md text-body-md text-on-surface-variant">
        Select your dietary preferences to help us recommend buffets that suit you.
      </p>
      <div className="flex flex-wrap gap-2">
        {dietaryOptions.map((option) => (
          <button
            key={option}
            onClick={() => toggleDietaryPreference(option)}
            className={`chip ${(profile.dietaryPreferences || []).includes(option) ? "chip-active" : ""}`}
          >
            {option}
          </button>
        ))}
      </div>
      {(profile.dietaryPreferences || []).length > 0 && (
        <div className="p-3 rounded-xl bg-secondary-container/10 border border-secondary/30">
          <p className="font-label-sm text-label-sm text-secondary">Selected Preferences:</p>
          <p className="font-body-md text-body-md text-text-deep-green">
            {(profile.dietaryPreferences || []).join(", ")}
          </p>
        </div>
      )}
    </div>
  );

  const renderEmergencyContact = () => (
    <div className="space-y-4">
      <p className="font-body-md text-body-md text-on-surface-variant">
        Emergency contact information (optional, used for booking safety).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Emergency Contact Name</label>
          <input
            name="emergencyContact"
            value={profile.emergencyContact || ""}
            onChange={handleChange}
            placeholder="Name of emergency contact"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Emergency Contact Phone</label>
          <input
            name="emergencyPhone"
            value={profile.emergencyPhone || ""}
            onChange={handleChange}
            placeholder="07X XXX XXXX"
            className="form-input w-full"
          />
        </div>
      </div>
    </div>
  );

  const renderBookingStats = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-surface-container-low text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Total Bookings</p>
          <p className="font-headline-lg text-headline-lg text-text-deep-green">{bookingStats?.totalBookings || 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary-container/10 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Completed</p>
          <p className="font-headline-lg text-headline-lg text-secondary">{bookingStats?.completedBookings || 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-highlight-gold/10 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Total Spent</p>
          <p className="font-headline-md text-headline-md text-highlight-gold">
            Rs. {(bookingStats?.totalSpent || 0).toLocaleString()}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-primary-container/10 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Member Since</p>
          <p className="font-label-md text-label-md text-text-deep-green">
            {bookingStats?.memberSince ? new Date(bookingStats.memberSince).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </div>
      <Link to="/my-bookings" className="text-secondary font-label-md text-label-md hover:underline inline-flex items-center gap-1">
        View All Bookings
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </Link>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  if (!token) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">lock</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Please Login</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              You need to be logged in to view your profile.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2 mt-6">
              Login
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          {renderLoading()}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green">My Profile</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage your personal details and preferences</p>
        </div>

        {renderMessage()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Sidebar */}
          <div className="lg:col-span-1">
            <div className="card-ambient p-6 text-center sticky top-28">
              <div className="w-32 h-32 rounded-full mx-auto overflow-hidden bg-surface-container-high flex items-center justify-center mb-4 border-4 border-border-subtle">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-headline-lg text-text-deep-green">
                    {profile.name?.charAt(0) || "U"}
                  </span>
                )}
              </div>
              <h3 className="font-headline-md text-headline-md text-text-deep-green">{profile.name}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">{profile.email}</p>
              <div className="mt-4">
                <MediaUploader accept="image/*" label="Upload Photo" onUpload={updateAvatar} />
              </div>
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <p className="font-label-sm text-label-sm text-on-surface-variant">Member Since</p>
                <p className="font-body-md text-body-md text-text-deep-green">
                  {bookingStats?.memberSince ? new Date(bookingStats.memberSince).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="card-ambient p-6">
              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-6 border-b border-border-subtle pb-4">
                {["personal", "dietary", "emergency", "stats"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg font-label-sm text-label-sm transition-all ${
                      activeTab === tab
                        ? "bg-secondary-container/20 text-secondary"
                        : "text-on-surface-variant hover:text-text-deep-green"
                    }`}
                  >
                    {tab === "personal" && "Personal Info"}
                    {tab === "dietary" && "Dietary Preferences"}
                    {tab === "emergency" && "Emergency Contact"}
                    {tab === "stats" && "Booking Stats"}
                  </button>
                ))}
              </div>

              <form onSubmit={updateProfile}>
                {activeTab === "personal" && renderPersonalInfo()}
                {activeTab === "dietary" && renderDietaryPreferences()}
                {activeTab === "emergency" && renderEmergencyContact()}
                {activeTab === "stats" && renderBookingStats()}

                {activeTab !== "stats" && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-surface-cream border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Save Changes
                      </>
                    )}
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ClientProfile;