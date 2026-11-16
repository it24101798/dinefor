import React from 'react';

const paths = {
  home: <><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-12 4h2m3 3h2"/></>,
  person: <><circle cx="12" cy="7" r="4"/><path d="M3 22a9 9 0 0 1 18 0"/></>,
  guests: <><circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m0-17a3 3 0 0 1 0 6m3 4a5 5 0 0 1 3 5v2"/></>,
  buffet: <><path d="M2 19h20M4 16a8 8 0 0 1 16 0M12 5v3M7 22h10"/></>,
  heart: <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1Z"/>,
  help: <><circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 1 1 5 2.3c-1.4.9-2 1.5-2 3M12 18h.01"/></>,
  menu: <path d="M3 5h18M3 12h18M3 19h18"/>,
  close: <path d="m5 5 14 14M19 5 5 19"/>,
  right: <path d="m9 5 7 7-7 7"/>,
  down: <path d="m5 9 7 7 7-7"/>,
  arrow: <path d="M3 12h17m-7-7 7 7-7 7"/>,
};

export default function ShellIcon({ name, filled = false }) {
  return <svg className="df-shell-icon" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
