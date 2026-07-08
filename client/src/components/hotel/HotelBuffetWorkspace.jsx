import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

const emptyEditForm = {
  title: "",
  category: "",
  buffetType: "regular",
  description: "",
  price: "",
  availableSeats: "",
  scheduleType: "all_days",
  availableFromDate: "",
  availableToDate: "",
  specialDate: "",
};

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

function HotelBuffetWorkspace({ headers, setMessage, onCreate }) {
  const [buffets, setBuffets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", status: "all", category: "all" });
  const [editingBuffet, setEditingBuffet] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);

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

  const categoryOptions = useMemo(() => ["breakfast", "lunch", "dinner", "high-tea", "seafood", "bbq", "brunch", "other"], []);

  const startEdit = (buffet) => {
    setEditingBuffet(buffet);
    setEditForm({
      title: buffet.title || "",
      category: buffet.category || "",
      buffetType: buffet.buffetType || "regular",
      description: buffet.description || "",
      price: buffet.price ?? "",
      availableSeats: buffet.availableSeats ?? "",
      scheduleType: buffet.scheduleType || "all_days",
      availableFromDate: toDateInput(buffet.availableFromDate),
      availableToDate: toDateInput(buffet.availableToDate),
      specialDate: toDateInput(buffet.specialDate),
    });
  };

  const closeEdit = () => {
    setEditingBuffet(null);
    setEditForm(emptyEditForm);
    setSavingEdit(false);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingBuffet?._id) return;
    try {
      setSavingEdit(true);
      const payload = {
        ...editForm,
        price: Number(editForm.price || 0),
        availableSeats: Number(editForm.availableSeats || 0),
      };
      const res = await axios.put(`${API}/hotel-portal/buffets/${editingBuffet._id}`, payload, { headers });
      setMessage?.(res.data?.message || "Buffet details updated successfully ✅");
      closeEdit();
      loadBuffets();
    } catch (error) {
      setMessage?.(error.response?.data?.message || "Failed to save buffet changes.");
      setSavingEdit(false);
    }
  };

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
        <div><span className="eyebrow">Buffet Manager</span><h2>Manage your buffet inventory</h2><p>Pause, resume, edit, duplicate, and maintain buffet offers from one workspace.</p></div>
        <button className="mini-btn primary" onClick={onCreate}>Create Buffet</button>
      </div>

      <div className="hotel-filter-bar qa-filter-bar">
        <input placeholder="Search buffet" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="all">All status</option><option value="active">Active</option><option value="paused">Paused</option>
        </select>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="all">All categories</option>{categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
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
                  <button onClick={() => startEdit(buffet)}>Edit</button>
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

      {editingBuffet && (
        <div className="qa-modal-backdrop" onClick={closeEdit}>
          <form className="qa-edit-modal" onSubmit={saveEdit} onClick={(e) => e.stopPropagation()}>
            <div className="qa-modal-head"><div><span className="eyebrow">Edit Buffet</span><h2>{editingBuffet.title}</h2></div><button type="button" onClick={closeEdit}>×</button></div>
            <div className="qa-edit-grid">
              <input required placeholder="Buffet title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}><option value="">Category</option>{categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select value={editForm.buffetType} onChange={(e) => setEditForm({ ...editForm, buffetType: e.target.value })}><option value="regular">Regular</option><option value="special">Special</option></select>
              <select value={editForm.scheduleType} onChange={(e) => setEditForm({ ...editForm, scheduleType: e.target.value })}><option value="all_days">All days</option><option value="selected_days">Selected days</option><option value="one_day">One day</option></select>
              <input type="number" min="0" placeholder="Price" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
              <input type="number" min="0" placeholder="Available seats" value={editForm.availableSeats} onChange={(e) => setEditForm({ ...editForm, availableSeats: e.target.value })} />
              <input type="date" value={editForm.availableFromDate} onChange={(e) => setEditForm({ ...editForm, availableFromDate: e.target.value })} />
              <input type="date" value={editForm.availableToDate} onChange={(e) => setEditForm({ ...editForm, availableToDate: e.target.value })} />
              <input type="date" value={editForm.specialDate} onChange={(e) => setEditForm({ ...editForm, specialDate: e.target.value })} />
              <textarea className="span-2" placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="action-row wrap"><button className="btn primary" disabled={savingEdit}>{savingEdit ? "Saving..." : "Save Changes"}</button><button type="button" className="btn secondary" onClick={closeEdit}>Cancel</button></div>
          </form>
        </div>
      )}
    </section>
  );
}

export default HotelBuffetWorkspace;
