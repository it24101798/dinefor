import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function ResendVerification() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data } = await api.post(
        "/auth/resend-verification",
        { email: email.trim().toLowerCase() }
      );

      setMessage(
        data.previewUrl
          ? `${data.message} Development link: ${data.previewUrl}`
          : data.message
      );
      setMessageType("success");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not send verification email."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface-cream flex items-center justify-center px-4 py-28">
      <section className="w-full max-w-md card-ambient p-7">
        <span className="material-symbols-outlined text-4xl text-secondary">
          forward_to_inbox
        </span>
        <h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-3">
          Verify your email
        </h1>
        <p className="text-on-surface-variant mt-2 mb-6">
          Request a fresh verification link for your DineFor account.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <label className="font-label-sm text-label-sm text-on-surface-variant">
            Email address
            <input
              type="email"
              className="form-input w-full mt-1"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {message && (
            <div
              className={`p-3 rounded-xl text-sm break-words ${
                messageType === "error"
                  ? "bg-error/10 text-error"
                  : "bg-secondary-container/20 text-secondary"
              }`}
            >
              {message}
            </div>
          )}

          <button
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Sending…" : "Send Verification Email"}
          </button>
        </form>

        <Link
          to="/login"
          className="block text-center mt-5 text-secondary font-semibold"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
