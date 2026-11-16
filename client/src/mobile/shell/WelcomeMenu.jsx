import React, { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import CrewArt from '../../design/CrewArt';
import ShellIcon from './ShellIcon';

const destinations = [
  ['/', 'Home', 'home'],
  ['/feed', 'Discover', 'search'],
  ['/listings', 'Buffets', 'buffet'],
  ['/explore-map', 'Explore map', 'pin'],
  ['/saved', 'Saved', 'heart'],
  ['/my-bookings', 'My bookings', 'calendar'],
  ['/help', 'Help', 'help'],
];

export default function WelcomeMenu({ onClose, user, onSignOut, partnerLink, returnTo }) {
  const dialog = useRef(null);

  useEffect(() => {
    const element = dialog.current;
    const originalOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return <dialog ref={dialog} className="df-welcome-menu" id="rf-mobile-menu" aria-labelledby="df-welcome-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="df-welcome-menu-inner">
      <div className="df-welcome-menu-top">
        <Link to="/" className="rf-logo df-mobile-wordmark" onClick={onClose}>DineFor.com</Link>
        <button type="button" className="df-shell-menu-toggle" aria-label="Close menu" autoFocus onClick={onClose}><ShellIcon name="close" /></button>
      </div>
      <section className="df-welcome-menu-intro">
        <CrewArt role="host" />
        <div><h2 id="df-welcome-title">Welcome to DineFor.com!</h2><p>Discover and reserve buffet experiences in Sri Lanka.</p></div>
      </section>
      <nav className="df-welcome-menu-links" aria-label="Mobile menu">
        {destinations.map(([to, label, icon]) => <NavLink to={to} key={to} end onClick={onClose}><ShellIcon name={icon} /><span>{label}</span><ShellIcon name="right" /></NavLink>)}
        {partnerLink && <NavLink to={partnerLink[0]} onClick={onClose}><ShellIcon name="buffet" /><span>{partnerLink[1]}</span><ShellIcon name="right" /></NavLink>}
      </nav>
      <div className="df-welcome-menu-actions">
        {user ? <>
          <Link className="df-shell-secondary" to="/customer" onClick={onClose}><ShellIcon name="person" /> My account</Link>
          <button type="button" className="df-shell-primary" onClick={() => { onClose(); onSignOut(); }}>Sign out</button>
        </> : <>
          <Link className="df-shell-secondary" to="/login" state={{ returnTo }} onClick={onClose}><ShellIcon name="person" /> Sign in</Link>
          <Link className="df-shell-primary" to="/register" onClick={onClose}>Create account</Link>
        </>}
      </div>
    </div>
  </dialog>;
}
