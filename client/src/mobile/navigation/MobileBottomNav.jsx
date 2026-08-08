import React, { useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useResponsive from "../../hooks/useResponsive";

const publicHiddenPrefixes = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-reset-code",
  "/reset-password",
  "/verify-email",
  "/verification-pending",
  "/resend-verification",
  "/check-in/",
];

const customerItems = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/feed", label: "Discover", icon: "explore" },
  { to: "/map", label: "Map", icon: "map" },
  { to: "/my-bookings", label: "Bookings", icon: "event_seat" },
  { to: "/profile", label: "Account", icon: "person" },
];

const hotelItems = [
  { to: "/hotel", label: "Overview", icon: "dashboard" },
  { to: "/hotel/reservations", label: "Bookings", icon: "event_seat" },
  { to: "/hotel/buffets", label: "Buffets", icon: "restaurant" },
  { to: "/hotel/check-in", label: "Check-In", icon: "qr_code_scanner" },
  { to: "/profile", label: "More", icon: "menu" },
];

const adminItems = [
  { to: "/admin", label: "Admin", icon: "dashboard" },
  { to: "/admin/hotels", label: "Hotels", icon: "business" },
  { to: "/admin/bookings", label: "Bookings", icon: "event_note" },
  { to: "/notifications", label: "Alerts", icon: "notifications" },
  { to: "/profile", label: "Account", icon: "person" },
];

export default function MobileBottomNav() {
  const { user } = useAuth() || {};
  const { isMobile } = useResponsive();
  const location = useLocation();

  const hidden = useMemo(
    () => publicHiddenPrefixes.some((prefix) => location.pathname === prefix || location.pathname.startsWith(prefix)),
    [location.pathname]
  );

  const items = user?.role === "admin" ? adminItems : user?.role === "hotel" ? hotelItems : customerItems;

  useEffect(() => {
    const shouldShow = isMobile && !hidden;
    document.body.classList.toggle("df-mobile-nav-present", shouldShow);
    return () => document.body.classList.remove("df-mobile-nav-present");
  }, [isMobile, hidden]);

  if (!isMobile || hidden) return null;

  return (
    <nav className="df-mobile-bottom-nav" aria-label="Mobile primary navigation">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/" || item.to === "/hotel" || item.to === "/admin"}
          className={({ isActive }) => `df-mobile-bottom-link ${isActive ? "is-active" : ""}`}
        >
          <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
