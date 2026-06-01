import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart, Activity, Users, BookOpen,
  Wrench, Clipboard, BarChart2, Database,
  MessageSquare, FileText, GraduationCap, Zap, Hammer, HelpCircle,
  ClipboardList, Briefcase, Monitor, BarChart, ClipboardCheck,
  AlertTriangle, CheckCircle, Clock, TrendingUp
} from "lucide-react";
import { Layout } from "../components/Layout";
import { useAuth } from "../../../context/AuthContext";
import { Tag } from "antd";
import { disciplineToLabel, getDefaultDiscipline } from "../../../utils/workspace";

const token = () => localStorage.getItem('token');
const jsonHeaders = () => ({ Authorization: `Bearer ${token()}` });

const ALL_APPS = [
  { id: "assets", name: "Equipment Master", icon: Database, color: "text-blue-600", bg: "bg-blue-50", link: "/assets", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR'] },
  { id: "operations", name: "Operations Summary", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50", link: "/operations", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR', 'TECHNICIAN', 'USER', 'VIEWER'] },
  { id: "workorders", name: "Work Orders", icon: ClipboardList, color: "text-teal-600", bg: "bg-teal-50", link: "/workorders", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR', 'TECHNICIAN', 'USER'] },
  { id: "calibration", name: "Calibration", icon: Activity, color: "text-green-600", bg: "bg-green-50", link: "/calibration", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR', 'TECHNICIAN'] },
  { id: "logbook", name: "Digital Logbook", icon: BookOpen, color: "text-amber-600", bg: "bg-amber-50", link: "/logbooks", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR', 'TECHNICIAN', 'USER'] },
  { id: "overhaul", name: "Major Overhaul", icon: Wrench, color: "text-orange-600", bg: "bg-orange-50", link: "/moh", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR'] },
  { id: "workshop", name: "Workshop", icon: Hammer, color: "text-yellow-500", bg: "bg-yellow-50", link: "/workshop", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR', 'TECHNICIAN'] },
  { id: "inspections", name: "Inspections", icon: ClipboardCheck, color: "text-teal-700", bg: "bg-teal-50", link: "/inspections", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR', 'TECHNICIAN', 'USER'] },
  { id: "kpis", name: "KPI Dashboard", icon: BarChart, color: "text-violet-600", bg: "bg-violet-50", link: "/kpis", roles: ['ADMIN', 'HOD', 'ENGINEER'] },
  { id: "procurement", name: "Procurement", icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-50", link: "/procurement", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR'] },
  { id: "contracts", name: "Contracts", icon: Briefcase, color: "text-blue-700", bg: "bg-blue-50", link: "/contracts", roles: ['ADMIN', 'HOD'] },
  { id: "energy", name: "Energy", icon: Zap, color: "text-red-600", bg: "bg-red-50", link: "/energy", roles: ['ADMIN', 'HOD', 'ENGINEER'] },
  { id: "stock", name: "Stock / MRP", icon: Clipboard, color: "text-indigo-600", bg: "bg-indigo-50", link: "/stock", roles: ['ADMIN', 'HOD', 'ENGINEER'] },
  { id: "training", name: "Training", icon: GraduationCap, color: "text-cyan-600", bg: "bg-cyan-50", link: "/training", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR', 'TECHNICIAN', 'USER'] },
  { id: "manpower", name: "Manpower", icon: Users, color: "text-pink-600", bg: "bg-pink-50", link: "/manpower", roles: ['ADMIN', 'HOD'] },
  { id: "reports", name: "Reports", icon: BarChart2, color: "text-emerald-600", bg: "bg-emerald-50", link: "/reports", roles: ['ADMIN', 'HOD', 'ENGINEER'] },
  { id: "collab", name: "Collaboration", icon: MessageSquare, color: "text-violet-600", bg: "bg-violet-50", link: "/collaboration", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR', 'TECHNICIAN', 'USER'] },
  { id: "manuals", name: "Manuals & Drawings", icon: FileText, color: "text-teal-500", bg: "bg-teal-50", link: "/manuals", roles: ['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR', 'TECHNICIAN', 'USER'] },
  { id: "presentations", name: "Presentations", icon: Monitor, color: "text-orange-500", bg: "bg-orange-50", link: "/presentations", roles: ['ADMIN', 'HOD', 'ENGINEER'] },
];

interface KPIStrip {
  pmCompliance: number;
  overdueWOs: number;
  availability: number;
  openWOs: number;
}

export const EnterpriseHub = () => {
  const { user } = useAuth();
  const role = user?.role || 'USER';
  const [kpiStrip, setKpiStrip] = useState<KPIStrip | null>(null);
  const defaultDiscipline = getDefaultDiscipline(user);
  useEffect(() => {
    // Fetch quick KPI summary for strip (last 30 days)
    const from = new Date(Date.now() - 30 * 86400000).toISOString();
    const to = new Date().toISOString();
    fetch(`/api/kpi/summary?from=${from}&to=${to}`, { headers: jsonHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setKpiStrip({
            pmCompliance: data.pmCompliance ?? 0,
            overdueWOs: data.overdueWOs ?? 0,
            availability: data.availability ?? 0,
            openWOs: data.overdueList?.length ?? 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const visibleApps = ALL_APPS;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src="/ongc_logo.jpg" alt="ONGC" className="w-20 h-20 object-contain" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Maintenance Management System</h1>
              <p className="text-lg text-red-600 font-semibold mt-1">ONGC Ankleshwar Asset</p>
              <p className="text-gray-500">Integrated platform for maintenance operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{user.username}</div>
                <div className="flex items-center justify-end gap-2">
                  <Tag color="blue" className="text-xs">{role}</Tag>
                  {user.persona ? <Tag color="purple" className="text-xs">{user.persona}</Tag> : null}
                  {defaultDiscipline ? <Tag color="green" className="text-xs">{disciplineToLabel(defaultDiscipline)}</Tag> : null}
                </div>
              </div>
            )}
            <a
              href="/help.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors border border-purple-200 dark:border-purple-700"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-sm font-medium">User Guide</span>
            </a>
          </div>
        </div>

        {/* KPI Strip — visible for ADMIN/HOD/ENGINEER */}
        {kpiStrip && ['ADMIN', 'HOD', 'ENGINEER'].includes(role) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'PM Compliance', value: `${kpiStrip.pmCompliance.toFixed(1)}%`, icon: CheckCircle, color: 'bg-green-500', good: kpiStrip.pmCompliance >= 80 },
              { label: 'Equipment Availability', value: `${kpiStrip.availability.toFixed(1)}%`, icon: TrendingUp, color: 'bg-blue-500', good: kpiStrip.availability >= 90 },
              { label: 'Overdue WOs', value: kpiStrip.overdueWOs, icon: AlertTriangle, color: 'bg-red-500', good: kpiStrip.overdueWOs === 0 },
              { label: 'Avg Response Time', value: '—', icon: Clock, color: 'bg-amber-500', good: null },
            ].map(item => (
              <Link key={item.label} to="/kpis" className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className={`p-2 rounded-lg ${item.color}`}>
                  <item.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                </div>
                {item.good !== null && (
                  <div className={`ml-auto w-2 h-2 rounded-full ${item.good ? 'bg-green-500' : 'bg-red-500'}`} />
                )}
              </Link>
            ))}
          </div>
        )}

        {/* App Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {visibleApps.map((app) => (
            <Link
              key={app.id}
              to={app.link}
              className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group"
            >
              <div className={`p-4 rounded-full ${app.bg} dark:bg-opacity-10 mb-4 group-hover:scale-110 transition-transform`}>
                <app.icon className={`w-8 h-8 ${app.color}`} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-center">{app.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};
