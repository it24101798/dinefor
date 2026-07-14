import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import MediaUploader from "../components/MediaUploader";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const mealOptions = ["Breakfast", "Lunch", "Dinner", "Brunch", "High Tea", "Seafood Night", "BBQ Night", "Special Events"];
const cuisineOptions = ["Sri Lankan", "Indian", "Chinese", "Italian", "Mexican", "Seafood", "Arabic", "International", "Vegetarian", "Halal"];
const provinceOptions = ["Western", "Central", "Southern", "Northern", "Eastern", "North Western", "North Central", "Uva", "Sabaragamuwa"];
const districtOptions = ["Colombo", "Gampaha", "Kalutara", "Kandy", "Galle", "Matara", "Hambantota", "Jaffna", "Batticaloa", "Trincomalee", "Kurunegala", "Anuradhapura", "Badulla", "Ratnapura"];
const cityOptions = ["Colombo", "Malabe", "Kotte", "Dehiwala", "Mount Lavinia", "Negombo", "Kandy", "Galle", "Matara", "Kurunegala", "Anuradhapura", "Jaffna", "Batticaloa", "Trincomalee"];
const starOptions = ["5 Star", "4 Star", "3 Star", "Boutique", "Casual Dining", "Not Applicable"];
const hotelCategoryOptions = ["Hotel", "Restaurant", "Resort", "Café", "Cloud Kitchen", "Event Venue"];
const bankOptions = ["Bank of Ceylon", "People's Bank", "Commercial Bank", "Hatton National Bank", "Sampath Bank", "Seylan Bank", "Nations Trust Bank", "DFCC Bank", "Other"];

const emptyApplication = {
  legalBusinessName: "",
  businessRegistrationNumber: "",
  taxNumber: "",
  hotelCategory: "Hotel",
  starRating: "",
  cuisineTypes: [],
  mealServices: [],
  buffetCapacity: "",
  averageBuffetPrice: "",
  managerName: "",
  managerPhone: "",
  managerEmail: "",
  financeContactName: "",
  financeContactPhone: "",
  bankName: "",
  accountNumber: "",
  accountHolderName: "",
  bankBranch: "",
  refundPolicy: "",
  cancellationPolicy: "",
  termsAccepted: false,
  applicantNote: "",
  documents: [],
};

