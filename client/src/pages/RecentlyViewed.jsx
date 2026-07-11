import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import SkeletonCard from "../components/shared/SkeletonCard";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

const fallbackImage = "https://images.unsplash.com/photo-1555244162-803834f70033";

const resolveMedia = (value) => {
  if (!value) return fallbackImage;
  if (value.startsWith("http") || value.startsWith("data:")) return value;
  if (value.startsWith("/uploads")) return `${API_ORIGIN}${value}`;
  if (value.startsWith("uploads")) return `${API_ORIGIN}/${value}`;
  return value;
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  });
};

const formatTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
};

// ============================================
// MAIN COMPONENT
// ============================================
function RecentlyViewed() {
  // ============================================
  // STATE
  // ============================================
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [clearLoading, setClearLoading] = useState(false);

  const storedToken = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("dineforUser") || "null")?.token || "";
    } catch {
      return "";
    }
  }, []);

  // ============================================
  // FETCH DATA
  // ============================================
  const loadItems = useCallback(async () => {
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const res = await api.get("/discovery/recently-viewed");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Recently viewed items could not be loaded.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, [storedToken]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ============================================
  // COMPUTED DATA
  // ============================================
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (filterType !== "all") {
      result = result.filter((item) => item.itemType === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) =>
        [item.item?.hotelName, item.item?.title, item.item?.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    // Sort by viewed date (newest first)
    result.sort((a, b) => new Date(b.viewedAt || 0) - new Date(a.viewedAt || 0));

    return result;
  }, [items, filterType, searchQuery]);

  const stats = useMemo(() => {
    const total = items.length;
    const buffets = items.filter((i) => i.itemType === "buffet").length;
    const hotels = items.filter((i) => i.itemType === "hotel").length;
    const today = items.filter((i) => {
      const viewedDate = new Date(i.viewedAt);
      const todayDate = new Date();
      return viewedDate.toDateString() === todayDate.toDateString();
    }).length;

    return { total, buffets, hotels, today };
  }, [items]);

  // ============================================
  // HANDLERS
  // ============================================
  const clearHistory = async () => {
    if (!window.confirm("Clear all recently viewed items?")) return;

    setClearLoading(true);
    try {
      await api.delete("/discovery/recently-viewed", {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setItems([]);
      setMessage("✅ Recently viewed history cleared.");
      setMessageType("success");
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to clear history.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setClearLoading(false);
    }
  };

  const removeItem = async (entry) => {
    const targetId = entry?._id || entry?.item?._id || entry?.item;
    if (!targetId) return;

    try {
      await api.delete(`/discovery/recently-viewed/${targetId}`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setItems((prev) => prev.filter((item) => {
        const currentId = item?._id || item?.item?._id || item?.item;
        return String(currentId) !== String(targetId);
      }));
      setMessage("Item removed from history.");
      setMessageType("success");
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to remove item.";
      setMessage(errorMsg);
      setMessageType("error");
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

  const renderEmpty = () => (
    <div className="text-center py-16">
      <span className="material-symbols-outlined text-6xl text-outline mb-4">history</span>
      <h3 className="font-headline-md text-headline-md text-text-deep-green">No Recently Viewed Items</h3>
      <p className="font-body-md text-body-md text-on-surface-variant mt-2">
        Start exploring buffets and hotels and they'll appear here.
      </p>
      <Link to="/feed" className="btn-primary inline-flex items-center gap-2 mt-6">
        Start Exploring
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Link>
    </div>
  );

  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  const renderItemCard = (item) => {
    const isBuffet = item.itemType === "buffet";
    const imageUrl = isBuffet
      ? resolveMedia(item.item?.thumbnail || item.item?.images?.[0])
      : resolveMedia(item.item?.coverImage || item.item?.coverMediaUrl);
    const title = isBuffet ? item.item?.title : item.item?.hotelName;
    const subtitle = isBuffet ? item.item?.hotel?.hotelName : item.item?.city || item.item?.location;
    const price = isBuffet ? item.item?.price : null;
    const rating = isBuffet ? item.item?.averageRating : item.item?.averageRating;
    const link = isBuffet ? `/buffets/${item.item?._id}` : `/hotels/${item.item?._id}`;

    return (
      <div className="card-ambient-hover overflow-hidden group">
        <Link to={link}>
          <div className="relative h-48 overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-3 left-3">
              <span className="badge-gold text-xs">
                {isBuffet ? "🍽️ Buffet" : "🏨 Hotel"}
              </span>
            </div>
            <div className="absolute bottom-3 right-3 bg-surface-cream/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-on-surface-variant">
              {formatDate(item.viewedAt)}
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-label-md text-label-md text-text-deep-green truncate">{title}</h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{subtitle || "View details"}</p>
            {price && (
              <p className="font-headline-md text-headline-md text-highlight-gold mt-1">
                Rs. {Number(price || 0).toLocaleString()}
              </p>
            )}
            {rating > 0 && (
              <p className="font-label-sm text-label-sm text-highlight-gold">
                ⭐ {rating.toFixed(1)}
              </p>
            )}
          </div>
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            removeItem(item);
          }}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-surface-cream/90 backdrop-blur-sm flex items-center justify-center text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/10 hover:text-error"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (!storedToken) {
    return (
      <main className="min-h-screen bg-surface-cream pt-20">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">lock</span>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Please Login</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              You need to be logged in to view your history.
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Recently Viewed</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Continue browsing buffets and hotels you've explored
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearHistory}
              disabled={clearLoading}
              className="btn-outline flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">clear_all</span>
              {clearLoading ? "Clearing..." : "Clear History"}
            </button>
          )}
        </div>

        {renderMessage()}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-surface-container-low text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Total Views</p>
            <p className="font-headline-md text-headline-md text-text-deep-green">{stats.total}</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary-container/10 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Today</p>
            <p className="font-headline-md text-headline-md text-secondary">{stats.today}</p>
          </div>
          <div className="p-3 rounded-xl bg-highlight-gold/10 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Buffets</p>
            <p className="font-headline-md text-headline-md text-highlight-gold">{stats.buffets}</p>
          </div>
          <div className="p-3 rounded-xl bg-primary-container/10 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Hotels</p>
            <p className="font-headline-md text-headline-md text-primary">{stats.hotels}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all ${
              filterType === "all"
                ? "bg-secondary text-surface-cream"
                : "border border-border-subtle hover:border-secondary"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilterType("buffet")}
            className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all ${
              filterType === "buffet"
                ? "bg-secondary text-surface-cream"
                : "border border-border-subtle hover:border-secondary"
            }`}
          >
            Buffets ({stats.buffets})
          </button>
          <button
            onClick={() => setFilterType("hotel")}
            className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all ${
              filterType === "hotel"
                ? "bg-secondary text-surface-cream"
                : "border border-border-subtle hover:border-secondary"
            }`}
          >
            Hotels ({stats.hotels})
          </button>
          <div className="flex-1 min-w-[150px]">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="form-input w-full"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          renderLoadingSkeleton()
        ) : filteredItems.length === 0 ? (
          renderEmpty()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => renderItemCard(item))}
          </div>
        )}
      </div>
    </main>
  );
}

export default RecentlyViewed;