import React, { useCallback, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import PasswordField from "../components/PasswordField";

const destinationForRole = (role) => {
  if (role === "admin") return "/admin";
  if (role === "hotel") return "/hotel";
  return "/feed";
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState(
    location.state?.email || ""
  );
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    location.state?.message || ""
  );
  const [messageType, setMessageType] = useState(
    location.state?.message ? "success" : "error"
  );
  const [verificationEmail, setVerificationEmail] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);

  const completeLogin = useCallback(
    (responseData) => {
      const user = responseData?.user;

      if (!user?.token) {
        throw new Error(
          "Invalid authentication response."
        );
      }

      login(user);
      navigate(destinationForRole(user.role), {
        replace: true,
      });
    },
    [login, navigate]
  );

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage("");
    setVerificationEmail("");

    if (!email.trim() || !password) {
      setMessage("Enter both email and password.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      completeLogin(response.data);
    } catch (error) {
      const code = error.response?.data?.code;
      const responseEmail =
        error.response?.data?.email ||
        email.trim().toLowerCase();

      if (code === "EMAIL_VERIFICATION_REQUIRED") {
        setVerificationEmail(responseEmail);
        setMessage(
          "Your password is correct, but your email must be verified before login. You are not signed in."
        );
      } else if (code === "PASSWORD_RESET_REQUIRED") {
        setMessage(
          "Reset your password before signing in."
        );
      } else if (error.code === "ERR_NETWORK") {
        setMessage(
          "Cannot connect to the DineFor server."
        );
      } else {
        setMessage(
          error.response?.data?.message ||
            "Login failed."
        );
      }

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (credential) => {
      setMessage("");
      setGoogleLoading(true);

      try {
        const response = await api.post("/auth/google", {
          credential,
        });
        completeLogin(response.data);
      } catch (error) {
        setMessage(
          error.response?.data?.message ||
            "Google Sign-In failed."
        );
        setMessageType("error");
      } finally {
        setGoogleLoading(false);
      }
    },
    [completeLogin]
  );

  const isBusy = loading || googleLoading;

  return (
    <main className="min-h-screen bg-surface-cream flex items-center justify-center px-4 py-24">
      <section className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-ambient border border-border-subtle">
        <header className="text-center mb-7">
          <span className="material-symbols-outlined text-4xl text-secondary">
            lock_person
          </span>
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">
            Welcome Back
          </h1>
          <p className="text-on-surface-variant mt-2">
            Sign in only after your email is verified.
          </p>
        </header>

        {message && (
          <div
            className={`mb-5 p-3 rounded-xl text-sm ${
              messageType === "success"
                ? "bg-secondary-container/25 text-secondary"
                : "bg-error/10 text-error"
            }`}
          >
            {message}

            {verificationEmail && (
              <Link
                to={`/verification-pending?email=${encodeURIComponent(
                  verificationEmail
                )}`}
                className="mt-3 btn-outline w-full block text-center"
              >
                Verify Email Now
              </Link>
            )}
          </div>
        )}

        <GoogleSignInButton
          onCredential={handleGoogleCredential}
          onError={(value) => {
            setMessage(value);
            setMessageType("error");
          }}
          disabled={isBusy}
        />

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-border-subtle" />
          <span className="text-xs text-on-surface-variant">
            OR CONTINUE WITH EMAIL
          </span>
          <div className="h-px flex-1 bg-border-subtle" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <label className="block">
            <span className="font-label-sm text-on-surface-variant">
              Email address
            </span>
            <input
              type="email"
              autoComplete="email"
              className="form-input w-full mt-1"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              disabled={isBusy}
            />
          </label>

          <div>
            <div className="flex justify-between">
              <span />
              <Link
                to="/forgot-password"
                className="text-secondary text-sm"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordField
              label="Password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
            />
          </div>

          <button
            className="btn-primary w-full"
            disabled={isBusy}
          >
            {loading ? "Signing In…" : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-6 text-on-surface-variant">
          New to DineFor?{" "}
          <Link
            to="/register"
            className="text-secondary font-semibold"
          >
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
