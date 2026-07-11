import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function Register() {
  const navigate = useNavigate();

  // ============================================
  // STATE
  // ============================================
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer",
    termsAccepted: false,
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
    color: "",
  });

  // ============================================
  // HANDLERS
  // ============================================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Password strength check
    if (name === "password") {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^a-zA-Z0-9]/)) score++;

    const labels = {
      0: { label: "Very Weak", color: "bg-error" },
      1: { label: "Weak", color: "bg-error/70" },
      2: { label: "Fair", color: "bg-tertiary-container" },
      3: { label: "Good", color: "bg-secondary" },
      4: { label: "Strong", color: "bg-secondary" },
      5: { label: "Very Strong", color: "bg-primary" },
    };

    setPasswordStrength({
      score,
      label: labels[Math.min(score, 5)].label,
      color: labels[Math.min(score, 5)].color,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // Validation
    if (!formData.name.trim()) {
      setMessage("Please enter your full name.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setMessage("Please enter your email address.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (!formData.password) {
      setMessage("Please enter a password.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (!formData.termsAccepted) {
      setMessage("Please accept the terms and conditions.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      setMessage(res.data.message || "✅ Account created successfully!");
      setMessageType("success");
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "customer",
        termsAccepted: false,
      });

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Registration failed. Please try again.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderMessage = () => {
    if (!message) return null;

    const styles = {
      success: "bg-secondary-container/30 text-secondary border border-secondary/30",
      error: "bg-error/10 text-error border border-error/20",
      warning: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30",
      info: "bg-primary-container/10 text-primary border border-primary-container/20",
    };

    return (
      <div className={`p-4 rounded-xl text-sm font-medium mb-4 ${styles[messageType] || styles.info}`}>
        {message}
        <button
          onClick={() => setMessage("")}
          className="float-right text-inherit opacity-70 hover:opacity-100"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    );
  };

  const renderPasswordStrength = () => {
    if (!formData.password) return null;

    const widths = {
      0: "w-0",
      1: "w-1/5",
      2: "w-2/5",
      3: "w-3/5",
      4: "w-4/5",
      5: "w-full",
    };

    return (
      <div className="mt-1">
        <div className="flex gap-1 h-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`flex-1 h-full rounded-full transition-all ${
                i <= passwordStrength.score ? passwordStrength.color : "bg-border-subtle"
              }`}
            />
          ))}
        </div>
        <p className={`text-xs mt-1 ${
          passwordStrength.score <= 1 ? "text-error" :
          passwordStrength.score <= 2 ? "text-tertiary" :
          "text-secondary"
        }`}>
          {passwordStrength.label}
        </p>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <main className="min-h-screen bg-surface-cream flex items-center justify-center px-4 py-12 pt-24">
      <div className="w-full max-w-md">
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient border border-border-subtle">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <span className="text-4xl">🍽️</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Join DineFor</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              Create your account to start discovering premium buffets
            </p>
          </div>

          {renderMessage()}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="form-input w-full"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="form-input w-full"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className="form-input w-full pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-text-deep-green"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility" : "visibility_off"}
                  </span>
                </button>
              </div>
              {renderPasswordStrength()}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                Confirm Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className="form-input w-full"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                I am a
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-select w-full"
              >
                <option value="customer">Guest / Customer</option>
                <option value="hotel">Hotel Partner</option>
              </select>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                className="mt-1 w-4 h-4 text-secondary focus:ring-secondary rounded"
                required
              />
              <label className="font-body-md text-body-md text-on-surface-variant text-sm">
                I agree to the{" "}
                <Link to="/terms" className="text-secondary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-secondary hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-surface-cream border-t-transparent" />
                  Creating account...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Already have an account?{" "}
              <Link to="/login" className="text-secondary hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              By signing up, you agree to our terms and conditions.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Register;