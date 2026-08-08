import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import MediaUploader from "../components/MediaUploader";
import { useAuth } from "../context/AuthContext";

const cuisineOptions = [
  "Sri Lankan",
  "Indian",
  "Chinese",
  "Italian",
  "Japanese",
  "Seafood",
  "BBQ",
  "International",
  "Desserts",
];

const dietaryOptions = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "No Restrictions",
];

const allergyOptions = [
  "Peanuts",
  "Tree Nuts",
  "Shellfish",
  "Fish",
  "Eggs",
  "Milk",
  "Soy",
  "Wheat",
  "Sesame",
];

const accessOptions = [
  "Wheelchair Access",
  "High Chair",
  "Quiet Seating",
  "Visual Assistance",
  "Hearing Assistance",
];

const genderOptions = [
  { value: "", label: "Select gender" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  {
    value: "prefer_not_to_say",
    label: "Prefer not to say",
  },
];

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

function MultiSelectSection({
  title,
  description,
  items,
  selected,
  onToggle,
}) {
  return (
    <section className="card-ambient p-5 sm:p-6">
      <h2 className="font-headline-md text-headline-md text-text-deep-green">
        {title}
      </h2>
      {description && (
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          {description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {items.map((item) => {
          const active = selected.includes(item);

          return (
            <button
              type="button"
              key={item}
              onClick={() => onToggle(item)}
              aria-pressed={active}
              className={`chip ${active ? "chip-active" : ""}`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProfileEditModal({
  profile,
  saving,
  onChange,
  onClose,
  onSave,
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl shadow-ambient-lg border border-border-subtle"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >
        <div className="sticky top-0 z-10 bg-surface-container-lowest border-b border-border-subtle p-5 flex items-center justify-between">
          <div>
            <h2
              id="edit-profile-title"
              className="font-headline-md text-headline-md text-text-deep-green"
            >
              Edit Personal Details
            </h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Update the information used for reservations.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full grid place-items-center hover:bg-surface-container-low"
            aria-label="Close profile editor"
          >
            <span className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        <div className="p-5 sm:p-6 grid sm:grid-cols-2 gap-4">
          <label className="font-label-sm text-label-sm text-on-surface-variant">
            Full Name
            <input
              className="form-input w-full mt-1"
              value={profile.name || ""}
              onChange={(event) =>
                onChange("name", event.target.value)
              }
            />
          </label>

          <label className="font-label-sm text-label-sm text-on-surface-variant">
            Phone Number
            <input
              className="form-input w-full mt-1"
              value={profile.phone || ""}
              onChange={(event) =>
                onChange("phone", event.target.value)
              }
              placeholder="07X XXX XXXX"
            />
          </label>

          <label className="font-label-sm text-label-sm text-on-surface-variant">
            City
            <input
              className="form-input w-full mt-1"
              value={profile.city || ""}
              onChange={(event) =>
                onChange("city", event.target.value)
              }
            />
          </label>

          <label className="font-label-sm text-label-sm text-on-surface-variant">
            Gender
            <select
              className="form-select w-full mt-1"
              value={profile.gender || ""}
              onChange={(event) =>
                onChange("gender", event.target.value)
              }
            >
              {genderOptions.map((option) => (
                <option
                  key={option.value || "empty"}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="font-label-sm text-label-sm text-on-surface-variant">
            Birthday
            <input
              type="date"
              className="form-input w-full mt-1"
              value={formatDateInput(profile.birthday)}
              onChange={(event) =>
                onChange(
                  "birthday",
                  event.target.value || null
                )
              }
            />
          </label>

          <label className="font-label-sm text-label-sm text-on-surface-variant">
            Anniversary
            <input
              type="date"
              className="form-input w-full mt-1"
              value={formatDateInput(profile.anniversary)}
              onChange={(event) =>
                onChange(
                  "anniversary",
                  event.target.value || null
                )
              }
            />
          </label>

          <label className="sm:col-span-2 font-label-sm text-label-sm text-on-surface-variant">
            About You
            <textarea
              className="form-textarea w-full mt-1"
              rows="4"
              maxLength="500"
              value={profile.bio || ""}
              onChange={(event) =>
                onChange("bio", event.target.value)
              }
              placeholder="Tell DineFor what kind of dining experiences you enjoy."
            />
            <span className="block text-right mt-1 text-xs">
              {(profile.bio || "").length}/500
            </span>
          </label>
        </div>

        <div className="p-5 border-t border-border-subtle flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Saving…" : "Save Details"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientProfile() {
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("success");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] =
    useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [profileResponse, statsResponse] =
        await Promise.all([
          api.get("/users/me"),
          api.get("/users/me/stats"),
        ]);

      setProfile(profileResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to load profile."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completion = useMemo(
    () => Number(profile?.profileCompletion || 0),
    [profile]
  );

  const updateField = (key, value) => {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updatePreference = (key, value) => {
    setProfile((current) => ({
      ...current,
      preferences: {
        ...(current.preferences || {}),
        [key]: value,
      },
    }));
  };

  const toggle = (key, value) => {
    setProfile((current) => {
      const list = current[key] || [];
      const exists = list.includes(value);

      return {
        ...current,
        [key]: exists
          ? list.filter((item) => item !== value)
          : [...list, value],
      };
    });
  };

  const saveProfile = async ({
    closeModal = false,
  } = {}) => {
    try {
      setSaving(true);
      setMessage("");

      const response = await api.put(
        "/users/me",
        profile
      );

      setProfile(response.data.user);

      updateUser({
        ...user,
        ...response.data.user,
        token: user.token,
      });

      setMessage("Profile updated successfully.");
      setMessageType("success");

      if (closeModal) setShowEditModal(false);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not update profile."
      );
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePhoto = async (data) => {
    const avatarUrl = data?.fileUrl;

    if (!avatarUrl) return;

    const nextProfile = {
      ...profile,
      avatarUrl,
    };

    setProfile(nextProfile);

    try {
      const response = await api.put(
        "/users/me",
        nextProfile
      );

      setProfile(response.data.user);
      updateUser({
        ...user,
        ...response.data.user,
        token: user.token,
      });

      setMessage("Profile photo updated.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Profile photo could not be saved."
      );
      setMessageType("error");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-surface-cream pt-32 text-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-secondary">
          progress_activity
        </span>
        <p className="mt-3 text-on-surface-variant">
          Loading profile…
        </p>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-surface-cream pt-24 sm:pt-28 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <span className="badge-gold">
              Customer Profile
            </span>
            <h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">
              My Profile
            </h1>
            <p className="text-on-surface-variant">
              Personalize recommendations and reservation
              support.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 self-start">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                edit
              </span>
              Edit Profile
            </button>

            <Link
              to="/account-security"
              className="btn-secondary"
            >
              Account Security
            </Link>
          </div>
        </div>

        {message && (
          <div
            className={[
              "mt-5 p-3 rounded-xl border",
              messageType === "error"
                ? "bg-error/10 text-error border-error/20"
                : "bg-secondary-container/20 text-secondary border-secondary/20",
            ].join(" ")}
            role={messageType === "error" ? "alert" : "status"}
          >
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-[300px_1fr] gap-6 mt-6">
          <aside className="space-y-5">
            <section className="card-ambient p-6 h-fit">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-surface-container-high mx-auto border-4 border-surface-container-lowest shadow-md">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    className="w-full h-full object-cover"
                    alt={profile.name}
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-3xl text-text-deep-green">
                    {profile.name?.[0]?.toUpperCase() || "D"}
                  </div>
                )}
              </div>

              <div className="text-center mt-3">
                <h2 className="font-headline-md text-headline-md text-text-deep-green">
                  {profile.name}
                </h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant break-all">
                  {profile.email}
                </p>
              </div>

              <div className="mt-4">
                <MediaUploader
                  label="Upload profile photo"
                  accept="image/*"
                  multiple={false}
                  onUpload={handleProfilePhoto}
                />
              </div>
            </section>

            <section className="card-ambient p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-label-md text-label-md text-text-deep-green">
                  Profile Completion
                </h3>
                <strong className="text-secondary">
                  {completion}%
                </strong>
              </div>

              <div className="h-2 bg-surface-container-high rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-secondary rounded-full transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>

              <p className="font-label-sm text-label-sm text-on-surface-variant mt-3">
                {completion >= 90
                  ? "Excellent — your profile is ready for personalized recommendations."
                  : "Add more details to improve buffet recommendations and reservation support."}
              </p>
            </section>

            <section className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 bg-surface-container-low rounded-xl border border-border-subtle">
                <strong className="block text-2xl text-text-deep-green">
                  {stats?.totalBookings || 0}
                </strong>
                <span className="text-xs text-on-surface-variant">
                  Bookings
                </span>
              </div>

              <div className="p-4 bg-surface-container-low rounded-xl border border-border-subtle">
                <strong className="block text-2xl text-text-deep-green">
                  {stats?.completedBookings || 0}
                </strong>
                <span className="text-xs text-on-surface-variant">
                  Completed
                </span>
              </div>

              <div className="p-4 bg-surface-container-low rounded-xl border border-border-subtle">
                <strong className="block text-2xl text-text-deep-green">
                  {stats?.savedBuffets || 0}
                </strong>
                <span className="text-xs text-on-surface-variant">
                  Saved Buffets
                </span>
              </div>

              <div className="p-4 bg-surface-container-low rounded-xl border border-border-subtle">
                <strong className="block text-2xl text-text-deep-green">
                  {stats?.savedHotels || 0}
                </strong>
                <span className="text-xs text-on-surface-variant">
                  Saved Hotels
                </span>
              </div>
            </section>
          </aside>

          <div className="space-y-6">
            <section className="card-ambient p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-headline-md text-headline-md text-text-deep-green">
                    Personal Details
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Information used to support your
                    reservations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="btn-outline self-start"
                >
                  Edit Details
                </button>
              </div>

              <dl className="grid sm:grid-cols-2 gap-4 mt-5">
                {[
                  ["Phone", profile.phone || "Not added"],
                  ["City", profile.city || "Not added"],
                  [
                    "Gender",
                    genderOptions.find(
                      (option) =>
                        option.value === profile.gender
                    )?.label || "Not added",
                  ],
                  [
                    "Birthday",
                    profile.birthday
                      ? new Date(
                          profile.birthday
                        ).toLocaleDateString()
                      : "Not added",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="p-4 rounded-xl bg-surface-container-low"
                  >
                    <dt className="font-label-sm text-label-sm text-on-surface-variant">
                      {label}
                    </dt>
                    <dd className="font-label-md text-label-md text-text-deep-green mt-1">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              {profile.bio && (
                <div className="mt-4 p-4 rounded-xl bg-surface-container-low">
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    About
                  </p>
                  <p className="font-body-md text-body-md text-text-deep-green mt-1">
                    {profile.bio}
                  </p>
                </div>
              )}
            </section>

            <MultiSelectSection
              title="Favorite Cuisines"
              description="Used to personalize buffet recommendations."
              items={cuisineOptions}
              selected={profile.favoriteCuisines || []}
              onToggle={(value) =>
                toggle("favoriteCuisines", value)
              }
            />

            <MultiSelectSection
              title="Dietary Preferences"
              description="Help hotels understand your dining requirements."
              items={dietaryOptions}
              selected={profile.dietaryPreferences || []}
              onToggle={(value) =>
                toggle("dietaryPreferences", value)
              }
            />

            <MultiSelectSection
              title="Allergies"
              description="Keep this information accurate and always reconfirm directly with the hotel."
              items={allergyOptions}
              selected={profile.allergies || []}
              onToggle={(value) =>
                toggle("allergies", value)
              }
            />

            <MultiSelectSection
              title="Accessibility & Seating Needs"
              description="Preferences can be shared during reservation requests."
              items={accessOptions}
              selected={profile.accessibilityNeeds || []}
              onToggle={(value) =>
                toggle("accessibilityNeeds", value)
              }
            />

            <section className="card-ambient p-5 sm:p-6">
              <h2 className="font-headline-md text-headline-md text-text-deep-green">
                Notifications & Language
              </h2>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <label className="font-label-sm text-label-sm text-on-surface-variant">
                  Language
                  <select
                    className="form-select w-full mt-1"
                    value={
                      profile.preferences?.language || "en"
                    }
                    onChange={(event) =>
                      updatePreference(
                        "language",
                        event.target.value
                      )
                    }
                  >
                    <option value="en">English</option>
                    <option value="si">Sinhala</option>
                    <option value="ta">Tamil</option>
                  </select>
                </label>

                {[
                  [
                    "emailNotifications",
                    "Email notifications",
                  ],
                  [
                    "smsNotifications",
                    "SMS notifications",
                  ],
                  [
                    "offerNotifications",
                    "Offers from hotels",
                  ],
                  [
                    "bookingReminders",
                    "Booking reminders",
                  ],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={
                        profile.preferences?.[key] !== false
                      }
                      onChange={(event) =>
                        updatePreference(
                          key,
                          event.target.checked
                        )
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </section>

            <button
              type="button"
              onClick={() => saveProfile()}
              disabled={saving}
              className="btn-primary w-full sm:w-auto px-8"
            >
              {saving ? "Saving Profile…" : "Save Preferences"}
            </button>
          </div>
        </div>
      </div>

      {showEditModal && (
        <ProfileEditModal
          profile={profile}
          saving={saving}
          onChange={updateField}
          onClose={() => setShowEditModal(false)}
          onSave={() =>
            saveProfile({ closeModal: true })
          }
        />
      )}
    </main>
  );
}
