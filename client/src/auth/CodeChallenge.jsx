import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AuthLayout from '../design/AuthLayout';
import { safeReturnTo } from './navigation';

export default function CodeChallenge({ recovery = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const email = typeof state.email === 'string' ? state.email : '';
  const returnTo = safeReturnTo(state.returnTo);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(state.message || '');
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [until, setUntil] = useState(() => Date.now() + (Number(state.waitSeconds) || 0) * 1000);
  const [now, setNow] = useState(Date.now);
  const wait = Math.max(0, Math.ceil((until - now) / 1000));
  const changePath = recovery ? '/forgot-password' : '/register';
  const maskedAddress = email.replace(/^[^@]+(?=@)/, value => value[0] + '***');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function verify(event) {
    event.preventDefault();
    if (busy || code.length !== 6) return;
    setBusy(true);
    setMessage('');
    try {
      const { data } = await api.post(recovery ? '/auth/verify-reset-otp' : '/auth/verify-email', { email, code });
      if (recovery) {
        if (!data.resetSession) throw new Error('Missing reset authorization');
        navigate('/reset-password', { replace: true, state: { email, resetSession: data.resetSession, returnTo } });
      } else {
        if (!data.verified) throw new Error('Verification incomplete');
        navigate('/login', { replace: true, state: { email, returnTo, message: data.message } });
      }
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Couldn’t verify your code. Try again.');
    } finally { setBusy(false); }
  }

  async function resend() {
    if (busy || wait) return;
    setBusy(true);
    setMessage('');
    try {
      const { data } = await api.post(recovery ? '/auth/forgot-password' : '/auth/resend-verification', { email });
      setCode('');
      setIsError(false);
      setMessage(data.message);
      setUntil(Date.now() + (Number(data.retryAfterSeconds) || 60) * 1000);
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Couldn’t request a code. Try again.');
      const seconds = Number(error.response?.data?.retryAfterSeconds);
      if (seconds > 0) setUntil(Date.now() + seconds * 1000);
    } finally { setBusy(false); }
  }

  return <AuthLayout recovery>
    <h1>{recovery ? 'Check your reset code' : 'Verify your email'}</h1>
    {email ? <>
      <p>Enter the six-digit code sent to <strong>{maskedAddress}</strong>.</p>
      <form className="df07-form" onSubmit={verify}>
        <label className="df07-code">
          <span className="sr-only">Six-digit verification code</span>
          <span className="df07-code-cells" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index}>{code[index] || '–'}</span>)}</span>
          <input value={code} inputMode="numeric" autoComplete="one-time-code" onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={busy} />
        </label>
        {message && <p className="df07-message" role={isError ? 'alert' : 'status'}>{message}</p>}
        <button type="submit" className="df-shell-primary" disabled={busy || code.length !== 6}>{recovery ? 'Verify code' : 'Verify email'}</button>
      </form>
      <button type="button" className="df07-link" disabled={busy || wait > 0} onClick={resend}>{wait ? `Resend code in ${wait}s` : 'Resend code'}</button>
    </> : <p>Enter your email to request a new code. If you’re verifying from an older email, sign in and request a fresh code there.</p>}
    <Link className="df-shell-secondary" to={email || recovery ? changePath : '/login'} state={{ returnTo }}>{email ? 'Change email' : recovery ? 'Start password recovery' : 'Sign in'}</Link>
    {!recovery && <Link to="/login" className="df07-link" state={{ email, returnTo }}>Back to sign in</Link>}
  </AuthLayout>;
}
