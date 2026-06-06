import React, { useEffect, useState } from "react";
import axios from "axios";
import { ProcurementLayout } from "../components/ProcurementLayout";
import { Shield, Plus, Trash2, Folder, Check, X, Edit2 } from "lucide-react";
import { useTheme, getColorClass } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";

interface Department { id: string; name: string; companyId: string; }
interface Company { id: string; name: string; departments: Department[]; }

export const OrgStructurePage = () => {
  const [orgData, setOrgData] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const { accentColor } = useTheme();
  const { token } = useAuth();
  
  // Add states
  const [newDeptName, setNewDeptName] = useState("");
  const [addingDept, setAddingDept] = useState(false);

  // Edit states
  const [editingCompany, setEditingCompany] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState("");

  useEffect(() => {
    if (token) {
      void fetchOrg();
    }
  }, [token]);

  const fetchOrg = async () => {
    setLoading(true);
    try { const res = await axios.get("/api/org/hierarchy"); setOrgData(res.data); } 
    catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  // Company
  const saveCompany = async () => {
    if (!orgData || !editCompanyName.trim()) return;
    try { await axios.put(`/api/org/companies/${orgData.id}`, { name: editCompanyName }); setEditingCompany(false); fetchOrg(); }
    catch (e) { alert("Failed to save"); }
  };

  // Department CRUD
  const addDepartment = async () => {
    if (!orgData || !newDeptName.trim()) return;
    try {
      await axios.post("/api/org/departments", { name: newDeptName, companyId: orgData.id });
      setNewDeptName(""); setAddingDept(false); fetchOrg();
    } catch (e) { console.error(e); alert("Failed to add Department"); }
  };

  const saveDept = async (id: string) => {
    if (!editDeptName.trim()) return;
    try { await axios.put(`/api/org/departments/${id}`, { name: editDeptName }); setEditingDeptId(null); fetchOrg(); }
    catch (e) { alert("Failed"); }
  };

  const deleteDept = async (id: string) => {
    if (!window.confirm("Delete Department?")) return;
    try { await axios.delete(`/api/org/departments/${id}`); fetchOrg(); } catch (e) { alert("Failed"); }
  };

  const inputClass = "bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <ProcurementLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center"><Shield className="w-5 h-5 mr-2 text-blue-600" />Org Management</h1>
          {!addingDept && (
            <button onClick={() => setAddingDept(true)} className={`${getColorClass(accentColor)} text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center hover:opacity-90`}>
              <Plus className="w-4 h-4 mr-1" /> Add Department
            </button>
          )}
        </div>

        {loading ? <div className="text-gray-500">Loading...</div> : (
          <div className="space-y-4">
            {/* Company Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 text-white">
              {editingCompany ? (
                <div className="flex items-center gap-2">
                  <input value={editCompanyName} onChange={e => setEditCompanyName(e.target.value)} className="bg-white/20 border border-white/50 rounded px-3 py-1 text-white placeholder-white/70 flex-1 text-lg font-bold" autoFocus />
                  <button onClick={saveCompany} className="p-1 bg-green-500 rounded"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingCompany(false)} className="p-1 bg-white/30 rounded"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{orgData?.name || "Organization"}</h2>
                  <button onClick={() => { setEditCompanyName(orgData?.name || ""); setEditingCompany(true); }} className="opacity-50 hover:opacity-100"><Edit2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>

            {/* Add Department Input */}
            {addingDept && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                <Folder className="w-5 h-5 text-blue-500" />
                <input value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="Department Name" className={`${inputClass} flex-1`} autoFocus onKeyDown={e => e.key === 'Enter' && addDepartment()} />
                <button onClick={addDepartment} className="px-4 py-1.5 bg-blue-600 text-white rounded font-medium text-sm flex items-center hover:bg-blue-700"><Check className="w-4 h-4 mr-1" />Add</button>
                <button onClick={() => { setAddingDept(false); setNewDeptName(""); }} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded font-medium text-sm">Cancel</button>
              </div>
            )}

            {/* Departments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orgData?.departments.map(dept => (
                <div key={dept.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                  {editingDeptId === dept.id ? (
                    <div className="flex items-center gap-2">
                      <input value={editDeptName} onChange={e => setEditDeptName(e.target.value)} className={`${inputClass} flex-1`} autoFocus />
                      <button onClick={() => saveDept(dept.id)} className="text-green-600"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingDeptId(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <Folder className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{dept.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditDeptName(dept.name); setEditingDeptId(dept.id); }} className="text-gray-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteDept(dept.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {orgData?.departments.length === 0 && (
                <div className="col-span-full text-gray-400 text-center py-8">No departments. Click "Add Department" to create one.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProcurementLayout>
  );
};