// ============================================
// MAIN COMPONENT
// ============================================
function HotelApply() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [activeStep, setActiveStep] = useState(1);

  const [formData, setFormData] = useState({
    hotelName: "",
    location: "",
    address: "",
    city: "",
    district: "",
    province: "",
    country: "Sri Lanka",
    description: "",
    contactNumber: "",
    email: "",
    logo: "",
    coverMediaUrl: "",
    coverMediaType: "image",
    googleMapUrl: "",
    latitude: "",
    longitude: "",
    application: emptyApplication,
  });

  const headers = { Authorization: `Bearer ${token}` };

  const normalizeApplication = (application = {}) => ({
    ...emptyApplication,
    ...application,
    cuisineTypes: Array.isArray(application.cuisineTypes) ? application.cuisineTypes : [],
    mealServices: Array.isArray(application.mealServices) ? application.mealServices : [],
    documents: Array.isArray(application.documents) ? application.documents : [],
    buffetCapacity: application.buffetCapacity || "",
    averageBuffetPrice: application.averageBuffetPrice || "",
  });

  // ============================================
  // FETCH HOTEL
  // ============================================
  const fetchHotel = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`${API_BASE}/api/hotels/my-hotel`, { headers });
      const h = res.data;
      setHotel(h);
      setFormData({
        hotelName: h.hotelName || "",
        location: h.location || "",
        address: h.address || "",
        city: h.city || "",
        district: h.district || "",
        province: h.province || "",
        country: h.country || "Sri Lanka",
        description: h.description || "",
        contactNumber: h.contactNumber || "",
        email: h.email || user?.email || "",
        logo: h.logo || "",
        coverMediaUrl: h.coverMediaUrl || "",
        coverMediaType: h.coverMediaType || "image",
        googleMapUrl: h.mapLocation?.googleMapUrl || "",
        latitude: h.mapLocation?.latitude || "",
        longitude: h.mapLocation?.longitude || "",
        application: normalizeApplication(h.application),
      });

      // If hotel is approved, redirect to dashboard
      if (h.status === "approved") {
        setMessage("Your hotel is already approved! Redirecting to dashboard...");
        setMessageType("success");
        setTimeout(() => navigate("/hotel"), 1500);
      }
    } catch (error) {
      // No hotel found - new application
      setHotel(null);
      setFormData((prev) => ({
        ...prev,
        email: user?.email || "",
        application: { ...prev.application, managerEmail: user?.email || "" },
      }));
    } finally {
      setLoading(false);
    }
  }, [token, headers, user, navigate]);

  useEffect(() => {
    fetchHotel();
  }, [fetchHotel]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleApplicationChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      application: {
        ...prev.application,
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  };

  const toggleMulti = (field, value) => {
    setFormData((prev) => {
      const current = prev.application[field] || [];
      const exists = current.includes(value);
      return {
        ...prev,
        application: {
          ...prev.application,
          [field]: exists ? current.filter((item) => item !== value) : [...current, value],
        },
      };
    });
  };

  const addDocument = (data) => {
    setFormData((prev) => ({
      ...prev,
      application: {
        ...prev.application,
        documents: [...(prev.application.documents || []), data.fileUrl],
      },
    }));
  };

  const removeDocument = (url) => {
    setFormData((prev) => ({
      ...prev,
      application: {
        ...prev.application,
        documents: prev.application.documents.filter((doc) => doc !== url),
      },
    }));
  };

  const buildPayload = () => ({
    hotelName: formData.hotelName,
    location: formData.location,
    address: formData.address,
    city: formData.city,
    district: formData.district,
    province: formData.province,
    country: formData.country,
    description: formData.description,
    contactNumber: formData.contactNumber,
    email: formData.email,
    logo: formData.logo,
    coverMediaUrl: formData.coverMediaUrl,
    coverMediaType: formData.coverMediaType,
    mapLocation: {
      googleMapUrl: formData.googleMapUrl,
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
    },
    application: {
      ...formData.application,
      buffetCapacity: Number(formData.application.buffetCapacity || 0),
      averageBuffetPrice: Number(formData.application.averageBuffetPrice || 0),
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);

    // Validation
    if (!formData.hotelName.trim()) {
      setMessage("Please enter your hotel name.");
      setMessageType("error");
      setSubmitting(false);
      return;
    }

    if (!formData.location.trim()) {
      setMessage("Please enter your hotel location.");
      setMessageType("error");
      setSubmitting(false);
      return;
    }

    if (!formData.application.managerName.trim()) {
      setMessage("Please enter the manager's name.");
      setMessageType("error");
      setSubmitting(false);
      return;
    }

    if (!formData.application.managerPhone.trim()) {
      setMessage("Please enter the manager's phone number.");
      setMessageType("error");
      setSubmitting(false);
      return;
    }

    if (!formData.application.termsAccepted) {
      setMessage("Please accept the terms and conditions.");
      setMessageType("error");
      setSubmitting(false);
      return;
    }

    try {
      const payload = buildPayload();
      const res = hotel
        ? await api.put(`${API_BASE}/api/hotels/my-hotel`, payload, { headers })
        : await api.post(`${API_BASE}/api/hotels`, payload, { headers });

      setMessage(res.data.message || "Hotel application saved successfully!");
      setMessageType("success");
      await fetchHotel();
      window.scrollTo({ top: 0, behavior: "smooth" });

      // If status is pending, show message
      if (res.data.hotel?.status === "pending" || res.data.status === "pending") {
        setMessage("✅ Application submitted! Please wait for admin approval.");
        setMessageType("success");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save hotel application.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setActiveStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setActiveStep((prev) => Math.max(prev - 1, 1));

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderMessage = () => {
    if (!message) return null;

    const styles = {
      success: "bg-secondary-container/30 text-secondary border border-secondary/30",
      error: "bg-error/10 text-error border border-error/20",
      warning: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30",
      info: "bg-primary-container/10 text-primary border border-primary-container/20",
    };

    return (
      <div className={`p-4 rounded-xl text-sm font-medium mb-6 ${styles[messageType] || styles.info}`}>
        {message}
        <button
          onClick={() => setMessage("")}
          className="float-right text-inherit opacity-70 hover:opacity-100"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    );
  };

  const renderStatusCard = () => {
    if (!hotel) return null;

    const statusConfig = {
      approved: { label: "✅ Approved", color: "approved", action: "Go to Dashboard" },
      pending: { label: "⏳ Pending Review", color: "pending", action: "Wait for Approval" },
      rejected: { label: "❌ Rejected", color: "rejected", action: "Reapply" },
      need_more_info: { label: "📝 Need More Info", color: "pending", action: "Update Application" },
      hold: { label: "⏸️ On Hold", color: "hold", action: "Contact Admin" },
      suspended: { label: "🚫 Suspended", color: "rejected", action: "Contact Admin" },
    };

    const config = statusConfig[hotel.status] || statusConfig.pending;

    return (
      <div className={`card-ambient p-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3`}>
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Application Status</p>
          <p className="font-headline-md text-headline-md text-text-deep-green">{hotel.hotelName}</p>
          <span className={`status-pill ${config.color}`}>{config.label}</span>
          {hotel.application?.submittedAt && (
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              Submitted: {new Date(hotel.application.submittedAt).toLocaleString()}
            </p>
          )}
        </div>
        {hotel.status === "approved" && (
          <Link to="/hotel" className="btn-primary">
            {config.action}
          </Link>
        )}
        {hotel.status === "need_more_info" && (
          <button className="btn-secondary">Update Application</button>
        )}
        {hotel.status === "pending" && (
          <div className="text-center">
            <span className="material-symbols-outlined text-3xl text-secondary mb-1 block">hourglass_top</span>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Please wait for admin review</p>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // STEP RENDERERS
  // ============================================
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 px-4">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <button
            onClick={() => setActiveStep(step)}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md text-label-md transition-all ${
              activeStep === step
                ? "bg-secondary text-surface-cream shadow-md"
                : activeStep > step
                ? "bg-secondary-container/30 text-secondary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {activeStep > step ? (
              <span className="material-symbols-outlined text-[18px]">check</span>
            ) : (
              step
            )}
          </button>
          {step < 4 && (
            <div className={`w-12 h-0.5 mx-2 ${activeStep > step ? "bg-secondary" : "bg-border-subtle"}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Public Hotel / Restaurant Name *</label>
          <input
            name="hotelName"
            value={formData.hotelName}
            onChange={handleChange}
            placeholder="e.g. Grand Hotel Colombo"
            className="form-input w-full"
            required
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Main Location *</label>
          <input
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g. Colombo 01"
            className="form-input w-full"
            required
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Province</label>
          <select name="province" value={formData.province} onChange={handleChange} className="form-select w-full">
            <option value="">Select Province</option>
            {provinceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">District</label>
          <select name="district" value={formData.district} onChange={handleChange} className="form-select w-full">
            <option value="">Select District</option>
            {districtOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">City</label>
          <select name="city" value={formData.city} onChange={handleChange} className="form-select w-full">
            <option value="">Select City</option>
            {cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Country</label>
          <select name="country" value={formData.country} onChange={handleChange} className="form-select w-full">
            <option value="Sri Lanka">Sri Lanka</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Full Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street address, building name, etc."
            className="form-textarea w-full"
            rows="2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Short Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Brief introduction to your hotel/restaurant"
            className="form-textarea w-full"
            rows="3"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Legal Business Name</label>
          <input
            name="legalBusinessName"
            value={formData.application.legalBusinessName}
            onChange={handleApplicationChange}
            placeholder="Registered business name"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Business Registration Number</label>
          <input
            name="businessRegistrationNumber"
            value={formData.application.businessRegistrationNumber}
            onChange={handleApplicationChange}
            placeholder="BR number"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Tax/VAT Number</label>
          <input
            name="taxNumber"
            value={formData.application.taxNumber}
            onChange={handleApplicationChange}
            placeholder="Tax registration number"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Hotel Category</label>
          <select
            name="hotelCategory"
            value={formData.application.hotelCategory}
            onChange={handleApplicationChange}
            className="form-select w-full"
          >
            {hotelCategoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Star Rating / Level</label>
          <select
            name="starRating"
            value={formData.application.starRating}
            onChange={handleApplicationChange}
            className="form-select w-full"
          >
            <option value="">Select Rating</option>
            {starOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Approx. Buffet Capacity</label>
          <input
            name="buffetCapacity"
            type="number"
            min="0"
            value={formData.application.buffetCapacity}
            onChange={handleApplicationChange}
            placeholder="Number of seats"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Average Buffet Price (Rs.)</label>
          <input
            name="averageBuffetPrice"
            type="number"
            min="0"
            value={formData.application.averageBuffetPrice}
            onChange={handleApplicationChange}
            placeholder="e.g. 3500"
            className="form-input w-full"
          />
        </div>
      </div>

      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-2">Meal Services You Plan to List</label>
        <div className="flex flex-wrap gap-2">
          {mealOptions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleMulti("mealServices", item)}
              className={`chip ${formData.application.mealServices.includes(item) ? "chip-active" : ""}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-2">Cuisine / Dining Types</label>
        <div className="flex flex-wrap gap-2">
          {cuisineOptions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleMulti("cuisineTypes", item)}
              className={`chip ${formData.application.cuisineTypes.includes(item) ? "chip-active" : ""}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Refund Policy</label>
        <textarea
          name="refundPolicy"
          value={formData.application.refundPolicy}
          onChange={handleApplicationChange}
          placeholder="Your refund policy terms"
          className="form-textarea w-full"
          rows="2"
        />
      </div>

      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Cancellation Policy</label>
        <textarea
          name="cancellationPolicy"
          value={formData.application.cancellationPolicy}
          onChange={handleApplicationChange}
          placeholder="Your cancellation policy terms"
          className="form-textarea w-full"
          rows="2"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Contact Number *</label>
          <input
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleChange}
            placeholder="07X XXX XXXX"
            className="form-input w-full"
            required
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="contact@hotel.com"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Manager Name *</label>
          <input
            name="managerName"
            value={formData.application.managerName}
            onChange={handleApplicationChange}
            placeholder="Full name"
            className="form-input w-full"
            required
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Manager Phone *</label>
          <input
            name="managerPhone"
            value={formData.application.managerPhone}
            onChange={handleApplicationChange}
            placeholder="07X XXX XXXX"
            className="form-input w-full"
            required
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Manager Email</label>
          <input
            name="managerEmail"
            type="email"
            value={formData.application.managerEmail}
            onChange={handleApplicationChange}
            placeholder="manager@hotel.com"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Finance Contact Name</label>
          <input
            name="financeContactName"
            value={formData.application.financeContactName}
            onChange={handleApplicationChange}
            placeholder="Finance person name"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Finance Contact Phone</label>
          <input
            name="financeContactPhone"
            value={formData.application.financeContactPhone}
            onChange={handleApplicationChange}
            placeholder="07X XXX XXXX"
            className="form-input w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Bank Name</label>
          <select
            name="bankName"
            value={formData.application.bankName}
            onChange={handleApplicationChange}
            className="form-select w-full"
          >
            <option value="">Select Bank</option>
            {bankOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Bank Branch</label>
          <input
            name="bankBranch"
            value={formData.application.bankBranch}
            onChange={handleApplicationChange}
            placeholder="Branch name"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Account Number</label>
          <input
            name="accountNumber"
            value={formData.application.accountNumber}
            onChange={handleApplicationChange}
            placeholder="Account number"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Account Holder Name</label>
          <input
            name="accountHolderName"
            value={formData.application.accountHolderName}
            onChange={handleApplicationChange}
            placeholder="As per bank"
            className="form-input w-full"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Google Maps URL</label>
          <input
            name="googleMapUrl"
            value={formData.googleMapUrl}
            onChange={handleChange}
            placeholder="https://goo.gl/maps/..."
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Latitude</label>
          <input
            name="latitude"
            value={formData.latitude}
            onChange={handleChange}
            placeholder="e.g. 6.9271"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Longitude</label>
          <input
            name="longitude"
            value={formData.longitude}
            onChange={handleChange}
            placeholder="e.g. 79.8612"
            className="form-input w-full"
          />
        </div>
      </div>

      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-2">Logo</label>
        <MediaUploader onUpload={(data) => setFormData((prev) => ({ ...prev, logo: data.fileUrl }))} />
        {formData.logo && (
          <div className="mt-2 flex items-center gap-3">
            <img src={formData.logo} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-border-subtle" />
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, logo: "" }))}
              className="text-error text-sm hover:text-error/80"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-2">Cover Image / Video</label>
        <MediaUploader
          onUpload={(data) => setFormData((prev) => ({ ...prev, coverMediaUrl: data.fileUrl, coverMediaType: data.mediaType }))}
        />
        {formData.coverMediaUrl && (
          <div className="mt-2 flex items-center gap-3">
            <img src={formData.coverMediaUrl} alt="Cover" className="w-32 h-20 rounded-lg object-cover border border-border-subtle" />
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, coverMediaUrl: "" }))}
              className="text-error text-sm hover:text-error/80"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-2">Verification Documents</label>
        <MediaUploader onUpload={addDocument} />
        {formData.application.documents.length > 0 && (
          <div className="mt-2 space-y-2">
            {formData.application.documents.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-border-subtle">
                <a href={doc} target="_blank" rel="noreferrer" className="text-secondary hover:underline text-sm">
                  Document {index + 1}
                </a>
                <button
                  type="button"
                  onClick={() => removeDocument(doc)}
                  className="text-error hover:text-error/80"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Additional Notes</label>
        <textarea
          name="applicantNote"
          value={formData.application.applicantNote}
          onChange={handleApplicationChange}
          placeholder="Any additional information for the admin"
          className="form-textarea w-full"
          rows="2"
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="termsAccepted"
          checked={formData.application.termsAccepted}
          onChange={handleApplicationChange}
          className="mt-1 w-4 h-4 text-secondary focus:ring-secondary rounded"
        />
        <span className="font-body-md text-body-md text-on-surface-variant">
          I confirm these details are correct and agree to follow DineFor hotel partner rules, reservation handling, customer check-in, cancellation, and review standards. *
        </span>
      </label>
    </div>
  );

  const renderCurrentStep = () => {
    switch (activeStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (loading) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-pulse">
                <span className="material-symbols-outlined text-5xl text-secondary mb-3 block">sync</span>
                <p className="font-headline-md text-headline-md text-text-deep-green">Loading application...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // If hotel is approved, show redirect message
  if (hotel?.status === "approved") {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="card-ambient p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-secondary mb-3 block">check_circle</span>
            <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Hotel Approved!</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              Your hotel has been approved. Redirecting to dashboard...
            </p>
            <Link to="/hotel" className="btn-primary inline-flex items-center gap-2 mt-4">
              Go to Dashboard
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-gold">Hotel Partner</span>
            {hotel?.status === "pending" && (
              <span className="status-pill pending">Pending Review</span>
            )}
            {hotel?.status === "rejected" && (
              <span className="status-pill rejected">Rejected</span>
            )}
            {hotel?.status === "need_more_info" && (
              <span className="status-pill pending">Need More Info</span>
            )}
          </div>
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green">
            {hotel ? "Update Hotel Application" : "Apply as Hotel Partner"}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {hotel
              ? "Update your hotel information and application details."
              : "Apply to become a DineFor hotel partner and start listing your buffets."}
          </p>
        </div>

        {/* Message */}
        {renderMessage()}

        {/* Status Card */}
        {renderStatusCard()}

        {/* Step Indicator */}
        <div className="card-ambient p-6 mb-6">
          {renderStepIndicator()}
          <div className="text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Step {activeStep} of 4
            </p>
          </div>
        </div>

        {/* Form */}
        {hotel?.status !== "approved" && (
          <form onSubmit={handleSubmit}>
            <div className="card-ambient p-6 mb-6">
              {renderCurrentStep()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                {activeStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn-outline flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Previous
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {activeStep < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary flex items-center gap-2"
                  >
                    Next Step
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-surface-cream border-t-transparent" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">send</span>
                        {hotel ? "Update Application" : "Submit Application"}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* Help Section */}
        <div className="mt-8 card-ambient p-6 bg-surface-container-low/50">
          <h3 className="font-headline-md text-headline-md text-text-deep-green mb-2">Need Help?</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            If you have any questions about the application process, please contact our support team.
          </p>
          <div className="flex gap-3 mt-3">
            <a href="mailto:support@dinefor.com" className="text-secondary hover:underline flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">mail</span>
              support@dinefor.com
            </a>
            <span className="text-border-subtle">|</span>
            <a href="#" className="text-secondary hover:underline flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">help</span>
              FAQ
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

export default HotelApply;