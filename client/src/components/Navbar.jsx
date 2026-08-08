import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [unreadCount] = useState(0);
  const profileRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) setIsMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout?.();
    navigate("/");
  };

  const navLinks = [
    { to: "/feed", label: "Discover", icon: "explore" },
    { to: "/explore-map", label: "Map", icon: "map" },
    { to: "/listings", label: "Buffets", icon: "restaurant" },
  ];

  const getLinks = () => {
    if (user?.role === "admin") return [...navLinks, { to: "/admin", label: "Admin", icon: "admin_panel_settings" }];
    if (user?.role === "hotel") return [...navLinks, { to: "/hotel", label: "Hotel Portal", icon: "business" }];
    return navLinks;
  };

  const userMenuItems = [
    { to: "/customer", label: "Dashboard", icon: "dashboard" },
    { to: "/my-bookings", label: "My Bookings", icon: "event_seat" },
    { to: "/recommendations", label: "For You", icon: "auto_awesome" },
    ...(user?.role === "customer" || user?.role === "admin" ? [{ to: "/my-reviews", label: "My Reviews", icon: "rate_review" }] : []),
    { to: "/notifications", label: "Notifications", icon: "notifications" },
    { to: "/saved", label: "Saved", icon: "bookmark" },
    { to: "/payments", label: "Payments", icon: "payments" },
    { to: "/profile", label: "Profile", icon: "person" },
    { to: "/account-security", label: "Security", icon: "shield_lock" },
  ];

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      "bg-primary-container text-on-primary-container",
      "bg-secondary-container text-on-secondary-container",
      "bg-tertiary-container text-on-tertiary-container",
      "bg-highlight-gold/30 text-tertiary",
      "bg-accent-mint/30 text-secondary",
    ];
    return colors[(name?.length || 0) % colors.length];
  };

  const renderAvatar = (size = "w-9 h-9") => user?.avatarUrl ? (
    <img src={user.avatarUrl} alt={user.name || "Account"} className={`${size} rounded-full object-cover border-2 border-border-subtle`} />
  ) : (
    <div className={`${size} rounded-full flex items-center justify-center font-label-md ${getAvatarColor(user?.name)} border-2 border-border-subtle`}>
      {getInitials(user?.name)}
    </div>
  );

  return (
    <nav className={`df-navbar fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-surface-cream/95 backdrop-blur-xl shadow-ambient border-b border-border-subtle" : "bg-surface-cream/90 backdrop-blur-md border-b border-border-subtle/50"}`}>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="df-navbar-inner flex justify-between items-center h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2 text-text-deep-green hover:opacity-80 transition-opacity" aria-label="DineFor home">
            <span className="text-xl md:text-2xl" aria-hidden="true">🍽️</span>
            <span className="df-mobile-brand md:font-headline-lg md:text-headline-lg">DineFor</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {getLinks().map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-full font-label-md text-label-md transition-all ${isActive ? "bg-secondary-container/20 text-secondary font-semibold" : "text-on-surface-variant hover:text-text-deep-green hover:bg-surface-container-low"}`}>
                <span className="material-symbols-outlined text-[18px]">{link.icon}</span>{link.label}
              </NavLink>
            ))}
          </div>

          <div className="df-mobile-top-actions flex items-center gap-2 md:gap-4">
            {user ? (
              <>
                <button className="relative p-2 rounded-full hover:bg-surface-container-low transition-colors" onClick={() => navigate("/notifications")} aria-label="Notifications">
                  <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
                  {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />}
                </button>
                <div className="relative" ref={profileRef}>
                  <button onClick={() => setIsProfileOpen((value) => !value)} className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-container-low transition-all" aria-label="Open account menu" aria-expanded={isProfileOpen}>
                    {renderAvatar()}
                    <span className="hidden lg:inline font-label-sm text-on-surface-variant max-w-[110px] truncate">{user.name || user.email}</span>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px] hidden lg:inline">{isProfileOpen ? "expand_less" : "expand_more"}</span>
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-1rem))] bg-surface-container-lowest rounded-2xl shadow-ambient-lg border border-border-subtle overflow-hidden animate-fade-in-down">
                      <div className="p-4 border-b border-border-subtle bg-surface-container-low">
                        <div className="flex items-center gap-3">{renderAvatar("w-12 h-12")}<div className="min-w-0"><p className="font-label-md text-text-deep-green truncate">{user.name || "User"}</p><p className="font-label-sm text-on-surface-variant truncate">{user.email}</p><span className="badge-gold text-xs">{user.role === "admin" ? "Admin" : user.role === "hotel" ? "Hotel Partner" : "Customer"}</span></div></div>
                      </div>
                      <div className="p-2">
                        {userMenuItems.map((item) => <Link key={item.to} to={item.to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container-low"><span className="material-symbols-outlined text-[20px] text-on-surface-variant">{item.icon}</span><span className="font-label-md text-text-deep-green">{item.label}</span></Link>)}
                      </div>
                      <div className="p-2 border-t border-border-subtle"><button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full hover:bg-error/10 text-error"><span className="material-symbols-outlined text-[20px]">logout</span><span className="font-label-md">Logout</span></button></div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1 md:gap-3">
                <Link to="/login" className="hidden sm:inline-flex min-h-11 items-center px-3 font-label-md text-on-surface-variant hover:text-text-deep-green">Sign In</Link>
                <Link to="/register" className="min-h-11 inline-flex items-center px-4 font-label-md bg-text-deep-green text-surface-cream rounded-full hover:opacity-90">Join</Link>
              </div>
            )}

            <button onClick={() => setIsMobileMenuOpen((value) => !value)} className="md:hidden p-2 rounded-full hover:bg-surface-container-low" aria-label="Open navigation menu" aria-expanded={isMobileMenuOpen}>
              <span className="material-symbols-outlined text-on-surface-variant">{isMobileMenuOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="df-mobile-menu-panel md:hidden animate-fade-in-down" ref={mobileMenuRef}>
            <div className="flex flex-col space-y-1">
              {getLinks().map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-label-md transition-all ${isActive ? "bg-secondary-container/20 text-secondary font-semibold" : "text-on-surface-variant hover:bg-surface-container-low"}`}><span className="material-symbols-outlined text-[20px]">{link.icon}</span>{link.label}</NavLink>)}
              {user && userMenuItems.slice(0, 6).map((item) => <Link key={item.to} to={item.to} className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-low"><span className="material-symbols-outlined text-[20px]">{item.icon}</span>{item.label}</Link>)}
              {!user && <Link to="/login" className="sm:hidden flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant"><span className="material-symbols-outlined">login</span>Sign In</Link>}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
