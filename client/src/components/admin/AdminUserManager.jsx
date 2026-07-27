import { useMemo, useState } from "react";
import api from "../../services/api";

export default function AdminUserManager({ users = [], onChanged }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase())), [query, users]);

  const update = async (user, patch) => {
    try { await api.patch(`/users/admin/${user._id}`, patch); setMessage("User updated."); onChanged?.(); }
    catch (error) { setMessage(error.response?.data?.message || "User update failed."); }
  };
  const reset = async (user) => {
    try { const res = await api.post(`/users/admin/${user._id}/request-password-reset`); setMessage(res.data.message); onChanged?.(); }
    catch (error) { setMessage(error.response?.data?.message || "Password-reset request failed."); }
  };
  const remove = async (user) => {
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    try { await api.delete(`/users/admin/${user._id}`); setMessage("User deleted."); onChanged?.(); }
    catch (error) { setMessage(error.response?.data?.message || "User deletion failed."); }
  };

  return <section>
    <div className="mb-6"><h1 className="font-headline-lg text-headline-lg text-text-deep-green">User Management</h1><p className="font-body-md text-on-surface-variant">View emails, roles and account status. Passwords remain securely hashed and cannot be viewed.</p></div>
    <input className="form-input w-full mb-4" placeholder="Search users" value={query} onChange={(e) => setQuery(e.target.value)} />
    {message && <div className="p-3 mb-4 rounded-xl bg-secondary-container/20 text-secondary">{message}</div>}
    <div className="space-y-3">{filtered.map((user) => <div key={user._id} className="card-ambient p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
      <div><strong className="text-text-deep-green block">{user.name}</strong><span className="text-on-surface-variant text-sm">{user.email}</span><div className="text-xs mt-1">Joined {new Date(user.createdAt).toLocaleDateString()}</div></div>
      <select className="form-select" value={user.role} onChange={(e) => update(user, { role: e.target.value })}><option value="customer">Customer</option><option value="hotel">Hotel</option><option value="admin">Admin</option></select>
      <button className="btn-outline" onClick={() => update(user, { isActive: user.isActive === false })}>{user.isActive === false ? "Activate" : "Disable"}</button>
      <div className="flex flex-wrap gap-2"><button className="btn-outline" onClick={() => reset(user)}>Require Password Reset</button><button className="btn-outline" onClick={() => remove(user)}>Delete</button></div>
    </div>)}</div>
  </section>;
}
