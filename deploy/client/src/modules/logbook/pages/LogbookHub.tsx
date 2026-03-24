import React, { useState } from 'react';
import { Layout } from '../../core/components/Layout';
import { FileText, Activity, Gauge, Wrench, Zap, Flame, Settings, Home } from 'lucide-react';
import { MaintenanceLog } from '../components/MaintenanceLog';
import { RunningHoursLog } from '../components/RunningHoursLog';
import { CompressionLog } from '../components/CompressionLog';
import { ElectricalTestLog } from '../components/ElectricalTestLog';
import { useNavigate } from 'react-router-dom';
import { Button, Tooltip } from 'antd';

export const LogbookHub = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<'mechanical' | 'electrical' | 'process'>('mechanical');
  const [subView, setSubView] = useState<string>('maintenance');

  const categories = [
    { id: 'mechanical', label: 'Mechanical', icon: Wrench, color: 'text-blue-500' },
    { id: 'electrical', label: 'Electrical', icon: Zap, color: 'text-yellow-500' },
    { id: 'process', label: 'Process', icon: Flame, color: 'text-red-500' },
  ];

  const getMechanicalMenu = () => [
    { id: 'maintenance', label: 'Maintenance Log', icon: FileText },
    { id: 'running', label: 'Running Hours Log', icon: Activity },
  ];

  const getElectricalMenu = () => [
    { id: 'maintenance', label: 'Maintenance Log', icon: FileText },
    { id: 'running', label: 'Running Hours Log', icon: Activity },
    { id: 'earthpit', label: 'Earth Pit Resistance', icon: Settings },
    { id: 'irvalue', label: 'IR Value Log', icon: Gauge },
  ];

  const getProcessMenu = () => [
    { id: 'compression', label: 'Gas Compression Log', icon: Gauge },
    { id: 'parameters', label: 'Compressor Parameters', icon: Settings },
  ];

  const getMenu = () => {
    switch (category) {
      case 'mechanical': return getMechanicalMenu();
      case 'electrical': return getElectricalMenu();
      case 'process': return getProcessMenu();
      default: return getMechanicalMenu();
    }
  };

  const renderContent = () => {
    if (category === 'mechanical') {
      switch (subView) {
        case 'maintenance': return <MaintenanceLog category={category} />;
        case 'running': return <RunningHoursLog category={category} />;
        default: return <MaintenanceLog category={category} />;
      }
    } else if (category === 'electrical') {
      switch (subView) {
        case 'maintenance': return <MaintenanceLog category={category} />;
        case 'running': return <RunningHoursLog category={category} />;
        case 'earthpit': return <ElectricalTestLog testType="Earth Pit Resistance" />;
        case 'irvalue': return <ElectricalTestLog testType="IR Value" />;
        default: return <MaintenanceLog category={category} />;
      }
    } else if (category === 'process') {
      switch (subView) {
        case 'compression': return <CompressionLog />;
        case 'parameters': return <CompressionLog showParameters />;
        default: return <CompressionLog />;
      }
    }
    return <MaintenanceLog category={category} />;
  };

  // Icons for collapsed sidebar
  const SidebarIcons = (
    <>
      {categories.map(cat => (
        <Tooltip key={cat.id} title={cat.label} placement="right">
          <button onClick={() => { setCategory(cat.id as any); setSubView(cat.id === 'process' ? 'compression' : 'maintenance'); }}
            className={`w-full flex justify-center p-2 rounded ${category === cat.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <cat.icon className={`w-5 h-5 ${cat.color}`} />
          </button>
        </Tooltip>
      ))}
      <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
      {getMenu().map(item => (
        <Tooltip key={item.id} title={item.label} placement="right">
          <button onClick={() => setSubView(item.id)}
            className={`w-full flex justify-center p-2 rounded ${subView === item.id ? 'bg-amber-100 dark:bg-amber-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <item.icon className={`w-4 h-4 ${subView === item.id ? 'text-amber-600' : 'text-gray-400'}`} />
          </button>
        </Tooltip>
      ))}
    </>
  );

  const SidebarContent = (
    <div className="space-y-4">
      <Button type="primary" icon={<Home className="w-4 h-4" />} onClick={() => navigate("/hub")} className="w-full" ghost>
        Maintenance Hub
      </Button>
      
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
        Logbook Category
      </div>
      <div className="grid grid-cols-3 gap-2 px-2">
        {categories.map(cat => (
          <button key={cat.id}
            onClick={() => { setCategory(cat.id as any); setSubView(cat.id === 'process' ? 'compression' : 'maintenance'); }}
            className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${
              category === cat.id ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400'
                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}`}>
            <cat.icon className={`w-5 h-5 ${cat.color}`} />
            <span className={`text-xs mt-1 ${category === cat.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>{cat.label}</span>
          </button>
        ))}
      </div>
      
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
        {(category || '').charAt(0).toUpperCase() + (category || '').slice(1)} Logs
      </div>
      <div className="space-y-1">
        {getMenu().map(item => (
          <button key={item.id} onClick={() => setSubView(item.id)}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              subView === item.id ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
            <item.icon className={`w-4 h-4 mr-3 ${subView === item.id ? 'text-amber-600' : 'text-gray-400'}`} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Layout sidebarContent={SidebarContent} sidebarIcons={SidebarIcons}>
      <div className="h-full">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {categories.find(c => c.id === category)?.icon && 
              React.createElement(categories.find(c => c.id === category)!.icon, { className: `w-5 h-5 ${categories.find(c => c.id === category)?.color}` })}
            {(category || '').charAt(0).toUpperCase() + (category || '').slice(1)} Logbook
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {category === 'mechanical' && 'Mechanical equipment maintenance and running hours'}
            {category === 'electrical' && 'Electrical equipment maintenance, running hours, earth pit and IR values'}
            {category === 'process' && 'Gas compression logs and compressor parameters'}
          </p>
        </div>
        {renderContent()}
      </div>
    </Layout>
  );
};
