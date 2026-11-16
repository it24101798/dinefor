import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";


const HotelApprovedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [hotelStatus, setHotelStatus] = useState(null);
  const [partnershipStatus, setPartnershipStatus] = useState(null);
  const [checking, setChecking] = useState(true);
  const [checkedToken, setCheckedToken] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const checkHotelStatus = async () => {
      if (!user || user.role !== "hotel") {
        setChecking(false);
        return;
      }

      setChecking(true);
      setHotelStatus(null);
      setPartnershipStatus(null);
      try {
        const token = user.token;
        const headers = { Authorization: `Bearer ${token}` };
        const res = await api.get(`/hotels/my-hotel`, { headers });
        
        if (cancelled) return;
        const hotel = Object.hasOwn(res.data || {}, "hotel") ? res.data.hotel : res.data;
        if (hotel) {
          setHotelStatus(hotel.status || "pending");
          setPartnershipStatus(hotel.partnershipStatus || null);
        } else {
          setHotelStatus("no_application");
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Hotel status check failed:", error);
        setHotelStatus("no_application");
      } finally {
        if (!cancelled) { setCheckedToken(user.token); setChecking(false); }
      }
    };

    checkHotelStatus();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || checking || (user?.role === "hotel" && checkedToken !== user.token)) {
    return (
      <div className="min-h-screen bg-surface-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <span className="material-symbols-outlined text-5xl text-secondary mb-3 block">sync</span>
            <p className="font-headline-md text-headline-md text-text-deep-green">Checking hotel status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "hotel") {
    return <Navigate to="/" replace />;
  }

  if (hotelStatus === "approved" || ["active", "active_legacy"].includes(partnershipStatus)) {
    return children;
  }

  return <Navigate to={hotelStatus === "no_application" ? "/hotel-enquiry" : "/hotel-partnership"} replace />;
};

export default HotelApprovedRoute;