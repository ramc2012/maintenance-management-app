import React, { useState, useEffect, useRef } from "react";
import { Monitor, Download, Eye, FileText, Plus, X, Search, ChevronDown } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { PageHeader } from "../../../components/PageHeader";

const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:3003/api";

interface Presentation {
  id: string;
  title: string;
  originalName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  category: string;
  departmentId?: string;
  description?: string;
  uploadedBy?: string;
  createdAt: string;
}

const CATEGORIES = ["ALL", "TECHNICAL", "SAFETY", "TRAINING", "MANAGEMENT", "OPERATIONS", "HSE"];

// Departments fetched dynamically — see fetchDepartments()
const DEPARTMENTS_FALLBACK = ["All Departments"];

const CATEGORY_COLORS: Record<string, string> = {
  TECHNICAL: "bg-blue-100 text-blue-700",
  SAFETY: "bg-red-100 text-red-700",
  TRAINING: "bg-green-100 text-green-700",
  MANAGEMENT: "bg-purple-100 text-purple-700",
  OPERATIONS: "bg-orange-100 text-orange-700",
  HSE: "bg-yellow-100 text-yellow-700",
};

const getFileIcon = (mimeType?: string, originalName?: string) => {
  const ext = originalName?.split(".").pop()?.toLowerCase();
  if (ext === "pptx" || ext === "ppt") return { color: "text-orange-500", bg: "bg-orange-50" };
  if (ext === "pdf" || mimeType === "application/pdf") return { color: "text-red-500", bg: "bg-red-50" };
  return { color: "text-blue-500", bg: "bg-blue-50" };
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const emptyForm = {
  title: "",
  category: "TECHNICAL",
  department: "",
  description: "",
};

export const PresentationsHub = () => {
  const { themeMode } = useTheme();
  const isDark = themeMode === "dark";
  const isSepia = themeMode === "sepia";
  const bg = isDark ? "bg-gray-900" : isSepia ? "bg-amber-50" : "bg-gray-50";
  const cardBg = isDark ? "bg-gray-800" : isSepia ? "bg-amber-100/60" : "bg-white";
  const bdr = isDark ? "border-gray-700" : isSepia ? "border-amber-200" : "border-gray-200";
  const tx = isDark ? "text-white" : isSepia ? "text-amber-900" : "text-gray-900";
  const sub = isDark ? "text-gray-400" : isSepia ? "text-amber-700" : "text-gray-500";

  const token = localStorage.getItem("token");
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [showUpload, setShowUpload] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [orgDepartments, setOrgDepartments] = useState<string[]>([]);

  const fetchPresentations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/presentations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPresentations(data);
      }
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
        if (data?.departments) setOrgDepartments(data.departments.map((d: any) => d.name));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchPresentations(); fetchDepartments(); }, []);

  const filtered = presentations.filter((p) => {
    const matchSearch =
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.uploadedBy?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "ALL" || p.category === catFilter;
    const matchDept = deptFilter === "All Departments";
    return matchSearch && matchCat && matchDept;
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", formData.title);
      fd.append("category", formData.category);
      fd.append("department", formData.department);
      fd.append("description", formData.description);
      const res = await fetch(`${API}/presentations/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        setShowUpload(false);
        setFormData({ ...emptyForm });
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        fetchPresentations();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-200`}>
      <PageHeader
        icon={Monitor}
        iconColor="text-orange-600"
        iconBg="bg-orange-50 dark:bg-orange-900/30"
        title="Presentations Library"
        subtitle="ONGC Ankleshwar · Technical presentations & document library"
        actions={
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Upload
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Search + Filters */}
        <div className={`${cardBg} border ${bdr} rounded-xl p-4 shadow-sm`}>
          <div className="flex flex-col md:flex-row gap-4 mb-3">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${sub}`} />
              <input
                type="text"
                placeholder="Search presentations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-orange-500`}
              />
            </div>
            <div className="relative">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-orange-500`}
              >
                {["All Departments", ...orgDepartments].map((d) => <option key={d}>{d}</option>)}
              </select>
              <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${sub} pointer-events-none`} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  catFilter === c
                    ? "bg-orange-600 text-white"
                    : `${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className={`text-center py-12 ${sub}`}>Loading presentations...</div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-12 ${sub}`}>No presentations found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const icon = getFileIcon(p.mimeType, p.originalName);
              const viewUrl  = `${API}/presentations/${p.id}/view`;
              const dlUrl    = `${API}/presentations/${p.id}/download`;
              return (
                <div key={p.id} className={`${cardBg} border ${bdr} rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-3 rounded-lg ${icon.bg} flex-shrink-0`}>
                      <FileText className={`w-6 h-6 ${icon.color}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className={`font-semibold ${tx} text-sm line-clamp-2`}>{p.title}</h3>
                      {p.category && (
                        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 ${CATEGORY_COLORS[p.category] || "bg-gray-100 text-gray-600"}`}>
                          {p.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 flex-1">
                    {p.originalName && <p className={`text-xs ${sub} truncate`}><span className="font-medium">File:</span> {p.originalName}</p>}
                    {p.uploadedBy && <p className={`text-xs ${sub}`}><span className="font-medium">By:</span> {p.uploadedBy}</p>}
                    <p className={`text-xs ${sub}`}>{new Date(p.createdAt).toLocaleDateString("en-IN")}</p>
                    <p className={`text-xs ${sub}`}>{formatFileSize(p.fileSize)}</p>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <a
                      href={`${viewUrl}?token=${token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        fetch(viewUrl, { headers: { Authorization: `Bearer ${token}` } })
                          .then(r => r.blob())
                          .then(blob => { const url = URL.createObjectURL(blob); window.open(url, '_blank'); });
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </a>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        fetch(dlUrl, { headers: { Authorization: `Bearer ${token}` } })
                          .then(r => r.blob())
                          .then(blob => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = p.originalName || 'file';
                            a.click(); URL.revokeObjectURL(url);
                          });
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${cardBg} rounded-2xl shadow-2xl w-full max-w-lg`}>
            <div className={`flex items-center justify-between p-6 border-b ${bdr}`}>
              <h2 className={`text-lg font-bold ${tx}`}>Upload Presentation</h2>
              <button onClick={() => setShowUpload(false)} className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${sub}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-medium ${sub} mb-1`}>Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-orange-500`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  >
                    {CATEGORIES.filter((c) => c !== "ALL").map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${sub} mb-1`}>Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  >
                    {["All Departments", ...orgDepartments].map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium ${sub} mb-1`}>Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${bdr} ${cardBg} ${tx} text-sm focus:outline-none focus:ring-2 focus:ring-orange-500`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium ${sub} mb-1`}>File *</label>
                <input
                  ref={fileRef}
                  type="file"
                  required
                  accept=".pptx,.pdf,.ppt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className={`w-full text-sm ${tx} file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100`}
                />
                <p className={`text-[10px] ${sub} mt-1`}>Accepted: .pptx, .ppt, .pdf</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className={`flex-1 py-2 rounded-lg border ${bdr} text-sm font-medium ${sub} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="flex-1 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
