import React, { useState, useEffect } from "react";
import { ClipboardList, Plus, X, LayoutGrid, List, AlertCircle } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { PageHeader } from "../../../components/PageHeader";

const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:3003/api";

interface WorkOrder {
  id: string;
  woNumber?: string;
  title: string;
  description?: string;
  woType?: string;
  priority: string;
  status: string;
  department?: string;
  equipmentId?: string;
  scheduledDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: string;
  requestedBy?: string;
  specialTools?: string;
  safetyPrecautions?: string;
  completionNotes?: string;
  partsUsed?: string;
  followUpRequired?: boolean;
  teamMembers?: string[];
  createdAt?: string;
}

const KANBAN_COLUMNS = ["PENDING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CLOSED"];

const COLUMN_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CLOSED: "Closed",
};

const COLUMN_COLORS: Record<string, string> = {
  PENDING: "border-t-yellow-400",
  IN_PROGRESS: "border-t-blue-500",
  ON_HOLD: "border-t-orange-400",
  COMPLETED: "border-t-green-500",
  CLOSED: "border-t-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-green-100 text-green-700",
};

const WO_TYPES = ["PREVENTIVE", "CORRECTIVE", "BREAKDOWN", "INSPECTION", "OVERHAUL"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const emptyForm = {
  title: "",
  description: "",
  woType: "PREVENTIVE",
  priority: "MEDIUM",
  department: "",
  equipmentId: "",
  scheduledDate: "",
  estimatedHours: "",
  assignedTo: "",
  requestedBy: "",
  specialTools: "",
  safetyPrecautions: "",
};

const emptyClosureForm = {
  completionNotes: "",
  actualHours: "",
  partsUsed: "",
  followUpRequired: false,
};

export const WorkOrderHub = () => {
  const { themeMode } = useTheme();
  const { user } = useAuth();
  const isDark = themeMode === "dark";
  const isSepia = themeMode === "sepia";
  const bg = isDark ? "bg-gray-900" : isSepia ? "bg-amber-50" : "bg-gray-50";
  const cardBg = isDark ? "bg-gray-800" : isSepia ? "bg-amber-100/60" : "bg-white";
  const bdr = isDark ? "border-gray-700" : isSepia ? "border-amber-200" : "border-gray-200";
  const tx = isDark ? "text-white" : isSepia ? "text-amber-900" : "text-gray-900";
  const sub = isDark ? "text-gray-400" : isSepia ? "text-amber-700" : "text-gray-500";

  const token = localStorage.getItem("token");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [showClosure, setShowClosure] = useState(false);
  const [closureForm, setClosureForm] = useState({ ...emptyClosureForm });
  const [closing, setClosing] = useState(false);
  const [departments, setDepartments] = useState<{id:string; name:string}[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";
  const canCreate = isAdminOrManager || user?.canCreateWorkOrder;
  const canClose  = isAdminOrManager || user?.canCloseWorkOrder;

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      // Fetch from both maintenance-requests AND ISO 14224 work orders
      const [reqRes, woRes] = await Promise.all([
        fetch(`${API}/maintenance-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${API}/workorders`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      let allWOs: WorkOrder[] = [];

      // Manual/Kanban work orders from maintenance-requests
      if (reqRes?.ok) {
        const data = await reqRes.json();
        const requests = Array.isArray(data) ? data : data.requests || [];
        allWOs.push(...requests);
      } else if (reqRes?.status === 401 || reqRes?.status === 403) {
        window.location.href = "/login";
        return;
      }

      // ISO 14224 work orders (including auto-generated from PMS)
      if (woRes?.ok) {
        const isoWOs = await woRes.json();
        const mapped = (Array.isArray(isoWOs) ? isoWOs : []).map((wo: any) => ({
          id: wo.id,
          woNumber: wo.woNumber,
          title: wo.description?.substring(0, 80) || wo.woNumber,
          description: wo.description,
          woType: wo.woType,
          priority: wo.priority || 'NORMAL',
          status: wo.status === 'OPEN' ? 'PENDING' : wo.status === 'COMPLETED' ? 'COMPLETED' : wo.status === 'CLOSED' ? 'CLOSED' : wo.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : wo.status,
          department: wo.functionalLocation?.system?.area?.site?.name || '',
          equipmentId: wo.functionalLocation?.flId || '',
          scheduledDate: wo.scheduledDate,
          assignedTo: wo.assignedBy || '',
          requestedBy: wo.createdBy || '',
          createdAt: wo.createdAt,
          _source: 'ISO14224',
        }));
        // Merge, avoiding duplicates by id
        const existingIds = new Set(allWOs.map(w => w.id));
        allWOs.push(...mapped.filter((w: any) => !existingIds.has(w.id)));
      }

      setWorkOrders(allWOs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API}/org/hierarchy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.departments) setDepartments(data.departments);
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { fetchWorkOrders(); fetchDepartments(); }, []);

  const stats = {
    total: workOrders.length,
    open: workOrders.filter((w) => w.status === "PENDING").length,
    inProgress: workOrders.filter((w) => w.status === "IN_PROGRESS").length,
    overdue: workOrders.filter((w) => {
      if (!w.scheduledDate || w.status === "COMPLETED" || w.status === "CLOSED") return false;
      return new Date(w.scheduledDate) < new Date();
    }).length,
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      setSaving(true);
      const res = await fetch(`${API}/maintenance-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          estimatedHours: parseFloat(formData.estimatedHours) || undefined,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormData({ ...emptyForm });
        fetchWorkOrders();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || err.message || `Server error (${res.status})`);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setErrorMsg("");
    try {
      setClosing(true);
      const res = await fetch(`${API}/maintenance-requests/${selected.id}/close`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...closureForm,
          actualHours: parseFloat(closureForm.actualHours) || undefined,
        }),
      });
      if (res.ok) {
        setShowClosure(false);
        setSelected(null);
        setClosureForm({ ...emptyClosureForm });
        fetchWorkOrders();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || err.message || `Close failed (${res.status})`);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Network error");
    } finally {
      setClosing(false);
    }
  };

  const handleDeleteWO = async (id: string) => {
    if (!window.confirm('Delete this work order? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/maintenance-requests/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setSelected(null); fetchWorkOrders(); } else { setErrorMsg('Failed to delete'); }
    } catch { setErrorMsg('Network error'); }
  };

  const WOCard = ({ wo }: { wo: WorkOrder }) => (
    <div
      onClick={() => setSelected(wo)}
      className={`${cardBg} border ${bdr} rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow mb-2`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-[10px] font-mono ${sub}`}>{wo.woNumber || wo.id?.slice(0, 8)}</p>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[wo.priority] || "bg-gray-100 text-gray-600"}`}>
          {wo.priority}
        </span>
      </div>
      <p className={`text-xs font-semibold ${tx} line-clamp-2 mb-2`}>{wo.title}</p>
      {wo.equipmentId && <p className={`text-[10px] ${sub} mb-1`}>Tag: {wo.equipmentId}</p>}
      {wo.assignedTo && <p className={`text-[10px] ${sub} mb-1`}>Assigned: {wo.assignedTo}</p>}
      {wo.scheduledDate && (
        <p className={`text-[10px] ${sub} flex items-center gap-1`}>
          {new Date(wo.scheduledDate) < new Date() && wo.status !== "COMPLETED" && wo.status !== "CLOSED" && (
            <AlertCircle className="w-3 h-3 text-red-500" />
          )}
          {new Date(wo.scheduledDate).toLocaleDateString("en-IN")}
        </p>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-200 flex flex-col`}>
      <PageHeader
        icon={ClipboardList}
        iconColor="text-rose-600"
        iconBg="bg-rose-50 dark:bg-rose-900/30"
        title="Work Order Management"
        subtitle="ONGC Ankleshwar · Maintenance work orders & scheduling"
        actions={
          <div className="flex items-center gap-2">
            <div className={`flex items-center ${isDark ? "bg-gray-700" : "bg-gray-100"} rounded-lg p-0.5`}>
              <button
                onClick={() => setView("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "kanban" ? `${cardBg} ${tx} shadow-sm` : sub}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Kanban
              </button>
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "list" ? `${cardBg} ${tx} shadow-sm` : sub}`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
            {canCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Work Order
              </button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-5 flex-1 flex flex-col">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
          {[
            { label: "Total WOs", value: stats.total, color: "text-blue-600" },
            { label: "Open", value: stats.open, color: "text-yellow-600" },
            { label: "In Progress", value: stats.inProgress, color: "text-blue-500" },
            { label: "Overdue", value: stats.overdue, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className={`${cardBg} border ${bdr} rounded-xl p-4 shadow-sm`}>
              <p className={`text-xs ${sub} mb-1`}>{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className={`text-center py-12 ${sub}`}>Loading work orders...</div>
        ) : view === "kanban" ? (
          /* Kanban Board */
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            {KANBAN_COLUMNS.map((col) => {
              const colWOs = workOrders.filter((w) => w.status === col);
              return (
                <div key={col} className={`flex-shrink-0 w-64 ${isDark ? "bg-gray-800/50" : "bg-gray-100"} rounded-xl border-t-4 ${COLUMN_COLORS[col]} overflow-hidden`}>
                  <div className="p-3 flex items-center justify-between">
                    <span className={`text-xs font-bold ${tx}`}>{COLUMN_LABELS[col]}</span>
                    <span className={`text-xs ${isDark ? "bg-gray-700 text-gray-300" : "bg-white text-gray-600"} font-medium px-2 py-0.5 rounded-full`}>
                      {colWOs.length}
                    </span>
                  </div>
                  <div className="p-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
                    {colWOs.length === 0 ? (
                      <p className={`text-center text-xs ${sub} py-4`}>No items</p>
                    ) : (
                      colWOs.map((wo) => <WOCard key={wo.id} wo={wo} />)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className={`${cardBg} border ${bdr} rounded-xl shadow-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`${isDark ? "bg-gray-700" : "bg-gray-50"} text-xs`}>
                  <tr>
                    {["WO #", "Title", "Equipment", "Priority", "Status", "Assigned To", "Due Date"].map((h) => (
                      <th key={h} className={`px-4 py-3 text-left font-semibold ${sub} whitespace-nowrap`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {workOrders.map((wo) => (
                    <tr
                      key={wo.id}
                      onClick={() => setSelected(wo)}
                      className={`cursor-pointer hover:${isDark ? "bg-gray-700/50" : "bg-gray-50"} transition-colors`}
                    >
                      <td className={`px-4 py-3 font-mono text-xs ${sub}`}>{wo.woNumber || wo.id?.slice(0, 8)}</td>
                      <td className={`px-4 py-3 font-medium ${tx} max-w-[200px] truncate`}>{wo.title}</td>
                      <td className={`px-4 py-3 ${sub}`}>{wo.equipmentId || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[wo.priority] || "bg-gray-100 text-gray-600"}`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${sub}`}>{wo.status?.replace("_", " ")}</td>
                      <td className={`px-4 py-3 ${sub}`}>{wo.assignedTo || "—"}</td>
                      <td className={`px-4 py-3 ${sub} whitespace-nowrap`}>
                        {wo.scheduledDate ? new Date(wo.scheduledDate).toLocaleDateString("en-IN") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {workOrders.length === 0 && (
                <div className={`text-center py-12 ${sub}`}>No work orders found.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Work Order Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${cardBg} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between p-6 border-b ${bdr}`}>
              <h2 className={`text-lg font-bold ${tx}`}>Create Work Order</h2>
              <button onClick={() => setShowCreate(false)} className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${sub}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-medium ${sub} mb-1`}>Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>WO Type</label>
                  <select
                    value={formData.woType}
                    onChange={(e) => setFormData({ ...formData, woType: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                  >
                    {WO_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                  >
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                  >
                    <option value="">Select...</option>
                    {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Equipment Tag</label>
                  <input
                    type="text"
                    value={formData.equipmentId}
                    onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Scheduled Date</label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Estimated Hours</label>
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Assigned To</label>
                  <input
                    type="text"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Requested By</label>
                  <input
                    type="text"
                    value={formData.requestedBy}
                    onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium ${sub} mb-1`}>Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Special Tools</label>
                  <textarea
                    rows={2}
                    value={formData.specialTools}
                    onChange={(e) => setFormData({ ...formData, specialTools: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Safety Precautions</label>
                  <textarea
                    rows={2}
                    value={formData.safetyPrecautions}
                    onChange={(e) => setFormData({ ...formData, safetyPrecautions: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                  />
                </div>
              </div>
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">{errorMsg}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setErrorMsg(""); }}
                  className={`flex-1 py-2 rounded-lg border ${bdr} text-sm font-medium ${sub} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create Work Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && !showClosure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${cardBg} rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between p-6 border-b ${bdr}`}>
              <div>
                <p className={`text-xs font-mono ${sub}`}>{selected.woNumber || selected.id?.slice(0, 8)}</p>
                <h2 className={`text-lg font-bold ${tx} mt-0.5`}>{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${sub}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[selected.priority] || "bg-gray-100 text-gray-600"}`}>
                  {selected.priority}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                  {selected.status?.replace("_", " ")}
                </span>
                {selected.woType && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-blue-900/30 text-blue-300" : "bg-blue-50 text-blue-600"}`}>
                    {selected.woType}
                  </span>
                )}
              </div>
              {[
                ["Department", selected.department],
                ["Equipment Tag", selected.equipmentId],
                ["Assigned To", selected.assignedTo],
                ["Requested By", selected.requestedBy],
                ["Scheduled Date", selected.scheduledDate ? new Date(selected.scheduledDate).toLocaleDateString("en-IN") : undefined],
                ["Estimated Hours", selected.estimatedHours?.toString()],
                ["Actual Hours", selected.actualHours?.toString()],
                ["Special Tools", selected.specialTools],
                ["Safety Precautions", selected.safetyPrecautions],
              ].map(([label, value]) =>
                value ? (
                  <div key={label} className={`flex justify-between py-2 border-b ${bdr}`}>
                    <span className={`text-sm ${sub}`}>{label}</span>
                    <span className={`text-sm font-medium ${tx} max-w-[60%] text-right`}>{value}</span>
                  </div>
                ) : null
              )}
              {selected.description && (
                <div>
                  <p className={`text-xs font-medium ${sub} mb-1`}>Description</p>
                  <p className={`text-sm ${tx}`}>{selected.description}</p>
                </div>
              )}
              {selected.completionNotes && (
                <div>
                  <p className={`text-xs font-medium ${sub} mb-1`}>Completion Notes</p>
                  <p className={`text-sm ${tx}`}>{selected.completionNotes}</p>
                </div>
              )}
              {selected.teamMembers && selected.teamMembers.length > 0 && (
                <div>
                  <p className={`text-xs font-medium ${sub} mb-2`}>Team Members</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.teamMembers.map((m, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {canClose && selected.status !== "COMPLETED" && selected.status !== "CLOSED" && (
                <button
                  onClick={() => setShowClosure(true)}
                  className="w-full py-2 mt-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                >
                  Close Work Order
                </button>
              )}
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => handleDeleteWO(selected.id)}
                  className="w-full py-2 mt-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                >
                  Delete Work Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Closure Modal */}
      {showClosure && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${cardBg} rounded-2xl shadow-2xl w-full max-w-lg`}>
            <div className={`flex items-center justify-between p-6 border-b ${bdr}`}>
              <h2 className={`text-lg font-bold ${tx}`}>Close Work Order</h2>
              <button onClick={() => { setShowClosure(false); }} className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${sub}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleClose} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-medium ${sub} mb-1`}>Completion Notes *</label>
                <textarea
                  required
                  rows={3}
                  value={closureForm.completionNotes}
                  onChange={(e) => setClosureForm({ ...closureForm, completionNotes: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-green-500`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Actual Hours</label>
                  <input
                    type="number"
                    value={closureForm.actualHours}
                    onChange={(e) => setClosureForm({ ...closureForm, actualHours: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-green-500`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Parts Used</label>
                  <input
                    type="text"
                    value={closureForm.partsUsed}
                    onChange={(e) => setClosureForm({ ...closureForm, partsUsed: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-green-500`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="followUp"
                  checked={closureForm.followUpRequired}
                  onChange={(e) => setClosureForm({ ...closureForm, followUpRequired: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="followUp" className={`text-sm ${tx}`}>Follow-up Required</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClosure(false)}
                  className={`flex-1 py-2 rounded-lg border ${bdr} text-sm font-medium ${sub} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closing}
                  className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {closing ? "Closing..." : "Confirm Closure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
