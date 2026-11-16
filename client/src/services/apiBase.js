// Local development uses Vite's same-origin proxy so phones reach the PC backend.
// Explicit remote API endpoints and production behavior remain unchanged.
export function resolveApiBase(configured = '', development = false) {
 const value = String(configured || '').trim().replace(/\/+$/, '');
 if (development && (!value || /^https?:\/\/(localhost|127\.0\.0\.1):5000(?:\/api)?$/i.test(value))) return '/api';
 return value || 'http://localhost:5000/api';
}
