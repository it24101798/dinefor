import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./routes/ProtectedRoute";
import HotelApprovedRoute from "./routes/HotelApprovedRoute";

import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Listings from "./pages/Listings";
import BuffetDetails from "./pages/BuffetDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyBookings from "./pages/MyBookings";
import HotelDashboard from "./pages/HotelDashboard";
import HotelApply from "./pages/HotelApply";
import HotelProfile from "./pages/HotelProfile";
import AdminDashboard from "./pages/AdminDashboard";
import ExploreMap from "./pages/ExploreMap";
import BookingCheckIn from "./pages/BookingCheckIn";
import HotelCheckInDesk from "./pages/HotelCheckInDesk";
import ClientProfile from "./pages/ClientProfile";
import SavedBuffets from "./pages/SavedBuffets";
import CustomerDashboard from "./pages/CustomerDashboard";
import BookingSummary from "./pages/BookingSummary";
import PaymentHistory from "./pages/PaymentHistory";

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/discover" element={<Feed />} />
        <Route path="/explore-map" element={<ExploreMap />} />
        <Route path="/map" element={<ExploreMap />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/buffets" element={<Listings />} />
        <Route path="/buffets/:id" element={<BuffetDetails />} />
        <Route path="/booking-summary" element={<ProtectedRoute allowedRoles={["customer", "admin"]}><BookingSummary /></ProtectedRoute>} />
        <Route path="/hotels/:id" element={<HotelProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/customer" element={<ProtectedRoute allowedRoles={["customer", "hotel", "admin"]}><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["customer", "hotel", "admin"]}><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/my-bookings" element={<ProtectedRoute allowedRoles={["customer", "admin"]}><MyBookings /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute allowedRoles={["customer", "hotel", "admin"]}><PaymentHistory /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute allowedRoles={["customer", "hotel", "admin"]}><ClientProfile /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute allowedRoles={["customer", "hotel", "admin"]}><SavedBuffets /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute allowedRoles={["customer", "hotel", "admin"]}><SavedBuffets /></ProtectedRoute>} />
        <Route path="/hotel-apply" element={<ProtectedRoute allowedRoles={["hotel", "admin"]}><HotelApply /></ProtectedRoute>} />
        <Route path="/hotel/check-in" element={<HotelApprovedRoute><HotelCheckInDesk /></HotelApprovedRoute>} />
        <Route path="/hotel/*" element={<HotelApprovedRoute><HotelDashboard /></HotelApprovedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/check-in/:code" element={<ProtectedRoute allowedRoles={["hotel", "admin"]}><BookingCheckIn /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

export default App;
