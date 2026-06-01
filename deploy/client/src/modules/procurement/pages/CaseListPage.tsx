import React, { useEffect, useState } from "react";
import axios from "axios";
import { ProcurementLayout } from "../components/ProcurementLayout";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Search, Plus, DollarSign, Briefcase, FileText, Trash2, MessageSquare, Building, Filter } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTheme, getColorClass } from "../../../context/ThemeContext";
import { parseDiscipline } from "../../../utils/workspace";

interface Comment {
  effectiveDate?: string;
  timestamp: string;
  stageSnapshot: string;
  content: string;
  user?: { username?: string; };
}

interface Department { id: string; name: string; }
interface OrgData { id: string; name: string; departments: Department[]; }

interface Case {
  id: string;
  title: string;
  type: string;
  currentStage: string;
  updatedAt: string;
  createdAt: string;
  createdBy: string;
  vendor?: string;
  prValue?: number;
  poValue?: number;
  currency?: string;
  prNumber?: string;
  poNumber?: string;
  procurementMethod?: string;
  department?: { id: string; name: string };
  comments: Comment[];
}

const STAGES_STANDARD = ["Requirement Raised", "Approval", "PR Release", "Tendering", "Post Bid Evaluation", "PO Released", "QCC", "GRV", "Payment", "Closed"];
const STAGES_PETTY = ["Requirement Raised", "Approval", "Enquiry", "PO Released", "Receipt", "Payment", "Closed"];
const CASE_TYPES = ["STORES", "SPARES", "CAPITAL", "SERVICES", "PETTY"];

