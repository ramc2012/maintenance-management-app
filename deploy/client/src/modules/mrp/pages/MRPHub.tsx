import React, { useState } from 'react';
import { Layout } from '../../core/components/Layout';
import { Package, Plus, List, Archive, Home } from 'lucide-react';
import { RequirementForm } from '../components/RequirementForm';
import { RequirementList } from '../components/RequirementList';
import { DraftManager } from '../components/DraftManager';
import { useNavigate } from 'react-router-dom';
import { Button, Tooltip } from 'antd';

export const MRPHub = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'list' | 'new' | 'drafts'>('list');
  const [editingRequirement, setEditingRequirement] = useState<any>(null);

  const menuItems = [
    { id: 'list', label: 'All Requirements', icon: List },
    { id: 'new', label: 'New Requirement', icon: Plus },
    { id: 'drafts', label: 'Saved Drafts', icon: Archive },
  ];

  const handleEdit = (req: any) => { setEditingRequirement(req); setActiveView('new'); };
  const handleNewComplete = () => { setEditingRequirement(null); setActiveView('list'); };

  const SidebarIcons = (
    <>
      {menuItems.map(item => (
        <Tooltip key={item.id} title={item.label} placement="right">
          <button onClick={() => { setActiveView(item.id as any); setEditingRequirement(null); }}
            className={`w-full flex justify-center p-2 rounded ${activeView === item.id ? 'bg-indigo-100 dark:bg-indigo-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-indigo-600' : 'text-gray-400'}`} />
          </button>
        </Tooltip>
      ))}
    </>
  );

  const SidebarContent = (
    <div className="space-y-4">
      <Button type="primary" icon={<Home className="w-4 h-4" />} onClick={() => navigate("/")} className="w-full" ghost>
        Maintenance Hub
      </Button>
      
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
        Material Requirement Planner
      </div>
      
      <div className="space-y-1">
        {menuItems.map(item => (
          <button key={item.id}
            onClick={() => { setActiveView(item.id as any); setEditingRequirement(null); }}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === item.id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
            <item.icon className={`w-4 h-4 mr-3 ${activeView === item.id ? 'text-indigo-600' : 'text-gray-400'}`} />
            {item.label}
          </button>
        ))}
      </div>
      
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Categories</div>
        <div className="px-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <div>🏪 Stores</div><div>🔧 Spares</div><div>💰 Capital</div><div>🛠️ Service</div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout sidebarContent={SidebarContent} sidebarIcons={SidebarIcons}>
      <div className="h-full">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />Material Requirement Planner
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Build and manage material requirements per vendor</p>
        </div>

        {activeView === 'list' && <RequirementList onEdit={handleEdit} />}
        {activeView === 'new' && <RequirementForm editData={editingRequirement} onComplete={handleNewComplete} />}
        {activeView === 'drafts' && <DraftManager onLoadDraft={(draft) => { setEditingRequirement(draft); setActiveView('new'); }} />}
      </div>
    </Layout>
  );
};
