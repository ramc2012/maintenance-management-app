import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Progress, Empty } from 'antd';
import { AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';
import axios from 'axios';

interface Props {
  showScheduleOnly?: boolean;
}

export const CalibrationDashboard: React.FC<Props> = ({ showScheduleOnly = false }) => {
  const [stats, setStats] = useState({ total: 0, due: 0, overdue: 0, completed: 0 });
  const [dueInstruments, setDueInstruments] = useState<any[]>([]);
  const [overdueInstruments, setOverdueInstruments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dueRes, overdueRes, statsRes] = await Promise.all([
          axios.get('/api/calibration/due'),
          axios.get('/api/calibration/overdue'),
          axios.get('/api/calibration/unified/stats').catch(() => ({ data: {} }))
        ]);
        setDueInstruments(dueRes.data || []);
        setOverdueInstruments(overdueRes.data || []);
        setStats({
          total: statsRes.data.totalInstruments || 0,
          due: dueRes.data?.length || 0,
          overdue: overdueRes.data?.length || 0,
          completed: statsRes.data.calibratedThisMonth || 0
        });
        
        // Update quick stats in sidebar
        const quickStats = document.getElementById('quick-stats-count');
        if (quickStats) quickStats.innerText = String(statsRes.data.totalInstruments || '--');
      } catch (error) {
        console.error('Dashboard data error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { title: 'Tag ID', dataIndex: 'tagId', render: (t: string) => <span className="font-mono font-bold text-cyan-400">{t}</span> },
    { title: 'Type', dataIndex: 'type', render: (t: string) => <Tag color="blue">{t}</Tag> },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    { title: 'Last Cal', dataIndex: 'lastCalDate', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Due Date', dataIndex: 'nextDueDate', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Status', render: (_: any, r: any) => {
      const daysUntil = r.nextDueDate ? Math.ceil((new Date(r.nextDueDate).getTime() - Date.now()) / (1000*60*60*24)) : null;
      if (daysUntil === null) return <Tag>Unknown</Tag>;
      if (daysUntil < 0) return <Tag color="red">OVERDUE ({Math.abs(daysUntil)}d)</Tag>;
      if (daysUntil <= 30) return <Tag color="orange">Due in {daysUntil}d</Tag>;
      return <Tag color="green">OK</Tag>;
    }}
  ];

  const complianceRate = stats.total > 0 ? Math.round(((stats.total - stats.overdue) / stats.total) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Calibration Dashboard</h1>
          <p className="text-gray-400">ISO 10012 Compliance Overview</p>
        </div>
      </div>

      {!showScheduleOnly && (
        <Row gutter={16}>
          <Col span={6}>
            <Card className="bg-gray-800 border-gray-700">
              <Statistic 
                title={<span className="text-gray-400">Total Instruments</span>}
                value={stats.total}
                prefix={<Activity className="w-4 h-4 text-blue-400" />}
                valueStyle={{ color: '#60a5fa' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="bg-gray-800 border-gray-700">
              <Statistic 
                title={<span className="text-gray-400">Due This Month</span>}
                value={stats.due}
                prefix={<Clock className="w-4 h-4 text-yellow-400" />}
                valueStyle={{ color: '#facc15' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="bg-gray-800 border-gray-700">
              <Statistic 
                title={<span className="text-gray-400">Overdue</span>}
                value={stats.overdue}
                prefix={<AlertTriangle className="w-4 h-4 text-red-400" />}
                valueStyle={{ color: stats.overdue > 0 ? '#f87171' : '#4ade80' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="bg-gray-800 border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Compliance Rate</div>
              <Progress 
                percent={complianceRate} 
                status={complianceRate >= 95 ? 'success' : complianceRate >= 80 ? 'normal' : 'exception'}
                strokeColor={complianceRate >= 95 ? '#4ade80' : complianceRate >= 80 ? '#facc15' : '#f87171'}
              />
            </Card>
          </Col>
        </Row>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Overdue */}
        <Card 
          title={<span className="text-red-400 font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Overdue Calibrations</span>}
          className="bg-gray-800 border-gray-700"
          headStyle={{ borderBottom: '1px solid #374151' }}
        >
          {overdueInstruments.length > 0 ? (
            <Table 
              dataSource={overdueInstruments} 
              columns={columns.slice(0, 4)}
              rowKey="tagId"
              size="small"
              pagination={false}
              loading={loading}
            />
          ) : (
            <Empty description={<span className="text-gray-500">No overdue instruments</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>

        {/* Due Soon */}
        <Card 
          title={<span className="text-yellow-400 font-bold flex items-center gap-2"><Clock className="w-4 h-4" /> Due This Month</span>}
          className="bg-gray-800 border-gray-700"
          headStyle={{ borderBottom: '1px solid #374151' }}
        >
          {dueInstruments.length > 0 ? (
            <Table 
              dataSource={dueInstruments} 
              columns={columns.slice(0, 4)}
              rowKey="tagId"
              size="small"
              pagination={false}
              loading={loading}
            />
          ) : (
            <Empty description={<span className="text-gray-500">No instruments due this month</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </div>
    </div>
  );
};

export default CalibrationDashboard;
