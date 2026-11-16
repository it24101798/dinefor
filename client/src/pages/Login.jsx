import { accountDestination, safeReturnTo } from "../auth/navigation";
import AuthLayout from "../design/AuthLayout";
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

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const returnTo = safeReturnTo(location.state?.returnTo);

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
      navigate(accountDestination(user.role, returnTo), {
        replace: true,
      });
    },
    [login, navigate, returnTo]
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

  return <AuthLayout signIn>
    <h1>Welcome back</h1>
    <p>Sign in to reserve a buffet and manage your dining plans.</p>
    {message && <div className="df07-message" role={messageType === 'success' ? 'status' : 'alert'}>{message}
      {verificationEmail && <Link className="df07-link" to="/verification-pending" state={{ email: verificationEmail, returnTo }}>Verify your email</Link>}
    </div>}
    <form className="df07-form" onSubmit={handleLogin}>
      <label>Email<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={isBusy} /></label>
      <PasswordField label="Password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" />
      <Link to="/forgot-password" className="df07-forgot" state={{ email, returnTo }}>Forgot password?</Link>
      <button type="submit" className="df-shell-primary" disabled={isBusy}>{loading ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <div className="df07-divider">Or continue with</div>
    <GoogleSignInButton onCredential={handleGoogleCredential} onError={value => { setMessage(value); setMessageType('error'); }} disabled={isBusy} />
    <p>Don’t have an account? <Link to="/register" state={{ returnTo }}>Create account</Link></p>
  </AuthLayout>;
}
