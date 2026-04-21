import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ProcurementLayout } from "../components/ProcurementLayout";
import {
  CheckCircle, Clock, DollarSign, Folder,
  Package, Wrench, Briefcase, HardHat, Coins,
  Building2, Tag, ChevronDown, ChevronUp
} from "lucide-react";

const CATEGORIES = ["STORES", "SPARES", "SERVICES", "CAPITAL", "PETTY"];

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string; textColor: string }> = {
  STORES:   { icon: Package,   color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",     textColor: "text-blue-700 dark:text-blue-300" },
  SPARES:   { icon: Wrench,    color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",   textColor: "text-amber-700 dark:text-amber-300" },
  SERVICES: { icon: Briefcase, color: "text-cyan-600",    bg: "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800",     textColor: "text-cyan-700 dark:text-cyan-300" },
  CAPITAL:  { icon: HardHat,   color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800", textColor: "text-emerald-700 dark:text-emerald-300" },
  PETTY:    { icon: Coins,     color: "text-purple-600",  bg: "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800",  textColor: "text-purple-700 dark:text-purple-300" },
};

const CAT_HEADER_COLORS: Record<string, string> = {
  STORES: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200",
  SPARES: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200",
  SERVICES: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200",
  CAPITAL: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200",
  PETTY: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200",
};

interface AnalyticsData {
  fy: string;
  activeCount: number;
  closedCount: number;
  valueBreakdown: Record<string, number>;
  departmentBreakdown?: DeptRow[];
  assetBreakdown?: AssetRow[];
}

interface DeptRow { id: string; name: string; countByType: Record<string, number>; valueByType: Record<string, number>; }
interface AssetRow { tag: string; countByType: Record<string, number>; valueByType: Record<string, number>; }
interface BudgetData { category: string; amount: number; }
interface Department { id: string; name: string; }
interface OrgData { id: string; name: string; departments: Department[]; }

export const DashboardPage = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllDepts, setShowAllDepts] = useState(false);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const departmentId = searchParams.get("departmentId");

  useEffect(() => { if (token) fetchData(); }, [token, departmentId]);

  const normalizeAnalytics = (data: Partial<AnalyticsData> | null | undefined): AnalyticsData | null => {
    if (!data || !data.fy) {
      return null;
    }

    return {
      fy: data.fy,
      activeCount: data.activeCount ?? 0,
      closedCount: data.closedCount ?? 0,
      valueBreakdown: data.valueBreakdown ?? {},
      departmentBreakdown: data.departmentBreakdown ?? [],
      assetBreakdown: data.assetBreakdown ?? [],
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (departmentId) params.departmentId = departmentId;

      const [analyticsRes, orgRes, budgetRes] = await Promise.all([
        axios.get("/api/cases/analytics", { params }),
        axios.get("/api/org/hierarchy"),
        axios.get("/api/budgets", { params: { fy: "2024-25", ...params } })
      ]);
      setAnalytics(normalizeAnalytics(analyticsRes.data));
      setOrgData(orgRes.data);
      setBudgets(budgetRes.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const fmtL = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n === 0) return "—";
    return fmt(n);
  };

  let contextTitle = orgData?.name || "Dashboard";
  let contextIcon = null;
  if (departmentId && orgData) {
    const dept = orgData.departments?.find(d => d.id === departmentId);
    if (dept) { contextTitle = `${orgData.name} › ${dept.name}`; contextIcon = <Folder className="w-4 h-4 mr-2 text-blue-500" />; }
  }

  if (loading) return <ProcurementLayout><div className="flex items-center justify-center h-48 text-gray-500">Loading dashboard…</div></ProcurementLayout>;
  if (!analytics) return <ProcurementLayout><div className="text-red-500 p-4">Error loading data.</div></ProcurementLayout>;

  const departmentBreakdown = analytics.departmentBreakdown ?? [];
  const assetBreakdown = analytics.assetBreakdown ?? [];

  const budgetByCategory: Record<string, number> = {};
  budgets.forEach(b => { budgetByCategory[b.category] = (budgetByCategory[b.category] || 0) + b.amount; });

  const totalValue = CATEGORIES.reduce((s, c) => s + (analytics.valueBreakdown[c] || 0), 0);

  const handleCategoryClick = (cat: string, deptId?: string) => {
    let url = `/procurement/cases?type=${cat}`;
    const dId = deptId || departmentId;
    if (dId) url += `&departmentId=${dId}`;
    navigate(url);
  };

  const DEPT_LIMIT = 5;
  const ASSET_LIMIT = 8;
  const visibleDepts = showAllDepts ? departmentBreakdown : departmentBreakdown.slice(0, DEPT_LIMIT);
  const visibleAssets = showAllAssets ? assetBreakdown : assetBreakdown.slice(0, ASSET_LIMIT);

  return (
    <ProcurementLayout>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">{contextIcon}{contextTitle}</h1>
        <p className="text-xs text-gray-500 mt-0.5">Procurement Dashboard • FY {analytics.fy}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center shadow-sm">
          <Clock className="w-5 h-5 mx-auto text-blue-500 mb-1" />
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.activeCount}</p>
          <p className="text-[11px] text-gray-500 font-medium">Active Cases</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center shadow-sm">
          <CheckCircle className="w-5 h-5 mx-auto text-green-500 mb-1" />
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.closedCount}</p>
          <p className="text-[11px] text-gray-500 font-medium">Closed Cases</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center shadow-sm">
          <DollarSign className="w-5 h-5 mx-auto text-green-500 mb-1" />
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmtL(totalValue)}</p>
          <p className="text-[11px] text-gray-500 font-medium">Total Value</p>
        </div>
      </div>

      {/* Category Breakdown Tiles */}
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Category Breakdown</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {CATEGORIES.map(cat => {
          const cfg = CATEGORY_CONFIG[cat];
          const Icon = cfg.icon;
          const value = analytics.valueBreakdown[cat] || 0;
          const budget = budgetByCategory[cat] || 0;
          const utilization = budget > 0 ? Math.round((value / budget) * 100) : 0;
          const count = departmentBreakdown.reduce((s, d) => s + (d.countByType[cat] || 0), 0)
            || assetBreakdown.reduce((s, a) => s + (a.countByType[cat] || 0), 0);

          return (
            <div
              key={cat}
              className={`rounded-xl p-4 border ${cfg.bg} text-center cursor-pointer hover:opacity-80 hover:shadow-md transition-all`}
              onClick={() => handleCategoryClick(cat)}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${cfg.color}`} />
              <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{cat}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{fmtL(value)}</p>
              {count > 0 && <p className="text-[10px] text-gray-500 mt-0.5">{count} case{count !== 1 ? 's' : ''}</p>}
              {budget > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${utilization > 100 ? 'bg-red-500' : utilization > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                  <p className={`text-[10px] mt-1 font-semibold ${utilization > 100 ? 'text-red-600' : utilization > 75 ? 'text-amber-600' : 'text-green-600'}`}>
                    {utilization}% of budget
                  </p>
                </div>
              )}
              {budget === 0 && <p className="text-[9px] text-gray-400 mt-1">No budget set</p>}
            </div>
          );
        })}
      </div>

      {/* Department-wise Breakdown */}
      {departmentBreakdown.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Department-wise Case Details</h3>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
              {departmentBreakdown.length} dept{departmentBreakdown.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-bold text-gray-600 dark:text-gray-400 min-w-[140px]">Department</th>
                    {CATEGORIES.map(cat => (
                      <th key={cat} className={`text-center px-3 py-3 font-bold min-w-[90px] ${CAT_HEADER_COLORS[cat]}`}>
                        {cat}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 min-w-[90px]">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDepts.map((dept, i) => {
                    const rowTotal = CATEGORIES.reduce((s, c) => s + (dept.valueByType[c] || 0), 0);
                    const rowCount = CATEGORIES.reduce((s, c) => s + (dept.countByType[c] || 0), 0);
                    return (
                      <tr key={dept.id} className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/50'}`}>
                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                          <div className="flex items-center gap-1.5">
                            <Folder className="w-3 h-3 text-blue-400" />
                            {dept.name}
                          </div>
                        </td>
                        {CATEGORIES.map(cat => {
                          const cnt = dept.countByType[cat] || 0;
                          const val = dept.valueByType[cat] || 0;
                          return (
                            <td
                              key={cat}
                              className={`text-center px-3 py-3 cursor-pointer hover:opacity-80 ${cnt > 0 ? 'cursor-pointer' : ''}`}
                              onClick={() => cnt > 0 && handleCategoryClick(cat, dept.id)}
                            >
                              {cnt > 0 ? (
                                <>
                                  <p className={`font-bold ${CATEGORY_CONFIG[cat].textColor}`}>{cnt}</p>
                                  <p className="text-gray-500 dark:text-gray-400 text-[10px]">{fmtL(val)}</p>
                                </>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center px-3 py-3 bg-gray-50/80 dark:bg-gray-700/30">
                          <p className="font-bold text-gray-800 dark:text-gray-200">{rowCount}</p>
                          <p className="text-gray-500 text-[10px]">{fmtL(rowTotal)}</p>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Column totals row */}
                  <tr className="bg-indigo-50 dark:bg-indigo-900/20 border-t-2 border-indigo-200 dark:border-indigo-700">
                    <td className="px-4 py-3 font-bold text-indigo-800 dark:text-indigo-200 text-xs uppercase">All Departments</td>
                    {CATEGORIES.map(cat => {
                      const totalCnt = departmentBreakdown.reduce((s, d) => s + (d.countByType[cat] || 0), 0);
                      const totalVal = departmentBreakdown.reduce((s, d) => s + (d.valueByType[cat] || 0), 0);
                      return (
                        <td key={cat} className="text-center px-3 py-3">
                          {totalCnt > 0 ? (
                            <>
                              <p className={`font-bold ${CATEGORY_CONFIG[cat].textColor}`}>{totalCnt}</p>
                              <p className="text-gray-500 text-[10px]">{fmtL(totalVal)}</p>
                            </>
                          ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                      );
                    })}
                    <td className="text-center px-3 py-3">
                      <p className="font-bold text-indigo-800 dark:text-indigo-200">
                        {departmentBreakdown.reduce((s, d) => s + CATEGORIES.reduce((ss, c) => ss + (d.countByType[c] || 0), 0), 0)}
                      </p>
                      <p className="text-gray-500 text-[10px]">
                        {fmtL(departmentBreakdown.reduce((s, d) => s + CATEGORIES.reduce((ss, c) => ss + (d.valueByType[c] || 0), 0), 0))}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {departmentBreakdown.length > DEPT_LIMIT && (
              <button
                onClick={() => setShowAllDepts(!showAllDepts)}
                className="w-full py-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-center gap-1 border-t border-gray-100 dark:border-gray-700 transition-colors"
              >
                {showAllDepts ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />Show all {departmentBreakdown.length} departments</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Asset (Tag)-wise Breakdown */}
      {assetBreakdown.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Asset-wise Case Details</h3>
            <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full font-semibold">
              {assetBreakdown.length} asset{assetBreakdown.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-bold text-gray-600 dark:text-gray-400 min-w-[140px]">Asset Tag</th>
                    {CATEGORIES.map(cat => (
                      <th key={cat} className={`text-center px-3 py-3 font-bold min-w-[90px] ${CAT_HEADER_COLORS[cat]}`}>
                        {cat}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 min-w-[90px]">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAssets.map((asset, i) => {
                    const rowTotal = CATEGORIES.reduce((s, c) => s + (asset.valueByType[c] || 0), 0);
                    const rowCount = CATEGORIES.reduce((s, c) => s + (asset.countByType[c] || 0), 0);
                    return (
                      <tr key={asset.tag} className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/50'}`}>
                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-orange-400" />
                            <span className="font-mono text-[11px] bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 px-1.5 py-0.5 rounded">
                              {asset.tag}
                            </span>
                          </div>
                        </td>
                        {CATEGORIES.map(cat => {
                          const cnt = asset.countByType[cat] || 0;
                          const val = asset.valueByType[cat] || 0;
                          return (
                            <td
                              key={cat}
                              className={`text-center px-3 py-3 ${cnt > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
                              onClick={() => cnt > 0 && handleCategoryClick(cat)}
                            >
                              {cnt > 0 ? (
                                <>
                                  <p className={`font-bold ${CATEGORY_CONFIG[cat].textColor}`}>{cnt}</p>
                                  <p className="text-gray-500 dark:text-gray-400 text-[10px]">{fmtL(val)}</p>
                                </>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center px-3 py-3 bg-gray-50/80 dark:bg-gray-700/30">
                          <p className="font-bold text-gray-800 dark:text-gray-200">{rowCount}</p>
                          <p className="text-gray-500 text-[10px]">{fmtL(rowTotal)}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {assetBreakdown.length > ASSET_LIMIT && (
              <button
                onClick={() => setShowAllAssets(!showAllAssets)}
                className="w-full py-2.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center justify-center gap-1 border-t border-gray-100 dark:border-gray-700 transition-colors"
              >
                {showAllAssets ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />Show all {assetBreakdown.length} assets</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state when no breakdown data */}
      {departmentBreakdown.length === 0 && assetBreakdown.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">No case data found for FY {analytics.fy}.</p>
          <p className="text-xs mt-1">Create procurement cases to see department and asset breakdowns.</p>
        </div>
      )}
    </ProcurementLayout>
  );
};
