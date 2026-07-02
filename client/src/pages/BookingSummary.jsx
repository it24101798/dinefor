import { useMemo, useState } from "react";
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
      <main className="payment-page-shell">
        <section className="payment-empty-state">
          <h1>Booking summary is not available</h1>
          <p>Please select a buffet date, time slot and seats again.</p>
          <Link className="btn primary" to="/feed">Back to Discover</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="payment-page-shell">
      <section className="payment-hero">
        <div>
          <span className="eyebrow">DineFor Checkout</span>
          <h1>Confirm your reservation</h1>
          <p>Review booking details, apply a coupon, choose payment method, and generate your invoice + QR reservation.</p>
        </div>
        <Link className="btn secondary" to={`/buffets/${reservation.buffetId}`}>Edit Selection</Link>
      </section>

      <section className="payment-layout">
        <div className="payment-panel">
          <span className="eyebrow">Reservation</span>
          <h2>{buffet.title}</h2>
          <p className="muted">{buffet.hotel?.hotelName || "Hotel"} • {buffet.category || "Buffet"}</p>

          <div className="payment-info-grid">
            <p><strong>Date</strong><span>{formatDate(reservation.selectedDate)}</span></p>
            <p><strong>Time</strong><span>{reservation.slot?.startTime} - {reservation.slot?.endTime}</span></p>
            <p><strong>Guests</strong><span>{reservation.seats}</span></p>
            <p><strong>Unit Price</strong><span>{money(buffet.price)}</span></p>
          </div>

          <div className="coupon-box">
            <label>Coupon Code</label>
            <div>
              <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="WELCOME10" />
              <button type="button" onClick={applyCoupon}>Apply</button>
            </div>
          </div>

          <h3>Payment Method</h3>
          <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
        </div>

        <aside className="payment-panel payment-summary-card">
          <span className="eyebrow">Invoice Preview</span>
          <h2>Payment Summary</h2>

          <div className="summary-row"><span>Subtotal</span><strong>{money(totals.subtotal)}</strong></div>
          <div className="summary-row discount"><span>Discount</span><strong>- {money(totals.discountAmount)}</strong></div>
          <div className="summary-row"><span>Service Charge</span><strong>{money(totals.serviceCharge)}</strong></div>
          <div className="summary-row"><span>Tax / VAT</span><strong>{money(totals.taxAmount)}</strong></div>
          <div className="summary-total"><span>Grand Total</span><strong>{money(totals.grandTotal)}</strong></div>

          <div className="payment-note">
            <strong>MVP Payment Mode</strong>
            <p>Only Pay at Hotel is enabled now. Online gateways are architecturally prepared for the next payment integration bundle.</p>
          </div>

          <button className="btn primary wide" type="button" onClick={confirmBooking} disabled={loading}>
            {loading ? "Confirming..." : "Confirm Reservation + Generate QR"}
          </button>
          {message && <p className={message.toLowerCase().includes("fail") || message.toLowerCase().includes("could") || message.toLowerCase().includes("invalid") ? "error-text" : "success-text"}>{message}</p>}
        </aside>
      </section>
    </main>
  );
}

export default BookingSummary;
