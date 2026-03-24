import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart, Activity, Users, BookOpen,
  Wrench, BarChart2, Database, Package,
  MessageSquare, FileText, GraduationCap, Zap, Hammer,
  HelpCircle, Briefcase, Monitor, ClipboardList,
  Settings, ThumbsUp, Shield,
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { Layout } from "../components/Layout";

interface AppTile {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  link: string;
  external?: boolean;
}

// ── 5 × 4 = 20 tiles, organised by function ──────────────────────────────
const APPS: AppTile[] = [
  // Row 1 — Core Maintenance Operations
  { id: "workorders",    name: "Work Orders",       icon: ClipboardList, color: "text-rose-600",    bg: "bg-rose-50",    link: "/workorders" },
  { id: "assets",        name: "Equipment Master",  icon: Database,      color: "text-blue-600",    bg: "bg-blue-50",    link: "/assets" },
  { id: "logbook",       name: "Digital Logbook",   icon: BookOpen,      color: "text-amber-600",   bg: "bg-amber-50",   link: "/logbooks" },
  { id: "overhaul",      name: "Major Overhaul",    icon: Wrench,        color: "text-orange-600",  bg: "bg-orange-50",  link: "/moh" },
  { id: "workshop",      name: "Workshop",          icon: Hammer,        color: "text-slate-600",   bg: "bg-slate-50",   link: "/workshop" },

  // Row 2 — Inspection, Monitoring & Compliance
  { id: "calibration",   name: "Calibration",       icon: Activity,      color: "text-cyan-600",    bg: "bg-cyan-50",    link: "/calibration" },
  { id: "energy",        name: "Energy",            icon: Zap,           color: "text-yellow-500",  bg: "bg-yellow-50",  link: "/energy" },
  { id: "manuals",       name: "Manuals & Drawings",icon: FileText,      color: "text-teal-600",    bg: "bg-teal-50",    link: "/manuals" },
  { id: "training",      name: "Training",          icon: GraduationCap, color: "text-fuchsia-600", bg: "bg-fuchsia-50", link: "/training" },
  { id: "reports",       name: "Reports",           icon: BarChart2,     color: "text-emerald-600", bg: "bg-emerald-50", link: "/reports" },
  { id: "audit",         name: "Audit",             icon: Shield,        color: "text-red-600",     bg: "bg-red-50",     link: "/audit" },

  // Row 3 — Procurement & Resources
  { id: "procurement",   name: "Procurement",       icon: ShoppingCart,  color: "text-purple-600",  bg: "bg-purple-50",  link: "/procurement" },
  { id: "stock",         name: "Stock & Inventory", icon: Package,       color: "text-indigo-600",  bg: "bg-indigo-50",  link: "/stock" },
  { id: "contracts",     name: "Contracts",         icon: Briefcase,     color: "text-sky-600",     bg: "bg-sky-50",     link: "/contracts" },
  { id: "manpower",      name: "Manpower",          icon: Users,         color: "text-pink-600",    bg: "bg-pink-50",    link: "/manpower" },
  { id: "presentations", name: "Presentations",     icon: Monitor,       color: "text-violet-600",  bg: "bg-violet-50",  link: "/presentations" },

  // Row 4 — Communication & System
  { id: "collab",        name: "Collaboration",     icon: MessageSquare, color: "text-blue-500",    bg: "bg-blue-50",    link: "/collaboration" },
  { id: "feedback",      name: "Feedback",          icon: ThumbsUp,      color: "text-teal-500",    bg: "bg-teal-50",    link: "/feedback" },
  { id: "settings",      name: "Settings",          icon: Settings,      color: "text-gray-600",    bg: "bg-gray-100",   link: "/settings" },
];

// Row labels shown as subtle dividers between groups
const ROW_LABELS: Record<number, string> = {
  0:  "Core Maintenance Operations",
  5:  "Inspection, Monitoring & Compliance",
  11: "Procurement & Resources",
  16: "Communication & System",
};

const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:3003/api";

