import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

// SVG Icons (reused from Login)
const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const PasswordIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const EyeIcon = ({ open }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordValidations, setPasswordValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const nameRef = useRef(null);

  // Auto-focus name on load
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Password strength calculation
  const calculatePasswordStrength = useCallback((password) => {
    let strength = 0;
    const validations = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    setPasswordValidations(validations);

    if (validations.length) strength += 20;
    if (validations.uppercase) strength += 20;
    if (validations.lowercase) strength += 20;
    if (validations.number) strength += 20;
    if (validations.special) strength += 20;

    setPasswordStrength(strength);
    return strength;
  }, []);

  // Handle password change
  const handlePasswordChange = useCallback(
    (e) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, password: value }));
      calculatePasswordStrength(value);
    },
    [calculatePasswordStrength]
  );

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRegister = useCallback(
    async (e) => {
      e.preventDefault();
      setMessage("");
      setMessageType("");
      setLoading(true);

      // Validate name
      if (!formData.name.trim()) {
        setMessage("Please enter your full name.");
        setMessageType("error");
        setLoading(false);
        nameRef.current?.focus();
        return;
      }

      // Validate email
      if (!formData.email.trim() || !formData.email.includes("@")) {
        setMessage("Please enter a valid email address.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      // Validate password
      if (formData.password.length < 8) {
        setMessage("Password must be at least 8 characters.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      // Validate confirm password
      if (formData.password !== formData.confirmPassword) {
        setMessage("Passwords do not match.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      try {
        await axios.post("http://localhost:5000/api/auth/register", {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        });

        setMessage("Account created successfully! 🎉");
        setMessageType("success");
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "customer",
        });
        setPasswordStrength(0);

        setTimeout(() => {
          navigate("/login", {
            state: { message: "Account created! Please sign in." },
          });
        }, 800);
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Registration failed. Please try again.";
        setMessage(errorMessage);
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    },
    [formData, navigate]
  );

  // Handle keypress for Enter key
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter") {
        handleRegister(e);
      }
    },
    [handleRegister]
  );

  // Get password strength label and color
  const getStrengthLabel = () => {
    if (passwordStrength === 0) return { label: "", color: "" };
    if (passwordStrength <= 20) return { label: "Weak", color: "#C0392B" };
    if (passwordStrength <= 40) return { label: "Fair", color: "#E67E22" };
    if (passwordStrength <= 60) return { label: "Good", color: "#F1C40F" };
    if (passwordStrength <= 80) return { label: "Strong", color: "#2D8B4E" };
    return { label: "Very Strong", color: "#1A6A3A" };
  };

  const strengthInfo = getStrengthLabel();

  return (
    <main className="auth-page premium-auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <div className="brand-icon">🍽️</div>
          <h1>DineFor</h1>
          <p className="brand-tagline">Luxury Hotel Buffet Discovery</p>
        </div>

        <div className="auth-card premium-auth-card register-card">
          <div className="auth-card-header">
            <span className="auth-badge">Join Us</span>
            <h2>Create your account</h2>
            <p className="auth-subtitle">
              Register as a guest or hotel partner and start using DineFor.
            </p>
          </div>

          <form onSubmit={handleRegister} className="auth-form premium-auth-form">
            {/* Name Field */}
            <div className="form-field">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <div className={`input-wrapper ${focusedField === "name" ? "focused" : ""}`}>
                <span className="input-icon">
                  <UserIcon />
                </span>
                <input
                  ref={nameRef}
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  autoComplete="name"
                  disabled={loading}
                  aria-label="Full name"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="form-field">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className={`input-wrapper ${focusedField === "email" ? "focused" : ""}`}>
                <span className="input-icon">
                  <EmailIcon />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  autoComplete="email"
                  disabled={loading}
                  aria-label="Email address"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-field">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className={`input-wrapper ${focusedField === "password" ? "focused" : ""}`}>
                <span className="input-icon">
                  <PasswordIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  autoComplete="new-password"
                  disabled={loading}
                  aria-label="Password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex="-1"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password.length > 0 && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{
                        width: `${passwordStrength}%`,
                        backgroundColor: strengthInfo.color,
                      }}
                    />
                  </div>
                  <span className="strength-label" style={{ color: strengthInfo.color }}>
                    {strengthInfo.label}
                  </span>
                </div>
              )}

              {/* Password Validations */}
              {formData.password.length > 0 && (
                <div className="password-validations">
                  <div className={`validation-item ${passwordValidations.length ? "valid" : "invalid"}`}>
                    <span className="validation-icon">
                      {passwordValidations.length ? <CheckIcon /> : "○"}
                    </span>
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`validation-item ${passwordValidations.uppercase ? "valid" : "invalid"}`}>
                    <span className="validation-icon">
                      {passwordValidations.uppercase ? <CheckIcon /> : "○"}
                    </span>
                    <span>At least one uppercase letter</span>
                  </div>
                  <div className={`validation-item ${passwordValidations.lowercase ? "valid" : "invalid"}`}>
                    <span className="validation-icon">
                      {passwordValidations.lowercase ? <CheckIcon /> : "○"}
                    </span>
                    <span>At least one lowercase letter</span>
                  </div>
                  <div className={`validation-item ${passwordValidations.number ? "valid" : "invalid"}`}>
                    <span className="validation-icon">
                      {passwordValidations.number ? <CheckIcon /> : "○"}
                    </span>
                    <span>At least one number</span>
                  </div>
                  <div className={`validation-item ${passwordValidations.special ? "valid" : "invalid"}`}>
                    <span className="validation-icon">
                      {passwordValidations.special ? <CheckIcon /> : "○"}
                    </span>
                    <span>At least one special character</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="form-field">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <div className={`input-wrapper ${focusedField === "confirmPassword" ? "focused" : ""}`}>
                <span className="input-icon">
                  <PasswordIcon />
                </span>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  autoComplete="new-password"
                  disabled={loading}
                  aria-label="Confirm password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex="-1"
                >
                  <EyeIcon open={showConfirmPassword} />
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <div className="password-mismatch">Passwords do not match</div>
              )}
            </div>

            {/* Role Selection */}
            <div className="form-field">
              <label className="form-label">Account Type</label>
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-card ${formData.role === "customer" ? "active" : ""}`}
                  onClick={() => setFormData((prev) => ({ ...prev, role: "customer" }))}
                >
                  <span className="role-icon">👤</span>
                  <div className="role-info">
                    <strong>Guest</strong>
                    <span>Book buffets & explore</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`role-card ${formData.role === "hotel" ? "active" : ""}`}
                  onClick={() => setFormData((prev) => ({ ...prev, role: "hotel" }))}
                >
                  <span className="role-icon">🏨</span>
                  <div className="role-info">
                    <strong>Hotel Partner</strong>
                    <span>List buffets & manage</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Terms */}
          <div className="terms-text">
            By creating an account, you agree to our{" "}
            <Link to="/terms">Terms of Service</Link> and{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </div>

          {/* Message Display */}
          {message && (
            <div className={`auth-message ${messageType}`}>
              <span className="message-icon">
                {messageType === "error" && "❌"}
                {messageType === "success" && "✅"}
                {messageType === "info" && "ℹ️"}
              </span>
              <span>{message}</span>
            </div>
          )}

          {/* Footer */}
          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Register;