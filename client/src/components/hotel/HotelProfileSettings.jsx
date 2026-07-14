import { useEffect, useState } from "react";
import api from "../../services/api";

function HotelProfileSettings({ hotel, headers, onUpdated }) {
  const [form, setForm] = useState({
    hotelName: "",
    location: "",
    address: "",
    description: "",
    contactNumber: "",
    email: "",
    latitude: "",
    longitude: "",
    googleMapUrl: "",
  });

  useEffect(() => {
    if (hotel) {
      setForm({
        hotelName: hotel.hotelName || "",
        location: hotel.location || "",
        address: hotel.address || "",
        description: hotel.description || "",
        contactNumber: hotel.contactNumber || "",
        email: hotel.email || "",
        latitude: hotel.mapLocation?.latitude || "",
        longitude: hotel.mapLocation?.longitude || "",
        googleMapUrl: hotel.mapLocation?.googleMapUrl || "",
      });
    }
  }, [hotel]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const updateProfile = async (e) => {
    e.preventDefault();

    const payload = {
      hotelName: form.hotelName,
      location: form.location,
      address: form.address,
      description: form.description,
      contactNumber: form.contactNumber,
      email: form.email,
      mapLocation: {
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        googleMapUrl: form.googleMapUrl,
      },
    };

    const res = await api.put("/hotels/my-hotel", payload, { headers });
    onUpdated(res.data.hotel, res.data.message);
  };

  return (
    <section className="panel reveal-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Profile</span>
          <h2>Hotel Profile Settings</h2>
        </div>
        {form.googleMapUrl && (
          <a className="btn secondary" href={form.googleMapUrl} target="_blank" rel="noreferrer">
            Open Google Maps
          </a>
        )}
      </div>

      <form onSubmit={updateProfile} className="form-grid">
        <input name="hotelName" placeholder="Hotel Name" value={form.hotelName} onChange={handleChange} required />
        <input name="location" placeholder="City / Area" value={form.location} onChange={handleChange} required />
        <input name="contactNumber" placeholder="Contact Number" value={form.contactNumber} onChange={handleChange} />
        <input name="email" placeholder="Hotel Email" value={form.email} onChange={handleChange} />
        <input name="address" placeholder="Full Address" value={form.address} onChange={handleChange} className="span-2" />
        <textarea name="description" placeholder="Hotel Description" value={form.description} onChange={handleChange} className="span-2" />
        <input name="latitude" placeholder="Latitude e.g. 6.9271" value={form.latitude} onChange={handleChange} />
        <input name="longitude" placeholder="Longitude e.g. 79.8612" value={form.longitude} onChange={handleChange} />
        <input name="googleMapUrl" placeholder="Google Maps URL" value={form.googleMapUrl} onChange={handleChange} className="span-2" />
        <button className="btn primary">Save Hotel Profile</button>
      </form>
    </section>
  );
}

export default HotelProfileSettings;
