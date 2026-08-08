import React, { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import api from "../services/api";

export default function VerifyResetCode() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const email = params.get("email") || "";
  const refs = useRef([]);

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState(
    location.state?.message || "Enter the code sent to your email."
  );
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [seconds]);

  const updateDigit = (index, value) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) refs.current[index + 1]?.focus();
  };

  const paste = (event) => {
    event.preventDefault();
    const code = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (code.length === 6) {
      setDigits(code.split(""));
      refs.current[5]?.focus();
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setMessage("Enter all six digits.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-reset-otp", {
        email,
        code,
      });
      sessionStorage.setItem(
        "dineforPasswordReset",
        JSON.stringify({
          email: data.email,
          resetSession: data.resetSession,
          createdAt: Date.now(),
        })
      );
      navigate("/reset-password", { replace: true });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      const { data } = await api.post("/auth/forgot-password", {
        email,
      });
      setDigits(["", "", "", "", "", ""]);
      setSeconds(60);
      setMessage(data.message);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not resend code."
      );
      setSeconds(
        Number(error.response?.data?.retryAfterSeconds || 0)
      );
    }
  };

  return (
    <main className="min-h-screen bg-surface-cream flex items-center justify-center px-4 py-24">
      <section className="w-full max-w-md card-ambient p-7 text-center">
        <span className="material-symbols-outlined text-5xl text-secondary">
          mark_email_read
        </span>
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-3">
          Verify your code
        </h1>
        <p className="text-on-surface-variant mt-2">
          We sent a six-digit code to
        </p>
        <p className="font-semibold break-all">{email}</p>

        <form onSubmit={verify} className="mt-6">
          <div className="grid grid-cols-6 gap-2" onPaste={paste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => (refs.current[index] = element)}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                onChange={(event) =>
                  updateDigit(index, event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Backspace" &&
                    !digit &&
                    index > 0
                  ) {
                    refs.current[index - 1]?.focus();
                  }
                }}
                className="form-input text-center text-xl font-bold px-1"
              />
            ))}
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low text-on-surface-variant text-left mt-5">
            {message}
          </div>

          <button
            className="btn-primary w-full mt-5"
            disabled={loading}
          >
            {loading ? "Verifying…" : "Verify Code"}
          </button>
        </form>

        <button
          type="button"
          onClick={resend}
          disabled={seconds > 0}
          className="text-secondary font-semibold mt-5"
        >
          {seconds > 0
            ? `Resend code in ${seconds}s`
            : "Resend verification code"}
        </button>

        <Link
          to="/forgot-password"
          className="block text-on-surface-variant mt-4"
        >
          Use another email
        </Link>
      </section>
    </main>
  );
}
