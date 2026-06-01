import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

// Core Pages
import { LoginPage } from "./modules/core/pages/LoginPage";
import { SettingsPage } from "./modules/core/pages/SettingsPage";
import { EnterpriseHub } from "./modules/core/pages/EnterpriseHub";
import { DisciplineWorkspacePage } from "./modules/core/pages/DisciplineWorkspacePage";
import { FieldWorkspaceChooser } from "./modules/core/pages/FieldWorkspaceChooser";
import { AssetsHub } from "./modules/assets/pages/AssetsHub";
import { ReportsHub } from "./modules/reports/pages/ReportsHub";
import { OperationsSummaryPage } from "./modules/operations/pages/OperationsSummaryPage";
import { LogbookHub } from "./modules/logbook/pages/LogbookHub";
import { CalibrationHub } from "./modules/calibration/pages/CalibrationHub";
import { TrainingHub } from "./modules/training/pages/TrainingHub";
import { EnergyHub } from "./modules/energy/pages/EnergyHub";
import { WorkshopHub } from "./modules/workshop/pages/WorkshopHub";
import { MOHHub } from "./modules/moh/pages/MOHHub";
import { CollaborationHub } from "./modules/collaboration/pages/CollaborationHub";
import { MRPHub } from "./modules/mrp/pages/MRPHub";
import { ManualsHub } from "./modules/manuals/pages/ManualsHub";
import { ChatInterface } from "./modules/cognitive/ChatInterface";

// Procurement Pages
import { DashboardPage } from "./modules/procurement/pages/DashboardPage";
import { CaseListPage } from "./modules/procurement/pages/CaseListPage";
import { CreateCasePage } from "./modules/procurement/pages/CreateCasePage";
import { CaseDetailPage } from "./modules/procurement/pages/CaseDetailPage";
import { AdminPage } from "./modules/procurement/pages/AdminPage";
import { OrgStructurePage } from "./modules/procurement/pages/OrgStructurePage";
import { BudgetPage } from "./modules/procurement/pages/BudgetPage";
import { UserManagement } from "./modules/manpower/pages/UserManagement";
import { ContractsHub } from "./modules/contracts/pages/ContractsHub";
import { PresentationsHub } from "./modules/presentations/pages/PresentationsHub";
import { WorkOrderHub } from "./modules/workorders/pages/WorkOrderHub";
import { KPIDashboard } from "./modules/kpi/pages/KPIDashboard";
import { InspectionHub } from "./modules/inspections/pages/InspectionHub";
import { getUserHomePath, getWorkspaceModuleHref, shouldRedirectFieldUserFromLegacyRoute, type Discipline } from "./utils/workspace";

