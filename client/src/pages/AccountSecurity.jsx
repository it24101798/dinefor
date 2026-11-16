import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import AccountLayout from "../design/AccountLayout";

export default function AccountSecurity() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (form.newPassword.length < 8) {
      setMessage("New password must contain at least 8 characters.");
      setMessageType("error");
      return;
    }

    if (form.newPassword !== form.confirm) {
      setMessage("New passwords do not match.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.put("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setMessage(data.message);
      setMessageType("success");
      setForm({
        currentPassword: "",
        newPassword: "",
        confirm: "",
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not change password."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountLayout title="Keep your account secure." description="Review how you sign in and manage the password protecting your DineFor account." className="rf-security">
      <div className="w-full">

        {message && (
          <div
            className={`mt-5 p-3 rounded-xl ${
              messageType === "error"
                ? "bg-error/10 text-error"
                : "bg-secondary-container/20 text-secondary"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <section className="card-ambient p-5 sm:p-7 bg-white border border-emerald-100 rounded-2xl">
            <h2 className="font-headline-md text-headline-md text-text-deep-green">
              Sign-in details
            </h2>

            <dl className="mt-5 space-y-4">
              <div className="p-3 rounded-xl bg-surface-container-low">
                <dt className="text-on-surface-variant text-sm">
                  Email
                </dt>
                <dd className="font-semibold break-all">
                  {user?.email}
                </dd>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low">
                <dt className="text-on-surface-variant text-sm">
                  Provider
                </dt>
                <dd className="font-semibold capitalize">
                  {user?.authProvider || "local"}
                </dd>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low">
                <dt className="text-on-surface-variant text-sm">
                  Email status
                </dt>
                <dd className="font-semibold">
                  {user?.isEmailVerified === false
                    ? "Verification required"
                    : "Verified"}
                </dd>
              </div>

              {user?.isEmailVerified === false && (
                <Link
                  to={`/resend-verification?email=${encodeURIComponent(
                    user.email || ""
                  )}`}
                  className="btn-outline block text-center"
                >
                  Resend Verification
                </Link>
              )}
            </dl>
          </section>

          <section className="card-ambient p-5 sm:p-7 bg-white border border-emerald-100 rounded-2xl">
            <h2 className="font-headline-md text-headline-md text-text-deep-green">
              Change password
            </h2>

            {user?.authProvider === "google" ? (
              <div className="mt-4 p-4 rounded-xl bg-surface-container-low">
                <p className="text-on-surface-variant">
                  This account signs in with Google. Manage your password from your Google Account.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3 mt-4">
                <input
                  type="password"
                  autoComplete="current-password"
                  className="form-input w-full"
                  placeholder="Current password"
                  value={form.currentPassword}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      currentPassword: event.target.value,
                    })
                  }
                  required
                />

                <input
                  type="password"
                  autoComplete="new-password"
                  className="form-input w-full"
                  placeholder="New password"
                  value={form.newPassword}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      newPassword: event.target.value,
                    })
                  }
                  required
                />

                <input
                  type="password"
                  autoComplete="new-password"
                  className="form-input w-full"
                  placeholder="Confirm new password"
                  value={form.confirm}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      confirm: event.target.value,
                    })
                  }
                  required
                />

                <button
                  className="btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? "Updating…" : "Update Password"}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </AccountLayout>
  );
}
