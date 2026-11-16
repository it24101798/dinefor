import RouteLoadBoundary from "./routes/RouteLoadBoundary";
import ReservationDetails from "./pages/ReservationDetails";
import { SavedBuffetsProvider } from "./discovery/useSavedBuffets";
import React, { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import "./design/reference.css";
import NotFound from "./pages/NotFound";
import ForHotels from "./pages/ForHotels";
import CustomerHelp from "./mobile/shell/CustomerHelp";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./routes/ProtectedRoute";
import HotelApprovedRoute from "./routes/HotelApprovedRoute";
import MobileBottomNav from "./mobile/navigation/MobileBottomNav";

import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Listings from "./pages/Listings";
import BuffetDetails from "./pages/BuffetDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyResetCode from "./pages/VerifyResetCode";
import VerifyEmail from "./pages/VerifyEmail";
import VerificationPending from "./pages/VerificationPending";
import AccountSecurity from "./pages/AccountSecurity";
import MyBookings from "./pages/MyBookings";
import CustomerBooking from "./pages/CustomerBooking";
import MyReviews from "./pages/MyReviews";
import Notifications from "./pages/Notifications";
import Recommendations from "./pages/Recommendations";
import HotelApply from "./pages/HotelApply";
import PartnerEnquiry from "./onboarding/PartnerEnquiry";
import HotelInvitation from "./onboarding/HotelInvitation";
import AdminHotelOnboarding from "./onboarding/AdminHotelOnboarding";
import HotelBankDetails from "./onboarding/HotelBankDetails";
import HotelStaff, { HotelStaffDesk, HotelStaffInvitation } from "./onboarding/HotelStaff";
import HotelProfile from "./pages/HotelProfile";
import BookingCheckIn from "./pages/BookingCheckIn";
import HotelCheckInDesk from "./pages/HotelCheckInDesk";
import ClientProfile from "./pages/ClientProfile";
import SavedBuffets from "./pages/SavedBuffets";
import CustomerDashboard from "./pages/CustomerDashboard";
import BookingSummary from "./pages/BookingSummary";
import PaymentHistory from "./pages/PaymentHistory";
import RecentlyViewed from "./pages/RecentlyViewed";
import PartnershipCompliance from "./pages/PartnershipCompliance";
import PaymentGatewayResult from "./pages/PaymentGatewayResult";

const HotelDashboard = lazy(() => import("./pages/HotelDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ExploreMap = lazy(() => import("./pages/ExploreMap"));
const AdminPartnershipReview = lazy(() => import("./pages/AdminPartnershipReview"));
const SeoLandingPage = lazy(() => import("./pages/seo/SeoLandingPage"));
const DestinationPage = lazy(() => import("./pages/seo/DestinationPage"));
const PriceCollectionPage = lazy(() => import("./pages/seo/PriceCollectionPage"));

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <SavedBuffetsProvider><div className="df-app">
      <Navbar />
      <RouteLoadBoundary route={pathname}>
      <Suspense fallback={<div className="min-h-[50vh] grid place-items-center" role="status">Loading page…</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/help" element={<CustomerHelp />} />
        <Route path="/for-hotels" element={<ForHotels />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/discover" element={<Feed />} />
        <Route path="/explore-map" element={<ExploreMap />} />
        <Route path="/map" element={<ExploreMap />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/buffets" element={<Listings />} />
        <Route path="/buffets/:id" element={<BuffetDetails />} />
        <Route path="/hotels/:id" element={<HotelProfile />} />

        {/* Release 4.1 public SEO landing pages */}
        <Route path="/best-buffets-in-colombo" element={<SeoLandingPage slug="best-buffets-in-colombo" />} />
        <Route path="/best-buffets-in-galle" element={<SeoLandingPage slug="best-buffets-in-galle" />} />
        <Route path="/best-buffets-in-kandy" element={<SeoLandingPage slug="best-buffets-in-kandy" />} />
        <Route path="/most-popular-buffets" element={<SeoLandingPage slug="most-popular-buffets" />} />
        <Route path="/top-rated-buffets" element={<SeoLandingPage slug="top-rated-buffets" />} />
        <Route path="/latest-buffets" element={<SeoLandingPage slug="latest-buffets" />} />
        <Route path="/best-high-tea-in-colombo" element={<SeoLandingPage slug="best-high-tea-in-colombo" />} />
        <Route path="/best-dinner-buffets-in-colombo" element={<SeoLandingPage slug="best-dinner-buffets-in-colombo" />} />
        <Route path="/best-lunch-buffets-in-colombo" element={<SeoLandingPage slug="best-lunch-buffets-in-colombo" />} />
        <Route path="/best-seafood-buffets-in-colombo" element={<SeoLandingPage slug="best-seafood-buffets-in-colombo" />} />

        {/* Release 4.2 destination + programmatic SEO architecture */}
        <Route path="/destinations/:citySlug" element={<DestinationPage />} />
        <Route path="/destinations/:citySlug/:categorySlug" element={<DestinationPage />} />
        <Route path="/buffets-under-5000" element={<PriceCollectionPage slug="buffets-under-5000" />} />
        <Route path="/buffets-under-7500" element={<PriceCollectionPage slug="buffets-under-7500" />} />
        <Route path="/buffets-under-10000" element={<PriceCollectionPage slug="buffets-under-10000" />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/verification-pending"
          element={<VerificationPending />}
        />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/resend-verification"
          element={<VerificationPending />}
        />
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />
        <Route
          path="/verify-reset-code"
          element={<VerifyResetCode />}
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route
          path="/customer"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "hotel", "admin"]}
            >
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "hotel", "admin"]}
            >
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recommendations"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "hotel", "admin"]}
            >
              <Recommendations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "hotel", "admin"]}
            >
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-reviews"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "admin"]}
            >
              <MyReviews />
            </ProtectedRoute>
          }
        />
        <Route path="/reserve" element={<ProtectedRoute allowedRoles={["customer", "admin"]}><ReservationDetails /></ProtectedRoute>} />
        <Route
          path="/booking-summary"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "admin"]}
            >
              <BookingSummary />
            </ProtectedRoute>
          }
        />
        <Route path="/bookings/:id" element={<ProtectedRoute allowedRoles={["customer", "admin"]}><CustomerBooking /></ProtectedRoute>} />
        <Route path="/bookings/:id/manage" element={<ProtectedRoute allowedRoles={["customer", "admin"]}><CustomerBooking screen="manage" /></ProtectedRoute>} />
        <Route path="/bookings/:id/pass" element={<ProtectedRoute allowedRoles={["customer", "admin"]}><CustomerBooking screen="pass" /></ProtectedRoute>} />
        <Route path="/bookings/:id/review" element={<ProtectedRoute allowedRoles={["customer", "admin"]}><CustomerBooking screen="review" /></ProtectedRoute>} />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "admin"]}
            >
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "hotel", "admin"]}
            >
              <PaymentHistory />
            </ProtectedRoute>
          }
        />
        <Route path="/payment/status/:paymentId" element={<ProtectedRoute allowedRoles={["customer", "admin"]}><PaymentGatewayResult /></ProtectedRoute>} />
        <Route path="/payment/return" element={<ProtectedRoute allowedRoles={["customer", "admin"]}><PaymentGatewayResult /></ProtectedRoute>} />
        <Route path="/payment/cancel" element={<ProtectedRoute allowedRoles={["customer", "admin"]}><PaymentGatewayResult /></ProtectedRoute>} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "hotel", "admin"]}
            >
              <ClientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account-security"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "hotel", "admin"]}
            >
              <AccountSecurity />
            </ProtectedRoute>
          }
        />
        <Route
          path="/saved"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "hotel", "admin"]}
            >
              <SavedBuffets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "hotel", "admin"]}
            >
              <SavedBuffets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recently-viewed"
          element={
            <ProtectedRoute
              allowedRoles={["customer", "hotel", "admin"]}
            >
              <RecentlyViewed />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hotel-partnership"
          element={
            <ProtectedRoute allowedRoles={["hotel", "admin"]}>
              <PartnershipCompliance />
            </ProtectedRoute>
          }
        />
        <Route path="/hotel-enquiry" element={<PartnerEnquiry />} />
        <Route path="/hotel-invitation" element={<HotelInvitation />} />
        <Route path="/hotel/staff" element={<ProtectedRoute allowedRoles={["hotel"]}><HotelStaff /></ProtectedRoute>} />
        <Route path="/hotel/staff-desk" element={<ProtectedRoute allowedRoles={["hotel_staff"]}><HotelStaffDesk /></ProtectedRoute>} />
        <Route path="/hotel-staff-invitation" element={<HotelStaffInvitation />} />
        <Route path="/hotel/bank-details" element={<ProtectedRoute allowedRoles={["hotel"]}><HotelBankDetails /></ProtectedRoute>} />
        <Route path="/admin/hotel-onboarding/:id?" element={<ProtectedRoute allowedRoles={["admin"]}><AdminHotelOnboarding /></ProtectedRoute>} />
        <Route
          path="/hotel-apply"
          element={
            <ProtectedRoute allowedRoles={["hotel", "admin"]}>
              <HotelApply />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hotel/check-in"
          element={
            <HotelApprovedRoute>
              <HotelCheckInDesk />
            </HotelApprovedRoute>
          }
        />
        <Route
          path="/hotel/checkin"
          element={
            <HotelApprovedRoute>
              <HotelCheckInDesk />
            </HotelApprovedRoute>
          }
        />
        <Route
          path="/hotel/qr-desk"
          element={
            <HotelApprovedRoute>
              <HotelCheckInDesk />
            </HotelApprovedRoute>
          }
        />
        <Route
          path="/hotel/*"
          element={
            <HotelApprovedRoute>
              <HotelDashboard />
            </HotelApprovedRoute>
          }
        />

        <Route
          path="/admin/partnership/:hotelId"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPartnershipReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/check-in/:code"
          element={
            <ProtectedRoute allowedRoles={["hotel", "admin", "hotel_staff"]}>
              <BookingCheckIn />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </RouteLoadBoundary>
      <MobileBottomNav />
    </div></SavedBuffetsProvider>
  );
}
