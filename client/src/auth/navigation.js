export function safeReturnTo(value) {
  if (typeof value !== 'string' || !/^\/(?![\/\\])/.test(value) || /[\\\s\u0000-\u001f]/.test(value)) return null;
  const path = new URL(value, 'https://dinefor.invalid').pathname;
  if (path.startsWith('//')) return null;
  return /^\/(login|register|verify-email|verification-pending|resend-verification|verify-reset-code|reset-password|forgot-password)\/?$/i.test(path) ? null : value;
}

export function accountDestination(role, returnTo) {
  if (role === 'admin') return '/admin';
  if (role === 'hotel_staff') {
    const target = safeReturnTo(returnTo);
    return target?.startsWith('/check-in/') ? target : '/hotel/staff-desk';
  }
  if (role === 'hotel') return '/hotel';
  return safeReturnTo(returnTo) || '/feed';
}
