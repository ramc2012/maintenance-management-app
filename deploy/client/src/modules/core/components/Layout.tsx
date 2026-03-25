import React, { ReactNode, useState, useEffect, createContext, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, Settings, LayoutDashboard, BookOpen, BookOpenCheck, HelpCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { Tooltip } from "antd";
import { NotificationBell } from "./NotificationBell";

// Create context for sidebar state
export const SidebarContext = createContext<{ collapsed: boolean; setCollapsed: (v: boolean) => void }>({ collapsed: true, setCollapsed: () => {} });

export const useSidebar = () => useContext(SidebarContext);

interface LayoutProps {
  children: ReactNode;
  sidebarContent?: ReactNode;
  sidebarIcons?: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, sidebarContent, sidebarIcons }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { accentColor } = useTheme();
  
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActiveLink = (path: string) => location.pathname === path;
  
  const getAccentClass = (isActive: boolean) => {
    if (!isActive) return "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white";
    return "bg-" + accentColor + "-600 text-white";
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {collapsed ? <BookOpen className="w-5 h-5 text-blue-600" /> : <BookOpenCheck className="w-5 h-5 text-blue-600" />}
        </button>

        <div className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300`}>
          
          <div className="p-4 pt-14 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center text-center gap-2">
              <img src="/ongc_logo.jpg" alt="Logo" className={`${collapsed ? 'w-10 h-10' : 'w-16 h-16'} object-contain transition-all`} />
              {!collapsed && (
                <div>
                  <h1 className="text-xs font-bold text-gray-900 dark:text-white uppercase">Maintenance Hub</h1>
                  <p className="text-[10px] text-red-600">ANKLESHWAR ASSET</p>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto text-sm">
            <Tooltip title={collapsed ? "Maintenance Hub" : ""} placement="right">
              <Link to="/" className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded transition-colors ${getAccentClass(isActiveLink("/"))}`}>
                <LayoutDashboard className="w-5 h-5" />{!collapsed && <span className="ml-3">Maintenance Hub</span>}
              </Link>
            </Tooltip>

            {collapsed ? (
              sidebarIcons && (
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  {sidebarIcons}
                </div>
              )
            ) : (
              sidebarContent && (
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                  {sidebarContent}
                </div>
              )
            )}
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-700 mt-auto bg-gray-50/50 dark:bg-gray-900/50 p-2">
            {!collapsed ? (
              <>
                <a href="/help.html" target="_blank" rel="noopener noreferrer" className="flex items-center px-3 py-2 mb-2 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  <span className="text-xs font-medium">User Guide</span>
                </a>
                <Link to="/settings" className="flex items-center px-3 py-2 rounded hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className={`w-8 h-8 rounded-full bg-${accentColor}-600 flex items-center justify-center text-white text-xs font-bold mr-3`}>
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{user?.username}</p>
                    <p className="text-[10px] text-gray-500">{user?.role}</p>
                  </div>
                  <Settings className="w-4 h-4 text-gray-400" />
                </Link>
                <button onClick={handleLogout} className="flex items-center justify-center w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded mt-2">
                  <LogOut className="w-3.5 h-3.5 mr-2" />Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <Tooltip title="Help & Guide" placement="right">
                  <a href="/help.html" target="_blank" rel="noopener noreferrer" className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"><HelpCircle className="w-4 h-4" /></a>
                </Tooltip>
                <Tooltip title="Settings" placement="right">
                  <Link to="/settings" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Settings className="w-4 h-4" /></Link>
                </Tooltip>
                <Tooltip title="Logout" placement="right">
                  <button onClick={handleLogout} className="p-2 text-red-600 hover:bg-red-50 rounded"><LogOut className="w-4 h-4" /></button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          {/* Top bar with notification bell */}
          <div className="sticky top-0 z-10 flex justify-end items-center px-6 py-2 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
            <NotificationBell />
          </div>
          <div className="p-6 pl-8">{children}</div>
        </div>
      </div>
    </SidebarContext.Provider>
  );
};