const FIELD_MODULES: Record<Discipline, string[]> = {
  MECHANICAL: ["equipment", "operations", "workorders", "reports", "procurement", "manuals", "logbook", "history"],
  ELECTRICAL: ["equipment", "operations", "workorders", "reports", "procurement", "manuals", "logbook", "history"],
  INSTRUMENTATION: ["equipment", "operations", "workorders", "reports", "procurement", "manuals", "calibration", "history"],
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (shouldRedirectFieldUserFromLegacyRoute(user, location.pathname, location.search)) {
    return <Navigate to={getUserHomePath(user)} replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (token && user) {
    const locationState = location.state as { from?: string } | null;
    const requestedPath = locationState?.from;
    const redirectTo: string =
      typeof requestedPath === "string" && requestedPath !== "/login"
        ? requestedPath
        : getUserHomePath(user);
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

const WorkspaceModuleRedirect = ({
  discipline,
  moduleKey,
}: {
  discipline: Discipline;
  moduleKey: string;
}) => <Navigate to={getWorkspaceModuleHref(discipline, moduleKey)} replace />;

const AppContent = () => {
  const { themeMode } = useTheme();
  
  return (
    <ConfigProvider
      theme={{
        algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
             // Optional: Override defaults if needed
             // colorPrimary: '#3b82f6', 
        }
      }}
    >
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          
          {/* Main Hub */}
          <Route path="/" element={
            <ProtectedRoute>
              <EnterpriseHub />
            </ProtectedRoute>
          } />
          <Route path="/hub" element={
            <ProtectedRoute>
              <EnterpriseHub />
            </ProtectedRoute>
          } />
          <Route path="/workspaces" element={<ProtectedRoute><FieldWorkspaceChooser /></ProtectedRoute>} />
          <Route path="/mechanical" element={<ProtectedRoute><DisciplineWorkspacePage discipline="MECHANICAL" /></ProtectedRoute>} />
          <Route path="/electrical" element={<ProtectedRoute><DisciplineWorkspacePage discipline="ELECTRICAL" /></ProtectedRoute>} />
          <Route path="/instrumentation" element={<ProtectedRoute><DisciplineWorkspacePage discipline="INSTRUMENTATION" /></ProtectedRoute>} />
          {Object.entries(FIELD_MODULES).flatMap(([discipline, modules]) =>
            modules.map((moduleKey) => (
              <Route
                key={`${discipline}-${moduleKey}`}
                path={`/${discipline.toLowerCase()}/${moduleKey}`}
                element={
                  <ProtectedRoute>
                    <WorkspaceModuleRedirect discipline={discipline as Discipline} moduleKey={moduleKey} />
                  </ProtectedRoute>
                }
              />
            ))
          )}

          {/* Core User Settings */}
          <Route path="/assets" element={<ProtectedRoute><AssetsHub /></ProtectedRoute>} />
          <Route path="/operations" element={<ProtectedRoute><OperationsSummaryPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsHub /></ProtectedRoute>} />
          <Route path="/logbooks" element={<ProtectedRoute><LogbookHub /></ProtectedRoute>} />
          <Route path="/calibration" element={<ProtectedRoute><CalibrationHub /></ProtectedRoute>} />
          <Route path="/training" element={<ProtectedRoute><TrainingHub /></ProtectedRoute>} />
          <Route path="/energy" element={<ProtectedRoute><EnergyHub /></ProtectedRoute>} />
          <Route path="/workshop" element={<ProtectedRoute><WorkshopHub /></ProtectedRoute>} />
          <Route path="/moh" element={<ProtectedRoute><MOHHub /></ProtectedRoute>} />
          <Route path="/collaboration" element={<ProtectedRoute><CollaborationHub /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><CollaborationHub defaultTab="feedback" /></ProtectedRoute>} />
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />

          {/* Procurement Module Routes */}
          <Route path="/procurement" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="/procurement/cases" element={
            <ProtectedRoute>
              <CaseListPage />
            </ProtectedRoute>
          } />
          
          <Route path="/procurement/create" element={
            <ProtectedRoute>
              <CreateCasePage />
            </ProtectedRoute>
          } />
          
          <Route path="/procurement/cases/:id" element={
            <ProtectedRoute>
              <CaseDetailPage />
            </ProtectedRoute>
          } />
          
          <Route path="/procurement/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
          
          <Route path="/procurement/admin/hierarchy" element={
            <ProtectedRoute>
              <OrgStructurePage />
            </ProtectedRoute>
          } />
          
          <Route path="/procurement/budgets" element={
            <ProtectedRoute>
              <BudgetPage />
            </ProtectedRoute>
          } />
          
                  <Route path="/stock" element={<ProtectedRoute><MRPHub /></ProtectedRoute>} />
          <Route path="/manuals" element={<ProtectedRoute><ManualsHub /></ProtectedRoute>} />
          <Route path="/manpower" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/contracts" element={<ProtectedRoute><ContractsHub /></ProtectedRoute>} />
          <Route path="/presentations" element={<ProtectedRoute><PresentationsHub /></ProtectedRoute>} />
          <Route path="/workorders" element={<ProtectedRoute><WorkOrderHub /></ProtectedRoute>} />
          <Route path="/kpis" element={<ProtectedRoute><KPIDashboard /></ProtectedRoute>} />
          <Route path="/inspections" element={<ProtectedRoute><InspectionHub /></ProtectedRoute>} />
        </Routes>
        <ChatInterface />
      </AuthProvider>
    </ConfigProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
