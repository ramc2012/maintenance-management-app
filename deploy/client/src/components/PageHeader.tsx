/**
 * PageHeader — Universal top header bar for all module pages.
 *
 * Usage:
 *   <PageHeader
 *     icon={Briefcase}
 *     iconColor="text-sky-600"
 *     iconBg="bg-sky-50 dark:bg-sky-900/30"
 *     title="Contracts Management"
 *     subtitle="Manage vendor contracts and agreements"
 *     actions={<button>New Contract</button>}
 *   />
 *
 * Always renders a back-to-hub arrow on the left. Pass backTo="/procurement"
 * to override the default "/hub" destination.
 */

import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface PageHeaderProps {
  /** Lucide icon component */
  icon: React.ElementType;
  /** Tailwind text-colour for the icon, e.g. "text-sky-600" */
  iconColor: string;
  /** Tailwind bg classes for the icon box, e.g. "bg-sky-50 dark:bg-sky-900/30" */
  iconBg: string;
  /** Module name shown in large text */
  title: string;
  /** Short descriptor shown below the title */
  subtitle: string;
  /** Route the back arrow navigates to. Defaults to "/hub". */
  backTo?: string;
  /** Optional action buttons rendered on the right side */
  actions?: React.ReactNode;
  /** Extra className for the outer wrapper div */
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  backTo = "/hub",
  actions,
  className = "",
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === "dark";
  const isSepia = themeMode === "sepia";

  const headerBg = isDark
    ? "bg-gray-800 border-gray-700"
    : isSepia
    ? "bg-amber-100/60 border-amber-200"
    : "bg-white border-gray-200";

  const titleCls = isDark
    ? "text-white"
    : isSepia
    ? "text-amber-900"
    : "text-gray-900";

  const subtitleCls = isDark
    ? "text-gray-400"
    : isSepia
    ? "text-amber-700"
    : "text-gray-500";

  const backCls = isDark
    ? "text-gray-400 hover:text-white hover:bg-gray-700"
    : isSepia
    ? "text-amber-700 hover:text-amber-900 hover:bg-amber-200"
    : "text-gray-400 hover:text-gray-700 hover:bg-gray-100";

  const dividerCls = isDark
    ? "border-gray-700"
    : isSepia
    ? "border-amber-200"
    : "border-gray-200";

  return (
    <div
      className={`flex-none border-b ${headerBg} px-5 py-3.5 flex items-center justify-between shadow-sm z-10 ${className}`}
    >
      {/* Left: back arrow + icon + title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Back arrow */}
        <Link
          to={backTo}
          className={`flex-none p-1.5 rounded-lg transition-colors ${backCls}`}
          title="Back to Maintenance Hub"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Vertical divider */}
        <span className={`flex-none h-7 border-l ${dividerCls}`} />

        {/* Module icon */}
        <div className={`flex-none p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>

        {/* Title + subtitle */}
        <div className="min-w-0">
          <h1 className={`text-base font-bold leading-tight truncate ${titleCls}`}>
            {title}
          </h1>
          <p className={`text-[11px] leading-tight truncate ${subtitleCls}`}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: action buttons */}
      {actions && (
        <div className="flex-none flex items-center gap-2 ml-4">{actions}</div>
      )}
    </div>
  );
};
