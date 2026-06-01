import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ProcurementLayout } from "../components/ProcurementLayout";
import { ArrowLeft, Folder, Info } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { parseDiscipline } from "../../../utils/workspace";

const CASE_TYPES = ["STORES", "SPARES", "CAPITAL", "SERVICES", "PETTY"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD"];
const PROCESSED_BY_OPTIONS = ["DEPT", "HPO", "CPD"];
const PROCUREMENT_METHODS_SPARES_SERVICES = ["OEM CASE", "OEM RC CASE", "NON OEM LIMITED TENDER", "NON OEM OPEN TENDER", "OTHERS"];
const PROCUREMENT_METHODS_STORES_CAPITAL = ["LIMITED TENDER", "OPEN TENDER", "GEM PROCUREMENT", "OTHERS"];

interface Department { id: string; name: string; companyId: string; }
interface OrgData { id: string; name: string; departments: Department[]; }

export const CreateCasePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  
  // Get context from URL
  const contextType = searchParams.get("type") || "STORES";
  const contextDeptId = searchParams.get("departmentId") || "";
  const discipline = parseDiscipline(searchParams.get("discipline"));

  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [contextInfo, setContextInfo] = useState<{ deptName?: string }>({});
  
  const [formData, setFormData] = useState({
    title: "", type: contextType, vendor: "", vendorCode: "",
    prValue: "", poValue: "", currency: "INR",
    prNumber: "", poNumber: "",
    sanctionFileNumber: "", tenderingFileNumber: "",
    createdAt: new Date().toISOString().split('T')[0],
    procurementMethod: "", category: "", value: "",
    tag: "", processedBy: "",
    primaryDiscipline: discipline || undefined,
    departmentId: contextDeptId
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      void fetchOrg();
    }
  }, [token]);

  useEffect(() => {
    // Auto-fill context when org data loads
    if (orgData && contextDeptId) {
      const dept = orgData.departments.find(d => d.id === contextDeptId);
      if (dept) {
        setFormData(prev => ({ ...prev, departmentId: contextDeptId }));
        setContextInfo({ deptName: dept.name });
      }
    }
  }, [orgData, contextDeptId]);

  const fetchOrg = async () => {
    try { const res = await axios.get("/api/org/hierarchy"); setOrgData(res.data); } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post("/api/cases", formData);
      // Navigate back to contextual page
      if (contextDeptId) navigate(`/procurement/cases?departmentId=${contextDeptId}&type=${formData.type}${discipline ? `&discipline=${discipline}` : ''}`);
      else navigate(formData.type === "PETTY" ? `/procurement/cases?type=PETTY${discipline ? `&discipline=${discipline}` : ''}` : `/procurement/cases${discipline ? `?discipline=${discipline}` : ''}`);
    } catch (error: any) { setError(error.response?.data?.message || "Failed to create case."); }
  };

  const getProcurementMethods = (type: string) => {
    if (type === "SPARES" || type === "SERVICES") return PROCUREMENT_METHODS_SPARES_SERVICES;
    if (type === "STORES" || type === "CAPITAL") return PROCUREMENT_METHODS_STORES_CAPITAL;
    return [];
  };

  const isPetty = formData.type === "PETTY";
  const hasContext = !!contextDeptId;
  const inputClass = "bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

  return (
    <ProcurementLayout>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Create New Case</h1>
          
          {/* Context Banner */}
          {hasContext && (
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg mb-4">
              <Info className="w-3 h-3" />
              Creating for: {contextInfo.deptName}
            </div>
          )}

          {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-2 rounded-lg mb-4 border border-red-200 dark:border-red-700 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className={labelClass}>Case Title *</label>
              <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={`w-full ${inputClass}`} placeholder="e.g., Laptop Procurement" />
            </div>

            {/* Type + Method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Type *</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value, procurementMethod: "" })} className={`w-full ${inputClass}`}>
                  {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {!isPetty && (
                <div>
                  <label className={labelClass}>Procurement Method</label>
                  <select value={formData.procurementMethod} onChange={(e) => setFormData({ ...formData, procurementMethod: e.target.value })} className={`w-full ${inputClass}`}>
                    <option value="">Select</option>
                    {getProcurementMethods(formData.type).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Department - Only show if no context */}
            {!hasContext && (
              <div>
                <label className={labelClass}><Folder className="w-3 h-3 inline mr-1" />Department</label>
                <select value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} className={`w-full ${inputClass}`}>
                  <option value="">--</option>
                  {orgData?.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {/* Vendor + Code */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Vendor</label><input type="text" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} className={`w-full ${inputClass}`} placeholder="Vendor Name" /></div>
              <div><label className={labelClass}>Vendor Code</label><input type="text" value={formData.vendorCode} onChange={(e) => setFormData({ ...formData, vendorCode: e.target.value })} className={`w-full ${inputClass}`} placeholder="VEN-001" /></div>
            </div>

            {isPetty ? (
              <div>
                <label className={labelClass}>Value</label>
                <div className="flex">
                  <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className={`${inputClass} rounded-r-none border-r-0 w-20`}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className={`flex-1 ${inputClass} rounded-l-none`} placeholder="0.00" />
                </div>
              </div>
            ) : (
              <>
                {/* PR */}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>PR Number</label><input type="text" value={formData.prNumber} onChange={(e) => setFormData({ ...formData, prNumber: e.target.value })} className={`w-full ${inputClass}`} /></div>
                  <div>
                    <label className={labelClass}>PR Value</label>
                    <div className="flex">
                      <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className={`${inputClass} rounded-r-none border-r-0 w-16 text-xs`}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                      <input type="number" value={formData.prValue} onChange={(e) => setFormData({ ...formData, prValue: e.target.value })} className={`flex-1 ${inputClass} rounded-l-none`} placeholder="0.00" />
                    </div>
                  </div>
                </div>
                {/* PO */}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>{formData.type === "SERVICES" ? "WO" : "PO"} Number</label><input type="text" value={formData.poNumber} onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })} className={`w-full ${inputClass}`} /></div>
                  <div>
                    <label className={labelClass}>{formData.type === "SERVICES" ? "WO" : "PO"} Value</label>
                    <div className="flex">
                      <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className={`${inputClass} rounded-r-none border-r-0 w-16 text-xs`}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                      <input type="number" value={formData.poValue} onChange={(e) => setFormData({ ...formData, poValue: e.target.value })} className={`flex-1 ${inputClass} rounded-l-none`} placeholder="0.00" />
                    </div>
                  </div>
                </div>
                {/* Files */}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Sanction File No</label><input type="text" value={formData.sanctionFileNumber} onChange={(e) => setFormData({ ...formData, sanctionFileNumber: e.target.value })} className={`w-full ${inputClass}`} /></div>
                  <div><label className={labelClass}>Tendering File No</label><input type="text" value={formData.tenderingFileNumber} onChange={(e) => setFormData({ ...formData, tenderingFileNumber: e.target.value })} className={`w-full ${inputClass}`} /></div>
                </div>
              </>
            )}

            {/* Tag + Processed By */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Tag</label><input type="text" value={formData.tag} onChange={(e) => setFormData({ ...formData, tag: e.target.value })} className={`w-full ${inputClass}`} placeholder="Urgent, Priority" /></div>
              <div>
                <label className={labelClass}>Processed By</label>
                <select value={formData.processedBy} onChange={(e) => setFormData({ ...formData, processedBy: e.target.value })} className={`w-full ${inputClass}`}>
                  <option value="">--</option>
                  {PROCESSED_BY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className={labelClass}>Creation Date</label>
              <input type="date" value={formData.createdAt} onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })} className={`w-full ${inputClass}`} />
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors">Create Case</button>
            </div>
          </form>
        </div>
      </div>
    </ProcurementLayout>
  );
};
