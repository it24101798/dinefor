import { useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// SVG Icons
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

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Auto-focus email on load
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Check for redirect message
  useEffect(() => {
    const state = location.state;
    if (state?.message) {
      setMessage(state.message);
      setMessageType("info");
    }
  }, [location]);

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      setMessage("");
      setMessageType("");
      setLoading(true);

      // Validate email
      if (!email.trim()) {
        setMessage("Please enter your email address.");
        setMessageType("error");
        setLoading(false);
        emailRef.current?.focus();
        return;
      }

      // Validate password
      if (!password.trim()) {
        setMessage("Please enter your password.");
        setMessageType("error");
        setLoading(false);
        passwordRef.current?.focus();
        return;
      }

      try {
        const res = await axios.post("http://localhost:5000/api/auth/login", {
          email: email.trim(),
          password: password.trim(),
        });

        const user = res.data.user;

        // Store user with remember me preference
        const userData = {
          ...user,
          token: res.data.token,
        };

        login(userData);

        // Role-based redirect
        if (user.role === "admin") {
          navigate("/admin");
        } else if (user.role === "hotel") {
          navigate("/hotel");
        } else {
          navigate("/feed");
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Login failed. Please check your credentials.";
        setMessage(errorMessage);
        setMessageType("error");
        setLoading(false);
      } finally {
        setLoading(false);
      }
    },
    [email, password, login, navigate]
  );

  // Handle keypress for Enter key
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter") {
        handleLogin(e);
      }
    },
    [handleLogin]
  );

  // Demo credentials
  const fillDemoCredentials = useCallback((type) => {
    if (type === "customer") {
      setEmail("customer@dinefor.com");
      setPassword("123456");
    } else if (type === "hotel") {
      setEmail("hotel@dinefor.com");
      setPassword("123456");
    } else if (type === "admin") {
      setEmail("admin@dinefor.com");
      setPassword("123456");
    }
  }, []);

  return (
    <main className="auth-page premium-auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <div className="brand-icon">🍽️</div>
          <h1>DineFor</h1>
          <p className="brand-tagline">Luxury Hotel Buffet Discovery</p>
        </div>

        <div className="auth-card premium-auth-card">
          <div className="auth-card-header">
            <span className="auth-badge">Welcome Back</span>
            <h2>Sign in to DineFor</h2>
            <p className="auth-subtitle">
              Continue discovering and reserving premium buffet experiences.
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="demo-credentials">
            <span className="demo-label">Demo Accounts:</span>
            <button
              type="button"
              className="demo-btn customer"
              onClick={() => fillDemoCredentials("customer")}
            >
              Customer
            </button>
            <button
              type="button"
              className="demo-btn hotel"
              onClick={() => fillDemoCredentials("hotel")}
            >
              Hotel
            </button>
            <button
              type="button"
              className="demo-btn admin"
              onClick={() => fillDemoCredentials("admin")}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleLogin} className="auth-form premium-auth-form">
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
                  ref={emailRef}
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  autoComplete="current-password"
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
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
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
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Social Login */}
          <div className="social-login">
            <div className="divider">
              <span>or continue with</span>
            </div>
            <div className="social-buttons">
              <button
                type="button"
                className="social-btn google"
                disabled
                aria-label="Sign in with Google (Coming soon)"
              >
                <GoogleIcon />
                <span>Google</span>
                <span className="coming-soon">Soon</span>
              </button>
              <button
                type="button"
                className="social-btn facebook"
                disabled
                aria-label="Sign in with Facebook (Coming soon)"
              >
                <FacebookIcon />
                <span>Facebook</span>
                <span className="coming-soon">Soon</span>
              </button>
            </div>
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
              New to DineFor? <Link to="/register">Create account</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Login;