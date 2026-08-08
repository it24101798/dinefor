import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [seconds]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      if (data.code === "GOOGLE_ACCOUNT") {
        setMessage(data.message);
        return;
      }

      navigate(
        `/verify-reset-code?email=${encodeURIComponent(
          data.email || email.trim().toLowerCase()
        )}`,
        {
          state: { message: data.message },
        }
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not send verification code."
      );
      setSeconds(
        Number(error.response?.data?.retryAfterSeconds || 0)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface-cream flex items-center justify-center px-4 py-24">
      <section className="w-full max-w-md card-ambient p-7">
        <span className="material-symbols-outlined text-4xl text-secondary">
          password
        </span>
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-3">
          Reset your password
        </h1>
        <p className="text-on-surface-variant mt-2">
          Enter your registered email. We will send a six-digit verification code.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-label-sm text-on-surface-variant">
              Email address
            </span>
            <input
              type="email"
              className="form-input w-full mt-1"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          {message && (
            <div className="p-3 rounded-xl bg-surface-container-low text-on-surface-variant">
              {message}
            </div>
          )}

          <button
            className="btn-primary w-full"
            disabled={loading || seconds > 0}
          >
            {loading
              ? "Sending Code…"
              : seconds > 0
                ? `Try again in ${seconds}s`
                : "Send Verification Code"}
          </button>
        </form>

        <Link
          to="/login"
          className="block text-center text-secondary font-semibold mt-6"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
