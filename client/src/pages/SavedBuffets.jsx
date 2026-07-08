import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import FeedCard from "../components/FeedCard";
import { useAuth } from "../context/AuthContext";
import SkeletonCard from "../components/shared/SkeletonCard";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// ============================================
// MAIN COMPONENT
// ============================================
function SavedBuffets() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // ============================================
  // STATE
  // ============================================
  const [buffets, setBuffets] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [activeTab, setActiveTab] = useState("buffets");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removing, setRemoving] = useState(false);

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchSaved = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const [buffetRes, hotelRes] = await Promise.all([
        api.get("/users/saved-buffets", { headers: { Authorization: `Bearer ${token}` } }),
        api.get("/customer/saved-hotels", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setBuffets(buffetRes.data || []);
      setHotels(hotelRes.data || []);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to load saved items.";
      setMessage(errorMsg);
      setMessageType("error");
      
      if (error.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  // ============================================
  // COMPUTED DATA
  // ============================================
  const filteredBuffets = useMemo(() => {
    let result = [...buffets];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((b) =>
        [b.title, b.hotel?.hotelName, b.category, b.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        break;
      case "price-high":
        result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        break;
      case "price-low":
        result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        break;
      case "rating":
        result.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
        break;
      default:
        break;
    }
    return result;
  }, [buffets, searchQuery, sortBy]);

  const filteredHotels = useMemo(() => {
    let result = [...hotels];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((h) =>
        [h.hotelName, h.city, h.location, h.address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return result;
  }, [hotels, searchQuery]);

  // ============================================
  // HANDLERS
  // ============================================
  const removeSavedBuffet = async () => {
    if (!selectedItem) return;

    setRemoving(true);
    try {
      await api.delete(`/users/saved-buffets/${selectedItem._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("Removed from saved buffets.");
      setMessageType("success");
      setShowRemoveModal(false);
      setSelectedItem(null);
      await fetchSaved();
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to remove item.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setRemoving(false);
    }
  };

  const removeSavedHotel = async () => {
    if (!selectedItem) return;

    setRemoving(true);
    try {
      await api.delete(`/customer/saved-hotels/${selectedItem._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("Removed from favourite hotels.");
      setMessageType("success");
      setShowRemoveModal(false);
      setSelectedItem(null);
      await fetchSaved();
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to remove item.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setRemoving(false);
    }
  };

  const handleRemove = (item, type) => {
    setSelectedItem({ ...item, type });
    setShowRemoveModal(true);
  };

  const confirmRemove = () => {
    if (selectedItem?.type === "buffet") {
      removeSavedBuffet();
    } else if (selectedItem?.type === "hotel") {
      removeSavedHotel();
    }
  };

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

  const renderEmpty = (title, text, icon = "bookmark_border", action = null) => (
    <div className="text-center py-16">
      <span className="material-symbols-outlined text-5xl text-outline mb-3 block">{icon}</span>
      <h3 className="font-headline-md text-headline-md text-text-deep-green">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
      {action && (
        <Link to={action.to} className="btn-primary inline-flex items-center gap-2 mt-4">
          {action.label}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      )}
    </div>
  );

  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  const renderRemoveModal = () => {
    if (!showRemoveModal || !selectedItem) return null;

    const name = selectedItem.title || selectedItem.hotelName || selectedItem.name || "this item";

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRemoveModal(false)}>
        <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-headline-md text-headline-md text-text-deep-green mb-2">Remove from Saved</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            Are you sure you want to remove <strong>"{name}"</strong> from your saved items?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowRemoveModal(false)} className="btn-outline flex-1">Cancel</button>
            <button
              onClick={confirmRemove}
              disabled={removing}
              className="bg-error text-white px-4 py-2 rounded-full hover:bg-error/80 flex-1"
            >
              {removing ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (!token) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">lock</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Please Login</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              You need to be logged in to view your saved items.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2 mt-6">
              Login
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
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Saved Items</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Your wishlist of buffets and favourite hotels
          </p>
        </div>

        {renderMessage()}
        {renderRemoveModal()}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card-ambient p-4 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Saved Buffets</p>
            <p className="font-headline-lg text-headline-lg text-text-deep-green">{buffets.length}</p>
          </div>
          <div className="card-ambient p-4 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Favourite Hotels</p>
            <p className="font-headline-lg text-headline-lg text-text-deep-green">{hotels.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveTab("buffets")}
            className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all ${
              activeTab === "buffets"
                ? "bg-secondary text-surface-cream"
                : "border border-border-subtle hover:border-secondary"
            }`}
          >
            Saved Buffets ({buffets.length})
          </button>
          <button
            onClick={() => setActiveTab("hotels")}
            className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all ${
              activeTab === "hotels"
                ? "bg-secondary text-surface-cream"
                : "border border-border-subtle hover:border-secondary"
            }`}
          >
            Favourite Hotels ({hotels.length})
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === "buffets" ? "buffets" : "hotels"}...`}
              className="form-input w-full"
            />
          </div>
          {activeTab === "buffets" && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select w-auto"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-high">Price: High to Low</option>
              <option value="price-low">Price: Low to High</option>
              <option value="rating">Highest Rating</option>
            </select>
          )}
        </div>

        {/* Content */}
        {loading ? (
          renderLoadingSkeleton()
        ) : activeTab === "buffets" ? (
          filteredBuffets.length === 0 ? (
            renderEmpty(
              "No Saved Buffets",
              searchQuery ? "No buffets match your search." : "Start saving buffets you're interested in!",
              "bookmark_border",
              { to: "/feed", label: "Browse Buffets" }
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBuffets.map((buffet) => (
                <div key={buffet._id} className="relative group">
                  <FeedCard buffet={buffet} />
                  <button
                    onClick={() => handleRemove(buffet, "buffet")}
                    className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-surface-cream/90 backdrop-blur-sm flex items-center justify-center text-error opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/10"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredHotels.length === 0 ? (
            renderEmpty(
              "No Favourite Hotels",
              searchQuery ? "No hotels match your search." : "Hotels you favourite will appear here.",
              "hotel",
              { to: "/feed", label: "Explore Hotels" }
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHotels.map((hotel) => (
                <div key={hotel._id} className="card-ambient-hover overflow-hidden group relative">
                  <Link to={`/hotels/${hotel._id}`}>
                    <img
                      src={hotel.logo || hotel.coverMediaUrl || hotel.galleryImages?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop"}
                      alt={hotel.hotelName}
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-label-md text-label-md text-text-deep-green">{hotel.hotelName}</h3>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">{hotel.city || hotel.location}</p>
                      {hotel.averageRating > 0 && (
                        <p className="font-label-sm text-label-sm text-highlight-gold mt-1">
                          ⭐ {hotel.averageRating.toFixed(1)}
                        </p>
                      )}
                      {hotel.totalReviews > 0 && (
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          {hotel.totalReviews} reviews
                        </p>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleRemove(hotel, "hotel")}
                    className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-surface-cream/90 backdrop-blur-sm flex items-center justify-center text-error opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/10"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}

export default SavedBuffets;