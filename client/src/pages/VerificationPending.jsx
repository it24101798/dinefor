import React, {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import api from "../services/api";

export default function VerificationPending() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const email = params.get("email") || "";
  const [message, setMessage] = useState(
    location.state?.message ||
      "Check your inbox and verify your email before signing in."
  );
  const [messageType, setMessageType] =
    useState("success");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return undefined;

    const timer = setInterval(
      () =>
        setSeconds((value) =>
          value > 0 ? value - 1 : 0
        ),
      1000
    );

    return () => clearInterval(timer);
  }, [seconds]);

  useEffect(() => {
    if (!email) return undefined;

    const poll = setInterval(async () => {
      try {
        const response = await api.get(
          `/auth/verification-status?email=${encodeURIComponent(
            email
          )}`
        );

        if (response.data?.verified) {
          clearInterval(poll);
          navigate("/login", {
            replace: true,
            state: {
              email,
              message:
                "Email verified. Sign in to continue.",
            },
          });
        }
      } catch {
        // Polling failure should not disturb the page.
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [email, navigate]);

  const resend = async () => {
    if (!email) {
      setMessage("Email is missing.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post(
        "/auth/resend-verification",
        { email }
      );

      setMessage(
        data.previewUrl
          ? `${data.message} Development link: ${data.previewUrl}`
          : data.message
      );
      setMessageType("success");
      setSeconds(60);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not send verification email."
      );
      setMessageType("error");
      setSeconds(
        Number(
          error.response?.data?.retryAfterSeconds || 0
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface-cream flex items-center justify-center px-4 py-24">
      <section className="w-full max-w-md card-ambient p-7 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary-container/25 text-secondary grid place-items-center mx-auto">
          <span className="material-symbols-outlined text-4xl">
            mark_email_unread
          </span>
        </div>

        <h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-4">
          Verify Before Login
        </h1>

        <p className="text-on-surface-variant mt-2">
          We sent a secure verification link to:
        </p>
        <p className="font-semibold text-text-deep-green mt-1 break-all">
          {email || "your email address"}
        </p>

        <div
          className={`p-3 rounded-xl mt-5 text-left break-words ${
            messageType === "error"
              ? "bg-error/10 text-error"
              : "bg-secondary-container/20 text-secondary"
          }`}
        >
          {message}
        </div>

        <ol className="text-left mt-5 space-y-2 text-on-surface-variant">
          <li>1. Open the verification email.</li>
          <li>2. Select “Verify Email”.</li>
          <li>3. Return and sign in.</li>
        </ol>

        <button
          type="button"
          onClick={resend}
          disabled={loading || seconds > 0}
          className="btn-primary w-full mt-6"
        >
          {loading
            ? "Sending…"
            : seconds > 0
              ? `Resend in ${seconds}s`
              : "Resend Verification Email"}
        </button>

        <p className="text-xs text-outline mt-3">
          Also check your spam or promotions folder.
        </p>

        <Link
          to="/login"
          state={{ email }}
          className="btn-outline block mt-5"
        >
          Back to Sign In
        </Link>
      </section>
    </main>
  );
}
