import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/map/MapView";
import ReviewList from "../components/reviews/ReviewList";
import HotelHero from "../components/hotelExperience/HotelHero";
import HotelGallery from "../components/hotelExperience/HotelGallery";
import HotelAmenities from "../components/hotelExperience/HotelAmenities";
import HotelReviewSummary from "../components/hotelExperience/HotelReviewSummary";
import HotelBuffetGrid from "../components/hotelExperience/HotelBuffetGrid";
import SimilarHotels from "../components/hotelExperience/SimilarHotels";
import SkeletonCard from "../components/shared/SkeletonCard";

function HotelProfile() {
  const { id } = useParams();
  const { token, isLoggedIn } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchHotelExperience = async () => {
      try {
        setLoading(true);
        setMessage("");
        const res = await api.get(`/hotel-experience/${id}/experience`);
        setData(res.data);

        if (isLoggedIn && token) {
          api.post(
            "/customer/recently-viewed",
            { itemType: "hotel", itemId: id },
            { headers: { Authorization: `Bearer ${token}` } }
          ).catch(() => null);
        }
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load hotel profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchHotelExperience();
  }, [id, isLoggedIn, token]);

  if (loading) {
    return (
      <main className="df-hotel-profile-page">
        <SkeletonCard type="hotel" />
        <SkeletonCard />
      </main>
    );
  }

  if (message || !data?.hotel) {
    return (
      <main className="df-hotel-profile-page">
        <section className="df-empty-state">
          <h2>Hotel profile unavailable</h2>
          <p>{message || "Hotel not found."}</p>
        </section>
      </main>
    );
  }

  const { hotel, gallery, buffets, reviews, reviewSummary, similarHotels } = data;

  return (
    <main className="df-hotel-profile-page">
      <HotelHero hotel={hotel} reviewSummary={reviewSummary} />

      <section className="df-hotel-summary-strip">
        <div><span>Location</span><strong>{hotel.city || hotel.location || "Sri Lanka"}</strong></div>
        <div><span>Buffets</span><strong>{buffets?.length || 0}</strong></div>
        <div><span>Reviews</span><strong>{reviewSummary?.total || 0}</strong></div>
        <div><span>Contact</span><strong>{hotel.contactNumber || "Not provided"}</strong></div>
      </section>

      <section className="df-hotel-section df-about-grid">
        <div>
          <div className="df-section-head">
            <span className="eyebrow">About</span>
            <h2>{hotel.hotelName}</h2>
          </div>
          <p className="df-large-copy">
            {hotel.description || "This hotel is preparing its public DineFor profile. Guests can still browse active buffet experiences and make reservations."}
          </p>
        </div>
        <div className="df-contact-card">
          <h3>Contact & directions</h3>
          <p>📍 {hotel.address || hotel.location || hotel.city}</p>
          {hotel.contactNumber && <a href={`tel:${hotel.contactNumber}`}>☎ {hotel.contactNumber}</a>}
          {hotel.email && <a href={`mailto:${hotel.email}`}>✉ {hotel.email}</a>}
          {hotel.mapLocation?.googleMapUrl && <a href={hotel.mapLocation.googleMapUrl} target="_blank" rel="noreferrer">🧭 Open directions</a>}
        </div>
      </section>

      <HotelGallery gallery={gallery || []} />
      <HotelAmenities amenities={hotel.amenities} facilities={hotel.facilities} diningHighlights={hotel.diningHighlights} />
      <HotelBuffetGrid buffets={buffets || []} />

      {hotel.mapLocation?.latitude && hotel.mapLocation?.longitude ? (
        <section className="df-hotel-section">
          <div className="df-section-head">
            <span className="eyebrow">Location</span>
            <h2>Find this hotel</h2>
          </div>
          <div className="df-map-card"><MapView hotels={[hotel]} /></div>
        </section>
      ) : null}

      <HotelReviewSummary summary={reviewSummary} reviews={reviews || []} />

      <section className="df-hotel-section">
        <div className="df-section-head">
          <span className="eyebrow">Guest photos & feedback</span>
          <h2>Customer reviews</h2>
        </div>
        <ReviewList reviews={reviews || []} />
      </section>

      <SimilarHotels hotels={similarHotels || []} />
    </main>
  );
}

export default HotelProfile;
