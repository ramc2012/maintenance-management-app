import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ProcurementLayout } from "../components/ProcurementLayout";
import { ArrowLeft, Send, Clock, User, FileText, DollarSign, Briefcase, Calendar, Edit2, Save, X, CheckCircle, Tag, Building } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

interface Comment {
  id: string;
  content: string;
  timestamp: string;
  effectiveDate?: string;
  user: {
    username: string;
  };
  stageSnapshot: string;
}

interface Case {
  id: string;
  title: string;
  type: string;
  currentStage: string;
  updatedAt: string;
  createdAt: string;
  createdBy: string;
  vendor?: string;
  vendorCode?: string;
  prValue?: number;
  poValue?: number;
  currency?: string;
  prNumber?: string;
  poNumber?: string;
  sanctionFileNumber?: string;
  tenderingFileNumber?: string;
  procurementMethod?: string;
  category?: string;
  value?: number;
  tag?: string;
  processedBy?: string;
  department?: { id: string; name: string };
  comments: Comment[];
}

const STAGES_STANDARD = [
  "Requirement Raised",
  "Approval",
  "PR Release",
  "Tendering",
  "Post Bid Evaluation",
  "PO Released",
  "QCC",
  "GRV",
  "Payment",
  "Closed"
];

const STAGES_PETTY = [
  "Requirement Raised",
  "Approval",
  "Enquiry",
  "PO Released",
  "Receipt",
  "Payment",
  "Closed"
];

const CATEGORIES = ["SPARES", "STORES", "SERVICES", "TOOLS", "CONSUMABLES"];

