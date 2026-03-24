import React, { useState, useEffect } from 'react';
import { Card, Statistic, Table, Tag, Row, Col, Progress } from 'antd';
import { GraduationCap, Calendar, Award, XCircle, Clock } from 'lucide-react';
import axios from 'axios';

export const TrainingDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get('/api/training/dashboard');
      setData(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingColumns = [
    { title: 'Title', dataIndex: 'title', ellipsis: true },
    { title: 'Type', dataIndex: 'trainingType', render: (t: string) => <Tag color="blue">{t}</Tag> },
    { title: 'Date', dataIndex: 'startDate', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: 'Venue', dataIndex: 'venue', ellipsis: true }
  ];

  const recentColumns = [
    { title: 'Title', dataIndex: 'title', ellipsis: true },
    { title: 'Type', dataIndex: 'trainingType', render: (t: string) => <Tag color="green">{t}</Tag> },
    { title: 'Date', dataIndex: 'endDate', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: 'Attendance', render: (_: any, r: any) => <span>{r.attendees?.length || 0} attended</span> }
  ];

  if (loading) return <div className="text-white">Loading...</div>;

  const { stats, upcoming, recent, byType } = data || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Training Dashboard</h2>
        <p className="text-gray-400 text-sm">Workforce development overview</p>
      </div>

      {/* Stats Cards */}
      <Row gutter={16}>
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">Total Trainings</span>}
              value={stats?.total || 0}
              valueStyle={{ color: '#fff' }}
              prefix={<GraduationCap className="w-5 h-5 text-blue-400" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">Scheduled</span>}
              value={stats?.scheduled || 0}
              valueStyle={{ color: '#3b82f6' }}
              prefix={<Calendar className="w-5 h-5 text-blue-400" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">Completed</span>}
              value={stats?.completed || 0}
              valueStyle={{ color: '#22c55e' }}
              prefix={<Award className="w-5 h-5 text-green-400" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">Cancelled</span>}
              value={stats?.cancelled || 0}
              valueStyle={{ color: '#ef4444' }}
              prefix={<XCircle className="w-5 h-5 text-red-400" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Training Type Breakdown */}
      <Card title={<span className="text-white">By Training Type</span>} className="bg-gray-800 border-gray-700">
        <div className="grid grid-cols-4 gap-4">
          {byType?.map((t: any) => (
            <div key={t.type} className="text-center">
              <div className="text-2xl font-bold text-white">{t.count}</div>
              <div className="text-xs text-gray-400">{t.type}</div>
            </div>
          ))}
        </div>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title={<span className="text-white flex items-center gap-2"><Clock className="w-4 h-4" />Upcoming Trainings</span>} className="bg-gray-800 border-gray-700">
            <Table
              dataSource={upcoming || []}
              columns={upcomingColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<span className="text-white flex items-center gap-2"><Award className="w-4 h-4" />Recently Completed</span>} className="bg-gray-800 border-gray-700">
            <Table
              dataSource={recent || []}
              columns={recentColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TrainingDashboard;
