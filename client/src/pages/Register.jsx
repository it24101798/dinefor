import React, { useState } from "react";
import api from "../services/api";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useAuth } from "../context/AuthContext";
import PasswordField, { evaluatePassword } from "../components/PasswordField";

const destinationForRole = (role) => {
  if (role === "admin") return "/admin";
  if (role === "hotel") return "/hotel";
  return "/feed";
};

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer",
    terms: false,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!evaluatePassword(form.password).valid) {
      setMessage(
        "Password must include uppercase, lowercase, number, special character and at least 8 characters."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!form.terms) {
      setMessage(
        "Accept the Terms of Service and Privacy Policy."
      );
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });

      navigate(
        `/verification-pending?email=${encodeURIComponent(
          data.email || form.email
        )}`,
        {
          replace: true,
          state: {
            message: data.message,
            previewUrl: data.previewUrl,
          },
        }
      );
    } catch (error) {
      if (
        error.response?.data?.code ===
        "EMAIL_VERIFICATION_REQUIRED"
      ) {
        navigate(
          `/verification-pending?email=${encodeURIComponent(
            error.response.data.email || form.email
          )}`
        );
        return;
      }

      setMessage(
        error.response?.data?.message ||
          "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (credential) => {
    try {
      const { data } = await api.post("/auth/google", {
        credential,
      });
      login(data.user);
      navigate(destinationForRole(data.user.role), {
        replace: true,
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Google Sign-In failed."
      );
    }
  };

  return (
    <main className="min-h-screen bg-surface-cream flex items-center justify-center px-4 py-24">
      <section className="w-full max-w-lg card-ambient p-7">
        <header className="text-center mb-6">
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green">
            Join DineFor
          </h1>
          <p className="text-on-surface-variant mt-2">
            Email accounts must be verified before the first login.
          </p>
        </header>

        <GoogleSignInButton
          onCredential={googleLogin}
          onError={setMessage}
        />

        <div className="flex items-center gap-3 my-5">
          <span className="h-px bg-border-subtle flex-1" />
          <span className="text-xs text-on-surface-variant">
            OR
          </span>
          <span className="h-px bg-border-subtle flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="font-label-sm text-on-surface-variant">
              Full name
            </span>
            <input
              name="name"
              className="form-input w-full mt-1"
              value={form.name}
              onChange={update}
              required
            />
          </label>

          <label className="block">
            <span className="font-label-sm text-on-surface-variant">
              Email
            </span>
            <input
              name="email"
              type="email"
              className="form-input w-full mt-1"
              value={form.email}
              onChange={update}
              required
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <PasswordField
              label="Password"
              name="password"
              value={form.password}
              onChange={update}
              autoComplete="new-password"
              showStrength
            />

            <PasswordField
              label="Confirm password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={update}
              autoComplete="new-password"
              error={
                form.confirmPassword &&
                form.password !== form.confirmPassword
                  ? "Passwords do not match."
                  : ""
              }
            />
          </div>

          <label className="block">
            <span className="font-label-sm text-on-surface-variant">
              Account type
            </span>
            <select
              name="role"
              className="form-select w-full mt-1"
              value={form.role}
              onChange={update}
            >
              <option value="customer">Customer</option>
              <option value="hotel">Hotel partner</option>
            </select>
          </label>

          <label className="flex gap-3 items-start text-sm text-on-surface-variant">
            <input
              name="terms"
              type="checkbox"
              checked={form.terms}
              onChange={update}
              className="mt-1"
            />
            I accept the Terms of Service and Privacy Policy.
          </label>

          {message && (
            <div className="p-3 rounded-xl bg-error/10 text-error text-sm">
              {message}
            </div>
          )}

          <button
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading
              ? "Creating Account…"
              : "Create Account & Verify Email"}
          </button>
        </form>

        <p className="text-center mt-6 text-on-surface-variant">
          Already registered?{" "}
          <Link
            to="/login"
            className="text-secondary font-semibold"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
