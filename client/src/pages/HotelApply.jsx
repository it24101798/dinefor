import { useEffect, useState } from "react";
import axios from "axios";
import MediaUploader from "../components/MediaUploader";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const mealOptions = ["Breakfast", "Lunch", "Dinner", "Brunch", "High Tea", "Seafood Night", "BBQ Night", "Special Events"];
const cuisineOptions = ["Sri Lankan", "Indian", "Chinese", "Italian", "Mexican", "Seafood", "Arabic", "International", "Vegetarian", "Halal"];

const provinceOptions = ["Western", "Central", "Southern", "Northern", "Eastern", "North Western", "North Central", "Uva", "Sabaragamuwa"];
const districtOptions = ["Colombo", "Gampaha", "Kalutara", "Kandy", "Galle", "Matara", "Hambantota", "Jaffna", "Batticaloa", "Trincomalee", "Kurunegala", "Anuradhapura", "Badulla", "Ratnapura"];
const cityOptions = ["Colombo", "Malabe", "Kotte", "Dehiwala", "Mount Lavinia", "Negombo", "Kandy", "Galle", "Matara", "Kurunegala", "Anuradhapura", "Jaffna", "Batticaloa", "Trincomalee"];

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

function HotelApply() {
  const { token, user } = useAuth();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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

  const fetchHotel = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/hotels/my-hotel", { headers });
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
    } catch {
      setHotel(null);
      setFormData((prev) => ({
        ...prev,
        email: user?.email || "",
        application: { ...prev.application, managerEmail: user?.email || "" },
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotel();
  }, []);

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

    try {
      const payload = buildPayload();
      const res = hotel
        ? await axios.put("http://localhost:5000/api/hotels/my-hotel", payload, { headers })
        : await axios.post("http://localhost:5000/api/hotels", payload, { headers });

      setMessage(res.data.message || "Hotel application saved.");
      fetchHotel();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save hotel application.");
    }
  };

  if (loading) {
    return <main className="dashboard-page"><section className="panel"><h2>Loading hotel application...</h2></section></main>;
  }

  return (
    <main className="dashboard-page hotel-application-page">
      <section className="page-hero compact reveal hotel-application-hero">
        <span className="eyebrow">DineFor Hotel Partner Application</span>
        <h1>Apply as Hotel / Restaurant Partner</h1>
        <p>Submit your hotel profile, buffet service details, contact persons, location, media, and partner terms for admin approval.</p>
        <div className="application-steps">
          <span>1. Business Info</span>
          <span>2. Dining Details</span>
          <span>3. Media & Location</span>
          <span>4. Admin Review</span>
        </div>
        {hotel?.status === "approved" && <Link to="/hotel" className="btn primary">Go to Hotel Dashboard</Link>}
      </section>

      {hotel && (
        <section className="panel status-panel application-status-card">
          <div>
            <span className="eyebrow">Current Application</span>
            <h2>{hotel.hotelName}</h2>
            <p>Status: <span className={`status ${hotel.status === "approved" ? "success" : hotel.status}`}>{hotel.status}</span></p>
            {hotel.application?.submittedAt && <p className="muted">Submitted: {new Date(hotel.application.submittedAt).toLocaleString()}</p>}
          </div>
          {hotel.status !== "approved" && <p className="muted">Admin must approve your application before buffet management opens.</p>}
        </section>
      )}

      {message && <p className={message.toLowerCase().includes("failed") || message.toLowerCase().includes("required") ? "error-text page-message" : "success-text page-message"}>{message}</p>}

      <form onSubmit={handleSubmit} className="application-form-stack">
        <section className="panel application-section">
          <div className="section-header"><span className="eyebrow">Step 1</span><h2>Business & Hotel Information</h2></div>
          <div className="form-grid">
            <input name="hotelName" placeholder="Public Hotel / Restaurant Name *" value={formData.hotelName} onChange={handleChange} required />
            <input name="location" placeholder="Main Location e.g. Colombo *" value={formData.location} onChange={handleChange} required />
            <select name="province" value={formData.province} onChange={handleChange}>
              <option value="">Select Province</option>
              {provinceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select name="district" value={formData.district} onChange={handleChange}>
              <option value="">Select District</option>
              {districtOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select name="city" value={formData.city} onChange={handleChange}>
              <option value="">Select City</option>
              {cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select name="country" value={formData.country} onChange={handleChange}>
              <option value="Sri Lanka">Sri Lanka</option>
              <option value="Other">Other</option>
            </select>
            <input name="legalBusinessName" placeholder="Legal Business Name" value={formData.application.legalBusinessName} onChange={handleApplicationChange} />
            <input name="businessRegistrationNumber" placeholder="Business Registration Number" value={formData.application.businessRegistrationNumber} onChange={handleApplicationChange} />
            <input name="taxNumber" placeholder="Tax/VAT Number if available" value={formData.application.taxNumber} onChange={handleApplicationChange} />
            <select name="hotelCategory" value={formData.application.hotelCategory} onChange={handleApplicationChange}>
              <option>Hotel</option><option>Restaurant</option><option>Resort</option><option>Café</option><option>Cloud Kitchen</option><option>Event Venue</option>
            </select>
            <select name="starRating" value={formData.application.starRating} onChange={handleApplicationChange}>
              <option value="">Star Rating / Level</option><option>5 Star</option><option>4 Star</option><option>3 Star</option><option>Boutique</option><option>Casual Dining</option><option>Not Applicable</option>
            </select>
            <textarea name="address" placeholder="Full Address" value={formData.address} onChange={handleChange} className="span-2" />
            <textarea name="description" placeholder="Short hotel/restaurant introduction for customers" value={formData.description} onChange={handleChange} className="span-2" />
          </div>
        </section>

        <section className="panel application-section">
          <div className="section-header"><span className="eyebrow">Step 2</span><h2>Dining & Buffet Service Details</h2></div>
          <div className="form-grid">
            <input name="buffetCapacity" type="number" min="0" placeholder="Approx. buffet seats / capacity" value={formData.application.buffetCapacity} onChange={handleApplicationChange} />
            <input name="averageBuffetPrice" type="number" min="0" placeholder="Average buffet price Rs." value={formData.application.averageBuffetPrice} onChange={handleApplicationChange} />
            <div className="span-2 application-option-block">
              <h3>Meal services you plan to list</h3>
              <div className="chip-select-grid">
                {mealOptions.map((item) => <button type="button" key={item} className={formData.application.mealServices.includes(item) ? "chip active" : "chip"} onClick={() => toggleMulti("mealServices", item)}>{item}</button>)}
              </div>
            </div>
            <div className="span-2 application-option-block">
              <h3>Cuisine / dining types</h3>
              <div className="chip-select-grid">
                {cuisineOptions.map((item) => <button type="button" key={item} className={formData.application.cuisineTypes.includes(item) ? "chip active" : "chip"} onClick={() => toggleMulti("cuisineTypes", item)}>{item}</button>)}
              </div>
            </div>
            <textarea name="refundPolicy" placeholder="Refund policy / payment terms" value={formData.application.refundPolicy} onChange={handleApplicationChange} className="span-2" />
            <textarea name="cancellationPolicy" placeholder="Cancellation and no-show policy" value={formData.application.cancellationPolicy} onChange={handleApplicationChange} className="span-2" />
          </div>
        </section>

        <section className="panel application-section">
          <div className="section-header"><span className="eyebrow">Step 3</span><h2>Contact Persons & Finance</h2></div>
          <div className="form-grid">
            <input name="contactNumber" placeholder="Main Public Contact Number" value={formData.contactNumber} onChange={handleChange} />
            <input name="email" placeholder="Public Hotel Email" value={formData.email} onChange={handleChange} />
            <input name="managerName" placeholder="Manager / Responsible Person Name *" value={formData.application.managerName} onChange={handleApplicationChange} required />
            <input name="managerPhone" placeholder="Manager Phone *" value={formData.application.managerPhone} onChange={handleApplicationChange} required />
            <input name="managerEmail" placeholder="Manager Email" value={formData.application.managerEmail} onChange={handleApplicationChange} />
            <input name="financeContactName" placeholder="Finance Contact Name" value={formData.application.financeContactName} onChange={handleApplicationChange} />
            <input name="financeContactPhone" placeholder="Finance Contact Phone" value={formData.application.financeContactPhone} onChange={handleApplicationChange} />
            <select name="bankName" value={formData.application.bankName} onChange={handleApplicationChange}>
              <option value="">Select Bank</option>
              <option>Bank of Ceylon</option><option>People's Bank</option><option>Commercial Bank</option><option>Hatton National Bank</option><option>Sampath Bank</option><option>Seylan Bank</option><option>Nations Trust Bank</option><option>DFCC Bank</option><option>Other</option>
            </select>
            <input name="bankBranch" placeholder="Bank Branch" value={formData.application.bankBranch} onChange={handleApplicationChange} />
            <input name="accountNumber" placeholder="Account Number" value={formData.application.accountNumber} onChange={handleApplicationChange} />
            <input name="accountHolderName" placeholder="Account Holder Name" value={formData.application.accountHolderName} onChange={handleApplicationChange} />
          </div>
        </section>

        <section className="panel application-section">
          <div className="section-header"><span className="eyebrow">Step 4</span><h2>Branding, Documents & Map</h2></div>
          <div className="form-grid">
            <div className="span-2 application-upload-card">
              <h3>Upload Logo</h3>
              <MediaUploader onUpload={(data) => setFormData((prev) => ({ ...prev, logo: data.fileUrl }))} />
              {formData.logo && <img src={formData.logo} alt="logo" className="logo-preview" />}
            </div>

            <div className="span-2 application-upload-card">
              <h3>Upload Cover Image / Video</h3>
              <MediaUploader onUpload={(data) => setFormData((prev) => ({ ...prev, coverMediaUrl: data.fileUrl, coverMediaType: data.mediaType }))} />
            </div>

            <div className="span-2 application-upload-card">
              <h3>Upload verification documents</h3>
              <p className="muted">For MVP this stores uploaded file links. You can later rename them as BR, tax, menu, certificate, etc.</p>
              <MediaUploader onUpload={addDocument} />
              {!!formData.application.documents.length && <div className="uploaded-doc-list">{formData.application.documents.map((doc) => <span key={doc}><a href={doc} target="_blank" rel="noreferrer">Document</a><button type="button" onClick={() => removeDocument(doc)}>×</button></span>)}</div>}
            </div>

            <input name="googleMapUrl" placeholder="Google Maps URL" value={formData.googleMapUrl} onChange={handleChange} className="span-2" />
            <input name="latitude" placeholder="Latitude e.g. 6.9271" value={formData.latitude} onChange={handleChange} />
            <input name="longitude" placeholder="Longitude e.g. 79.8612" value={formData.longitude} onChange={handleChange} />
            <textarea name="applicantNote" placeholder="Anything admin should know before approving this hotel" value={formData.application.applicantNote} onChange={handleApplicationChange} className="span-2" />
          </div>
        </section>

        <section className="panel application-section application-submit-panel">
          <label className="terms-check">
            <input type="checkbox" name="termsAccepted" checked={formData.application.termsAccepted} onChange={handleApplicationChange} />
            <span>I confirm these details are correct and agree to follow DineFor hotel partner rules, reservation handling, customer check-in, cancellation, and review standards.</span>
          </label>
          <div className="action-row wrap">
            <button className="btn primary" type="submit">{hotel ? "Update Application" : "Submit Hotel Application"}</button>
            {hotel?.status === "approved" && <Link to="/hotel" className="btn secondary">Open Hotel Portal</Link>}
          </div>
        </section>
      </form>
    </main>
  );
}

export default HotelApply;
