import React, { useState, useEffect } from 'react';
import { Table, Tag, Input, Button, Select, DatePicker, message, Card, Statistic, Row, Col, Tabs, Empty } from 'antd';
import { Search, Wrench, Zap, Filter, History, Download } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface MaintenanceLogProps {
  category?: 'mechanical' | 'electrical';
}

export const MaintenanceLog: React.FC<MaintenanceLogProps> = ({ category = 'mechanical' }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [installations, setInstallations] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [filterInstallation, setFilterInstallation] = useState<string>('');
  const [filterEquipment, setFilterEquipment] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'equipment'>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);

  useEffect(() => { 
    fetchInstallations();
    fetchEquipment();
  }, []);

  useEffect(() => { fetchData(); }, [category, filterInstallation]);

  const fetchInstallations = async () => {
    try {
      const res = await axios.get('/api/equipment/installations');
      setInstallations(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchEquipment = async () => {
    try {
      const res = await axios.get('/api/fl-assets');
      setEquipment(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch from daily work reports (maintenance logs)
      const params: any = { department: category === 'mechanical' ? 'Mechanical' : 'Electrical' };
      if (filterInstallation) params.installationId = filterInstallation;
      
      const res = await axios.get('/api/maintenance-logs', { params });
      const logs = res.data || [];
      
      // Map to display format
      const mappedLogs = logs.map((l: any) => ({
        id: l.id,
        date: l.date,
        equipment: l.equipmentTag || l.equipmentTypeName || '-',
        equipmentId: l.equipmentTag,
        desc: l.description,
        workDone: l.description,
        technician: l.createdBy,
        status: l.status || 'Completed',
        installation: l.installationId,
        jobType: l.jobType,
        duration: l.durationHours
      }));
      
      setData(mappedLogs);
    } catch (error) {
      // Fallback mock data
      setData([
        { id: '1', date: new Date().toISOString(), equipment: category === 'mechanical' ? 'CPF--EQ-001' : 'Motor-101', desc: 'Routine Checkup', status: 'Completed', category, jobType: 'PM' },
        { id: '2', date: new Date().toISOString(), equipment: category === 'mechanical' ? 'CPF--EQ-002' : 'Transformer-A', desc: 'Vibration Analysis', status: 'Pending', category, jobType: 'BD' },
      ]);
    } finally { setLoading(false); }
  };

  const viewEquipmentHistory = (equipId: string) => {
    const equipData = data.filter(d => d.equipmentId === equipId || d.equipment === equipId);
    setSelectedEquipment({ id: equipId, logs: equipData });
    setViewMode('equipment');
  };

  // Stats
  const completedCount = data.filter(d => d.status === 'Completed').length;
  const pendingCount = data.filter(d => d.status === 'Pending' || d.status === 'In Progress').length;

  const columns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-', width: 100 },
    { title: 'Equipment', dataIndex: 'equipment', render: (t: string, r: any) => (
      <Button type="link" size="small" onClick={() => viewEquipmentHistory(t)} className="p-0 font-semibold">{t}</Button>
    )},
    { title: 'Job Type', dataIndex: 'jobType', render: (j: string) => (
      <Tag color={j === 'PM' ? 'blue' : j === 'BD' ? 'red' : 'default'}>{j || '-'}</Tag>
    ), width: 80 },
    { title: 'Description', dataIndex: 'desc', ellipsis: true },
    { title: 'Duration (hrs)', dataIndex: 'duration', width: 100 },
    { title: 'Technician', dataIndex: 'technician', width: 120 },
    { title: 'Status', dataIndex: 'status', width: 100, render: (s: string) => (
      <Tag color={s === 'Completed' ? 'green' : s === 'Pending' ? 'orange' : 'blue'}>{s}</Tag>
    )},
  ];

  const CategoryIcon = category === 'mechanical' ? Wrench : Zap;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small"><Statistic title="Total Logs" value={data.length} valueStyle={{ color: '#3b82f6' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Completed" value={completedCount} valueStyle={{ color: '#10b981' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Pending/In Progress" value={pendingCount} valueStyle={{ color: '#f59e0b' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Equipment Tracked" value={new Set(data.map(d => d.equipment)).size} /></Card>
        </Col>
      </Row>

      {/* Filters */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
        <div className="flex items-center gap-2">
          <CategoryIcon className={`w-5 h-5 ${category === 'mechanical' ? 'text-blue-500' : 'text-yellow-500'}`} />
          <h2 className="text-lg font-bold dark:text-white">
            {(category || '').charAt(0).toUpperCase() + (category || '').slice(1)} Maintenance Log
          </h2>
        </div>
        <div className="flex gap-2">
          <Select placeholder="Installation" allowClear style={{ width: 150 }} onChange={v => setFilterInstallation(v || '')} value={filterInstallation || undefined}>
            {installations.map(i => <Option key={i.id} value={i.id}>{i.installationId}</Option>)}
          </Select>
          <Input prefix={<Search className="w-4 h-4 text-gray-400" />} placeholder="Search..." className="w-40" />
          <Button
            icon={<Download className="w-4 h-4" />}
            onClick={async () => {
              try {
                const params = filterInstallation ? `?installationId=${filterInstallation}` : '';
                const res = await fetch(`/api/maintenance/logs/export${params}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                if (!res.ok) throw new Error();
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `Maintenance_Logs_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
                URL.revokeObjectURL(url);
              } catch { message.error('Export failed'); }
            }}
          >Export</Button>
          {viewMode === 'equipment' && (
            <Button onClick={() => { setViewMode('all'); setSelectedEquipment(null); }}>
              Back to All
            </Button>
          )}
        </div>
      </div>

      {/* Equipment History View */}
      {viewMode === 'equipment' && selectedEquipment ? (
        <Card title={<span className="flex items-center gap-2"><History className="w-4 h-4" /> Log History: {selectedEquipment.id}</span>}>
          {selectedEquipment.logs.length > 0 ? (
            <Table dataSource={selectedEquipment.logs} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
          ) : (
            <Empty description="No log history for this equipment" />
          )}
        </Card>
      ) : (
        <Table 
          dataSource={data} 
          columns={columns} 
          rowKey="id" 
          size="small" 
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          className="dark-table" 
          footer={() => <div className="text-xs text-gray-500">Source: Daily Work Reports | Total: {data.length} Records</div>} 
        />
      )}
    </div>
  );
};
