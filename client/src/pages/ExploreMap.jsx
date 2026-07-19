import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import MapView from "../components/map/MapView";


const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

// ============================================
// MAIN COMPONENT
// ============================================
function ExploreMap() {
  // ============================================
  // STATE
  // ============================================
  const [hotels, setHotels] = useState([]);
  const [buffets, setBuffets] = useState([]);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [viewMode, setViewMode] = useState("map");
  const [filterType, setFilterType] = useState("all");
  const [mapCenter, setMapCenter] = useState(null);

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchData = useCallback(async (searchQuery = query, searchCity = city) => {
    try {
      setLoading(true);
      setError("");
      const [hotelRes, buffetRes] = await Promise.all([
        api.get(`/hotels/map`, {
          params: { q: searchQuery, city: searchCity },
          timeout: 10000,
        }),
        api.get(`/buffets`, { timeout: 10000 }),
      ]);

      const hotelData = hotelRes.data || [];
      const buffetData = buffetRes.data || [];
      
      setHotels(hotelData);
      setBuffets(buffetData);

      // Set map center to first hotel if available
      if (hotelData.length > 0 && hotelData[0]?.mapLocation) {
        setMapCenter({
          lat: hotelData[0].mapLocation.latitude || 6.9271,
          lng: hotelData[0].mapLocation.longitude || 79.8612,
        });
      }
    } catch (err) {
      setError(err.message || "Failed to load map data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // COMPUTED DATA
  // ============================================
  const visibleBuffets = useMemo(() => {
    const hotelIds = hotels.map((hotel) => hotel._id);
    return buffets.filter((buffet) => hotelIds.includes(buffet.hotel?._id));
  }, [hotels, buffets]);

  const filteredHotels = useMemo(() => {
    let result = hotels;

    if (filterType === "buffet") {
      const buffetHotelIds = new Set(visibleBuffets.map((b) => b.hotel?._id));
      result = result.filter((h) => buffetHotelIds.has(h._id));
    }

    // Search filter
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter((h) =>
        [h.hotelName, h.city, h.location, h.address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (city.trim()) {
      const c = city.toLowerCase().trim();
      result = result.filter((h) =>
        [h.city, h.location, h.address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(c)
      );
    }

    return result;
  }, [hotels, visibleBuffets, filterType, query, city]);

  const hotelStats = useMemo(() => {
    const total = hotels.length;
    const withBuffets = filteredHotels.filter((h) =>
      visibleBuffets.some((b) => b.hotel?._id === h._id)
    ).length;
    const avgRating = hotels.length > 0
      ? hotels.reduce((sum, h) => sum + Number(h.averageRating || 0), 0) / hotels.length
      : 0;

    return { total, withBuffets, avgRating };
  }, [hotels, filteredHotels, visibleBuffets]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleSearch = (e) => {
    e.preventDefault();
    fetchData(query, city);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      fetchData(query, city);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setCity("");
    fetchData("", "");
  };

  const selectHotel = (hotel) => {
    setSelectedHotel(hotel);
    // Update map center
    if (hotel?.mapLocation) {
      setMapCenter({
        lat: hotel.mapLocation.latitude || 6.9271,
        lng: hotel.mapLocation.longitude || 79.8612,
      });
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderMessage = () => {
    if (!error) return null;

    return (
      <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error mb-6">
        <p className="font-body-md text-body-md flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {error}
        </p>
        <button
          onClick={() => setError("")}
          className="float-right text-inherit opacity-70 hover:opacity-100"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    );
  };

  const renderLoading = () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-pulse">
          <span className="material-symbols-outlined text-5xl text-secondary mb-3 block">sync</span>
          <p className="font-headline-md text-headline-md text-text-deep-green">Loading map data...</p>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">Please wait while we find hotels near you.</p>
      </div>
    </div>
  );

  const renderEmpty = () => (
    <div className="text-center py-12">
      <span className="material-symbols-outlined text-5xl text-outline mb-3 block">search_off</span>
      <h3 className="font-headline-md text-headline-md text-text-deep-green">No Results Found</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Try adjusting your search or clear the filters.
      </p>
      <button onClick={clearSearch} className="btn-secondary inline-flex items-center gap-2 mt-4">
        <span className="material-symbols-outlined text-[18px]">refresh</span>
        Clear Search
      </button>
    </div>
  );

  const renderSearchBar = () => (
    <div className="card-ambient p-4 mb-6">
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Search</label>
          <input
            placeholder="Search hotel, city, area..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="form-input w-full"
          />
        </div>
        <div className="flex-1">
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">City</label>
          <input
            placeholder="City e.g. Colombo"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyPress={handleKeyPress}
            className="form-input w-full"
          />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary flex items-center gap-2 h-[48px]">
            <span className="material-symbols-outlined text-[18px]">search</span>
            Search
          </button>
          {(query || city) && (
            <button
              type="button"
              onClick={clearSearch}
              className="btn-outline h-[48px] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">clear</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="p-3 rounded-xl bg-surface-container-low text-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Hotels Found</p>
        <p className="font-headline-md text-headline-md text-text-deep-green">{hotelStats.total}</p>
      </div>
      <div className="p-3 rounded-xl bg-secondary-container/10 text-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant">With Buffets</p>
        <p className="font-headline-md text-headline-md text-secondary">{hotelStats.withBuffets}</p>
      </div>
      <div className="p-3 rounded-xl bg-highlight-gold/10 text-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Avg Rating</p>
        <p className="font-headline-md text-headline-md text-highlight-gold">⭐ {hotelStats.avgRating.toFixed(1)}</p>
      </div>
      <div className="p-3 rounded-xl bg-primary-container/10 text-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Total Buffets</p>
        <p className="font-headline-md text-headline-md text-primary">{visibleBuffets.length}</p>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => setFilterType("all")}
        className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all ${
          filterType === "all"
            ? "bg-secondary text-surface-cream"
            : "border border-border-subtle hover:border-secondary"
        }`}
      >
        All Hotels
      </button>
      <button
        onClick={() => setFilterType("buffet")}
        className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all ${
          filterType === "buffet"
            ? "bg-secondary text-surface-cream"
            : "border border-border-subtle hover:border-secondary"
        }`}
      >
        With Buffets ({hotelStats.withBuffets})
      </button>
      <button
        onClick={() => setViewMode("map")}
        className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all ${
          viewMode === "map"
            ? "bg-secondary text-surface-cream"
            : "border border-border-subtle hover:border-secondary"
        }`}
      >
        Map View
      </button>
      <button
        onClick={() => setViewMode("list")}
        className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all ${
          viewMode === "list"
            ? "bg-secondary text-surface-cream"
            : "border border-border-subtle hover:border-secondary"
        }`}
      >
        List View
      </button>
    </div>
  );

  const renderHotelList = () => (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
      {filteredHotels.map((hotel) => {
        const hotelBuffets = visibleBuffets.filter((b) => b.hotel?._id === hotel._id);
        const isSelected = selectedHotel?._id === hotel._id;

        return (
          <div
            key={hotel._id}
            id={isSelected ? "hotel-details" : ""}
            className={`card-ambient p-4 transition-all cursor-pointer ${
              isSelected ? "border-secondary ring-1 ring-secondary" : "hover:border-secondary"
            }`}
            onClick={() => selectHotel(hotel)}
          >
            <div className="flex gap-4">
              <img
                src={hotel.logo || hotel.coverImage || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=80&h=80&fit=crop"}
                alt={hotel.hotelName}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-label-md text-label-md text-text-deep-green">{hotel.hotelName}</h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {hotel.city || hotel.location || "Location not specified"}
                    </p>
                    {hotel.averageRating > 0 && (
                      <p className="font-label-sm text-label-sm text-highlight-gold">
                        ⭐ {hotel.averageRating.toFixed(1)}
                      </p>
                    )}
                  </div>
                  {hotelBuffets.length > 0 && (
                    <span className="badge-mint">{hotelBuffets.length} buffets</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {hotelBuffets.slice(0, 2).map((buffet) => (
                    <Link
                      key={buffet._id}
                      to={`/buffets/${buffet._id}`}
                      className="text-xs px-2 py-1 rounded-full bg-surface-container-high hover:bg-secondary-container/20 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {buffet.title} • {formatCurrency(buffet.price)}
                    </Link>
                  ))}
                  {hotelBuffets.length > 2 && (
                    <span className="text-xs text-on-surface-variant">
                      +{hotelBuffets.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {filteredHotels.length === 0 && renderEmpty()}
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <main className="min-h-screen bg-surface-cream text-on-surface font-body-md antialiased pt-20">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-headline-lg text-headline-lg text-text-deep-green">
            Explore Buffets by Location
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Find hotels and buffets near you
          </p>
        </div>

        {renderMessage()}
        {renderSearchBar()}
        {renderStats()}
        {renderFilters()}

        {/* Map + List Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl overflow-hidden border border-border-subtle shadow-ambient h-[500px] lg:h-[600px] bg-surface-container-low">
              {loading ? (
                renderLoading()
              ) : (
                <MapView 
                  hotels={filteredHotels} 
                  selectedHotel={selectedHotel}
                />
              )}
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-1">
            {viewMode === "map" ? (
              <div className="card-ambient p-4 h-[500px] lg:h-[600px] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-headline-md text-headline-md text-text-deep-green">
                    Hotels ({filteredHotels.length})
                  </h3>
                  <button
                    onClick={() => setViewMode("list")}
                    className="text-secondary font-label-sm text-label-sm hover:underline"
                  >
                    List View
                  </button>
                </div>
                {renderHotelList()}
              </div>
            ) : (
              <div className="h-[500px] lg:h-[600px] overflow-y-auto">
                {renderHotelList()}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default ExploreMap;