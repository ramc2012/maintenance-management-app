import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Select, Modal, message } from 'antd';
import { Eye, Play, Pause, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;

const SHOP_CONFIG: Record<string, { name: string; color: string }> = {
  FABRICATION: { name: 'Fabrication', color: 'blue' },
  DIESEL: { name: 'Diesel', color: 'orange' },
  MACHINE: { name: 'Machine', color: 'green' },
  ELECTRICAL: { name: 'Electrical', color: 'purple' },
};

interface Props { shopFilter?: string; }

export const JobTracking: React.FC<Props> = ({ shopFilter }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');

  useEffect(() => { fetchJobs(); }, [shopFilter, filterStatus, filterPriority]);

  const fetchJobs = async () => {
    try {
      const params: any = {};
      if (shopFilter) params.shopType = shopFilter;
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const res = await axios.get('/api/workshop', { params });
      setJobs(res.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await axios.put(`/api/workshop/${id}/status`, { status });
      message.success('Status updated');
      fetchJobs();
    } catch (error) {
      message.error('Failed to update status');
    }
  };

  const columns = [
    { title: 'Job #', dataIndex: 'jobNumber', render: (j: string) => <span className="font-mono text-blue-400">{j}</span> },
    { title: 'Shop', dataIndex: 'shopType', render: (s: string) => <Tag color={SHOP_CONFIG[s]?.color}>{SHOP_CONFIG[s]?.name}</Tag> },
    { title: 'Title', dataIndex: 'title', ellipsis: true, render: (t: string) => <span className="text-white">{t}</span> },
    { title: 'Requested By', dataIndex: 'requestedBy' },
    { title: 'Priority', dataIndex: 'priority', render: (p: string) => {
      const colors: any = { LOW: 'default', NORMAL: 'blue', HIGH: 'orange', URGENT: 'red' };
      return <Tag color={colors[p]}>{p}</Tag>;
    }},
    { title: 'Status', dataIndex: 'status', render: (s: string) => {
      const colors: any = { PENDING: 'orange', IN_PROGRESS: 'cyan', COMPLETED: 'green', ON_HOLD: 'default', CANCELLED: 'red' };
      return <Tag color={colors[s]}>{s.replace('_', ' ')}</Tag>;
    }},
    { title: 'Requested', dataIndex: 'requestDate', render: (d: string) => new Date(d).toLocaleDateString() },
    {
      title: 'Actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="text" icon={<Eye className="w-4 h-4" />} onClick={() => setSelectedJob(record)} />
          {record.status === 'PENDING' && <Button type="text" icon={<Play className="w-4 h-4 text-green-400" />} onClick={() => updateStatus(record.id, 'IN_PROGRESS')} title="Start" />}
          {record.status === 'IN_PROGRESS' && <Button type="text" icon={<Pause className="w-4 h-4 text-orange-400" />} onClick={() => updateStatus(record.id, 'ON_HOLD')} title="Hold" />}
          {record.status === 'IN_PROGRESS' && <Button type="text" icon={<CheckCircle className="w-4 h-4 text-green-400" />} onClick={() => updateStatus(record.id, 'COMPLETED')} title="Complete" />}
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">{shopFilter ? `${SHOP_CONFIG[shopFilter]?.name} Shop Jobs` : 'All Workshop Jobs'}</h2>
          <p className="text-gray-400 text-sm">Track and manage workshop jobs</p>
        </div>
      </div>

      <div className="flex gap-4 bg-gray-800 p-4 rounded-lg">
        <Select value={filterStatus} onChange={setFilterStatus} placeholder="All Status" className="w-40" allowClear>
          <Option value="PENDING">Pending</Option>
          <Option value="IN_PROGRESS">In Progress</Option>
          <Option value="ON_HOLD">On Hold</Option>
          <Option value="COMPLETED">Completed</Option>
          <Option value="CANCELLED">Cancelled</Option>
        </Select>
        <Select value={filterPriority} onChange={setFilterPriority} placeholder="All Priority" className="w-40" allowClear>
          <Option value="LOW">Low</Option>
          <Option value="NORMAL">Normal</Option>
          <Option value="HIGH">High</Option>
          <Option value="URGENT">Urgent</Option>
        </Select>
      </div>

      <Table
        dataSource={jobs}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        footer={() => <div className="text-gray-400 text-sm">Total: <span className="text-white font-bold">{jobs.length}</span> jobs</div>}
      />

      <Modal open={!!selectedJob} onCancel={() => setSelectedJob(null)} title={<span className="text-white">{selectedJob?.jobNumber} - {selectedJob?.title}</span>} footer={null} width={600}>
        {selectedJob && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-400">Shop:</span> <Tag color={SHOP_CONFIG[selectedJob.shopType]?.color}>{SHOP_CONFIG[selectedJob.shopType]?.name}</Tag></div>
              <div><span className="text-gray-400">Status:</span> <Tag>{selectedJob.status}</Tag></div>
              <div><span className="text-gray-400">Priority:</span> <Tag>{selectedJob.priority}</Tag></div>
              <div><span className="text-gray-400">Requested By:</span> {selectedJob.requestedBy}</div>
              <div><span className="text-gray-400">Assigned To:</span> {selectedJob.assignedTo || '-'}</div>
              <div><span className="text-gray-400">Equipment:</span> {selectedJob.equipmentTag || '-'}</div>
            </div>
            <div className="border-t border-gray-700 pt-3">
              <div><span className="text-gray-400">Description:</span></div>
              <div className="text-white mt-1">{selectedJob.description || 'No description'}</div>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-gray-700 pt-3">
              <div><span className="text-gray-400">Est. Hours:</span> {selectedJob.estimatedHours || '-'}</div>
              <div><span className="text-gray-400">Actual Hours:</span> {selectedJob.actualHours || '-'}</div>
              <div><span className="text-gray-400">Total Cost:</span> ₹{selectedJob.totalCost?.toLocaleString() || '-'}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default JobTracking;
