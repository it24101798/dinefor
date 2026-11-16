import AuthLayout from '../design/AuthLayout';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import PasswordField, { evaluatePassword } from '../components/PasswordField';
import { safeReturnTo } from '../auth/navigation';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const returnTo = safeReturnTo(state?.returnTo);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!evaluatePassword(password).valid || password !== confirm) {
      setError('Use all the password requirements and enter the same password twice.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/reset-password', { email: state.email, resetSession: state.resetSession, password });
      navigate('/login', { replace: true, state: { email: state.email, returnTo, message: data.message } });
    } catch (error) {
      setError(error.response?.data?.message || 'Couldn’t reset your password.');
    } finally { setBusy(false); }
  }

  return <AuthLayout>
    <h1>Create a new password</h1>
    {state?.resetSession && state?.email ? <form className="df07-form" onSubmit={submit}>
      <PasswordField label="New password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" showStrength />
      <PasswordField label="Confirm password" value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" error={confirm && confirm !== password ? 'Passwords do not match.' : ''} />
      {error && <p role="alert" className="df07-message">{error}</p>}
      <button type="submit" className="df-shell-primary" disabled={busy}>{busy ? 'Updating…' : 'Reset password'}</button>
    </form> : <p>Request and verify a reset code first.</p>}
    <Link className="df07-link" to="/forgot-password" state={{ returnTo }}>Request a new reset code</Link>
  </AuthLayout>;
}
