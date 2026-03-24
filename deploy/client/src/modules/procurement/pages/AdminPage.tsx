import React, { useEffect, useState } from "react";
import axios from "axios";
import { ProcurementLayout } from "../components/ProcurementLayout";
import { Users, Plus, Search, Key, Trash2, ChevronLeft, ChevronRight, X, Circle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTheme, getColorClass } from "../../../context/ThemeContext";

interface User {
  id: string;
  username: string;
  role: string;
  departmentId?: string;
  department?: { name: string };
  lastLogin?: string;
}

interface OrgData {
  departments: { id: string; name: string }[];
}

const ITEMS_PER_PAGE = 20;

export const AdminPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // New user form
  const [formData, setFormData] = useState({ username: "", password: "", role: "VIEWER", departmentId: "" });

  const { token } = useAuth();
  const { accentColor } = useTheme();

  useEffect(() => { if (token) { fetchUsers(); fetchOrg(); } }, [token]);

  const fetchUsers = async () => {
    setLoading(true);
    try { const res = await axios.get("/api/auth/users"); setUsers(res.data); } 
    catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const fetchOrg = async () => {
    try { const res = await axios.get("/api/org/hierarchy"); setOrgData(res.data); } catch (e) { console.error(e); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/auth/register", formData);
      setFormData({ username: "", password: "", role: "VIEWER", departmentId: "" });
      setShowModal(false);
      alert("User created successfully!");
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || error.response?.data?.details || "Failed to create user");
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordId || !newPassword) return;
    try {
      await axios.put(`/api/auth/users/${resetPasswordId}/reset-password`, { password: newPassword });
      setResetPasswordId(null);
      setNewPassword("");
      alert("Password reset successfully");
    } catch (e) { alert("Failed to reset password"); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete user?")) return;
    try { await axios.delete(`/api/auth/users/${id}`); fetchUsers(); } catch (e) { alert("Failed"); }
  };

  // Filter logic
  const filteredUsers = users.filter(u => {
    if (searchQuery && !u.username.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterDept && u.departmentId !== filterDept) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Check online (last login within 15 min)
  const isOnline = (lastLogin?: string) => {
    if (!lastLogin) return false;
    return (Date.now() - new Date(lastLogin).getTime()) < 15 * 60 * 1000;
  };

  const inputClass = "bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <ProcurementLayout>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center"><Users className="w-5 h-5 mr-2" />User Management</h1>
          <p className="text-xs text-gray-500">{filteredUsers.length} users</p>
        </div>
        <button onClick={() => setShowModal(true)} className={`${getColorClass(accentColor)} text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center hover:opacity-90`}>
          <Plus className="w-4 h-4 mr-1" /> Create User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className={`${inputClass} flex-1`} />
        </div>
        <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setCurrentPage(1); }} className={`${inputClass} w-40`}>
          <option value="">All Departments</option>
          {orgData?.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {(searchQuery || filterDept) && (
          <button onClick={() => { setSearchQuery(""); setFilterDept(""); setCurrentPage(1); }} className="text-xs text-gray-500 hover:text-gray-700 flex items-center"><X className="w-3 h-3 mr-0.5" />Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Department</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map(u => (
              <tr key={u.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.username}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{u.role}</span></td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.department?.name || '-'}</td>
                <td className="px-4 py-3 text-center"><Circle className={`w-2.5 h-2.5 inline ${isOnline(u.lastLogin) ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'}`} /></td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => { setResetPasswordId(u.id); setNewPassword(""); }} className="text-gray-400 hover:text-blue-500" title="Reset Password"><Key className="w-4 h-4 inline" /></button>
                  <button onClick={() => handleDelete(u.id)} className="text-gray-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4 inline" /></button>
                </td>
              </tr>
            ))}
            {paginatedUsers.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-500">No users found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create User</h2>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Username</label><input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className={`w-full ${inputClass}`} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Password</label><input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className={`w-full ${inputClass}`} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Role</label><select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className={`w-full ${inputClass}`}><option value="USER">USER</option><option value="VIEWER">VIEWER</option><option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option><option value="L4">L4</option><option value="PROCUREMENT_OFFICER">Procurement Officer</option><option value="ADMIN">ADMIN</option></select></div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Department</label>
                <select value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })} className={`w-full ${inputClass}`}>
                  <option value="">--</option>
                  {orgData?.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm">Cancel</button>
                <button type="submit" className={`flex-1 ${getColorClass(accentColor)} text-white px-4 py-2 rounded-lg text-sm`}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Reset Password</h2>
            <div className="space-y-3">
              <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`w-full ${inputClass}`} />
              <div className="flex gap-2">
                <button onClick={() => setResetPasswordId(null)} className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm">Cancel</button>
                <button onClick={handleResetPassword} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Reset</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProcurementLayout>
  );
};
