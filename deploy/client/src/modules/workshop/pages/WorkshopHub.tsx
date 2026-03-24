import React, { useState } from 'react';
import { Hammer, Wrench, BarChart3, FileText, ClipboardCheck, Settings, Zap } from 'lucide-react';
import { Layout } from '../../core/components/Layout';
import { PageHeader } from '../../../components/PageHeader';
import { useTheme } from '../../../context/ThemeContext';
import { WorkshopDashboard } from '../components/WorkshopDashboard';
import { JobTracking } from '../components/JobTracking';
import { NewJob } from '../components/NewJob';

const JOB_ITEMS = [
  { key: 'dashboard', icon: BarChart3,     label: 'Dashboard' },
  { key: 'jobs',      icon: FileText,      label: 'All Jobs' },
  { key: 'new-job',   icon: ClipboardCheck, label: 'New Job' },
];

const SHOP_ITEMS = [
  { key: 'fabrication', icon: Hammer,   label: 'Fabrication Shop' },
  { key: 'diesel',      icon: Wrench,   label: 'Diesel Shop' },
  { key: 'machine',     icon: Settings, label: 'Machine Shop' },
  { key: 'electrical',  icon: Zap,      label: 'Electrical Shop' },
];

export const WorkshopHub: React.FC = () => {
  const { themeMode } = useTheme();
  const isDark  = themeMode === 'dark';
  const isSepia = themeMode === 'sepia';
  const [activeKey, setActiveKey] = useState('dashboard');

  const itemCls = (active: boolean) => {
    if (active) return 'bg-slate-600 text-white shadow-sm';
    if (isDark)  return 'text-gray-400 hover:bg-gray-700/60 hover:text-white';
    if (isSepia) return 'text-amber-700 hover:bg-amber-100 hover:text-amber-900';
    return 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
  };

  const sectionLabel = (text: string) => (
    <p className={`px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider ${
      isDark ? 'text-gray-500' : isSepia ? 'text-amber-600' : 'text-gray-400'
    }`}>{text}</p>
  );

  const navBtn = ({ key, icon: Icon, label }: { key: string; icon: React.ElementType; label: string }) => (
    <button
      key={key}
      onClick={() => setActiveKey(key)}
      className={`flex items-center gap-3 w-full rounded-lg px-2 py-2 text-sm transition-colors ${itemCls(activeKey === key)}`}
    >
      <Icon className="w-4 h-4 flex-none" />
      <span className="truncate font-medium">{label}</span>
    </button>
  );

  const sidebarContent = (
    <div className="space-y-0.5">
      {sectionLabel('Jobs')}
      {JOB_ITEMS.map(navBtn)}
      {sectionLabel('Shops')}
      {SHOP_ITEMS.map(navBtn)}
    </div>
  );

  const allItems = [...JOB_ITEMS, ...SHOP_ITEMS];
  const sidebarIcons = (
    <>
      {allItems.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          title={label}
          onClick={() => setActiveKey(key)}
          className={`w-full flex justify-center p-2 rounded-lg transition-colors ${
            activeKey === key
              ? 'bg-slate-600 text-white'
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
      case 'dashboard':   return <WorkshopDashboard />;
      case 'jobs':        return <JobTracking />;
      case 'new-job':     return <NewJob />;
      case 'fabrication': return <JobTracking shopFilter="FABRICATION" />;
      case 'diesel':      return <JobTracking shopFilter="DIESEL" />;
      case 'machine':     return <JobTracking shopFilter="MACHINE" />;
      case 'electrical':  return <JobTracking shopFilter="ELECTRICAL" />;
      default:            return <WorkshopDashboard />;
    }
  };

  return (
    <Layout sidebarContent={sidebarContent} sidebarIcons={sidebarIcons}>
      <PageHeader
        icon={Hammer}
        iconColor="text-slate-600"
        iconBg="bg-slate-50 dark:bg-slate-900/30"
        title="Workshop Management"
        subtitle="ONGC Ankleshwar · Job tracking & shop-wise management"
      />
      <div className="flex-1 overflow-auto p-6">
        {renderContent()}
      </div>
    </Layout>
  );
};

export default WorkshopHub;
