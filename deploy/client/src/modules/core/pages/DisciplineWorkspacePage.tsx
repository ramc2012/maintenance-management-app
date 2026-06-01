import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Activity,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Gauge,
  Package,
  ShoppingCart,
  Wrench,
  Zap,
  ArrowLeft,
} from "lucide-react";
import { Layout } from "../components/Layout";
import { useAuth } from "../../../context/AuthContext";
import {
  disciplineToLabel,
  disciplineToSegment,
  getWorkspaceModuleHref,
  type Discipline,
} from "../../../utils/workspace";

interface DisciplineWorkspacePageProps {
  discipline: Discipline;
}

const DISCIPLINE_META: Record<Discipline, { icon: React.ComponentType<any>; accent: string; bg: string }> = {
  MECHANICAL: { icon: Wrench, accent: "text-blue-600", bg: "bg-blue-50" },
  ELECTRICAL: { icon: Zap, accent: "text-amber-600", bg: "bg-amber-50" },
  INSTRUMENTATION: { icon: Gauge, accent: "text-emerald-600", bg: "bg-emerald-50" },
};

export const DisciplineWorkspacePage: React.FC<DisciplineWorkspacePageProps> = ({ discipline }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);

  const access = user?.disciplineAccess?.find((entry) => entry.discipline === discipline) || null;
  const meta = DISCIPLINE_META[discipline];
  const DisciplineIcon = meta.icon;

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      try {
        const [woStatsRes, caseAnalyticsRes, opsRes] = await Promise.all([
          axios.get("/api/workorders/stats", { params: { discipline } }).catch(() => ({ data: null })),
          axios.get("/api/cases/analytics", { params: { discipline } }).catch(() => ({ data: null })),
          discipline === "INSTRUMENTATION"
            ? axios.get("/api/calibration/unified/stats").catch(() => ({ data: null }))
            : axios.get("/api/operations/overview", { params: { discipline } }).catch(() => ({ data: null })),
        ]);

        if (!cancelled) {
          setSummary({
            workorders: woStatsRes.data,
            procurement: caseAnalyticsRes.data,
            operations: opsRes.data,
          });
        }
      } catch {
        if (!cancelled) {
          setSummary(null);
        }
      }
    };

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [discipline]);

  const modules = useMemo(() => {
    const base = [
      { key: "equipment", label: "Equipment Master", icon: Package, description: "Registry and history for this discipline." },
      { key: "operations", label: "Operations Summary", icon: BarChart3, description: "Cross-module operating metrics before execution queues." },
      { key: "workorders", label: "Work Orders", icon: ClipboardList, description: "Execution, approvals, and closure for scoped work." },
      { key: "reports", label: "Field Reports", icon: FileText, description: "Daily reports and maintenance history for this discipline." },
      { key: "procurement", label: "Procurement", icon: ShoppingCart, description: access?.canUpdateProcurement ? "Update and track procurement workflow." : "View procurement status and raise requirements." },
      { key: "manuals", label: "Manuals & Drawings", icon: BookOpen, description: "Discipline-specific manuals, drawings, and procedures." },
    ];

    if (discipline === "INSTRUMENTATION") {
      return [
        ...base,
        { key: "calibration", label: "Calibration", icon: Activity, description: "Calibration dashboard, records, and due schedule." },
        { key: "history", label: "Instrument History", icon: ClipboardCheck, description: "Maintenance plus calibration history for instruments." },
      ];
    }

    return [
      ...base,
      { key: "logbook", label: "Digital Logbook", icon: Activity, description: "Operational hours, downtime, and discipline logs." },
      { key: "history", label: "Asset History", icon: ClipboardCheck, description: "Equipment maintenance and replacement history." },
    ];
  }, [access?.canUpdateProcurement, discipline]);

  const quickStats = [
    {
      label: "Open WOs",
      value: summary?.workorders?.counts?.open ?? 0,
    },
    {
      label: "Overdue WOs",
      value: summary?.workorders?.counts?.overdue ?? 0,
    },
    {
      label: "Active Cases",
      value: summary?.procurement?.activeCount ?? 0,
    },
    {
      label: discipline === "INSTRUMENTATION" ? "Compliance" : "Assets Logged",
      value:
        discipline === "INSTRUMENTATION"
          ? `${Math.round(Number(summary?.operations?.overallCompliance ?? 0))}%`
          : summary?.operations?.stats?.assetsLoggedToday ?? 0,
    },
  ];

  const sidebarContent = (
    <div className="space-y-2">
      {user?.persona !== "FIELD" ? (
        <button
          onClick={() => navigate("/hub")}
          className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Enterprise Hub
        </button>
      ) : null}

      {modules.map((module) => {
        const Icon = module.icon;
        return (
          <Link
            key={module.key}
            to={`/${disciplineToSegment(discipline)}/${module.key}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
          >
            <Icon className="h-4 w-4 text-gray-500" />
            {module.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <Layout sidebarContent={sidebarContent}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`rounded-2xl p-4 ${meta.bg}`}>
                <DisciplineIcon className={`h-8 w-8 ${meta.accent}`} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Field Workspace</p>
                <h1 className="mt-2 text-3xl font-bold text-gray-900">{disciplineToLabel(discipline)}</h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-600">
                  Smaller workspace for discipline-scoped execution. Managers can still drill in here from the enterprise view, while field teams see only the modules relevant to this discipline.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Access</div>
              <div className="mt-2 text-sm font-semibold text-gray-900">{access?.accessLevel || "VIEW"}</div>
              <div className="mt-1 text-xs text-gray-600">
                Procurement update: {access?.canUpdateProcurement ? "enabled" : "view and requirement raise only"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {quickStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{stat.label}</div>
              <div className="mt-3 text-3xl font-bold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-4 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Workspace Modules</h2>
              <p className="text-sm text-gray-600">Only discipline-relevant workflows are surfaced here.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.key}
                  to={`/${disciplineToSegment(discipline)}/${module.key}`}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`rounded-xl p-3 ${meta.bg}`}>
                      <Icon className={`h-5 w-5 ${meta.accent}`} />
                    </div>
                    <ArrowLeft className="h-4 w-4 rotate-180 text-gray-300 transition group-hover:text-gray-500" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{module.label}</h3>
                  <p className="mt-2 text-sm text-gray-600">{module.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};
