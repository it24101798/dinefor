import React, {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import api from "../services/api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState(
    "Verifying your email address…"
  );

  const email = params.get("email") || "";
  const token = params.get("token") || "";

  useEffect(() => {
    if (!email || !token) {
      setState("error");
      setMessage("This verification link is incomplete.");
      return;
    }

    api
      .post("/auth/verify-email", {
        email,
        token,
      })
      .then(({ data }) => {
        setState("success");
        setMessage(data.message);

        setTimeout(() => {
          navigate("/login", {
            replace: true,
            state: {
              email,
              message:
                "Email verified successfully. Sign in to continue.",
            },
          });
        }, 2200);
      })
      .catch((error) => {
        setState("error");
        setMessage(
          error.response?.data?.message ||
            "Email verification failed."
        );
      });
  }, [email, token, navigate]);

  return (
    <main className="min-h-screen bg-surface-cream flex items-center justify-center px-4">
      <section className="card-ambient p-8 text-center max-w-md">
        <span
          className={`material-symbols-outlined text-6xl ${
            state === "error"
              ? "text-error"
              : "text-secondary"
          } ${state === "loading" ? "animate-pulse" : ""}`}
        >
          {state === "success"
            ? "verified"
            : state === "error"
              ? "error"
              : "mark_email_read"}
        </span>

        <h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-3">
          {state === "success"
            ? "Email Verified"
            : "Email Verification"}
        </h1>
        <p className="text-on-surface-variant mt-3">
          {message}
        </p>

        {state === "error" && (
          <Link
            to={`/verification-pending?email=${encodeURIComponent(
              email
            )}`}
            className="btn-outline inline-block mt-6"
          >
            Request New Link
          </Link>
        )}

        {state === "success" && (
          <Link
            to="/login"
            state={{ email }}
            className="btn-primary inline-block mt-6"
          >
            Sign In
          </Link>
        )}
      </section>
    </main>
  );
}
