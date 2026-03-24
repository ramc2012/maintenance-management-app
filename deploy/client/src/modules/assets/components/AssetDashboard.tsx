import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Tabs, Timeline, Statistic, Row, Col, Empty, message, Modal, Select, Table } from 'antd';
import { 
  Cpu, Zap, Clock, History, Settings, ArrowRightLeft, Plus,
  Wrench, AlertTriangle, Gauge, Activity, Shield, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { HierarchyTree } from './HierarchyTree';
import { FLAssetAssignment } from './FLAssetAssignment';

const { TabPane } = Tabs;

interface FL {
  id: string;
  flId: string;
  name: string;
  description?: string;
  flType: string;
  positionType?: string;
  childFls?: FL[];
  system?: any;
  installations?: any[];
  maintenanceAssignments?: any[];
  workOrders?: any[];
}

export const AssetDashboard: React.FC = () => {
  const [selectedFL, setSelectedFL] = useState<FL | null>(null);
  const [flDetails, setFlDetails] = useState<FL | null>(null);
  const [loading, setLoading] = useState(false);
  const [electricalLoad, setElectricalLoad] = useState<any>(null);
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  
  // Assignment modal
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);

  const fetchAssets = async (id: string) => {
    try {
      const res = await axios.get(`/api/fl-assets/${id}`);
      setAssignedAssets(res.data);
    } catch (error) {
      console.error("Error fetching assets", error);
    }
  };

  const handleSelectFL = (fl: FL | null) => {
    setSelectedFL(fl);
    if (fl) {
      setFlDetails(fl);
      setAssignedAssets([]); 
      
      axios.get(`/api/fl/locations/${fl.id}`).then(res => {
        setFlDetails(res.data);
        if (res.data.systemId) {
           axios.get(`/api/fl/electrical-load?systemId=${res.data.systemId}`).then(r => setElectricalLoad(r.data)).catch(() => {});
        }
      });
      fetchAssets(fl.id);
    } else {
      setFlDetails(null);
      setAssignedAssets([]);
    }
  };

  // Split assets
  const driveTrain = assignedAssets.filter(a => ['DRIVER', 'DRIVEN', 'CONTROLLER'].includes(a.function))
                         .sort((a,b) => (a.sequence || 0) - (b.sequence || 0));
  const instruments = assignedAssets.filter(a => !['DRIVER', 'DRIVEN', 'CONTROLLER'].includes(a.function));

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Left Panel - Hierarchy Tree */}
      <div className="w-[30%] border-r dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <HierarchyTree onSelectFL={handleSelectFL} selectedFlId={selectedFL?.id} />
      </div>
      
      {/* Right Panel - FL Details */}
      <div className="flex-1 p-4 overflow-auto bg-gray-50 dark:bg-gray-900">
        {!flDetails ? (
          <div className="flex items-center justify-center h-full">
            <Empty description="Select a Functional Location to view details" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header Card */}
            <Card className="dark:bg-gray-800">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Cpu className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-bold dark:text-white">{flDetails.flId}</h2>
                    <Tag color="purple">{flDetails.flType}</Tag>
                  </div>
                  <p className="text-gray-500">{flDetails.name}</p>
                   <p className="text-xs text-gray-400 mt-2">
                    {flDetails.system?.area?.site?.siteId} → {flDetails.system?.area?.areaId} → {flDetails.system?.systemTag}
                  </p>
                </div>
                {electricalLoad && (
                  <Statistic
                    title="Total Load"
                    value={electricalLoad.totalKw}
                    suffix="kW"
                    prefix={<Zap className="w-4 h-4 text-yellow-500" />}
                  />
                )}
              </div>
            </Card>

            {/* Assigned Assets */}
            <Card 
              title={<span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Asset Configuration</span>}
              className="dark:bg-gray-800"
              extra={<Button type="primary" size="small" onClick={() => setAssignmentModalVisible(true)}>Manage Configuration</Button>}
            >
              {/* Drive Train Block */}
              {driveTrain.length > 0 && (
                 <div className="mb-6">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Drive Train Map</h4>
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded border dark:border-gray-700 overflow-x-auto">
                       {driveTrain.map((item, idx) => (
                          <React.Fragment key={item.id}>
                             {idx > 0 && <ArrowRight className="w-6 h-6 text-gray-300" />}
                             <div className="flex-shrink-0 text-center min-w-[120px]">
                                <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-white border flex items-center justify-center shadow-sm">
                                   {item.function === 'DRIVER' ? <Zap className="text-orange-500"/> : item.function === 'CONTROLLER' ? <Activity className="text-purple-500"/> : <Settings className="text-blue-500"/>}
                                </div>
                                <div className="font-bold text-blue-600">{item.assetTag}</div>
                                <Tag className="mt-1">{item.function}</Tag>
                             </div>
                          </React.Fragment>
                       ))}
                    </div>
                 </div>
              )}

              {/* Instruments Block */}
              {instruments.length > 0 && (
                 <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Instruments & Lists</h4>
                    <Table 
                       dataSource={instruments}
                       rowKey="id"
                       size="small"
                       pagination={false}
                       columns={[
                          { title: 'Tag', dataIndex: 'assetTag', render: (t) => <b className="text-blue-600">{t}</b> },
                          { title: 'Function', dataIndex: 'function', render: (t) => <Tag>{t}</Tag> },
                          { title: 'Type', dataIndex: 'assetType' },
                          { title: 'Details', render: (_, r) => <span className="text-xs text-gray-500">{r.assetDetails?.description}</span> }
                       ]}
                    />
                 </div>
              )}
              
              {assignedAssets.length === 0 && <Empty description="No assets assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </Card>

            {/* History / PMS / Sub-locations */}
             <Card className="dark:bg-gray-800">
              <Tabs defaultActiveKey="history">
                 <TabPane tab="Sub-Locations" key="child">
                    {/* Reuse Child FLs logic from before if needed, simplifying for brevity */}
                    {flDetails.childFls && flDetails.childFls.length > 0 ? (
                       <div className="grid grid-cols-2 gap-4">
                          {flDetails.childFls.map((child: any) => (
                             <Card key={child.id} size="small" hoverable onClick={() => handleSelectFL(child)}>
                                <span className="font-bold">{child.flId}</span>: {child.name}
                             </Card>
                          ))}
                       </div>
                    ) : <Empty description="No sub-locations"/>}
                 </TabPane>
                 <TabPane tab="Replacement History" key="history">
                     <Empty description="Check 'Manage Configuration' > 'Audit Trail' for detailed history" />
                 </TabPane>
              </Tabs>
             </Card>
          </div>
        )}
      </div>

      {flDetails && (
        <FLAssetAssignment
          flId={flDetails.id}
          flName={flDetails.flId}
          visible={assignmentModalVisible}
          onClose={() => setAssignmentModalVisible(false)}
          onSuccess={() => fetchAssets(flDetails.id)}
        />
      )}
    </div>
  );
};