export const CaseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [newComment, setNewComment] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  
  // Stage Update State
  const [selectedStage, setSelectedStage] = useState("");
  const [stageUpdateDate, setStageUpdateDate] = useState(new Date().toISOString().split("T")[0]);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
      vendor: "",
      vendorCode: "",
      prValue: "",
      poValue: "",
      currency: "INR",
      prNumber: "",
      poNumber: "",
      sanctionFileNumber: "",
      tenderingFileNumber: "",
      procurementMethod: "",
      category: "",
      value: "",
      tag: "",
      processedBy: ""
  });

  useEffect(() => {
    if (token && id) {
        fetchCase();
    }
  }, [id, token]);

  const fetchCase = async () => {
    try {
      const response = await axios.get(`/api/cases/${id}`);
      setCaseItem(response.data);
      // Initialize edit form
      setEditForm({
          vendor: response.data.vendor || "",
          vendorCode: response.data.vendorCode || "",
          prValue: response.data.prValue || "",
          poValue: response.data.poValue || "",
          currency: response.data.currency || "INR",
          prNumber: response.data.prNumber || "",
          poNumber: response.data.poNumber || "",
          sanctionFileNumber: response.data.sanctionFileNumber || "",
          tenderingFileNumber: response.data.tenderingFileNumber || "",
          procurementMethod: response.data.procurementMethod || "",
          category: response.data.category || "",
          value: response.data.value || "",
          tag: response.data.tag || "",
          processedBy: response.data.processedBy || ""
      });
      // Initialize stage selector
      if (response.data) {
          const stages = response.data.type === "PETTY" ? STAGES_PETTY : STAGES_STANDARD;
          const currentIndex = stages.indexOf(response.data.currentStage);
          if (currentIndex < stages.length - 1) {
              setSelectedStage(stages[currentIndex + 1]);
          } else {
              setSelectedStage(stages[currentIndex]);
          }
      }
    } catch (error) {
      console.error("Error fetching case", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await axios.post(`/api/cases/${id}/comments`, {
        content: newComment,
        effectiveDate: effectiveDate
      });
      setNewComment("");
      // Force refresh
      await fetchCase();
    } catch (error) {
      console.error("Error adding comment", error);
      alert("Failed to add comment. Please try again.");
    }
  };

  const handleStageUpdate = async () => {
    if (!selectedStage) return;
    try {
      await axios.put(`/api/cases/${id}/stage`, { 
          stage: selectedStage,
          effectiveDate: stageUpdateDate 
      });
      await fetchCase();
    } catch (error) {
      console.error("Error updating stage", error);
      alert("Failed to update stage. Please try again.");
    }
  };

  const handleSaveDetails = async () => {
      try {
          await axios.put(`/api/cases/${id}`, editForm);
          setIsEditing(false);
          await fetchCase();
      } catch (error) {
          console.error("Error updating case details", error);
          alert("Failed to update case details");
      }
  };

  if (loading) return <ProcurementLayout><div>Loading...</div></ProcurementLayout>;
  if (!caseItem) return <ProcurementLayout><div>Case not found</div></ProcurementLayout>;

  const stages = caseItem.type === "PETTY" ? STAGES_PETTY : STAGES_STANDARD;
  const currentStageIndex = stages.indexOf(caseItem.currentStage);
  const poLabel = caseItem.type === "SERVICES" ? "WO" : "PO";
  const isPetty = caseItem.type === "PETTY";

  const getStageEntryDateObj = (stageName: string) => {
      if (stageName === "Requirement Raised") return new Date(caseItem.createdAt);
      if (!caseItem.comments) return null;
      
      const sortedComments = [...caseItem.comments].sort((a, b) => {
          const dateA = new Date(a.effectiveDate || a.timestamp).getTime();
          const dateB = new Date(b.effectiveDate || b.timestamp).getTime();
          return dateA - dateB; 
      });

      const entry = sortedComments.find(c => c.stageSnapshot === stageName);
      if (entry) {
          return new Date(entry.effectiveDate || entry.timestamp);
      }
      return null;
  };

  const getStageDuration = (stageIndex: number) => {
      if (stageIndex >= stages.length - 1) return null; 
      const currentStageName = stages[stageIndex];
      const nextStageName = stages[stageIndex + 1];

      const currentDate = getStageEntryDateObj(currentStageName);
      if (!currentDate) return null;

      const nextDate = getStageEntryDateObj(nextStageName);
      
      if (nextDate) {
          const diffTime = Math.abs(nextDate.getTime() - currentDate.getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      }

      if (stageIndex === currentStageIndex) {
          const diffTime = Math.abs(new Date().getTime() - currentDate.getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return null;
  };

  const getStageColor = (index: number) => {
    if (index < currentStageIndex) return "bg-green-500 text-white";
    if (index === currentStageIndex) return "bg-blue-500 text-white ring-4 ring-blue-500/30";
    return "bg-gray-700 text-gray-400";
  };
  
  const getStageBarColor = (index: number) => {
      const duration = getStageDuration(index);
      if (duration === null) return "bg-gray-700";
      if (duration > 20) return "bg-red-500"; 
      if (duration > 10) return "bg-yellow-500"; 
      return "bg-green-500"; 
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const getCaseAge = () => {
      const start = new Date(caseItem.createdAt).getTime();
      const now = new Date().getTime();
      const diff = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
      return diff;
  };

  const getCurrencySymbol = (curr: string) => {
      switch(curr) {
          case "USD": return "$";
          case "EUR": return "€";
          case "GBP": return "£";
          default: return "₹"; 
      }
  };

  return (
    <ProcurementLayout>
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Cases
        </button>

        {/* Header Section with Timeline */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold">{caseItem.title}</h1>
                        <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full text-xs font-medium">
                        {caseItem.type}
                        </span>
                        {caseItem.category && (
                            <span className="bg-purple-900 text-purple-200 px-2 py-0.5 rounded-full text-xs font-medium">
                                {caseItem.category}
                            </span>
                        )}
                        {caseItem.procurementMethod && (
                            <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full text-xs font-medium border border-gray-600">
                                {caseItem.procurementMethod}
                            </span>
                        )}
                        {caseItem.tag && (
                            <span className="bg-teal-900 text-teal-200 px-2 py-0.5 rounded-full text-xs font-medium border border-teal-800">
                                {caseItem.tag}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center text-gray-400 text-xs gap-4">
                        {caseItem.department && (
                            <span className="flex items-center text-indigo-400 font-medium">
                                <Building className="w-3 h-3 mr-1" />
                                {caseItem.department.name}
                            </span>
                        )}
                        <span className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            Created by {caseItem.createdBy} on {formatDate(caseItem.createdAt)}
                        </span>
                        {caseItem.processedBy && (
                            <span className="flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                Processed by {caseItem.processedBy}
                            </span>
                        )}
                        <span className="flex items-center text-gray-300 bg-gray-700 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3 mr-1" />
                            Age: {getCaseAge()} days
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-400">Current Stage</div>
                    <div className="text-lg font-bold text-blue-400">{caseItem.currentStage}</div>
                </div>
            </div>

            {/* Timeline with Names and Dates - Adjusted for visibility */}
            <div className="border-t border-gray-700 pt-6 overflow-x-auto pb-4">
                <div className="flex items-center justify-between min-w-full px-4">
                    {stages.map((stage, index) => {
                        const duration = getStageDuration(index);
                        const entryDate = getStageEntryDateObj(stage);
                        
                        return (
                    <React.Fragment key={stage}>
                        <div className="relative flex flex-col items-center group">
                        <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center z-10 transition-all ${getStageColor(
                            index
                            )}`}
                        >
                            {/* Small dot instead of number */}
                        </div>
                        <div className="absolute top-6 w-32 text-center -left-14">
                            <div className={`text-[10px] font-bold leading-tight ${index <= currentStageIndex ? "text-white" : "text-gray-500"}`}>
                            {stage}
                            </div>
                            {entryDate && (
                                <div className="text-[9px] text-blue-400 mt-0.5 font-medium">
                                    {formatDate(entryDate.toISOString())}
                                </div>
                            )}
                        </div>
                        </div>
                        {index < stages.length - 1 && (
                        <div className="flex-1 h-0.5 mx-2 relative group-bar bg-gray-700">
                            <div className={`h-full rounded-full ${getStageBarColor(index)}`} style={{ width: "100%" }}></div>
                            {duration !== null && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[9px] text-gray-400">
                                    {duration}d
                                </div>
                            )}
                        </div>
                        )}
                    </React.Fragment>
                    )})}
                </div>
            </div>
        </div>

        {/* Main Content Grid: 40% Details / 60% Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Details (5/12 ≈ 41%) */}
            <div className="lg:col-span-5 space-y-6">
                
                {/* Stage Update Section */}
                {user?.role === "ADMIN" && caseItem.currentStage !== "Closed" && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                    <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 text-blue-400" />
                        Update Stage
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">New Stage</label>
                            <select
                                value={selectedStage}
                                onChange={(e) => setSelectedStage(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            >
                                {stages.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Effective Date</label>
                            <input
                                type="date"
                                value={stageUpdateDate}
                                onChange={(e) => setStageUpdateDate(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <button
                            onClick={handleStageUpdate}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition-colors text-sm"
                        >
                            Update Stage
                        </button>
                    </div>
                </div>
                )}

                {/* Case Details Card */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                        <h2 className="text-lg font-bold text-gray-200">Case Details</h2>
                        {user?.role === "ADMIN" && (
                            !isEditing ? (
                                <button onClick={() => setIsEditing(true)} className="text-blue-400 hover:text-blue-300 flex items-center text-sm">
                                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={handleSaveDetails} className="text-green-400 hover:text-green-300 flex items-center text-sm">
                                        <Save className="w-4 h-4 mr-1" /> Save
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="text-red-400 hover:text-red-300 flex items-center text-sm">
                                        <X className="w-4 h-4 mr-1" /> Cancel
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                    
                    <div className="space-y-4">
                        {/* Category - Only for Petty */}
                        {isPetty && (
                        <div>
                            <div className="text-sm text-gray-400 mb-1 flex items-center"><Tag className="w-4 h-4 mr-1" /> Category</div>
                            {isEditing ? (
                                <select 
                                    value={editForm.category}
                                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                >
                                    <option value="">Select Category</option>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="font-medium text-white">{caseItem.category || "N/A"}</div>
                            )}
                        </div>
                        )}

                        {/* Vendor + Vendor Code */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-gray-400 mb-1 flex items-center"><Briefcase className="w-4 h-4 mr-1" /> Vendor</div>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={editForm.vendor} 
                                        onChange={(e) => setEditForm({...editForm, vendor: e.target.value})}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                    />
                                ) : (
                                    <div className="font-medium text-white">{caseItem.vendor || "N/A"}</div>
                                )}
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 mb-1 flex items-center"><FileText className="w-4 h-4 mr-1" /> Vendor Code</div>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={editForm.vendorCode} 
                                        onChange={(e) => setEditForm({...editForm, vendorCode: e.target.value})}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                    />
                                ) : (
                                    <div className="font-medium text-white">{caseItem.vendorCode || "N/A"}</div>
                                )}
                            </div>
                        </div>

                        {/* Petty Value */}
                        {isPetty ? (
                            <div>
                                <div className="text-sm text-gray-400 mb-1 flex items-center"><DollarSign className="w-4 h-4 mr-1" /> Value</div>
                                {isEditing ? (
                                    <div className="flex gap-1">
                                        <select 
                                            value={editForm.currency}
                                            onChange={(e) => setEditForm({...editForm, currency: e.target.value})}
                                            className="bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white text-xs"
                                        >
                                            <option value="INR">INR</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                        <input 
                                            type="number" 
                                            value={editForm.value} 
                                            onChange={(e) => setEditForm({...editForm, value: e.target.value})}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                        />
                                    </div>
                                ) : (
                                    <div className="font-medium text-white">{getCurrencySymbol(caseItem.currency || "INR")} {caseItem.value ? caseItem.value.toLocaleString() : "N/A"}</div>
                                )}
                            </div>
                        ) : (
                            /* Standard Fields */
                            <>
                            {/* PR Details: Number + Value */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-gray-400 mb-1 flex items-center"><FileText className="w-4 h-4 mr-1" /> PR No</div>
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={editForm.prNumber} 
                                            onChange={(e) => setEditForm({...editForm, prNumber: e.target.value})}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                        />
                                    ) : (
                                        <div className="font-medium text-white">{caseItem.prNumber || "N/A"}</div>
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400 mb-1 flex items-center"><DollarSign className="w-4 h-4 mr-1" /> PR Value</div>
                                    {isEditing ? (
                                        <div className="flex gap-1">
                                            <select 
                                                value={editForm.currency}
                                                onChange={(e) => setEditForm({...editForm, currency: e.target.value})}
                                                className="bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white text-xs"
                                            >
                                                <option value="INR">INR</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                            <input 
                                                type="number" 
                                                value={editForm.prValue} 
                                                onChange={(e) => setEditForm({...editForm, prValue: e.target.value})}
                                                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                            />
                                        </div>
                                    ) : (
                                        <div className="font-medium text-white">{getCurrencySymbol(caseItem.currency || "INR")} {caseItem.prValue ? caseItem.prValue.toLocaleString() : "N/A"}</div>
                                    )}
                                </div>
                            </div>

                            {/* PO Details: Number + Value */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-gray-400 mb-1 flex items-center"><FileText className="w-4 h-4 mr-1" /> {poLabel} No</div>
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={editForm.poNumber} 
                                            onChange={(e) => setEditForm({...editForm, poNumber: e.target.value})}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                        />
                                    ) : (
                                        <div className="font-medium text-white">{caseItem.poNumber || "N/A"}</div>
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400 mb-1 flex items-center"><DollarSign className="w-4 h-4 mr-1" /> {poLabel} Value</div>
                                    {isEditing ? (
                                        <input 
                                            type="number" 
                                            value={editForm.poValue} 
                                            onChange={(e) => setEditForm({...editForm, poValue: e.target.value})}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                        />
                                    ) : (
                                        <div className="font-medium text-white">{getCurrencySymbol(caseItem.currency || "INR")} {caseItem.poValue ? caseItem.poValue.toLocaleString() : "N/A"}</div>
                                    )}
                                </div>
                            </div>

                            {/* Files */}
                            <div>
                                <div className="text-sm text-gray-400 mb-1 flex items-center"><FileText className="w-4 h-4 mr-1" /> Sanction File</div>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={editForm.sanctionFileNumber} 
                                        onChange={(e) => setEditForm({...editForm, sanctionFileNumber: e.target.value})}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                    />
                                ) : (
                                    <div className="font-medium text-white">{caseItem.sanctionFileNumber || "N/A"}</div>
                                )}
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 mb-1 flex items-center"><FileText className="w-4 h-4 mr-1" /> Tendering File</div>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={editForm.tenderingFileNumber} 
                                        onChange={(e) => setEditForm({...editForm, tenderingFileNumber: e.target.value})}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                    />
                                ) : (
                                    <div className="font-medium text-white">{caseItem.tenderingFileNumber || "N/A"}</div>
                                )}
                            </div>
                            
                            {/* Procurement Method */}
                            <div>
                                <div className="text-sm text-gray-400 mb-1 flex items-center"><Briefcase className="w-4 h-4 mr-1" /> Method</div>
                                {isEditing ? (
                                    <select 
                                        value={editForm.procurementMethod}
                                        onChange={(e) => setEditForm({...editForm, procurementMethod: e.target.value})}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                    >
                                        <option value="">Select Method</option>
                                        <option value="OPEN TENDER">OPEN TENDER</option>
                                        <option value="LIMITED TENDER">LIMITED TENDER</option>
                                        <option value="SINGLE TENDER">SINGLE TENDER</option>
                                        <option value="NOMINATION">NOMINATION</option>
                                        <option value="REPEAT ORDER">REPEAT ORDER</option>
                                    </select>
                                ) : (
                                    <div className="font-medium text-white">{caseItem.procurementMethod || "N/A"}</div>
                                )}
                            </div>
                            </>
                        )}

                        {/* Tag */}
                        <div>
                            <div className="text-sm text-gray-400 mb-1 flex items-center"><Tag className="w-4 h-4 mr-1" /> Tag</div>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={editForm.tag} 
                                    onChange={(e) => setEditForm({...editForm, tag: e.target.value})}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                />
                            ) : (
                                <div className="font-medium text-white">{caseItem.tag || "N/A"}</div>
                            )}
                        </div>

                         {/* Processed By */}
                        <div>
                            <div className="text-sm text-gray-400 mb-1 flex items-center"><User className="w-4 h-4 mr-1" /> Processed By</div>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={editForm.processedBy} 
                                    onChange={(e) => setEditForm({...editForm, processedBy: e.target.value})}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                />
                            ) : (
                                <div className="font-medium text-white">{caseItem.processedBy || "N/A"}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Activity Log (7/12 ≈ 58%) */}
            <div className="lg:col-span-7">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 h-full">
                <h2 className="text-xl font-bold mb-6">Activity Log</h2>
                
                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="mb-8 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <div className="flex gap-4 mb-3">
                        <div className="flex-1">
                            <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment or update..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[80px]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Effective Date</label>
                            <input 
                                type="date" 
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Post Comment
                    </button>
                    </div>
                </form>

                {/* Comments List */}
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                    {caseItem.comments?.map((comment) => (
                    <div key={comment.id} className="flex gap-4 group">
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-gray-300">
                            {comment.user?.username?.charAt(0).toUpperCase()}
                        </span>
                        </div>
                        <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white">{comment.user.username}</span>
                            <span className="text-xs text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(comment.timestamp)}
                            </span>
                            {comment.effectiveDate && (
                                <span className="text-xs text-blue-400 border border-blue-900 bg-blue-900/20 px-1.5 rounded">
                                    Effective: {formatDate(comment.effectiveDate)}
                                </span>
                            )}
                            <span className="text-xs text-gray-600 bg-gray-900 px-2 py-0.5 rounded-full">
                                {comment.stageSnapshot || "Unknown Stage"}
                            </span>
                        </div>
                        <p className="text-gray-300 leading-relaxed">{comment.content}</p>
                        </div>
                    </div>
                    ))}
                    
                    {(!caseItem.comments || caseItem.comments.length === 0) && (
                        <div className="text-center text-gray-500 py-8">No activity recorded yet.</div>
                    )}
                </div>
                </div>
            </div>
        </div>
      </div>
    </ProcurementLayout>
  );
};