export const CaseListPage = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  
  const typeFilter = searchParams.get("type") || "";
  const departmentId = searchParams.get("departmentId") || "";
  const discipline = parseDiscipline(searchParams.get("discipline"));

  const { user, token } = useAuth();
  const { accentColor } = useTheme();

  useEffect(() => { if (token) { fetchOrg(); fetchCases(); } }, [discipline, token, typeFilter, departmentId]);

  const fetchOrg = async () => {
    try { const res = await axios.get("/api/org/hierarchy"); setOrgData(res.data); } 
    catch (e) { console.error(e); }
  };

  const fetchCases = async () => {
    try {
      const params: any = {};
      if (typeFilter) params.type = typeFilter;
      if (departmentId) params.departmentId = departmentId;
      if (discipline) params.discipline = discipline;
      const response = await axios.get("/api/cases", { params });
      setCases(response.data);
    } catch (error) { console.error("Error fetching cases", error); }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value); else newParams.delete(key);
    if (discipline) newParams.set('discipline', discipline);
    setSearchParams(newParams);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to delete this case?")) return;
    try { await axios.delete(`/api/cases/${id}`); fetchCases(); } catch (error) { console.error(error); alert("Failed to delete case."); }
  };

  const filteredCases = cases.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
  const getStages = (type: string) => (type === "PETTY" ? STAGES_PETTY : STAGES_STANDARD);
  const getTypeColor = (type: string) => {
    switch (type) {
      case "STORES": return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "SPARES": return "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200";
      case "CAPITAL": return "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200";
      case "SERVICES": return "bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200";
      case "PETTY": return "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200";
      default: return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300";
    }
  };
  const formatDate = (d: string) => { const dt = new Date(d); return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear().toString().slice(-2)}`; };
  const getLastComment = (comments?: Comment[]) => (!comments || comments.length === 0) ? null : [...comments].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  let pageTitle = "All Procurements";
  if (typeFilter && departmentId) { const dept = orgData?.departments?.find(d => d.id === departmentId); pageTitle = `${typeFilter} - ${dept?.name || 'Department'}`; }
  else if (typeFilter) pageTitle = `${typeFilter} Cases`;
  else if (departmentId) { const dept = orgData?.departments?.find(d => d.id === departmentId); pageTitle = `${dept?.name || 'Department'} Cases`; }

  return (
    <ProcurementLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
        <Link to={`/procurement/create?${departmentId ? `departmentId=${departmentId}&` : ""}${typeFilter ? `type=${typeFilter}&` : ""}${discipline ? `discipline=${discipline}` : ""}`} className={`${getColorClass(accentColor)} text-white px-4 py-2 rounded-lg font-medium flex items-center hover:opacity-90`}><Plus className="w-5 h-5 mr-2" />New Case</Link>
      </div>

      {/* Filter Row */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Filter className="w-4 h-4" /><span className="text-sm font-medium">Filters:</span></div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">Department:</label>
            <select value={departmentId} onChange={(e) => handleFilterChange("departmentId", e.target.value)} className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">All Departments</option>
              {orgData?.departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">Category:</label>
            <select value={typeFilter} onChange={(e) => handleFilterChange("type", e.target.value)} className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">All Categories</option>
              {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(departmentId || typeFilter) && <button onClick={() => setSearchParams(new URLSearchParams(discipline ? { discipline } : undefined))} className="text-xs text-red-500 hover:text-red-700 underline">Clear Filters</button>}
        </div>
      </div>

      <div className="mb-6"><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Search cases by title..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-blue-500" /></div></div>

      <div className="space-y-4">
        {filteredCases.map((c) => {
          const stages = getStages(c.type);
          const currentStageIndex = stages.indexOf(c.currentStage);
          const lastComment = getLastComment(c.comments);
          return (
            <Link key={c.id} to={`/procurement/cases/${c.id}${discipline ? `?discipline=${discipline}` : ''}`} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 transition-all hover:shadow-lg block group relative shadow-sm">
              <button onClick={(e) => handleDelete(e, c.id)} className="absolute top-3 right-3 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 p-1.5 rounded-lg z-20" title="Delete Case"><Trash2 className="w-3.5 h-3.5" /></button>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col md:flex-row justify-between items-start gap-2 pr-20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">{c.title}</h3>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold whitespace-nowrap ${getTypeColor(c.type)}`}>{c.type}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {c.department && <span className="flex items-center text-indigo-600 dark:text-indigo-400 font-medium"><Building className="w-3 h-3 mr-1"/> {c.department.name}</span>}
                      <span className="flex items-center"><Briefcase className="w-3 h-3 mr-1"/> {c.vendor || "No Vendor"}</span>
                      <span className="flex items-center"><DollarSign className="w-3 h-3 mr-1"/> {c.currency || "INR"} {c.prValue ? c.prValue.toLocaleString() : "0.00"}</span>
                      {c.poNumber && <span className="flex items-center"><FileText className="w-3 h-3 mr-1"/> {c.type === "SERVICES" ? "WO" : "PO"}: {c.poNumber}</span>}
                    </div>
                  </div>
                  <div className="w-full md:w-1/3">
                    <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400 mb-0.5"><span>{c.currentStage}</span><span>{Math.round(((currentStageIndex + 1) / stages.length) * 100)}%</span></div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">{stages.map((stage, idx) => <div key={stage} className={`h-full flex-1 border-r border-gray-100 dark:border-gray-800 last:border-0 ${idx <= currentStageIndex ? "bg-green-500" : "bg-transparent"}`} title={stage} />)}</div>
                  </div>
                </div>
                {lastComment ? (
                  <div className="w-full text-sm font-medium text-gray-600 dark:text-gray-200 flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700/50 mt-1">
                    <MessageSquare className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span className="text-blue-600 dark:text-blue-300 font-bold shrink-0">{formatDate(lastComment.timestamp)}</span>
                    <div className="flex items-center gap-1 truncate flex-1"><span className="font-bold text-gray-900 dark:text-white shrink-0">{lastComment.user?.username || "System"}:</span><span className="truncate text-gray-600 dark:text-gray-300">{lastComment.content}</span></div>
                  </div>
                ) : <div className="w-full text-xs text-gray-400 dark:text-gray-500 italic pl-1 mt-1">No activity logged.</div>}
              </div>
            </Link>
          );
        })}
      </div>
      {filteredCases.length === 0 && <div className="text-center py-12 text-gray-500 dark:text-gray-400">No cases found matching your criteria.</div>}
    </ProcurementLayout>
  );
};
