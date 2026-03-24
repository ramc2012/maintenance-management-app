import React, { useState } from 'react';
import { Activity, Target, FileText, ClipboardCheck, Calendar, BarChart3 } from 'lucide-react';
import { Layout } from '../../core/components/Layout';
import { PageHeader } from '../../../components/PageHeader';
import { useTheme } from '../../../context/ThemeContext';
import { CalibrationDashboard } from '../components/CalibrationDashboard';
import { CalibrationRecords } from '../components/CalibrationRecords';
import { CalibrationEntry } from '../components/CalibrationEntry';
import { StandardsRegistry } from '../components/StandardsRegistry';

const NAV_ITEMS = [
  { key: 'dashboard', icon: BarChart3,      label: 'Dashboard' },
  { key: 'records',   icon: FileText,       label: 'Calibration Records' },
  { key: 'new-entry', icon: ClipboardCheck, label: 'New Calibration' },
  { key: 'standards', icon: Target,         label: 'Standards Registry' },
  { key: 'schedule',  icon: Calendar,       label: 'Due Schedule' },
];

export const CalibrationHub: React.FC = () => {
  const { themeMode } = useTheme();
  const isDark  = themeMode === 'dark';
  const isSepia = themeMode === 'sepia';
  const [activeKey, setActiveKey] = useState('dashboard');

  const itemCls = (active: boolean) => {
    if (active) return 'bg-cyan-600 text-white shadow-sm';
    if (isDark)  return 'text-gray-400 hover:bg-gray-700/60 hover:text-white';
    if (isSepia) return 'text-amber-700 hover:bg-amber-100 hover:text-amber-900';
    return 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
  };

  const sidebarContent = (
    <div className="space-y-0.5">
      {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setActiveKey(key)}
          className={`flex items-center gap-3 w-full rounded-lg px-2 py-2 text-sm transition-colors ${itemCls(activeKey === key)}`}
        >
          <Icon className="w-4 h-4 flex-none" />
          <span className="truncate font-medium">{label}</span>
        </button>
      ))}
    </div>
  );

  const sidebarIcons = (
    <>
      {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          title={label}
          onClick={() => setActiveKey(key)}
          className={`w-full flex justify-center p-2 rounded-lg transition-colors ${
            activeKey === key
              ? 'bg-cyan-600 text-white'
              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </>
  );

  const renderContent = () => {
    switch (activeKey) {
      case 'dashboard': return <CalibrationDashboard />;
      case 'records':   return <CalibrationRecords />;
      case 'new-entry': return <CalibrationEntry />;
      case 'standards': return <StandardsRegistry />;
      case 'schedule':  return <CalibrationDashboard showScheduleOnly />;
      default:          return <CalibrationDashboard />;
    }
  };

  return (
    <Layout sidebarContent={sidebarContent} sidebarIcons={sidebarIcons}>
      <PageHeader
        icon={Activity}
        iconColor="text-cyan-600"
        iconBg="bg-cyan-50 dark:bg-cyan-900/30"
        title="Calibration Management"
        subtitle="ONGC Ankleshwar · ISO 10012 compliant instrument calibration"
      />
      <div className="flex-1 overflow-auto p-6">
        {renderContent()}
      </div>
    </Layout>
  );
};

export default CalibrationHub;
