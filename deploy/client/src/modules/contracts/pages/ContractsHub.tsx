import React, { useState, useEffect } from "react";
import { Briefcase, Plus, X, Search, ChevronDown } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { PageHeader } from "../../../components/PageHeader";

const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:3003/api";

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  vendorName: string;
  contractType: string;
  department: string;
  value: number;
  startDate: string;
  endDate: string;
  status: string;
  scopeOfWork?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRING_SOON: "bg-orange-100 text-orange-700",
  EXPIRED: "bg-red-100 text-red-700",
  DRAFT: "bg-gray-100 text-gray-600",
};

const STATUSES = ["ALL", "ACTIVE", "EXPIRING_SOON", "EXPIRED", "DRAFT"];

// Departments fetched dynamically from org hierarchy — see fetchDepartments()

const emptyForm = {
  contractNumber: "",
  title: "",
  vendorName: "",
  contractType: "",
  department: "",
  value: "",
  startDate: "",
  endDate: "",
  scopeOfWork: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
};

export const ContractsHub = () => {
  const { themeMode } = useTheme();
  const isDark = themeMode === "dark";
  const isSepia = themeMode === "sepia";
  const bg = isDark ? "bg-gray-900" : isSepia ? "bg-amber-50" : "bg-gray-50";
  const cardBg = isDark ? "bg-gray-800" : isSepia ? "bg-amber-100/60" : "bg-white";
  const bdr = isDark ? "border-gray-700" : isSepia ? "border-amber-200" : "border-gray-200";
  const tx = isDark ? "text-white" : isSepia ? "text-amber-900" : "text-gray-900";
  const sub = isDark ? "text-gray-400" : isSepia ? "text-amber-700" : "text-gray-500";

  const token = localStorage.getItem("token");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [orgDepartments, setOrgDepartments] = useState<string[]>([]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API}/org/hierarchy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.departments) setOrgDepartments(data.departments.map((d: any) => d.name));
      }
    } catch { /* ignore */ }
  };

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/contracts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContracts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContracts(); fetchDepartments(); }, []);

  const filtered = contracts.filter((c) => {
    const matchSearch =
      c.contractNumber?.toLowerCase().includes(search.toLowerCase()) ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.vendorName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchDept = deptFilter === "All Departments" || c.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === "ACTIVE").length,
    expiring: contracts.filter((c) => c.status === "EXPIRING_SOON").length,
    totalValue: contracts.reduce((sum, c) => sum + (c.value || 0), 0),
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`${API}/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, value: parseFloat(formData.value) || 0 }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormData({ ...emptyForm });
        fetchContracts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const formatValue = (v: number) => `₹${(v / 100000).toFixed(2)}L`;

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-200`}>
      <PageHeader
        icon={Briefcase}
        iconColor="text-sky-600"
        iconBg="bg-sky-50 dark:bg-sky-900/30"
        title="Contracts Management"
        subtitle="ONGC Ankleshwar · Vendor contracts & agreements registry"
        actions={
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Contract
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Contracts", value: stats.total, color: "text-blue-600" },
            { label: "Active", value: stats.active, color: "text-green-600" },
            { label: "Expiring Soon", value: stats.expiring, color: "text-orange-600" },
            { label: "Total Value", value: formatValue(stats.totalValue), color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className={`${cardBg} border ${bdr} rounded-xl p-4 shadow-sm`}>
              <p className={`text-xs ${sub} mb-1`}>{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className={`${cardBg} border ${bdr} rounded-xl p-4 shadow-sm`}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${sub}`} />
              <input
                type="text"
                placeholder="Search contracts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500`}
              />
            </div>
            <div className="relative">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500`}
              >
                {["All Departments", ...orgDepartments].map((d) => <option key={d}>{d}</option>)}
              </select>
              <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${sub} pointer-events-none`} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-sky-600 text-white"
                    : `${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Contract List */}
        {loading ? (
          <div className={`text-center py-12 ${sub}`}>Loading contracts...</div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-12 ${sub}`}>No contracts found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={`${cardBg} border ${bdr} rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className={`text-xs font-mono ${sub}`}>{c.contractNumber}</p>
                    <h3 className={`font-semibold ${tx} mt-0.5 line-clamp-1`}>{c.title}</h3>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600"}`}>
                    {c.status?.replace("_", " ")}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p className={`text-xs ${sub}`}><span className="font-medium">Vendor:</span> {c.vendorName}</p>
                  <p className={`text-xs ${sub}`}><span className="font-medium">Dept:</span> {c.department}</p>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs ${sub}`}><span className="font-medium">Ends:</span> {c.endDate ? new Date(c.endDate).toLocaleDateString("en-IN") : "—"}</p>
                    <p className="text-sm font-bold text-sky-600">{formatValue(c.value)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${cardBg} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between p-6 border-b ${bdr}`}>
              <h2 className={`text-lg font-bold ${tx}`}>Create New Contract</h2>
              <button onClick={() => setShowCreate(false)} className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${sub}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "contractNumber", label: "Contract Number", required: true },
                  { key: "title", label: "Title", required: true },
                  { key: "vendorName", label: "Vendor Name", required: true },
                  { key: "contractType", label: "Contract Type" },
                  { key: "department", label: "Department" },
                  { key: "value", label: "Value (₹)", type: "number" },
                  { key: "startDate", label: "Start Date", type: "date" },
                  { key: "endDate", label: "End Date", type: "date" },
                  { key: "contactPerson", label: "Contact Person" },
                  { key: "contactEmail", label: "Contact Email", type: "email" },
                  { key: "contactPhone", label: "Contact Phone" },
                ].map(({ key, label, required, type }) => (
                  <div key={key} className={key === "title" || key === "vendorName" ? "col-span-2" : ""}>
                    <label className={`block text-xs font-medium ${sub} mb-1`}>{label}{required && " *"}</label>
                    <input
                      type={type || "text"}
                      required={required}
                      value={(formData as any)[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Scope of Work</label>
                  <textarea
                    rows={3}
                    value={formData.scopeOfWork}
                    onChange={(e) => setFormData({ ...formData, scopeOfWork: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500`}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className={`flex-1 py-2 rounded-lg border ${bdr} text-sm font-medium ${sub} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Create Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Slide-over */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className={`w-full max-w-lg ${cardBg} shadow-2xl overflow-y-auto`}>
            <div className={`flex items-center justify-between p-6 border-b ${bdr}`}>
              <div>
                <p className={`text-xs font-mono ${sub}`}>{selected.contractNumber}</p>
                <h2 className={`text-lg font-bold ${tx} mt-0.5`}>{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${sub}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status] || "bg-gray-100 text-gray-600"}`}>
                  {selected.status?.replace("_", " ")}
                </span>
                <span className={`text-xs ${sub}`}>{selected.contractType}</span>
              </div>
              {[
                ["Vendor", selected.vendorName],
                ["Department", selected.department],
                ["Value", formatValue(selected.value)],
                ["Start Date", selected.startDate ? new Date(selected.startDate).toLocaleDateString("en-IN") : "—"],
                ["End Date", selected.endDate ? new Date(selected.endDate).toLocaleDateString("en-IN") : "—"],
                ["Contact Person", selected.contactPerson],
                ["Contact Email", selected.contactEmail],
                ["Contact Phone", selected.contactPhone],
              ].map(([label, value]) =>
                value ? (
                  <div key={label} className={`flex justify-between py-2 border-b ${bdr}`}>
                    <span className={`text-sm ${sub}`}>{label}</span>
                    <span className={`text-sm font-medium ${tx}`}>{value}</span>
                  </div>
                ) : null
              )}
              {selected.scopeOfWork && (
                <div>
                  <p className={`text-xs font-medium ${sub} mb-1`}>Scope of Work</p>
                  <p className={`text-sm ${tx} whitespace-pre-wrap`}>{selected.scopeOfWork}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
