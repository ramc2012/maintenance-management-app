import React, { ReactNode, useState, useEffect, createContext, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut, Settings, LayoutDashboard, ChevronLeft, ChevronRight,
  HelpCircle, Sun, Moon, Coffee,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTheme, ThemeMode } from "../../../context/ThemeContext";
import { Tooltip } from "antd";
import { NotificationBell } from "./NotificationBell";

// ── Sidebar context ────────────────────────────────────────────────────────
export const SidebarContext = createContext<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}>({ collapsed: false, setCollapsed: () => {} });

export const useSidebar = () => useContext(SidebarContext);

// ── Types ──────────────────────────────────────────────────────────────────
interface LayoutProps {
  children: ReactNode;
  sidebarContent?: ReactNode;
  sidebarIcons?: ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────
export const Layout: React.FC<LayoutProps> = ({
  children,
  sidebarContent,
  sidebarIcons,
}) => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, logout } = useAuth();
  const { accentColor, themeMode, setThemeMode } = useTheme();

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved !== null ? JSON.parse(saved) : false; // default: expanded
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  const handleLogout = () => { logout(); navigate("/login"); };

  const isActive = (path: string) => location.pathname === path;

  // Dynamic accent for active nav item
  const navCls = (active: boolean) =>
    active
      ? `bg-${accentColor}-600 text-white shadow-sm`
      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white";

  // ── Theme-specific sidebar colours ────────────────────────────────────
  const isDark  = themeMode === "dark";
  const isSepia = themeMode === "sepia";

  const sidebarBg = isDark
    ? "bg-gray-800 border-gray-700"
    : isSepia
    ? "bg-amber-100 border-amber-200"
    : "bg-white border-gray-200";

  const pageBg = isDark
    ? "bg-gray-900"
    : isSepia
    ? "bg-amber-50"
    : "bg-gray-50";

  const divider = isDark ? "border-gray-700" : isSepia ? "border-amber-200" : "border-gray-200";

  const logoTitleCls = isDark
    ? "text-gray-100"
    : isSepia
    ? "text-amber-900"
    : "text-gray-800";

  const footerBg = isDark
    ? "bg-gray-900/60"
    : isSepia
    ? "bg-amber-200/40"
    : "bg-gray-50";

  const themeSwitcherBg = isDark
    ? "bg-gray-700"
    : isSepia
    ? "bg-amber-200"
    : "bg-gray-100";

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div
        className={`flex h-screen ${pageBg} text-gray-900 dark:text-white transition-colors duration-200 overflow-hidden`}
      >
        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside
          className={`
            relative flex flex-col flex-none border-r
            transition-all duration-300 ease-in-out
            ${collapsed ? "w-14" : "w-60"}
            ${sidebarBg}
          `}
        >
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`
              absolute -right-3 top-6 z-20
              w-6 h-6 rounded-full border flex items-center justify-center
              shadow-md transition-colors
              ${isDark
                ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                : isSepia
                ? "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}
            `}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <ChevronRight className="w-3 h-3" />
              : <ChevronLeft  className="w-3 h-3" />}
          </button>

          {/* ── Brand header ──────────────────────────────────────────── */}
          <div className={`flex items-center gap-2.5 border-b ${divider} px-3 py-3`}>
            <img
              src="/ongc_logo.jpg"
              alt="ONGC"
              className={`
                flex-none object-contain rounded-sm transition-all duration-300
                ${collapsed ? "w-8 h-8" : "w-10 h-10"}
              `}
            />
            {!collapsed && (
              <div className="min-w-0">
                <p className={`text-[11px] font-extrabold uppercase tracking-wide leading-tight truncate ${logoTitleCls}`}>
                  Maintenance MIS
                </p>
                <p className="text-[10px] font-semibold text-red-500 leading-tight">
                  ONGC · Ankleshwar
                </p>
              </div>
            )}
          </div>

          {/* ── Nav ──────────────────────────────────────────────────── */}
          <nav className="flex-1 px-1.5 py-3 space-y-0.5 overflow-y-auto text-sm">
            <Tooltip title={collapsed ? "Maintenance Hub" : ""} placement="right">
              <Link
                to="/hub"
                className={`
                  flex items-center gap-3 rounded-lg px-2 py-2 transition-colors
                  ${collapsed ? "justify-center" : ""}
                  ${navCls(isActive("/hub"))}
                `}
              >
                <LayoutDashboard className="w-4 h-4 flex-none" />
                {!collapsed && <span className="truncate font-medium">Maintenance Hub</span>}
              </Link>
            </Tooltip>

            {/* Module-specific nav items injected by page */}
            {collapsed
              ? sidebarIcons && (
                  <div className={`pt-2 mt-2 border-t ${divider} space-y-0.5`}>
                    {sidebarIcons}
                  </div>
                )
              : sidebarContent && (
                  <div className={`pt-2 mt-2 border-t ${divider}`}>
                    {sidebarContent}
                  </div>
                )}
          </nav>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <div className={`border-t ${divider} ${footerBg} p-2 space-y-1.5`}>
            {!collapsed ? (
              <>
                {/* Help */}
                <a
                  href="/help.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-purple-200 dark:border-purple-800 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 flex-none" />
                  <span className="font-medium">Help & Guide</span>
                </a>

                {/* Theme switcher */}
                <div className={`flex items-center gap-1 p-1 rounded-lg ${themeSwitcherBg}`}>
                  {(
                    [
                      { mode: "light" as ThemeMode, Icon: Sun,    label: "Light", color: "text-yellow-500" },
                      { mode: "dark"  as ThemeMode, Icon: Moon,   label: "Dark",  color: "text-blue-400"   },
                      { mode: "sepia" as ThemeMode, Icon: Coffee, label: "Sepia", color: "text-amber-600"  },
                    ] as const
                  ).map(({ mode, Icon, label, color }) => (
                    <button
                      key={mode}
                      onClick={() => setThemeMode(mode)}
                      title={`Switch to ${label} mode`}
                      className={`
                        flex-1 flex flex-col items-center gap-0.5 py-1 rounded-md
                        text-[9px] font-semibold uppercase tracking-wide transition-colors
                        ${themeMode === mode
                          ? `${isDark ? "bg-gray-600" : "bg-white"} shadow-sm ${color}`
                          : `${isDark ? "text-gray-400 hover:text-gray-200" : isSepia ? "text-amber-500 hover:text-amber-800" : "text-gray-400 hover:text-gray-600"}`}
                      `}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* User card */}
                <Link
                  to="/settings"
                  className={`
                    flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-colors
                    ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700"
                    : isSepia ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
                    : "bg-white border-gray-200 hover:bg-gray-50"}
                  `}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex-none flex items-center justify-center text-white text-xs font-bold bg-${accentColor}-600`}
                  >
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${logoTitleCls}`}>
                      {user?.username}
                    </p>
                    <p className={`text-[10px] truncate ${isDark ? "text-gray-400" : isSepia ? "text-amber-600" : "text-gray-400"}`}>
                      {user?.role}
                    </p>
                  </div>
                  <Settings className={`w-3.5 h-3.5 flex-none ${isDark ? "text-gray-400" : "text-gray-400"}`} />
                </Link>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center w-full gap-1.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </>
            ) : (
              /* Collapsed icon strip */
              <div className="flex flex-col items-center gap-1.5">
                <Tooltip title="Help & Guide" placement="right">
                  <a
                    href="/help.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </a>
                </Tooltip>

                <Tooltip title={`Theme: ${themeMode} (click to cycle)`} placement="right">
                  <button
                    onClick={() => {
                      const m: ThemeMode[] = ["light", "dark", "sepia"];
                      setThemeMode(m[(m.indexOf(themeMode) + 1) % 3]);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {themeMode === "dark"
                      ? <Moon   className="w-4 h-4 text-blue-400"   />
                      : themeMode === "sepia"
                      ? <Coffee className="w-4 h-4 text-amber-600"  />
                      : <Sun    className="w-4 h-4 text-yellow-500" />}
                  </button>
                </Tooltip>

                <Tooltip title="Settings" placement="right">
                  <Link to="/settings" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <Settings className="w-4 h-4 text-gray-400" />
                  </Link>
                </Tooltip>

                <Tooltip title="Sign out" placement="right">
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto flex flex-col">
          {/* Top bar with notification and help */}
          <div className={`flex items-center justify-end gap-3 px-4 py-1.5 border-b ${divider} ${sidebarBg}`}>
            <Tooltip title="User Guide">
              <a href="/help.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-500 transition-colors">
                <HelpCircle className="w-4.5 h-4.5" />
              </a>
            </Tooltip>
            <NotificationBell />
          </div>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
};
