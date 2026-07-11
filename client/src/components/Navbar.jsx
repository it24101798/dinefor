import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth() || {};
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // ============================================
  // SCROLL EFFECT
  // ============================================
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ============================================
  // CLICK OUTSIDE HANDLER
  // ============================================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ============================================
  // HANDLERS
  // ============================================
  const handleLogout = () => {
    if (logout) {
      logout();
    }
    navigate("/");
    setIsProfileOpen(false);
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
    { to: "/saved", label: "Saved", icon: "bookmark" },
    { to: "/payments", label: "Payments", icon: "payments" },
    { to: "/profile", label: "Profile", icon: "person" },
  ];

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      "bg-primary-container text-on-primary-container",
      "bg-secondary-container text-on-secondary-container",
      "bg-tertiary-container text-on-tertiary-container",
      "bg-highlight-gold/30 text-tertiary",
      "bg-accent-mint/30 text-secondary",
    ];
    const index = (name?.length || 0) % colors.length;
    return colors[index];
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-surface-cream/95 backdrop-blur-xl shadow-ambient border-b border-border-subtle"
          : "bg-surface-cream/80 backdrop-blur-md border-b border-border-subtle/50"
      }`}
    >
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-headline-lg text-headline-lg text-text-deep-green hover:opacity-80 transition-opacity group"
          >
            <span className="text-2xl">🍽️</span>
            <span className="hidden sm:inline">DineFor</span>
            <span className="sm:hidden">DF</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {getLinks().map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-full font-label-md text-label-md transition-all ${
                    isActive
                      ? "bg-secondary-container/20 text-secondary font-semibold"
                      : "text-on-surface-variant hover:text-text-deep-green hover:bg-surface-container-low"
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 md:gap-4">
            {user ? (
              <>
                {/* Notifications */}
                <button
                  className="relative p-2 rounded-full hover:bg-surface-container-low transition-colors"
                  onClick={() => navigate("/customer")}
                >
                  <span className="material-symbols-outlined text-on-surface-variant">
                    notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-pulse" />
                  )}
                </button>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-container-low transition-all group"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover border-2 border-border-subtle group-hover:border-secondary transition-colors"
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-label-md text-label-md ${getAvatarColor(
                          user.name
                        )} border-2 border-border-subtle group-hover:border-secondary transition-colors`}
                      >
                        {getInitials(user.name)}
                      </div>
                    )}
                    <span className="hidden lg:inline font-label-sm text-label-sm text-on-surface-variant max-w-[100px] truncate">
                      {user.name || user.email}
                    </span>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px] hidden lg:inline">
                      {isProfileOpen ? "expand_less" : "expand_more"}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-surface-container-lowest rounded-2xl shadow-ambient-lg border border-border-subtle overflow-hidden animate-fade-in-down">
                      {/* User Info */}
                      <div className="p-4 border-b border-border-subtle bg-surface-container-low">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center font-headline-md text-headline-md ${getAvatarColor(
                                user.name
                              )}`}
                            >
                              {getInitials(user.name)}
                            </div>
                          )}
                          <div>
                            <p className="font-label-md text-label-md text-text-deep-green">
                              {user.name || "User"}
                            </p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant truncate max-w-[180px]">
                              {user.email}
                            </p>
                            <span className="badge-gold text-xs">
                              {user.role === "admin"
                                ? "Admin"
                                : user.role === "hotel"
                                ? "Hotel Partner"
                                : "Customer"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        {userMenuItems.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container-low transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                              {item.icon}
                            </span>
                            <span className="font-label-md text-label-md text-text-deep-green">
                              {item.label}
                            </span>
                          </Link>
                        ))}
                      </div>

                      {/* Logout */}
                      <div className="p-2 border-t border-border-subtle">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full hover:bg-error/10 transition-colors text-error"
                        >
                          <span className="material-symbols-outlined text-[20px]">logout</span>
                          <span className="font-label-md text-label-md">Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="font-label-md text-label-md text-on-surface-variant hover:text-text-deep-green transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="font-label-md text-label-md bg-text-deep-green text-surface-cream px-4 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all"
                >
                  Join
                </Link>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">
                {isMobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border-subtle animate-fade-in-down" ref={mobileMenuRef}>
            <div className="flex flex-col space-y-1">
              {getLinks().map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-label-md transition-all ${
                      isActive
                        ? "bg-secondary-container/20 text-secondary font-semibold"
                        : "text-on-surface-variant hover:text-text-deep-green hover:bg-surface-container-low"
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
              {!user && (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-label-md text-on-surface-variant hover:text-text-deep-green hover:bg-surface-container-low transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">login</span>
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-label-md bg-text-deep-green text-surface-cream hover:opacity-90 transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                    Join
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;