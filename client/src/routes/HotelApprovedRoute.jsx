import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const HotelApprovedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [hotelStatus, setHotelStatus] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkHotelStatus = async () => {
      if (!user || user.role !== "hotel") {
        setChecking(false);
        return;
      }

      try {
        const token = user.token;
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`${API_BASE}/api/hotels/my-hotel`, { headers });
        
        if (res.data) {
          setHotelStatus(res.data.status || "pending");
        } else {
          setHotelStatus("no_application");
        }
      } catch (error) {
        console.error("Hotel status check failed:", error);
        setHotelStatus("no_application");
      } finally {
        setChecking(false);
      }
    };

    checkHotelStatus();
  }, [user]);

  if (loading || checking) {
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

  // Redirect based on hotel status
  if (hotelStatus === "approved") {
    return children;
  }

  if (hotelStatus === "pending" || hotelStatus === "need_more_info") {
    return <Navigate to="/hotel-apply" replace />;
  }

  if (hotelStatus === "rejected" || hotelStatus === "suspended") {
    return <Navigate to="/hotel-apply" replace />;
  }

  // No application or draft
  return <Navigate to="/hotel-apply" replace />;
};

export default HotelApprovedRoute;