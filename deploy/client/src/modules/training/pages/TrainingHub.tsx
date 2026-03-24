import React, { useState } from 'react';
import { GraduationCap, BarChart3, FileText, ClipboardCheck } from 'lucide-react';
import { Layout } from '../../core/components/Layout';
import { PageHeader } from '../../../components/PageHeader';
import { useTheme } from '../../../context/ThemeContext';
import { TrainingDashboard } from '../components/TrainingDashboard';
import { TrainingRecords } from '../components/TrainingRecords';
import { TrainingEntry } from '../components/TrainingEntry';

const NAV_ITEMS = [
  { key: 'dashboard',    icon: BarChart3,      label: 'Dashboard' },
  { key: 'records',      icon: FileText,       label: 'Training Records' },
  { key: 'new-training', icon: ClipboardCheck, label: 'Record Training' },
];

export const TrainingHub: React.FC = () => {
  const { themeMode } = useTheme();
  const isDark  = themeMode === 'dark';
  const isSepia = themeMode === 'sepia';
  const [activeKey, setActiveKey] = useState('dashboard');

  const itemCls = (active: boolean) => {
    if (active) return 'bg-orange-600 text-white shadow-sm';
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
              ? 'bg-orange-600 text-white'
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
      case 'dashboard':    return <TrainingDashboard />;
      case 'records':      return <TrainingRecords />;
      case 'new-training': return <TrainingEntry />;
      default:             return <TrainingDashboard />;
    }
  };

  return (
    <Layout sidebarContent={sidebarContent} sidebarIcons={sidebarIcons}>
      <PageHeader
        icon={GraduationCap}
        iconColor="text-orange-600"
        iconBg="bg-orange-50 dark:bg-orange-900/30"
        title="Training Management"
        subtitle="ONGC Ankleshwar · Training records & competency tracking"
      />
      <div className="flex-1 overflow-auto p-6">
        {renderContent()}
      </div>
    </Layout>
  );
};

export default TrainingHub;