export const EnterpriseHub = () => {
  const { themeMode } = useTheme();
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      try {
        const endpoints: [string, string][] = [
          ['workorders', '/api/maintenance-requests'],
          ['assets', '/api/equipment/running-equip'],
          ['calibration', '/api/instruments'],
          ['contracts', '/api/contracts'],
          ['presentations', '/api/presentations'],
          ['training', '/api/training'],
          ['energy', '/api/energy/daily-logs'],
          ['workshop', '/api/workshop'],
          ['moh', '/api/moh'],
          ['audit', '/api/audit/observations'],
          ['manuals', '/api/manuals/repository'],
        ];

        await Promise.all(endpoints.map(async ([key, url]) => {
          try {
            const res = await fetch(`${API}${url}`, { headers });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) counts[key] = data.length;
              else if (data.data) counts[key] = data.pagination?.total || data.data.length;
              else if (data.folders) counts[key] = data.folders.length;
              else if (data.total !== undefined) counts[key] = data.total;
              else if (data.requests) counts[key] = data.requests.length;
            }
          } catch {}
        }));

        setModuleCounts(counts);
      } catch {}
    };

    fetchCounts();
  }, []);
  const isDark  = themeMode === "dark";
  const isSepia = themeMode === "sepia";

  const cardBg  = isDark ? "bg-gray-800 border-gray-700" : isSepia ? "bg-amber-100/60 border-amber-200" : "bg-white border-gray-200";
  const titleCls = isDark ? "text-white" : isSepia ? "text-amber-900" : "text-gray-900";
  const subCls   = isDark ? "text-gray-400" : isSepia ? "text-amber-700" : "text-gray-500";
  const labelCls = isDark ? "text-gray-500" : isSepia ? "text-amber-600" : "text-gray-400";

  const renderTile = (app: AppTile) => {
    const inner = (
      <>
        {moduleCounts[app.id] > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-sm">
            {moduleCounts[app.id] > 999 ? '999+' : moduleCounts[app.id]}
          </span>
        )}
        <div className={`p-3 rounded-xl ${app.bg} mb-3 group-hover:scale-110 transition-transform duration-200`}>
          <app.icon className={`w-7 h-7 ${app.color}`} />
        </div>
        <span className={`text-xs font-semibold text-center leading-tight ${titleCls}`}>{app.name}</span>
      </>
    );
    const cls = `relative flex flex-col items-center justify-center p-4 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer ${cardBg}`;

    return app.external ? (
      <a key={app.id} href={app.link} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    ) : (
      <Link key={app.id} to={app.link} className={cls}>
        {inner}
      </Link>
    );
  };

  return (
    <Layout>
      {/* Page scrolls inside Layout's <main> */}
      <div className="p-6 max-w-screen-xl mx-auto w-full">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className={`flex items-center justify-between mb-6 pb-5 border-b ${isDark ? "border-gray-700" : isSepia ? "border-amber-200" : "border-gray-200"}`}>
          <div className="flex items-center gap-4">
            <img src="/ongc_logo.jpg" alt="ONGC" className="w-14 h-14 object-contain flex-none" />
            <div>
              <h1 className={`text-xl font-bold leading-tight ${titleCls}`}>
                Maintenance Information System
              </h1>
              <p className="text-sm font-semibold text-red-600 mt-0.5">ONGC · Ankleshwar Asset</p>
              <p className={`text-xs mt-0.5 ${subCls}`}>Integrated Operations & Maintenance Platform</p>
            </div>
          </div>
          <a
            href="/help.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors border border-purple-200 dark:border-purple-700 text-sm font-medium"
          >
            <HelpCircle className="w-4 h-4" /> User Guide
          </a>
        </div>

        {/* ── Tile grid with section labels ───────────────────── */}
        <div className="space-y-5">
          {[0, 5, 10, 15].map((startIdx) => (
            <div key={startIdx}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${labelCls}`}>
                {ROW_LABELS[startIdx]}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {APPS.slice(startIdx, startIdx + 5).map(renderTile)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};
