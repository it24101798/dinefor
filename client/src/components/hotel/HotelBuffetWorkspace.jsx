import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

function HotelBuffetWorkspace({ headers, setMessage, onCreate }) {
  const [buffets, setBuffets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", status: "all", category: "all" });

  const loadBuffets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => value && value !== "all" && params.append(key, value));
      const res = await axios.get(`${API}/hotel-portal/buffets?${params.toString()}`, { headers });
      setBuffets(res.data || []);
    } catch (error) {
      setMessage?.(error.response?.data?.message || "Failed to load buffets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBuffets(); }, [filters.q, filters.status, filters.category]);

  const setActive = async (buffet, isActive) => {
    try {
      await axios.put(`${API}/hotel-portal/buffets/${buffet._id}/status`, { isActive }, { headers });
      setMessage?.(isActive ? "Buffet resumed successfully ✅" : "Buffet paused successfully ✅");
      loadBuffets();
    } catch (error) {
      setMessage?.(error.response?.data?.message || "Failed to update buffet.");
    }
  };

  const duplicateBuffet = async (buffet) => {
    try {
      await axios.post(`${API}/hotel-portal/buffets/${buffet._id}/duplicate`, {}, { headers });
      setMessage?.("Buffet duplicated as a paused draft ✅");
      loadBuffets();
    } catch (error) {
      setMessage?.(error.response?.data?.message || "Failed to duplicate buffet.");
    }
  };

  const deleteBuffet = async (buffet) => {
    if (!window.confirm(`Delete ${buffet.title}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/buffets/${buffet._id}`, { headers });
      setMessage?.("Buffet deleted successfully ✅");
      loadBuffets();
    } catch (error) {
      setMessage?.(error.response?.data?.message || "Failed to delete buffet.");
    }
  };

  return (
    <section className="hotel-panel">
      <div className="hotel-panel-head">
        <div><span className="eyebrow">Buffet Manager</span><h2>Manage your buffet inventory</h2><p>Pause, resume, duplicate, and maintain buffet offers from one workspace.</p></div>
        <button className="mini-btn primary" onClick={onCreate}>Create Buffet</button>
      </div>

      <div className="hotel-filter-bar">
        <input placeholder="Search buffet" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="all">All status</option><option value="active">Active</option><option value="paused">Paused</option>
        </select>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="all">All categories</option><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="high-tea">High Tea</option><option value="seafood">Seafood</option><option value="bbq">BBQ</option><option value="brunch">Brunch</option><option value="other">Other</option>
        </select>
      </div>

      {loading ? <p className="muted">Loading buffets...</p> : buffets.length === 0 ? <p className="empty-state">No buffets found. Create your first buffet offer.</p> : (
        <div className="hotel-buffet-grid">
          {buffets.map((buffet) => (
            <article className="hotel-buffet-card" key={buffet._id}>
              <div className="buffet-thumb">
                {buffet.images?.[0] ? <img src={buffet.images[0].startsWith("http") ? buffet.images[0] : `http://localhost:5000${buffet.images[0]}`} alt={buffet.title} /> : <span>No image</span>}
              </div>
              <div className="buffet-card-body">
                <div className="hotel-panel-head compact">
                  <div><strong>{buffet.title}</strong><span>{buffet.category} · {buffet.buffetType}</span></div>
                  <small className={buffet.isActive ? "status-pill success" : "status-pill warning"}>{buffet.isActive ? "Active" : "Paused"}</small>
                </div>
                <p>{buffet.description || "No description added yet."}</p>
                <div className="buffet-meta"><span>Rs. {Number(buffet.price || 0).toLocaleString()}</span><span>{buffet.timeSlots?.length || 0} slot(s)</span><span>⭐ {buffet.averageRating || 0}</span></div>
                <div className="buffet-actions">
                  {buffet.isActive ? <button onClick={() => setActive(buffet, false)}>Pause</button> : <button onClick={() => setActive(buffet, true)}>Resume</button>}
                  <button onClick={() => duplicateBuffet(buffet)}>Duplicate</button>
                  <button onClick={() => window.location.href = `/buffets/${buffet._id}`}>View</button>
                  <button className="danger" onClick={() => deleteBuffet(buffet)}>Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default HotelBuffetWorkspace;
