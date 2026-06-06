import React, { useEffect, useMemo, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { Activity, ClipboardCheck, Flame, Home, Radar, Settings, Wrench, Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../../core/components/Layout';
import { AssetTimeline } from '../components/AssetTimeline';
import { CompressionLog } from '../components/CompressionLog';
import { ElectricalTestLog } from '../components/ElectricalTestLog';
import { MaintenanceLog } from '../components/MaintenanceLog';
import { OperationsOverview } from '../components/OperationsOverview';
import { RunningHoursLog } from '../components/RunningHoursLog';
import { parseDiscipline } from '../../../utils/workspace';

type LogbookCategory = 'mechanical' | 'electrical' | 'process';

export const LogbookHub = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const discipline = parseDiscipline(searchParams.get('discipline'));
  const [category, setCategory] = useState<LogbookCategory>('mechanical');
  const [subView, setSubView] = useState<string>('overview');

  const categories = [
    { id: 'mechanical', label: 'Mechanical', icon: Wrench, color: 'text-blue-500' },
    { id: 'electrical', label: 'Electrical', icon: Zap, color: 'text-amber-500' },
    { id: 'process', label: 'Process', icon: Flame, color: 'text-red-500' },
  ] as const;
  const effectiveCategories = discipline
    ? categories.filter((item) => item.id === (discipline === 'ELECTRICAL' ? 'electrical' : 'mechanical'))
    : categories;

  useEffect(() => {
    if (discipline === 'ELECTRICAL') {
      setCategory('electrical');
      setSubView('overview');
    } else if (discipline === 'MECHANICAL') {
      setCategory('mechanical');
      setSubView('overview');
    }
  }, [discipline]);

  const menu = useMemo(() => {
    if (category === 'electrical') {
      return [
        { id: 'overview', label: 'Operations Overview', icon: Radar },
        { id: 'operations', label: 'Operations Logbook', icon: Activity },
        { id: 'maintenance', label: 'Field Maintenance History', icon: Wrench },
        { id: 'earthpit', label: 'Earth Pit Resistance', icon: Settings },
        { id: 'irvalue', label: 'IR Value Log', icon: Settings },
        { id: 'timeline', label: 'Asset Timeline', icon: Activity },
      ];
    }
    if (category === 'process') {
      return [
        { id: 'overview', label: 'Process Overview', icon: Radar },
        { id: 'compression', label: 'Compressor Process Log', icon: Flame },
        { id: 'parameters', label: 'Operating Parameters', icon: Settings },
        { id: 'timeline', label: 'Asset Timeline', icon: Activity },
      ];
    }
    return [
      { id: 'overview', label: 'Operations Overview', icon: Radar },
      { id: 'operations', label: 'Operations Logbook', icon: Activity },
      { id: 'maintenance', label: 'Field Maintenance History', icon: Wrench },
      { id: 'timeline', label: 'Asset Timeline', icon: Activity },
    ];
  }, [category]);

  const renderContent = () => {
    if (category === 'mechanical') {
      if (subView === 'maintenance') return <MaintenanceLog category="mechanical" />;
      if (subView === 'operations') return <RunningHoursLog category="mechanical" discipline="MECHANICAL" />;
      if (subView === 'timeline') return <AssetTimeline discipline="MECHANICAL" />;
      return <OperationsOverview focus="mechanical" discipline="MECHANICAL" />;
    }

    if (category === 'electrical') {
      if (subView === 'maintenance') return <MaintenanceLog category="electrical" />;
      if (subView === 'operations') return <RunningHoursLog category="electrical" discipline="ELECTRICAL" />;
      if (subView === 'earthpit') return <ElectricalTestLog testType="Earth Pit Resistance" />;
      if (subView === 'irvalue') return <ElectricalTestLog testType="IR Value" />;
      if (subView === 'timeline') return <AssetTimeline discipline="ELECTRICAL" />;
      return <OperationsOverview focus="electrical" discipline="ELECTRICAL" />;
    }

    if (subView === 'parameters') return <CompressionLog showParameters discipline="MECHANICAL" />;
    if (subView === 'timeline') return <AssetTimeline discipline="MECHANICAL" />;
    if (subView === 'compression') return <CompressionLog discipline="MECHANICAL" />;
    return <OperationsOverview focus="process" discipline="MECHANICAL" />;
  };

  const switchCategory = (nextCategory: LogbookCategory) => {
    setCategory(nextCategory);
    setSubView('overview');
  };

  const sidebarIcons = (
    <>
      {effectiveCategories.map((item) => (
        <Tooltip key={item.id} title={item.label} placement="right">
          <button
            onClick={() => switchCategory(item.id)}
            className={`w-full rounded p-2 ${category === item.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <item.icon className={`mx-auto h-5 w-5 ${item.color}`} />
          </button>
        </Tooltip>
      ))}
      <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
      {menu.map((item) => (
        <Tooltip key={item.id} title={item.label} placement="right">
          <button
            onClick={() => setSubView(item.id)}
            className={`w-full rounded p-2 ${subView === item.id ? 'bg-amber-100 dark:bg-amber-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <item.icon className={`mx-auto h-4 w-4 ${subView === item.id ? 'text-amber-600' : 'text-gray-400'}`} />
          </button>
        </Tooltip>
      ))}
    </>
  );

  const sidebarContent = (
    <div className="space-y-4">
      <Button type="primary" icon={<Home className="h-4 w-4" />} onClick={() => navigate('/hub')} className="w-full" ghost>
        Maintenance Hub
      </Button>

      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Logbook Domain
      </div>
      <div className="grid grid-cols-3 gap-2 px-2">
        {effectiveCategories.map((item) => (
          <button
            key={item.id}
            onClick={() => switchCategory(item.id)}
            className={`rounded-lg border p-2 transition-colors ${
              category === item.id
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
            }`}
          >
            <item.icon className={`mx-auto h-5 w-5 ${item.color}`} />
            <div className={`mt-1 text-xs ${category === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
              {item.label}
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-gray-200 px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {category.charAt(0).toUpperCase() + category.slice(1)} Views
      </div>
      <div className="space-y-1">
        {menu.map((item) => (
          <button
            key={item.id}
            onClick={() => setSubView(item.id)}
            className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              subView === item.id
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <item.icon className={`mr-3 h-4 w-4 ${subView === item.id ? 'text-amber-600' : 'text-gray-400'}`} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Layout sidebarContent={sidebarContent} sidebarIcons={sidebarIcons}>
      <div className="h-full">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            {React.createElement(categories.find((item) => item.id === category)!.icon, {
              className: `h-5 w-5 ${categories.find((item) => item.id === category)?.color}`,
            })}
            {category.charAt(0).toUpperCase() + category.slice(1)} Digital Logbook
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Operational logs are only for running equipment and compressors. Instruments stay on calibration history and field-report maintenance records.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="small" icon={<Activity className="h-4 w-4" />} onClick={() => navigate('/calibration')}>
              Instrument Calibration
            </Button>
            <Button size="small" icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => navigate('/reports')}>
              Field Reports
            </Button>
          </div>
        </div>
        {renderContent()}
      </div>
    </Layout>
  );
};
