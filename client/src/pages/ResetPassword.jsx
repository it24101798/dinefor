import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import PasswordField, {
  evaluatePassword,
} from "../components/PasswordField";

export default function ResetPassword() {
  const navigate = useNavigate();
  const resetData = useMemo(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("dineforPasswordReset") || "null"
      );
    } catch {
      return null;
    }
  }, []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = evaluatePassword(password);
  const mismatch =
    confirmPassword && password !== confirmPassword
      ? "Passwords do not match."
      : "";

  const submit = async (event) => {
    event.preventDefault();

    if (!resetData?.email || !resetData?.resetSession) {
      setMessage(
        "Your verified reset session is missing. Start again."
      );
      return;
    }
    if (!strength.valid) {
      setMessage("Create a strong password using all requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        email: resetData.email,
        resetSession: resetData.resetSession,
        password,
      });
      sessionStorage.removeItem("dineforPasswordReset");
      navigate("/login", {
        replace: true,
        state: {
          email: resetData.email,
          message: data.message,
        },
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Password reset failed."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!resetData) {
    return (
      <main className="min-h-screen bg-surface-cream grid place-items-center px-4">
        <section className="card-ambient p-7 text-center max-w-md">
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green">
            Verification required
          </h1>
          <p className="text-on-surface-variant mt-2">
            Verify the email code before creating a new password.
          </p>
          <Link
            to="/forgot-password"
            className="btn-primary inline-block mt-5"
          >
            Start Password Reset
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-cream flex items-center justify-center px-4 py-24">
      <section className="w-full max-w-md card-ambient p-7">
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green">
          Create new password
        </h1>
        <p className="text-on-surface-variant mt-2">
          Your verification code was accepted. Create a secure new password.
        </p>

        <form onSubmit={submit} className="space-y-5 mt-6">
          <PasswordField
            label="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            showStrength
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            autoComplete="new-password"
            error={mismatch}
          />

          {message && (
            <div className="p-3 rounded-xl bg-error/10 text-error">
              {message}
            </div>
          )}

          <button
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Updating Password…" : "Update Password"}
          </button>
        </form>
      </section>
    </main>
  );
}
