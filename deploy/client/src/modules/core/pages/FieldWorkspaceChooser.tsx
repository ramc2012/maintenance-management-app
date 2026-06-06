import React from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Gauge, Wrench, Zap } from "lucide-react";
import { Layout } from "../components/Layout";
import { useAuth } from "../../../context/AuthContext";
import {
  disciplineToLabel,
  disciplineToSegment,
  getDefaultDiscipline,
  type Discipline,
} from "../../../utils/workspace";

const DISCIPLINE_META: Record<Discipline, { icon: React.ComponentType<any>; accent: string; bg: string; description: string }> = {
  MECHANICAL: {
    icon: Wrench,
    accent: "text-blue-700",
    bg: "bg-blue-50",
    description: "Equipment, work orders, logbooks, reports, procurement, and manuals for rotating and static mechanical assets.",
  },
  ELECTRICAL: {
    icon: Zap,
    accent: "text-amber-700",
    bg: "bg-amber-50",
    description: "Electrical execution workspace with tests, logbook coverage, field reports, and discipline procurement.",
  },
  INSTRUMENTATION: {
    icon: Gauge,
    accent: "text-emerald-700",
    bg: "bg-emerald-50",
    description: "Instrument work orders, calibration, history, reports, manuals, and scoped procurement visibility.",
  },
};

export const FieldWorkspaceChooser = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const disciplineAccess = user.disciplineAccess ?? [];
  const defaultDiscipline = getDefaultDiscipline(user);

  if (user.persona !== "FIELD") {
    return <Navigate to="/hub" replace />;
  }

  if (disciplineAccess.length === 1 && defaultDiscipline) {
    return <Navigate to={`/${disciplineToSegment(defaultDiscipline)}`} replace />;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Field Workspace</p>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">Choose your department workspace</h1>
            <p className="mt-3 text-sm text-gray-600">
              Your login is valid across the full platform, but the field shell only exposes discipline-relevant modules. Choose the workspace you want to operate in for this session.
            </p>
          </div>
        </div>

        {disciplineAccess.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-amber-900">Discipline assignment required</h2>
            <p className="mt-2 text-sm text-amber-800">
              Your account is authenticated, but no field discipline is assigned yet. Ask an administrator or HOD to assign Mechanical, Electrical, or Instrumentation access.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {disciplineAccess.map((entry) => {
              const meta = DISCIPLINE_META[entry.discipline];
              const Icon = meta.icon;
              return (
                <Link
                  key={entry.discipline}
                  to={`/${disciplineToSegment(entry.discipline)}`}
                  className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`rounded-2xl p-4 ${meta.bg}`}>
                      <Icon className={`h-7 w-7 ${meta.accent}`} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-300 transition group-hover:text-gray-500" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-gray-900">{disciplineToLabel(entry.discipline)}</h2>
                  <p className="mt-2 text-sm text-gray-600">{meta.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">{entry.accessLevel}</span>
                    {entry.isDefault ? (
                      <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">Default</span>
                    ) : null}
                    {entry.canUpdateProcurement ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">Procurement Update</span>
                    ) : entry.canRaiseRequirements ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">Raise Requirement</span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};
