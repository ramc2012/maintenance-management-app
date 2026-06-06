import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Calendar,
  CheckCircle,
  ClipboardList,
  Fuel,
  Gauge,
  ShoppingCart,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { Layout } from "../../core/components/Layout";

interface Metric {
  source: string;
  label: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  to: string;
}

const formatCurrency = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;

export const OperationsSummaryPage: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [casesAnalytics, workshop, moh, energy, logbookToday, calibrationEvents, calibrationDue] = await Promise.all([
          axios.get("/api/cases/analytics").then((res) => res.data).catch(() => null),
          axios.get("/api/workshop/dashboard").then((res) => res.data).catch(() => null),
          axios.get("/api/moh/dashboard").then((res) => res.data).catch(() => null),
          axios.get("/api/energy/dashboard").then((res) => res.data).catch(() => null),
          axios.get("/api/operations/overview", { params: { from: today, to: today } }).then((res) => res.data).catch(() => null),
          axios.get("/api/calibration/events").then((res) => res.data).catch(() => []),
          axios.get("/api/calibration/due", { params: { days: 0 } }).then((res) => res.data).catch(() => []),
        ]);

        if (!cancelled) {
          const calibrationDoneToday = Array.isArray(calibrationEvents)
            ? calibrationEvents.filter((event) => String(event.calibrationDate || "").slice(0, 10) === today).length
            : 0;
          setMetrics([
            { source: "Procurement", label: "Active Cases", value: casesAnalytics?.activeCount || 0, icon: Briefcase, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20", to: "/procurement" },
            { source: "Procurement", label: "Closed Cases", value: casesAnalytics?.closedCount || 0, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20", to: "/procurement" },
            { source: "Workshop", label: "Open Jobs", value: (workshop?.overall?.pending || 0) + (workshop?.overall?.inProgress || 0), icon: Wrench, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", to: "/workshop" },
            { source: "Workshop", label: "Completed Jobs", value: workshop?.overall?.completed || 0, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", to: "/workshop" },
            { source: "Major Overhaul", label: "Planned", value: moh?.stats?.planned || 0, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", to: "/moh" },
            { source: "Major Overhaul", label: "In Progress", value: moh?.stats?.inProgress || 0, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", to: "/moh" },
            { source: "Energy", label: "Fuel Cost (30d)", value: formatCurrency(energy?.summary?.totalFuelCost || 0), icon: Fuel, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", to: "/energy" },
            { source: "Energy", label: "Power Usage", value: `${((energy?.summary?.totalElectricKwh || 0) / 1000).toFixed(0)} MWh`, icon: Zap, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-900/20", to: "/energy" },
            { source: "Logbook", label: "Logs Today", value: logbookToday?.stats?.submittedLogs || 0, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", to: "/logbooks" },
            { source: "Logbook", label: "Pending Today", value: logbookToday?.stats?.pendingLogsToday || 0, icon: Gauge, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20", to: "/logbooks" },
            { source: "Calibration", label: "Done Today", value: calibrationDoneToday, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", to: "/calibration" },
            { source: "Calibration", label: "Due Today", value: Array.isArray(calibrationDue) ? calibrationDue.length : 0, icon: Gauge, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-900/20", to: "/calibration" },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const links = [
    { label: "Procurement Status", to: "/procurement", icon: ShoppingCart, color: "text-violet-600" },
    { label: "Equipment Availability", to: "/assets", icon: TrendingUp, color: "text-blue-600" },
    { label: "Maintenance Summary", to: "/workorders", icon: Wrench, color: "text-amber-600" },
    { label: "Energy & Power", to: "/energy", icon: Zap, color: "text-red-600" },
  ];

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operations Summary</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Cross-module operating metrics for procurement, workshop, overhaul, energy, and maintenance status.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Link key={`${metric.source}-${metric.label}`} to={metric.to} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-start justify-between gap-3">
                  <div className={`inline-flex rounded-lg p-2 ${metric.bg}`}>
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                  <div className={`text-right text-2xl font-bold leading-none ${metric.color}`}>{loading ? "..." : metric.value}</div>
                </div>
                <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{metric.source}</div>
                <div className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{metric.label}</div>
              </Link>
            );
          })}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">Linked Views</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                  <span className="flex items-center gap-3 font-semibold text-gray-900 dark:text-white">
                    <Icon className={`h-5 w-5 ${item.color}`} />
                    {item.label}
                  </span>
                  <span className="text-sm text-gray-400">Open</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};
