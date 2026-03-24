import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Select, Button, message, Modal, Form, Input, DatePicker, InputNumber, Tag } from 'antd';
import { Settings, Clock, CheckCircle, AlertTriangle, Play, Wrench, Plus, Filter } from 'lucide-react';
import axios from 'axios';

interface EquipmentTile {
  id: string;
  tagNumber: string;
  name: string;
  runningHours: number;
  dCheckInterval: number;
  lastMOHDate?: string;
  installationId: string;
  status: 'UPCOMING' | 'OVERDUE' | 'PLANNED' | 'IN_PROGRESS';
  remaining?: number;
  excess?: number;
}

export const MOHDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [installations, setInstallations] = useState<any[]>([]);
  const [filterInstallation, setFilterInstallation] = useState<string>('');
  const [tiles, setTiles] = useState<{ upcoming: EquipmentTile[], overdue: EquipmentTile[], inProgress: any[] }>({ upcoming: [], overdue: [], inProgress: [] });
  const [initModalOpen, setInitModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, planned: 0, inProgress: 0, completed: 0 });
  const [form] = Form.useForm();

  useEffect(() => { fetchInstallations(); }, []);
  useEffect(() => { fetchData(); }, [filterInstallation]);

  const fetchInstallations = async () => {
    try {
      const res = await axios.get('/api/equipment/installations');
      setInstallations(res.data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchData = async () => {
    try {
      const params: any = {};
      if (filterInstallation) params.installationId = filterInstallation;
      
      // Get MOH stats
      const dashRes = await axios.get('/api/moh/dashboard', { params });
      setStats(dashRes.data.stats || {});
      
      // Get MOH records
      const mohRes = await axios.get('/api/moh', { params });
      const mohRecords = mohRes.data || [];
      const inProgress = mohRecords.filter((m: any) => m.status === 'IN_PROGRESS');
      
      // Get equipment from running equipment master
      const equipRes = await axios.get('/api/equipment/running-equip', { params: filterInstallation ? { installationId: filterInstallation } : {} });
      const equipment = equipRes.data || [];

      // Calculate upcoming and overdue
      const upcoming: EquipmentTile[] = [];
      const overdue: EquipmentTile[] = [];

      equipment.forEach((e: any) => {
        const runHours = e.currentRunHours || e.runningHours || 0;
        const dCheckInterval = e.dCheckInterval || 0;
        if (!dCheckInterval) return;
        
        const remaining = dCheckInterval - runHours;
        
        if (remaining <= 0) {
          overdue.push({
            ...e,
            status: 'OVERDUE',
            excess: Math.abs(remaining)
          });
        } else if (remaining < 500) {
          upcoming.push({
            ...e,
            status: 'UPCOMING',
            remaining
          });
        }
      });
      
      // Sort
      upcoming.sort((a, b) => (a.remaining || 0) - (b.remaining || 0));
      overdue.sort((a, b) => (b.excess || 0) - (a.excess || 0));
      
      setTiles({ upcoming, overdue, inProgress });
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

  const openInitModal = (equipment: any) => {
    setSelectedEquipment(equipment);
    form.setFieldsValue({
      installationId: equipment.installationId,
      equipmentTag: equipment.tagNumber,
      equipmentName: equipment.name,
      currentRunHours: equipment.runningHours,
      dCheckInterval: equipment.dCheckInterval
    });
    setInitModalOpen(true);
  };

  const handleInitiateMOH = async (values: any) => {
    try {
      await axios.post('/api/moh', {
        ...values,
        plannedStartDate: values.plannedStartDate?.toISOString(),
        createdBy: 'SYSTEM'
      });
      message.success('MOH initiated!');
      setInitModalOpen(false);
      fetchData();
    } catch (error) {
      message.error('Failed to initiate MOH');
    }
  };

  const EquipmentTileCard: React.FC<{ item: EquipmentTile; type: 'upcoming' | 'overdue' }> = ({ item, type }) => (
    <div className={`p-4 rounded-lg border-2 ${type === 'overdue' ? 'bg-red-900/30 border-red-600' : 'bg-yellow-900/30 border-yellow-600'}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold text-white text-lg">{item.tagNumber}</span>
        <Tag color={type === 'overdue' ? 'red' : 'orange'}>{type === 'overdue' ? 'OVERDUE' : 'DUE SOON'}</Tag>
      </div>
      <div className="text-gray-300 text-sm mb-2 truncate">{item.name}</div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <span className="text-gray-500">Last MOH:</span>
          <div className="text-white">{item.lastMOHDate ? new Date(item.lastMOHDate).toLocaleDateString() : 'Never'}</div>
        </div>
        <div>
          <span className="text-gray-500">Run Hours:</span>
          <div className="text-white">{(item.runningHours || 0).toLocaleString()} hrs</div>
        </div>
        <div>
          <span className="text-gray-500">D-Check:</span>
          <div className="text-white">{(item.dCheckInterval || 0).toLocaleString()} hrs</div>
        </div>
        <div>
          <span className="text-gray-500">{type === 'overdue' ? 'Overdue by:' : 'Remaining:'}</span>
          <div className={`font-bold ${type === 'overdue' ? 'text-red-400' : 'text-yellow-400'}`}>
            {type === 'overdue' ? `+${(item.excess || 0).toLocaleString()} hrs` : `${(item.remaining || 0).toLocaleString()} hrs`}
          </div>
        </div>
      </div>
      <Button type="primary" size="small" block icon={<Plus className="w-3 h-3" />} onClick={() => openInitModal(item)}>
        Initiate MOH
      </Button>
    </div>
  );

  if (loading) return <div className="text-white">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5" />MOH Dashboard</h2>
          <p className="text-gray-400 text-sm">Major Overhaul tracking linked to D-Check PMS</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <Select value={filterInstallation || 'all'} onChange={v => setFilterInstallation(v === 'all' ? '' : v)} style={{ width: 220 }}>
            <Select.Option value="all">All Installations</Select.Option>
            {installations.map(i => <Select.Option key={i.id} value={i.id}>{i.installationId}</Select.Option>)}
          </Select>
        </div>
      </div>

      {/* Stats */}
      <Row gutter={16}>
        <Col span={6}><Card className="bg-gray-800 border-gray-700"><Statistic title={<span className="text-gray-400">Total MOH</span>} value={stats.total || 0} valueStyle={{ color: '#fff' }} /></Card></Col>
        <Col span={6}><Card className="bg-red-900/30 border-red-700"><Statistic title={<span className="text-red-300">Overdue</span>} value={tiles.overdue.length} valueStyle={{ color: '#ef4444' }} prefix={<AlertTriangle className="w-5 h-5" />} /></Card></Col>
        <Col span={6}><Card className="bg-yellow-900/30 border-yellow-700"><Statistic title={<span className="text-yellow-300">Upcoming</span>} value={tiles.upcoming.length} valueStyle={{ color: '#eab308' }} prefix={<Clock className="w-5 h-5" />} /></Card></Col>
        <Col span={6}><Card className="bg-green-900/30 border-green-700"><Statistic title={<span className="text-green-300">Completed</span>} value={stats.completed || 0} valueStyle={{ color: '#22c55e' }} prefix={<CheckCircle className="w-5 h-5" />} /></Card></Col>
      </Row>

      {/* Overdue Tiles */}
      {tiles.overdue.length > 0 && (
        <Card title={<span className="text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />OVERDUE - {tiles.overdue.length} Equipment Exceeded D-Check Interval</span>} className="bg-red-900/10 border-red-800">
          <div className="grid grid-cols-4 gap-4">
            {tiles.overdue.map(item => <EquipmentTileCard key={item.id} item={item} type="overdue" />)}
          </div>
        </Card>
      )}

      {/* Upcoming Tiles */}
      {tiles.upcoming.length > 0 && (
        <Card title={<span className="text-yellow-400 flex items-center gap-2"><Wrench className="w-4 h-4" />UPCOMING - {tiles.upcoming.length} Equipment D-Check &lt; 500 hrs</span>} className="bg-yellow-900/10 border-yellow-800">
          <div className="grid grid-cols-4 gap-4">
            {tiles.upcoming.map(item => <EquipmentTileCard key={item.id} item={item} type="upcoming" />)}
          </div>
        </Card>
      )}

      {/* In Progress */}
      {tiles.inProgress.length > 0 && (
        <Card title={<span className="text-orange-400 flex items-center gap-2"><Play className="w-4 h-4" />IN PROGRESS - {tiles.inProgress.length} Active MOH</span>} className="bg-orange-900/10 border-orange-700">
          <div className="grid grid-cols-4 gap-4">
            {tiles.inProgress.map((item: any) => (
              <div key={item.id} className="p-4 rounded-lg border-2 bg-orange-900/30 border-orange-600">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-orange-400">{item.mohNumber}</span>
                  <Tag color="orange">IN PROGRESS</Tag>
                </div>
                <div className="font-bold text-white">{item.equipmentTag}</div>
                <div className="text-gray-300 text-sm mb-2">{item.equipmentName}</div>
                <div className="text-xs text-gray-400">Started: {item.actualStartDate ? new Date(item.actualStartDate).toLocaleDateString() : '-'}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tiles.overdue.length === 0 && tiles.upcoming.length === 0 && tiles.inProgress.length === 0 && (
        <Card className="bg-gray-800 border-gray-700 text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-white text-lg">All equipment within D-Check limits</p>
          <p className="text-gray-400">No overhauls due or in progress</p>
        </Card>
      )}

      {/* Initiate MOH Modal */}
      <Modal title="Initiate Major Overhaul" open={initModalOpen} onCancel={() => setInitModalOpen(false)} footer={null} width={600}>
        <Form form={form} layout="vertical" onFinish={handleInitiateMOH}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="installationId" label="Installation" rules={[{ required: true }]}>
              <Select disabled>{installations.map(i => <Select.Option key={i.id} value={i.id}>{i.installationId}</Select.Option>)}</Select>
            </Form.Item>
            <Form.Item name="equipmentTag" label="Equipment Tag"><Input disabled /></Form.Item>
            <Form.Item name="equipmentName" label="Equipment Name"><Input disabled /></Form.Item>
            <Form.Item name="priority" label="Priority" initialValue="HIGH">
              <Select><Select.Option value="LOW">Low</Select.Option><Select.Option value="NORMAL">Normal</Select.Option><Select.Option value="HIGH">High</Select.Option><Select.Option value="CRITICAL">Critical</Select.Option></Select>
            </Form.Item>
            <Form.Item name="currentRunHours" label="Current Run Hours"><InputNumber className="w-full" disabled addonAfter="hrs" /></Form.Item>
            <Form.Item name="dCheckInterval" label="D-Check Interval"><InputNumber className="w-full" disabled addonAfter="hrs" /></Form.Item>
            <Form.Item name="plannedStartDate" label="Planned Start"><DatePicker className="w-full" /></Form.Item>
            <Form.Item name="estimatedCost" label="Est. Cost (₹)"><InputNumber className="w-full" min={0} /></Form.Item>
          </div>
          <Form.Item name="scopeOfWork" label="Scope of Work"><Input.TextArea rows={3} /></Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setInitModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Initiate MOH</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MOHDashboard;
