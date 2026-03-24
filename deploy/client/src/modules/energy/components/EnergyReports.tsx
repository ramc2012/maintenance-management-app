import React, { useState, useEffect } from 'react';
import { Table, Card, Select, DatePicker, Tag } from 'antd';
import { FileText } from 'lucide-react';
import axios from 'axios';

const { RangePicker } = DatePicker;

export const EnergyReports: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [installations, setInstallations] = useState<any[]>([]);
  const [filterInstallation, setFilterInstallation] = useState<string>('');
  const [dateRange, setDateRange] = useState<any>(null);

  useEffect(() => { fetchInstallations(); }, []);
  useEffect(() => { fetchLogs(); }, [filterInstallation, dateRange]);

  const fetchInstallations = async () => {
    try {
      const res = await axios.get('/api/equipment/installations');
      setInstallations(res.data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchLogs = async () => {
    try {
      const params: any = {};
      if (filterInstallation) params.installationId = filterInstallation;
      if (dateRange?.[0]) params.startDate = dateRange[0].toISOString();
      if (dateRange?.[1]) params.endDate = dateRange[1].toISOString();
      const res = await axios.get('/api/energy/daily', { params });
      setLogs(res.data || []);
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

  const formatCurrency = (n: number) => n ? `₹${n.toLocaleString()}` : '-';

  const columns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => new Date(d).toLocaleDateString(), sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime() },
    { title: 'Installation', dataIndex: ['installation', 'installationId'] },
    { title: 'Fuel Type', dataIndex: 'fuelType', render: (t: string) => t ? <Tag color="orange">{t}</Tag> : '-' },
    { title: 'Fuel (L)', dataIndex: 'fuelQuantity', render: (q: number) => q?.toLocaleString() || '-' },
    { title: 'Fuel Cost', dataIndex: 'fuelCost', render: formatCurrency },
    { title: 'Electric (kWh)', dataIndex: 'electricityKwh', render: (k: number) => k?.toLocaleString() || '-' },
    { title: 'Electric Cost', dataIndex: 'electricityCost', render: formatCurrency },
    { title: 'Gen Hours', dataIndex: 'generatorHours', render: (h: number) => h || '-' },
    { title: 'Logged By', dataIndex: 'loggedBy' }
  ];

  // Summary
  const totalFuel = logs.reduce((s, l) => s + (l.fuelQuantity || 0), 0);
  const totalFuelCost = logs.reduce((s, l) => s + (l.fuelCost || 0), 0);
  const totalKwh = logs.reduce((s, l) => s + (l.electricityKwh || 0), 0);
  const totalElecCost = logs.reduce((s, l) => s + (l.electricityCost || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5" />Energy Reports</h2>
        <p className="text-gray-400 text-sm">Detailed energy consumption logs with filters</p>
      </div>

      <div className="flex gap-4 bg-gray-800 p-4 rounded-lg flex-wrap">
        <Select value={filterInstallation || 'all'} onChange={v => setFilterInstallation(v === 'all' ? '' : v)} style={{ width: 200 }} placeholder="Installation">
          <Select.Option value="all">All Installations</Select.Option>
          {installations.map(i => <Select.Option key={i.id} value={i.id}>{i.installationId}</Select.Option>)}
        </Select>
        <RangePicker onChange={(v) => setDateRange(v)} />
      </div>

      {/* Summary Row */}
      <Card className="bg-gray-800 border-gray-700">
        <div className="flex gap-8">
          <div><span className="text-gray-400">Total Fuel:</span> <span className="text-amber-400 font-bold">{totalFuel.toLocaleString()} L</span></div>
          <div><span className="text-gray-400">Fuel Cost:</span> <span className="text-amber-400 font-bold">{formatCurrency(totalFuelCost)}</span></div>
          <div><span className="text-gray-400">Total Electric:</span> <span className="text-blue-400 font-bold">{totalKwh.toLocaleString()} kWh</span></div>
          <div><span className="text-gray-400">Electric Cost:</span> <span className="text-blue-400 font-bold">{formatCurrency(totalElecCost)}</span></div>
          <div><span className="text-gray-400">Records:</span> <span className="text-white font-bold">{logs.length}</span></div>
        </div>
      </Card>

      <Table
        dataSource={logs}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
      />
    </div>
  );
};

export default EnergyReports;
