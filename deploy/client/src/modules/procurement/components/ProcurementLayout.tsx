import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LayoutDashboard, ShoppingCart, LogOut, Settings, DollarSign,
  ChevronDown, ChevronRight, Folder, Building,
  Package, Wrench, Briefcase, HardHat, Coins, Home,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";

interface Department { id: string; name: string; }
interface Company    { id: string; name: string; departments: Department[]; }
interface LayoutProps { children: React.ReactNode; }

const CATEGORIES = [
  { key: "STORES",   label: "Stores",    icon: Package,  color: "text-blue-500"    },
  { key: "SPARES",   label: "Spares",    icon: Wrench,   color: "text-amber-500"   },
  { key: "SERVICES", label: "Services",  icon: Briefcase, color: "text-cyan-500"   },
  { key: "CAPITAL",  label: "Capital",   icon: HardHat,  color: "text-emerald-500" },
  { key: "PETTY",    label: "Petty",     icon: Coins,    color: "text-purple-500"  },
];

export const ProcurementLayout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const { accentColor, themeMode } = useTheme();

  const isDark  = themeMode === "dark";
  const isSepia = themeMode === "sepia";

  // ── theme tokens ──────────────────────────────────────────────────────────
  const outerBg  = isDark ? "bg-gray-900"  : isSepia ? "bg-amber-50"       : "bg-gray-50";
  const sidebarBg = isDark ? "bg-gray-800" : isSepia ? "bg-amber-100"      : "bg-white";
  const bdr       = isDark ? "border-gray-700" : isSepia ? "border-amber-200" : "border-gray-200";
  const bdrSub    = isDark ? "border-gray-800" : isSepia ? "border-amber-300" : "border-gray-100";
  const tx        = isDark ? "text-white"  : isSepia ? "text-amber-900"    : "text-gray-900";
  const sub       = isDark ? "text-gray-400" : isSepia ? "text-amber-700"  : "text-gray-500";
  const hover     = isDark ? "hover:bg-gray-700/60 hover:text-white" : isSepia ? "hover:bg-amber-200 hover:text-amber-900" : "hover:bg-gray-100 hover:text-gray-900";
  const footerBg  = isDark ? "bg-gray-900/60" : isSepia ? "bg-amber-200/40" : "bg-gray-50";
  const userCardBg = isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : isSepia ? "bg-amber-50 border-amber-200 hover:bg-amber-100" : "bg-white border-gray-200 hover:bg-gray-50";

  const [orgData, setOrgData] = useState<Company | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [adminExpanded, setAdminExpanded] = useState(true);

  useEffect(() => { fetchOrg(); }, []);

  const fetchOrg = async () => {
    try {
      setOrgLoading(true);
      const res = await axios.get("/api/org/hierarchy");
      setOrgData(res.data);
    } catch (e) {
      console.error("Org hierarchy fetch error:", e);
    } finally {
      setOrgLoading(false);
    }
  };

  useEffect(() => {
    if (orgData) {
      const departmentId = new URLSearchParams(location.search).get("departmentId");
      if (departmentId) setExpandedDepts(prev => ({ ...prev, [departmentId]: true }));
    }
  }, [location.search, orgData]);

  const handleLogout = () => { logout(); navigate("/login"); };
  const handleToggleDept = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setExpandedDepts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const linkCls = (active: boolean) =>
    `flex items-center px-3 py-2 rounded text-sm transition-colors ${
      active
        ? `bg-${accentColor}-600 text-white`
        : `${sub} ${hover}`
    }`;

  const isActiveLink = (path: string, params: Record<string, string> = {}) => {
    if (location.pathname !== path) return false;
    if (!Object.keys(params).length && !location.search) return true;
    const sp = new URLSearchParams(location.search);
    return Object.entries(params).every(([k, v]) => sp.get(k) === v);
  };

  return (
    <div className={`flex h-screen ${outerBg} ${tx} transition-colors duration-200`}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className={`w-64 flex-none flex flex-col border-r ${sidebarBg} ${bdr} transition-colors duration-200`}>

        {/* Brand */}
        <div className={`flex flex-col items-center text-center gap-2 p-4 border-b ${bdr}`}>
          <img src="/ongc_logo.jpg" alt="ONGC Logo" className="w-12 h-12 object-contain" />
          <div>
            <p className={`text-[11px] font-extrabold uppercase tracking-wide ${tx}`}>Maintenance MIS</p>
            <p className="text-[10px] font-semibold text-red-600">ONGC · Ankleshwar</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto text-sm">
          {/* Hub shortcut */}
          <Link
            to="/hub"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-xs mb-2"
          >
            <Home className="w-4 h-4 flex-none" /> Maintenance Hub
          </Link>

          <Link to="/procurement" className={linkCls(isActiveLink("/procurement"))}>
            <LayoutDashboard className="w-4 h-4 mr-2 flex-none" /> Dashboard
          </Link>
          <Link to="/procurement/cases" className={linkCls(isActiveLink("/procurement/cases"))}>
            <ShoppingCart className="w-4 h-4 mr-2 flex-none" /> All Procurements
          </Link>

          {/* Departments tree */}
          {!orgLoading && orgData?.departments && orgData.departments.length > 0 && (
            <div className={`pt-3 mt-2 border-t ${bdr}`}>
              <p className={`mb-1 px-2 text-[10px] font-bold uppercase tracking-wider ${sub}`}>Departments</p>
              {orgData.departments.map(dept => (
                <div key={dept.id}>
                  <button
                    onClick={(e) => handleToggleDept(dept.id, e)}
                    className={`flex w-full items-center justify-between px-3 py-2 rounded text-xs font-semibold ${sub} ${hover} select-none`}
                  >
                    <span className="flex items-center gap-2">
                      <Folder className="w-3.5 h-3.5 text-blue-500 flex-none" />
                      {dept.name}
                    </span>
                    {expandedDepts[dept.id]
                      ? <ChevronDown className="w-3 h-3" />
                      : <ChevronRight className="w-3 h-3" />}
                  </button>

                  {expandedDepts[dept.id] && (
                    <div className={`pl-3 ml-3 border-l ${bdrSub} space-y-0.5 pb-1`}>
                      <Link
                        to={`/procurement?departmentId=${dept.id}`}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${
                          location.search.includes(`departmentId=${dept.id}`) && location.pathname === "/procurement"
                            ? "text-blue-600 font-bold"
                            : `${sub} hover:text-blue-600`
                        }`}
                      >
                        <LayoutDashboard className="w-2.5 h-2.5 flex-none" /> Dashboard
                      </Link>
                      <Link
                        to={`/procurement/cases?departmentId=${dept.id}`}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${
                          location.search.includes(`departmentId=${dept.id}`) && location.pathname === "/procurement/cases" && !location.search.includes("type=")
                            ? "text-blue-600 font-bold"
                            : `${sub} hover:text-blue-600`
                        }`}
                      >
                        All Cases
                      </Link>
                      {CATEGORIES.map(cat => {
                        const CatIcon = cat.icon;
                        const isAct = location.search.includes(`departmentId=${dept.id}`) && location.search.includes(`type=${cat.key}`);
                        return (
                          <Link
                            key={cat.key}
                            to={`/procurement/cases?departmentId=${dept.id}&type=${cat.key}`}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${
                              isAct
                                ? `${tx} font-bold ${isDark ? "bg-gray-700" : isSepia ? "bg-amber-200" : "bg-gray-100"}`
                                : `${sub} hover:text-blue-600`
                            }`}
                          >
                            <CatIcon className={`w-2.5 h-2.5 flex-none ${cat.color}`} />
                            {cat.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* If no depts yet */}
          {!orgLoading && (!orgData?.departments || orgData.departments.length === 0) && (
            <p className={`mt-3 px-3 text-[10px] ${sub} italic`}>
              No departments configured. Go to Org Management to add departments.
            </p>
          )}
        </nav>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className={`border-t ${bdr} ${footerBg}`}>
          {user?.role === "ADMIN" && (
            <div className={`px-2 py-2 border-b ${bdr}`}>
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className={`flex w-full items-center justify-between px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider ${sub} ${hover}`}
              >
                Administration
                {adminExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {adminExpanded && (
                <div className="mt-1 space-y-0.5">
                  <Link to="/procurement/admin/hierarchy" className={linkCls(isActiveLink("/procurement/admin/hierarchy"))}>
                    <Building className="w-4 h-4 mr-2 flex-none" /> Org Management
                  </Link>
                  <Link to="/procurement/budgets" className={linkCls(isActiveLink("/procurement/budgets"))}>
                    <DollarSign className="w-4 h-4 mr-2 flex-none" /> Budget Management
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="p-2 space-y-1">
            <Link
              to="/settings"
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-colors ${userCardBg}`}
            >
              <div className={`w-7 h-7 rounded-full flex-none flex items-center justify-center text-white text-xs font-bold bg-${accentColor}-600`}>
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${tx}`}>{user?.username}</p>
                <p className={`text-[10px] ${sub}`}>{user?.role}</p>
              </div>
              <Settings className={`w-3.5 h-3.5 flex-none ${sub}`} />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full gap-1.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className={`flex-1 overflow-auto ${outerBg} transition-colors duration-200`}>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
