import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Select, Modal, message, Form, Input, InputNumber, DatePicker, Popconfirm } from 'antd';
import { Eye, Play, CheckCircle, Edit3, Link2, Trash2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface Props { showOverdue?: boolean; }

export const MOHRecords: React.FC<Props> = ({ showOverdue }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [installations, setInstallations] = useState<any[]>([]);
  const [filterInstallation, setFilterInstallation] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => { fetchInstallations(); }, []);
  useEffect(() => { fetchRecords(); }, [filterStatus, filterInstallation]);

  const fetchInstallations = async () => {
    try {
      const res = await axios.get('/api/equipment/installations');
      setInstallations(res.data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchRecords = async () => {
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterInstallation) params.installationId = filterInstallation;
      const res = await axios.get('/api/moh', { params });
      let data = res.data || [];

      if (showOverdue) {
        data = data.filter((r: any) =>
          r.status !== 'COMPLETED' &&
          r.currentRunHours &&
          r.dCheckInterval &&
          r.currentRunHours >= r.dCheckInterval * 0.9
        );
      }

      setRecords(data);
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await axios.put(`/api/moh/${id}/status`, { status });
      message.success('Status updated');
      fetchRecords();
    } catch (error) { message.error('Failed to update status'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/moh/${id}`);
      message.success('Record deleted');
      fetchRecords();
    } catch (error) { message.error('Failed to delete record'); }
  };

  const openEdit = (record: any) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      lastMOHDate: record.lastMOHDate ? dayjs(record.lastMOHDate) : null,
      plannedStartDate: record.plannedStartDate ? dayjs(record.plannedStartDate) : null,
      actualStartDate: record.actualStartDate ? dayjs(record.actualStartDate) : null,
      completedDate: record.completedDate ? dayjs(record.completedDate) : null,
      nextMOHDue: record.nextMOHDue ? dayjs(record.nextMOHDue) : null,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (values: any) => {
    if (!editingRecord) return;
    try {
      const payload: any = {};
      // Only send changed fields
      if (values.status) payload.status = values.status;
      if (values.priority) payload.priority = values.priority;
      if (values.currentRunHours !== undefined) payload.currentRunHours = values.currentRunHours;
      if (values.dCheckInterval !== undefined) payload.dCheckInterval = values.dCheckInterval;
      if (values.estimatedCost !== undefined) payload.estimatedCost = values.estimatedCost;
      if (values.actualCost !== undefined) payload.actualCost = values.actualCost;
      if (values.scopeOfWork) payload.scopeOfWork = values.scopeOfWork;
      if (values.findings) payload.findings = values.findings;
      if (values.actionsTaken) payload.actionsTaken = values.actionsTaken;
      if (values.assignedTo) payload.assignedTo = values.assignedTo;
      if (values.lastMOHDate) payload.lastMOHDate = values.lastMOHDate.toISOString();
      if (values.plannedStartDate) payload.plannedStartDate = values.plannedStartDate.toISOString();
      if (values.actualStartDate) payload.actualStartDate = values.actualStartDate.toISOString();
      if (values.completedDate) payload.completedDate = values.completedDate.toISOString();
      if (values.nextMOHDue) payload.nextMOHDue = values.nextMOHDue.toISOString();

      await axios.put(`/api/moh/${editingRecord.id}`, payload);
      message.success('MOH record updated');
      setEditModalOpen(false);
      form.resetFields();
      setEditingRecord(null);
      fetchRecords();
    } catch (error) { message.error('Failed to update'); }
  };

  const columns = [
    { title: 'MOH #', dataIndex: 'mohNumber', width: 140, render: (m: string) => <span className="font-mono text-red-400">{m}</span> },
    { title: 'Equipment', dataIndex: 'equipmentTag', width: 200, ellipsis: true, render: (t: string, r: any) => <span>{r.equipmentName || t}</span> },
    { title: 'Last MOH', dataIndex: 'lastMOHDate', width: 100, render: (d: string) => d ? dayjs(d).format('DD-MMM-YY') : '-' },
    { title: 'Run Hours', dataIndex: 'currentRunHours', width: 90, render: (h: number) => h?.toLocaleString() || '-' },
    { title: 'D-Check', dataIndex: 'dCheckInterval', width: 80, render: (h: number) => h ? `${h.toLocaleString()} hrs` : '-' },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: string) => {
      const colors: any = { PLANNED: 'blue', PENDING: 'gold', IN_PROGRESS: 'orange', OVERDUE: 'red', COMPLETED: 'green', CANCELLED: 'default' };
      return <Tag color={colors[s] || 'default'}>{(s || '').replace('_', ' ')}</Tag>;
    }},
    { title: 'Priority', dataIndex: 'priority', width: 90, render: (p: string) => {
      const colors: any = { LOW: 'default', MEDIUM: 'blue', HIGH: 'orange', CRITICAL: 'red' };
      return <Tag color={colors[p] || 'default'}>{p}</Tag>;
    }},
    { title: 'Assigned To', dataIndex: 'assignedTo', width: 120, ellipsis: true },
    {
      title: 'Actions', width: isAdmin ? 160 : 130,
      render: (_: any, record: any) => (
        <Space>
          <Button type="text" size="small" icon={<Eye className="w-4 h-4" />} onClick={() => setSelectedRecord(record)} title="View" />
          <Button type="text" size="small" icon={<Edit3 className="w-4 h-4 text-blue-400" />} onClick={() => openEdit(record)} title="Edit" />
          {record.status === 'PLANNED' && <Button type="text" size="small" icon={<Play className="w-4 h-4 text-green-400" />} onClick={() => updateStatus(record.id, 'IN_PROGRESS')} title="Start" />}
          {record.status === 'IN_PROGRESS' && <Button type="text" size="small" icon={<CheckCircle className="w-4 h-4 text-green-400" />} onClick={() => updateStatus(record.id, 'COMPLETED')} title="Complete" />}
          {isAdmin && <Popconfirm title="Delete this record?" onConfirm={() => handleDelete(record.id)}><Button type="text" size="small" danger icon={<Trash2 className="w-4 h-4" />} title="Delete" /></Popconfirm>}
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white">{showOverdue ? 'Overdue/Critical MOH' : 'MOH Records'}</h2>
        <p className="text-gray-400 text-sm">{showOverdue ? 'Equipment exceeding 90% of D-Check interval' : 'Major Overhaul tracking records'}</p>
      </div>

      <div className="flex gap-4 bg-gray-800 p-4 rounded-lg">
        <Select value={filterInstallation || 'all'} onChange={v => setFilterInstallation(v === 'all' ? '' : v)} style={{ width: 180 }}>
          <Option value="all">All Installations</Option>
          {installations.map(i => <Option key={i.id} value={i.id}>{i.installationId}</Option>)}
        </Select>
        <Select value={filterStatus} onChange={setFilterStatus} placeholder="All Status" className="w-40" allowClear>
          <Option value="PLANNED">Planned</Option>
          <Option value="PENDING">Pending</Option>
          <Option value="IN_PROGRESS">In Progress</Option>
          <Option value="OVERDUE">Overdue</Option>
          <Option value="COMPLETED">Completed</Option>
          <Option value="CANCELLED">Cancelled</Option>
        </Select>
      </div>

      <Table
        dataSource={records}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1100 }}
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
      />

      {/* View Modal */}
      <Modal open={!!selectedRecord} onCancel={() => setSelectedRecord(null)} title={<span>{selectedRecord?.mohNumber}</span>} footer={null} width={700}>
        {selectedRecord && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><strong>Equipment:</strong> {selectedRecord.equipmentTag} - {selectedRecord.equipmentName}</div>
              <div><strong>Status:</strong> <Tag>{selectedRecord.status}</Tag></div>
              <div><strong>Priority:</strong> <Tag>{selectedRecord.priority}</Tag></div>
              <div><strong>Last MOH:</strong> {selectedRecord.lastMOHDate ? dayjs(selectedRecord.lastMOHDate).format('DD-MMM-YYYY') : '-'}</div>
              <div><strong>Run Hours:</strong> {selectedRecord.currentRunHours?.toLocaleString() || '-'}</div>
              <div><strong>D-Check Interval:</strong> {selectedRecord.dCheckInterval?.toLocaleString() || '-'} hrs</div>
              <div><strong>Planned Start:</strong> {selectedRecord.plannedStartDate ? dayjs(selectedRecord.plannedStartDate).format('DD-MMM-YYYY') : '-'}</div>
              <div><strong>Actual Start:</strong> {selectedRecord.actualStartDate ? dayjs(selectedRecord.actualStartDate).format('DD-MMM-YYYY') : '-'}</div>
              <div><strong>Completed:</strong> {selectedRecord.completedDate ? dayjs(selectedRecord.completedDate).format('DD-MMM-YYYY') : '-'}</div>
              <div><strong>Assigned To:</strong> {selectedRecord.assignedTo || '-'}</div>
              <div><strong>Est. Cost:</strong> {selectedRecord.estimatedCost ? `₹${selectedRecord.estimatedCost.toLocaleString()}` : '-'}</div>
              <div><strong>Actual Cost:</strong> {selectedRecord.actualCost ? `₹${selectedRecord.actualCost.toLocaleString()}` : '-'}</div>
            </div>
            <div className="border-t pt-3"><strong>Scope of Work:</strong><div className="mt-1 bg-gray-50 p-2 rounded text-gray-800 whitespace-pre-wrap">{selectedRecord.scopeOfWork || 'Not specified'}</div></div>
            {selectedRecord.findings && <div className="border-t pt-3"><strong>Findings:</strong><div className="mt-1 bg-gray-50 p-2 rounded text-gray-800 whitespace-pre-wrap">{selectedRecord.findings}</div></div>}
            {selectedRecord.actionsTaken && <div className="border-t pt-3"><strong>Actions Taken:</strong><div className="mt-1 bg-gray-50 p-2 rounded text-gray-800 whitespace-pre-wrap">{selectedRecord.actionsTaken}</div></div>}
            {selectedRecord.procurementCaseId && (
              <div className="border-t pt-3"><Tag color="cyan" icon={<Link2 className="w-3 h-3" />}>Linked to Procurement Case</Tag></div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingRecord(null); form.resetFields(); }}
        title={`Edit MOH: ${editingRecord?.mohNumber || ''}`}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleEditSubmit} size="small">
          <div className="grid grid-cols-3 gap-3">
            <Form.Item name="status" label="Status">
              <Select>
                <Option value="PLANNED">Planned</Option>
                <Option value="PENDING">Pending</Option>
                <Option value="IN_PROGRESS">In Progress</Option>
                <Option value="OVERDUE">Overdue</Option>
                <Option value="COMPLETED">Completed</Option>
                <Option value="CANCELLED">Cancelled</Option>
              </Select>
            </Form.Item>
            <Form.Item name="priority" label="Priority">
              <Select>
                <Option value="LOW">Low</Option>
                <Option value="MEDIUM">Medium</Option>
                <Option value="HIGH">High</Option>
                <Option value="CRITICAL">Critical</Option>
              </Select>
            </Form.Item>
            <Form.Item name="assignedTo" label="Assigned To">
              <Input placeholder="Person / Contractor" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Form.Item name="currentRunHours" label="Current Run Hours">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="dCheckInterval" label="D-Check Interval (hrs)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="lastMOHDate" label="Last MOH Date">
              <DatePicker style={{ width: '100%' }} format="DD-MMM-YYYY" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Form.Item name="plannedStartDate" label="Planned Start Date">
              <DatePicker style={{ width: '100%' }} format="DD-MMM-YYYY" />
            </Form.Item>
            <Form.Item name="actualStartDate" label="Actual Start Date">
              <DatePicker style={{ width: '100%' }} format="DD-MMM-YYYY" />
            </Form.Item>
            <Form.Item name="completedDate" label="Completed Date">
              <DatePicker style={{ width: '100%' }} format="DD-MMM-YYYY" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Form.Item name="estimatedCost" label="Estimated Cost (₹)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="actualCost" label="Actual Cost (₹)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="nextMOHDue" label="Next MOH Due">
              <DatePicker style={{ width: '100%' }} format="DD-MMM-YYYY" />
            </Form.Item>
          </div>
          <Form.Item name="scopeOfWork" label="Scope of Work">
            <TextArea rows={3} placeholder="Describe the scope of overhaul work" />
          </Form.Item>
          <Form.Item name="findings" label="Findings">
            <TextArea rows={2} placeholder="Inspection findings" />
          </Form.Item>
          <Form.Item name="actionsTaken" label="Actions Taken">
            <TextArea rows={2} placeholder="Corrective actions taken" />
          </Form.Item>
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => { setEditModalOpen(false); form.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save Changes</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MOHRecords;
