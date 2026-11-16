import AuthLayout from '../design/AuthLayout';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { safeReturnTo } from '../auth/navigation';

export function PasswordRecoveryForm({ backToSignIn = false }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const returnTo = safeReturnTo(state?.returnTo);
  const [email, setEmail] = useState(state?.email || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const normalized = email.trim().toLowerCase();
      const { data } = await api.post('/auth/forgot-password', { email: normalized });
      navigate('/verify-reset-code', { state: { email: normalized, returnTo, message: data.message, waitSeconds: data.retryAfterSeconds } });
    } catch (error) {
      setError(error.response?.data?.message || 'Couldn’t request a reset code. Try again.');
    } finally { setBusy(false); }
  }

  return <>
    <form className="df07-form" onSubmit={submit}>
      <label>Email<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      {error && <p role="alert" className="df07-message">{error}</p>}
      <button className="df-shell-primary" disabled={busy}>{busy ? 'Requesting…' : 'Send reset code'}</button>
    </form>
    {backToSignIn && <Link className="df07-link" to="/login" state={{ email, returnTo }}>Back to sign in</Link>}
  </>;
}

export default function ForgotPassword() {
  return <AuthLayout recovery>
    <h1>Forgot password?</h1>
    <p>Enter your account email to request a password reset code.</p>
    <PasswordRecoveryForm backToSignIn />
  </AuthLayout>;
}
