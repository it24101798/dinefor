import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  const closeMenu = () => setOpen(false);

  const isHotel = user?.role === "hotel";
  const isAdmin = user?.role === "admin";
  const isCustomer = user?.role === "customer";

  return (
    <header className="site-header df-header">
      <nav className="navbar df-navbar">
        <Link to="/" className="logo df-logo" onClick={closeMenu}>
          <span className="logo-mark df-logo-mark">D</span>
          <span className="df-logo-text">DineFor</span>
        </Link>

        <button
          className="df-mobile-toggle"
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={open ? "df-nav-panel open" : "df-nav-panel"}>
          <div className="nav-links main-nav-links df-main-links">
            <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
            <NavLink to="/feed" onClick={closeMenu}>Discover</NavLink>
            <NavLink to="/explore-map" onClick={closeMenu}>Map</NavLink>
            <NavLink to="/listings" onClick={closeMenu}>Buffets</NavLink>
            {!isHotel && <NavLink to="/hotel-apply" onClick={closeMenu}>For Hotels</NavLink>}
          </div>

          {isLoggedIn && (
            <div className="nav-links dashboard-nav-links role-nav-links df-role-links">
              {(isCustomer || isAdmin) && <NavLink to="/my-bookings" onClick={closeMenu}>Reservations</NavLink>}
              {(isCustomer || isAdmin) && <NavLink to="/saved" onClick={closeMenu}>Saved</NavLink>}
              <NavLink to="/profile" onClick={closeMenu}>Profile</NavLink>
              {(isHotel || isAdmin) && <NavLink to="/hotel" onClick={closeMenu}>Hotel</NavLink>}
              {(isHotel || isAdmin) && <NavLink to="/hotel/check-in" onClick={closeMenu}>QR Desk</NavLink>}
              {isAdmin && <NavLink to="/admin" onClick={closeMenu}>Admin</NavLink>}
            </div>
          )}

          <div className="nav-actions improved-nav-actions df-nav-actions">
            {isLoggedIn ? (
              <>
                <span className="user-chip clean-user-chip df-user-chip" title={user?.email || user?.name}>
                  <span className="avatar-dot df-avatar-dot">{user?.name?.charAt(0) || "U"}</span>
                  <span className="nav-user-name">{user?.name || user?.email}</span>
                </span>
                <button className="btn ghost small df-btn df-btn-ghost" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn ghost small df-btn df-btn-ghost" onClick={closeMenu}>Sign In</Link>
                <Link to="/register" className="btn primary small df-btn df-btn-primary" onClick={closeMenu}>Join</Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
