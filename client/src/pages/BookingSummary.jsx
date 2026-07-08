import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import PaymentMethodSelector from "../components/payments/PaymentMethodSelector";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function calculateClientTotals({ price, seats, couponPreview }) {
  const subtotal = Number(price || 0) * Number(seats || 0);
  const discountAmount = Number(couponPreview?.discountAmount || 0);
  const taxAmount = Number(couponPreview?.taxAmount || 0);
  const serviceCharge = Number(couponPreview?.serviceCharge || 0);
  const grandTotal = couponPreview?.grandTotal ?? Math.max(subtotal - discountAmount + taxAmount + serviceCharge, 0);
  return { subtotal, discountAmount, taxAmount, serviceCharge, grandTotal };
}

function BookingSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const reservation = location.state?.reservation || null;

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("dineforUser") || "null"); } catch { return null; }
  }, []);

  const [paymentMethod, setPaymentMethod] = useState("pay_at_hotel");
  const [couponCode, setCouponCode] = useState("");
  const [couponPreview, setCouponPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const buffet = reservation?.buffet;
  const totals = calculateClientTotals({ price: buffet?.price, seats: reservation?.seats, couponPreview });

  const headers = storedUser?.token ? { Authorization: `Bearer ${storedUser.token}` } : {};

  const applyCoupon = async () => {
    setMessage("");
    if (!couponCode.trim()) {
      setCouponPreview(null);
      setMessage("Enter a coupon code first.");
      return;
    }

    try {
      const res = await api.post(
        "/coupons/validate",
        { code: couponCode, price: buffet.price, seats: reservation.seats },
        { headers }
      );
      setCouponPreview(res.data.totals);
      setMessage(res.data.message || "Coupon applied successfully.");
    } catch (error) {
      setCouponPreview(null);
      setMessage(error.response?.data?.message || "Coupon could not be applied.");
    }
  };

  const confirmBooking = async () => {
    if (!storedUser) {
      navigate("/login");
      return;
    }

    if (!reservation) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await api.post(
        "/bookings",
        {
          buffetId: reservation.buffetId,
          selectedDate: reservation.selectedDate,
          slotId: reservation.slotId,
          seats: Number(reservation.seats),
          paymentMethod,
          couponCode: couponCode.trim(),
        },
        { headers }
      );

      setMessage(res.data.message || "Booking confirmed.");
      setTimeout(() => navigate("/my-bookings"), 700);
    } catch (error) {
      setMessage(error.response?.data?.message || "Booking confirmation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!reservation || !buffet) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">error</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">No Reservation Found</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">Please select a buffet and time slot first.</p>
            <Link to="/feed" className="btn-primary inline-flex items-center gap-2 mt-6">Browse Buffets</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!storedUser) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">lock</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Please Login</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">You need to be logged in to confirm a booking.</p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2 mt-6">Login</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Booking Summary</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Review and confirm your reservation</p>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm font-medium mb-6 ${
            message.includes("confirmed") || message.includes("success")
              ? "bg-secondary-container/30 text-secondary"
              : "bg-error/10 text-error"
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-ambient p-6">
              <h2 className="font-headline-md text-headline-md text-text-deep-green mb-4">Reservation Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Buffet</p>
                  <p className="font-label-md text-label-md text-text-deep-green">{buffet.title}</p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Hotel</p>
                  <p className="font-label-md text-label-md text-text-deep-green">{buffet.hotel?.hotelName || "Hotel"}</p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Date</p>
                  <p className="font-label-md text-label-md text-text-deep-green">{formatDate(reservation.selectedDate)}</p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Time</p>
                  <p className="font-label-md text-label-md text-text-deep-green">
                    {reservation.slot?.startTime} - {reservation.slot?.endTime}
                  </p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Guests</p>
                  <p className="font-label-md text-label-md text-text-deep-green">{reservation.seats}</p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Price per person</p>
                  <p className="font-label-md text-label-md text-text-deep-green">{money(buffet.price)}</p>
                </div>
              </div>
            </div>

            {/* Coupon */}
            <div className="card-ambient p-6">
              <h2 className="font-headline-md text-headline-md text-text-deep-green mb-4">Apply Coupon</h2>
              <div className="flex gap-3">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="form-input flex-1"
                />
                <button onClick={applyCoupon} className="btn-outline">Apply</button>
              </div>
              {couponPreview && (
                <div className="mt-3 p-3 rounded-xl bg-secondary-container/10 border border-secondary/30">
                  <p className="font-label-sm text-label-sm text-secondary">✅ Coupon applied! Discount: {money(couponPreview.discountAmount)}</p>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="card-ambient p-6">
              <h2 className="font-headline-md text-headline-md text-text-deep-green mb-4">Payment Method</h2>
              <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card-ambient p-6 sticky top-28">
              <h2 className="font-headline-md text-headline-md text-text-deep-green mb-4">Payment Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-body-md text-body-md text-on-surface-variant">Subtotal</span>
                  <span className="font-body-md text-body-md text-text-deep-green">{money(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span className="font-body-md text-body-md">Discount</span>
                  <span className="font-body-md text-body-md">- {money(totals.discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body-md text-body-md text-on-surface-variant">Service Charge</span>
                  <span className="font-body-md text-body-md text-text-deep-green">{money(totals.serviceCharge)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body-md text-body-md text-on-surface-variant">Tax</span>
                  <span className="font-body-md text-body-md text-text-deep-green">{money(totals.taxAmount)}</span>
                </div>
                <div className="border-t border-border-subtle pt-3 mt-3 flex justify-between">
                  <span className="font-headline-md text-headline-md text-text-deep-green">Total</span>
                  <span className="font-headline-md text-headline-md text-highlight-gold">{money(totals.grandTotal)}</span>
                </div>
              </div>

              <button
                onClick={confirmBooking}
                disabled={loading}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-surface-cream border-t-transparent" />
                    Confirming...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </button>
              <p className="font-label-sm text-label-sm text-on-surface-variant text-center mt-2">
                You'll receive a QR confirmation after booking
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default BookingSummary;