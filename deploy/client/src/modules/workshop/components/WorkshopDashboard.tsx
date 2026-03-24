import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Table, Tag, Progress } from 'antd';
import { Wrench, Clock, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
import axios from 'axios';

const SHOP_CONFIG: Record<string, { name: string; color: string; bg: string }> = {
  FABRICATION: { name: 'Fabrication', color: '#3b82f6', bg: 'bg-blue-900/30' },
  DIESEL: { name: 'Diesel', color: '#f59e0b', bg: 'bg-amber-900/30' },
  MACHINE: { name: 'Machine', color: '#10b981', bg: 'bg-emerald-900/30' },
  ELECTRICAL: { name: 'Electrical', color: '#8b5cf6', bg: 'bg-purple-900/30' },
};

export const WorkshopDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get('/api/workshop/dashboard');
      setData(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const recentColumns = [
    { title: 'Job #', dataIndex: 'jobNumber', render: (j: string) => <span className="font-mono text-blue-400">{j}</span> },
    { title: 'Shop', dataIndex: 'shopType', render: (s: string) => <Tag color={SHOP_CONFIG[s]?.color}>{SHOP_CONFIG[s]?.name}</Tag> },
    { title: 'Title', dataIndex: 'title', ellipsis: true },
    { title: 'Priority', dataIndex: 'priority', render: (p: string) => {
      const colors: any = { LOW: 'default', NORMAL: 'blue', HIGH: 'orange', URGENT: 'red' };
      return <Tag color={colors[p]}>{p}</Tag>;
    }},
    { title: 'Status', dataIndex: 'status', render: (s: string) => {
      const colors: any = { PENDING: 'orange', IN_PROGRESS: 'blue', COMPLETED: 'green', ON_HOLD: 'default', CANCELLED: 'red' };
      return <Tag color={colors[s]}>{s.replace('_', ' ')}</Tag>;
    }},
    { title: 'Requested', dataIndex: 'requestDate', render: (d: string) => new Date(d).toLocaleDateString() }
  ];

  if (loading) return <div className="text-white">Loading...</div>;

  const { overall, byShop, recentJobs, urgentJobs } = data || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Workshop Dashboard</h2>
        <p className="text-gray-400 text-sm">Job tracking across all workshop facilities</p>
      </div>

      {/* Overall Stats */}
      <Row gutter={16}>
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic title={<span className="text-gray-400">Total Jobs</span>} value={overall?.total || 0} valueStyle={{ color: '#fff' }} prefix={<Wrench className="w-5 h-5 text-gray-400" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic title={<span className="text-gray-400">Pending</span>} value={overall?.pending || 0} valueStyle={{ color: '#f59e0b' }} prefix={<Clock className="w-5 h-5 text-amber-400" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic title={<span className="text-gray-400">In Progress</span>} value={overall?.inProgress || 0} valueStyle={{ color: '#3b82f6' }} prefix={<Activity className="w-5 h-5 text-blue-400" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic title={<span className="text-gray-400">Completed</span>} value={overall?.completed || 0} valueStyle={{ color: '#22c55e' }} prefix={<CheckCircle className="w-5 h-5 text-green-400" />} />
          </Card>
        </Col>
      </Row>

      {/* Shop-wise Stats */}
      <Card title={<span className="text-white">Shop-wise Breakdown</span>} className="bg-gray-800 border-gray-700">
        <Row gutter={16}>
          {Object.entries(SHOP_CONFIG).map(([key, cfg]) => {
            const shop = byShop?.[key] || { total: 0, pending: 0, inProgress: 0, completed: 0 };
            const completionRate = shop.total > 0 ? Math.round((shop.completed / shop.total) * 100) : 0;
            return (
              <Col span={6} key={key}>
                <div className={`p-4 rounded-lg ${cfg.bg} border border-gray-700`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="w-5 h-5" style={{ color: cfg.color }} />
                    <span className="font-bold text-white">{cfg.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-400">Total:</span> <span className="text-white font-bold">{shop.total}</span></div>
                    <div><span className="text-gray-400">Pending:</span> <span className="text-amber-400 font-bold">{shop.pending}</span></div>
                    <div><span className="text-gray-400">Active:</span> <span className="text-blue-400 font-bold">{shop.inProgress}</span></div>
                    <div><span className="text-gray-400">Done:</span> <span className="text-green-400 font-bold">{shop.completed}</span></div>
                  </div>
                  <div className="mt-3">
                    <Progress percent={completionRate} size="small" strokeColor={cfg.color} trailColor="#374151" />
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={16}>
          <Card title={<span className="text-white">Recent Jobs</span>} className="bg-gray-800 border-gray-700">
            <Table dataSource={recentJobs || []} columns={recentColumns} rowKey="id" pagination={false} size="small" />
          </Card>
        </Col>
        <Col span={8}>
          <Card title={<span className="text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" />Urgent Jobs</span>} className="bg-gray-800 border-gray-700">
            {urgentJobs?.length > 0 ? (
              <div className="space-y-2">
                {urgentJobs.map((job: any) => (
                  <div key={job.id} className="p-2 bg-red-900/20 border border-red-800 rounded text-sm">
                    <div className="font-mono text-red-400">{job.jobNumber}</div>
                    <div className="text-white">{job.title}</div>
                    <Tag color={SHOP_CONFIG[job.shopType]?.color}>{SHOP_CONFIG[job.shopType]?.name}</Tag>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">No urgent jobs</div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WorkshopDashboard;
