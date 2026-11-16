import AuthLayout from '../design/AuthLayout';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import PasswordField, { evaluatePassword } from '../components/PasswordField';
import { safeReturnTo } from '../auth/navigation';

export default function Register() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const returnTo = safeReturnTo(state?.returnTo);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', terms: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = key => event => setForm(previous => ({ ...previous, [key]: key === 'terms' ? event.target.checked : event.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!evaluatePassword(form.password).valid || form.confirm !== form.password || !form.terms) {
      setError('Use all the password requirements, confirm your password and accept the terms.');
      return;
    }
    setBusy(true);
    setError('');
    const email = form.email.trim().toLowerCase();
    try {
      const { data } = await api.post('/auth/register', { name: form.name.trim(), email, phone: form.phone, password: form.password });
      navigate('/verification-pending', { replace: true, state: { email, returnTo, message: data.message, waitSeconds: data.retryAfterSeconds } });
    } catch (error) {
      if (error.response?.data?.code === 'EMAIL_VERIFICATION_REQUIRED') {
        navigate('/verification-pending', { state: { email, returnTo, message: 'Request a new verification code to continue.' } });
      } else setError(error.response?.data?.message || 'Couldn’t create your account.');
    } finally { setBusy(false); }
  }

  return <AuthLayout>
    <h1>Create your account</h1>
    <p>Discover buffets, reserve a table and manage your dining plans.</p>
    <form className="df07-form" onSubmit={submit}>
      <label>Full name<input autoComplete="name" required maxLength={100} value={form.name} onChange={update('name')} /></label>
      <label>Email<input type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={update('email')} /></label>
      <label>Phone number (optional)<input type="tel" autoComplete="tel" maxLength={25} value={form.phone} onChange={update('phone')} /></label>
      <PasswordField label="Password" value={form.password} onChange={update('password')} autoComplete="new-password" showStrength />
      <PasswordField label="Confirm password" value={form.confirm} onChange={update('confirm')} autoComplete="new-password" error={form.confirm && form.confirm !== form.password ? 'Passwords do not match.' : ''} />
      <label className="df07-check"><input type="checkbox" required checked={form.terms} onChange={update('terms')} />I accept the DineFor Terms of Service and Privacy Policy.</label>
      {error && <p role="alert" className="df07-message">{error}</p>}
      <button type="submit" className="df-shell-primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
    </form>
    <p>Already have an account? <Link to="/login" state={{ returnTo }}>Sign in</Link></p>
    <Link to="/for-hotels">Partner with DineFor</Link>
  </AuthLayout>;
}
