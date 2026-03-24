import React, { useState, useEffect } from 'react';
import { Layout } from '../../core/components/Layout';
import {
  Settings, GitBranch, Package, Crosshair,
  DollarSign, Droplets, Database, Home, History
} from 'lucide-react';
import { Tooltip, Button } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Existing Components
import { MasterSetup } from '../components/MasterSetup';
import { CustodyTransfer } from '../components/CustodyTransfer';
import { InternalFlowMeters } from '../components/InternalFlowMeters';

// ISO 14224 Components
import { AssetDashboard } from '../components/AssetDashboard';
import { AssetRegister } from '../components/AssetRegister';

// ISO 10012 Calibration Component
import { CalibrationForm } from '../components/CalibrationForm';

// Category-Specific Registry Components
import { CategoryRegistry } from '../components/CategoryRegistry';
import { AssetHistory } from '../components/AssetHistory';

export const AssetsHub = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeView, setActiveView] = useState('hierarchy');
  const [initialTag, setInitialTag] = useState<string | null>(null);

  useEffect(() => {
    const view = searchParams.get('view');
    const tag = searchParams.get('tag');
    if (view) setActiveView(view);
    if (tag) setInitialTag(tag);
  }, [searchParams]);

  const menuItems = [
    { id: 'hierarchy', label: 'Hierarchy Dashboard', icon: GitBranch },
    { id: 'asset-register', label: 'Functional Locations', icon: Package },
    { id: 'equipment-registry', label: 'Equipment Registry', icon: Database },
    { id: 'custody-meters', label: 'Custody Meters', icon: DollarSign },
    { id: 'internal-meters', label: 'Internal Meters', icon: Droplets },
    { id: 'history', label: 'Equipment History', icon: History },
    { id: 'calibration', label: 'Calibration Records', icon: Crosshair },
    { id: 'master', label: 'Master Setup', icon: Settings },
  ];
  
  const renderContent = () => {
    switch (activeView) {
      case 'hierarchy': return <AssetDashboard />;
      case 'asset-register': return <AssetRegister />;
      case 'equipment-registry': return <CategoryRegistry />;
      case 'custody-meters': return <CustodyTransfer />;
      case 'internal-meters': return <InternalFlowMeters />;
      case 'history': return <AssetHistory initialTag={initialTag} />;
      case 'calibration': return <CalibrationForm />;
      case 'master': return <MasterSetup />;
      default: return <AssetDashboard />;
    }
  };

  // Icons for collapsed sidebar
  const SidebarIcons = (
    <>
      {menuItems.map(item => (
        <Tooltip key={item.id} title={item.label} placement="right">
          <button onClick={() => setActiveView(item.id)}
            className={`w-full flex justify-center p-2 rounded ${activeView === item.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
          </button>
        </Tooltip>
      ))}
    </>
  );

  const SidebarContent = (
    <div className="space-y-1">
      <Button type="primary" icon={<Home className="w-4 h-4" />} onClick={() => navigate("/hub")} className="w-full mb-4" ghost>
        Maintenance Hub
      </Button>
      
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Asset Hierarchy</div>
      {menuItems.slice(0, 2).map(item => (
        <button key={item.id} onClick={() => setActiveView(item.id)}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeView === item.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
          <item.icon className={`w-4 h-4 mr-3 ${activeView === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
          {item.label}
        </button>
      ))}

      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">Asset Registries</div>
      {menuItems.slice(2, 6).map(item => (
        <button key={item.id} onClick={() => setActiveView(item.id)}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeView === item.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
          <item.icon className={`w-4 h-4 mr-3 ${activeView === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
          {item.label}
        </button>
      ))}

      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">Configuration</div>
      {menuItems.slice(6).map(item => (
        <button key={item.id} onClick={() => setActiveView(item.id)}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeView === item.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
          <item.icon className={`w-4 h-4 mr-3 ${activeView === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <Layout sidebarContent={SidebarContent} sidebarIcons={SidebarIcons}>
      <div className="h-full">
        {renderContent()}
      </div>
    </Layout>
  );
};
