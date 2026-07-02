import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

function HotelApprovedRoute({ children }) {
  const { user, token, isLoggedIn } = useAuth();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const checkHotelApproval = async () => {
      if (!isLoggedIn || user?.role !== "hotel") {
        setStatus("not-hotel");
        return;
      }

      try {
        const res = await axios.get("http://localhost:5000/api/hotels/my-hotel", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.status === "approved" && res.data?.isApproved) setStatus("approved");
        else setStatus("pending");
      } catch {
        setStatus("pending");
      }
    };

    checkHotelApproval();
  }, [isLoggedIn, token, user]);

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (user?.role === "admin") return children;
  if (user?.role !== "hotel") return <Navigate to="/feed" replace />;

  if (status === "checking") {
    return (
      <main className="dashboard-page">
        <section className="panel"><h2>Checking hotel approval...</h2></section>
      </main>
    );
  }

  if (status !== "approved") return <Navigate to="/hotel-apply" replace />;

  return children;
}

export default HotelApprovedRoute;
