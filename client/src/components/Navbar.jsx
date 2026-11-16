import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../design/ReferenceUI';
import useResponsive from '../hooks/useResponsive';
import ShellIcon from '../mobile/shell/ShellIcon';
import WelcomeMenu from '../mobile/shell/WelcomeMenu';
import '../mobile/shell/customer-shell.css';

const accounts = [
  ['/customer', 'My account'], ['/my-bookings', 'My bookings'], ['/saved', 'Saved buffets'],
  ['/recommendations', 'For you'], ['/my-reviews', 'My reviews'], ['/notifications', 'Notifications'],
  ['/payments', 'Payments'], ['/profile', 'Profile'], ['/account-security', 'Security'],
];

export default function Navbar() {
  const { user, logout } = useAuth() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(false);
  const header = useRef(null);
  const accountButton = useRef(null);
  const menuButton = useRef(null);
  const partner = user?.role === 'hotel' ? ['/hotel', 'Partner portal']
    : user?.role === 'hotel_staff' ? ['/hotel/staff-desk', 'Check-in desk']
    : user?.role === 'admin' ? ['/admin', 'Admin'] : ['/for-hotels', 'For hotels'];
  const links = [['/feed', 'Discover'], ['/listings', 'Buffets'], ['/explore-map', 'Map'], partner];
  const returnTo = location.pathname + location.search + location.hash;

  useEffect(() => { setOpen(false); setAccount(false); }, [location.key, isMobile]);

  useEffect(() => {
    function outsideClick(event) {
      if (!header.current?.contains(event.target)) setAccount(false);
    }
    function escape(event) {
      if (event.key === 'Escape' && account) {
        setAccount(false);
        accountButton.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outsideClick);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outsideClick);
      document.removeEventListener('keydown', escape);
    };
  }, [account]);

  function closeMenu() {
    setOpen(false);
    requestAnimationFrame(() => menuButton.current?.focus());
  }

  function signOut() {
    logout?.();
    navigate('/');
  }

  return <>
    <header className="rf-header df-shell-header" ref={header}>
      <div className="rf-nav">
        <Link to="/" className="rf-logo" aria-label="DineFor home">
          DineFor<span className="df-shell-domain">.com</span>
        </Link>
        <nav className="rf-desktop-nav" aria-label="Primary">
          {links.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : ''}>{label}</NavLink>)}
        </nav>
        <div className="rf-nav-actions">
          <Link className="rf-bookings-link" to="/my-bookings"><Icon name="calendar_month" /> My bookings</Link>
          {user ? <div className="rf-account df-shell-desktop-account">
            <button type="button" className="rf-signin" ref={accountButton} onClick={() => setAccount(!account)} aria-expanded={account} aria-controls={account ? 'rf-account-menu' : undefined}><Icon name="person" />{user.name?.trim().split(/\s+/)[0] || 'Account'}</button>
            {account && <nav id="rf-account-menu" className="rf-menu" aria-label="Account">
              {accounts.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
              <button type="button" onClick={signOut}>Sign out</button>
            </nav>}
          </div> : <Link to="/login" state={{ returnTo }} className="rf-signin df-shell-desktop-account">Sign in</Link>}
          <button type="button" className="df-shell-menu-toggle" ref={menuButton} aria-label="Open menu" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'rf-mobile-menu' : undefined} onClick={() => setOpen(true)}><ShellIcon name="menu" /></button>
        </div>
      </div>
    </header>
    {open && isMobile && <WelcomeMenu user={user} onClose={closeMenu} onSignOut={signOut} returnTo={returnTo} partnerLink={user && user.role !== 'customer' ? partner : null} />}
  </>;
}
