import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Modal, Select, message } from 'antd';
import { Eye, Edit, Users, Plus } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;

interface Props { showAttendance?: boolean; }

export const TrainingRecords: React.FC<Props> = ({ showAttendance }) => {
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => { fetchTrainings(); }, [filterType, filterStatus]);

  const fetchTrainings = async () => {
    try {
      const params: any = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      const res = await axios.get('/api/training', { params });
      setTrainings(res.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', ellipsis: true, render: (t: string) => <span className="font-semibold text-white">{t}</span> },
    { title: 'Type', dataIndex: 'trainingType', render: (t: string) => {
      const colors: any = { SAFETY: 'red', TECHNICAL: 'blue', HSE: 'orange', SOFT_SKILLS: 'purple', INDUCTION: 'green' };
      return <Tag color={colors[t] || 'default'}>{t}</Tag>;
    }},
    { title: 'Installation', dataIndex: ['installation', 'installationId'] },
    { title: 'Start', dataIndex: 'startDate', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: 'End', dataIndex: 'endDate', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: 'Status', dataIndex: 'status', render: (s: string) => {
      const colors: any = { SCHEDULED: 'blue', ONGOING: 'orange', COMPLETED: 'green', CANCELLED: 'red' };
      return <Tag color={colors[s]}>{s}</Tag>;
    }},
    { title: 'Attendees', render: (_: any, r: any) => <span>{r.attendees?.length || 0}</span> },
    {
      title: 'Actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="text" icon={<Eye className="w-4 h-4" />} onClick={() => setSelectedTraining(record)} />
          {showAttendance && <Button type="text" icon={<Users className="w-4 h-4" />} />}
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">{showAttendance ? 'Attendance Management' : 'Training Records'}</h2>
          <p className="text-gray-400 text-sm">Browse and manage training sessions</p>
        </div>
      </div>

      <div className="flex gap-4 bg-gray-800 p-4 rounded-lg">
        <Select value={filterType} onChange={setFilterType} placeholder="All Types" className="w-40" allowClear>
          <Option value="SAFETY">Safety</Option>
          <Option value="TECHNICAL">Technical</Option>
          <Option value="HSE">HSE</Option>
          <Option value="SOFT_SKILLS">Soft Skills</Option>
          <Option value="INDUCTION">Induction</Option>
        </Select>
        <Select value={filterStatus} onChange={setFilterStatus} placeholder="All Status" className="w-40" allowClear>
          <Option value="SCHEDULED">Scheduled</Option>
          <Option value="ONGOING">Ongoing</Option>
          <Option value="COMPLETED">Completed</Option>
          <Option value="CANCELLED">Cancelled</Option>
        </Select>
      </div>

      <Table
        dataSource={trainings}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        footer={() => <div className="text-gray-400 text-sm">Total: <span className="text-white font-bold">{trainings.length}</span> trainings</div>}
      />

      <Modal
        open={!!selectedTraining}
        onCancel={() => setSelectedTraining(null)}
        title={<span className="text-white">{selectedTraining?.title}</span>}
        footer={null}
        width={600}
      >
        {selectedTraining && (
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-400">Type:</span> <Tag>{selectedTraining.trainingType}</Tag></div>
            <div><span className="text-gray-400">Status:</span> <Tag>{selectedTraining.status}</Tag></div>
            <div><span className="text-gray-400">Duration:</span> {selectedTraining.durationHours}h</div>
            <div><span className="text-gray-400">Trainer:</span> {selectedTraining.trainerName || 'TBD'}</div>
            <div><span className="text-gray-400">Venue:</span> {selectedTraining.venue || '-'}</div>
            <div><span className="text-gray-400">Description:</span> {selectedTraining.description || '-'}</div>
            <div className="border-t border-gray-700 pt-3">
              <span className="text-gray-400">Attendees ({selectedTraining.attendees?.length || 0}):</span>
              <div className="mt-2 space-y-1">
                {selectedTraining.attendees?.map((a: any) => (
                  <div key={a.id} className="flex justify-between text-xs bg-gray-800 p-2 rounded">
                    <span>{a.employeeName}</span>
                    <Tag color={a.attended ? 'green' : 'default'}>{a.attended ? 'Attended' : 'Pending'}</Tag>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TrainingRecords;
