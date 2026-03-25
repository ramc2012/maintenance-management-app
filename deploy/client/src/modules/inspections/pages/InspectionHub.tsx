import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../core/components/Layout';
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, message,
  Tabs, Popconfirm, Drawer, List, Badge, Space, Divider, InputNumber, Alert
} from 'antd';
import {
  ClipboardCheck, Plus, Play, CheckCircle, AlertTriangle, Eye,
  Trash2, Edit, MapPin, Flag
} from 'lucide-react';
import dayjs from 'dayjs';

const API = '/api/inspections';
const FL_API = '/api/fl';
const token = () => localStorage.getItem('token');
const jsonHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const FREQ_COLORS: Record<string, string> = { DAILY: 'blue', WEEKLY: 'green', MONTHLY: 'orange' };
const STATUS_COLORS: Record<string, string> = { IN_PROGRESS: 'processing', COMPLETED: 'success' };

export const InspectionHub = () => {
  const [activeTab, setActiveTab] = useState('rounds');
  const [rounds, setRounds] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [flList, setFlList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [editRound, setEditRound] = useState<any>(null);
  const [executeDrawerOpen, setExecuteDrawerOpen] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [selectedExecution, setSelectedExecution] = useState<any>(null);
  const [activeExecution, setActiveExecution] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [roundForm] = Form.useForm();

  const fetchRounds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/rounds`, { headers: jsonHeaders() });
      setRounds(await res.json());
    } catch { message.error('Failed to load rounds'); }
    finally { setLoading(false); }
  }, []);

  const fetchExecutions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/executions`, { headers: jsonHeaders() });
      setExecutions(await res.json());
    } catch {}
  }, []);

  const fetchFL = useCallback(async () => {
    try {
      const res = await fetch(`${FL_API}?limit=200`, { headers: jsonHeaders() });
      const data = await res.json();
      setFlList(Array.isArray(data.fls) ? data.fls : Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/stats`, { headers: jsonHeaders() });
      setStats(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchRounds(); fetchExecutions(); fetchFL(); fetchStats(); }, [fetchRounds, fetchExecutions, fetchFL, fetchStats]);

  const handleSaveRound = async (values: any) => {
    const flIds = (values.flIds || []).map((id: string) => {
      const fl = flList.find(f => f.id === id);
      return { id, name: fl?.name || id, description: '' };
    });
    const body = { ...values, flIds };
    try {
      const url = editRound ? `${API}/rounds/${editRound.id}` : `${API}/rounds`;
      const method = editRound ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: jsonHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      message.success(editRound ? 'Round updated' : 'Round created');
      setRoundModalOpen(false);
      roundForm.resetFields();
      setEditRound(null);
      fetchRounds();
    } catch { message.error('Save failed'); }
  };

  const handleDeleteRound = async (id: string) => {
    try {
      await fetch(`${API}/rounds/${id}`, { method: 'DELETE', headers: jsonHeaders() });
      message.success('Round deleted');
      fetchRounds();
    } catch { message.error('Delete failed'); }
  };

  const handleStartExecution = async (round: any) => {
    setSelectedRound(round);
    try {
      const res = await fetch(`${API}/executions`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ roundId: round.id }),
      });
      if (!res.ok) throw new Error();
      const exec = await res.json();
      setActiveExecution(exec);
      setReadings(exec.readings || []);
      setExecuteDrawerOpen(true);
      fetchExecutions();
    } catch { message.error('Failed to start execution'); }
  };

  const handleSaveReadings = async () => {
    if (!activeExecution) return;
    setSaving(true);
    try {
      await fetch(`${API}/executions/${activeExecution.id}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify({ readings }),
      });
      message.success('Progress saved');
    } catch { message.error('Save failed'); }
    setSaving(false);
  };

  const handleCompleteExecution = async () => {
    if (!activeExecution) return;
    setSaving(true);
    try {
      await fetch(`${API}/executions/${activeExecution.id}/complete`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ readings }),
      });
      message.success('Inspection completed');
      setExecuteDrawerOpen(false);
      setActiveExecution(null);
      setReadings([]);
      fetchExecutions();
      fetchStats();
    } catch { message.error('Complete failed'); }
    setSaving(false);
  };

  const updateReading = (index: number, field: string, value: any) => {
    const updated = [...readings];
    updated[index] = { ...updated[index], [field]: value };
    setReadings(updated);
  };

  const roundColumns = [
    { title: 'Round Name', dataIndex: 'name', key: 'name', render: (v: string) => <span className="font-medium">{v}</span> },
    { title: 'FLs', key: 'fls', width: 70, render: (_: any, r: any) => <Badge count={r.flIds?.length || 0} showZero color="blue" /> },
    { title: 'Frequency', dataIndex: 'frequency', key: 'frequency', width: 100, render: (v: string) => <Tag color={FREQ_COLORS[v]}>{v}</Tag> },
    { title: 'Dept', dataIndex: 'assignedDept', key: 'assignedDept', width: 120, render: (v: string) => v || '—' },
    {
      title: 'Status', dataIndex: 'isActive', key: 'isActive', width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>
    },
    {
      title: 'Actions', key: 'actions', width: 180,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" type="primary" icon={<Play className="w-3 h-3" />} onClick={() => handleStartExecution(r)}>Execute</Button>
          <Button size="small" icon={<Edit className="w-3 h-3" />} onClick={() => { setEditRound(r); roundForm.setFieldsValue({ ...r, flIds: (r.flIds || []).map((f: any) => f.id) }); setRoundModalOpen(true); }} />
          <Popconfirm title="Delete this round?" onConfirm={() => handleDeleteRound(r.id)} okType="danger">
            <Button size="small" danger icon={<Trash2 className="w-3 h-3" />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const execColumns = [
    { title: 'Round', key: 'roundName', render: (_: any, r: any) => r.round?.name || '—' },
    { title: 'Executed By', dataIndex: 'executedBy', key: 'executedBy', width: 130 },
    { title: 'Started', dataIndex: 'executedAt', key: 'executedAt', width: 140, render: (v: string) => dayjs(v).format('DD-MM-YYYY HH:mm') },
    { title: 'Completed', dataIndex: 'completedAt', key: 'completedAt', width: 140, render: (v: string) => v ? dayjs(v).format('DD-MM-YYYY HH:mm') : '—' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: (v: string) => <Badge status={STATUS_COLORS[v] as any} text={v.replace('_', ' ')} />
    },
    {
      title: 'Flagged', key: 'flagged', width: 80,
      render: (_: any, r: any) => {
        const count = Array.isArray(r.flaggedItems) ? r.flaggedItems.length : 0;
        return count > 0 ? <Tag color="red" icon={<Flag className="w-3 h-3 inline" />}>{count}</Tag> : <Tag color="green">0</Tag>;
      }
    },
    {
      title: 'Actions', key: 'actions', width: 80,
      render: (_: any, r: any) => (
        <Button size="small" icon={<Eye className="w-3 h-3" />} onClick={() => { setSelectedExecution(r); setViewDrawerOpen(true); }}>View</Button>
      )
    }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 rounded-lg"><ClipboardCheck className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inspection Rounds</h1>
              <p className="text-sm text-gray-500">Field inspection management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats strip */}
            {[
              { label: 'Active Rounds', value: stats.activeRounds || 0, color: 'bg-blue-50 text-blue-700' },
              { label: 'Executions (30d)', value: stats.executions30d || 0, color: 'bg-green-50 text-green-700' },
              { label: 'Flagged Items', value: stats.flaggedItems30d || 0, color: 'bg-red-50 text-red-700' },
            ].map(s => (
              <div key={s.label} className={`px-3 py-2 rounded-lg text-center ${s.color}`}>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            activeTab === 'rounds' && (
              <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditRound(null); roundForm.resetFields(); setRoundModalOpen(true); }}>
                New Round
              </Button>
            )
          }
          items={[
            {
              key: 'rounds',
              label: 'Inspection Rounds',
              children: (
                <Card>
                  <Table
                    dataSource={rounds}
                    columns={roundColumns}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              )
            },
            {
              key: 'history',
              label: 'Execution History',
              children: (
                <Card>
                  <Table
                    dataSource={executions}
                    columns={execColumns}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              )
            }
          ]}
        />

        {/* Round Create/Edit Modal */}
        <Modal
          open={roundModalOpen}
          title={editRound ? 'Edit Inspection Round' : 'Create Inspection Round'}
          onCancel={() => { setRoundModalOpen(false); roundForm.resetFields(); setEditRound(null); }}
          onOk={() => roundForm.submit()}
          width={600}
        >
          <Form form={roundForm} layout="vertical" onFinish={handleSaveRound}>
            <Form.Item name="name" label="Round Name" rules={[{ required: true }]}>
              <Input placeholder="e.g., Morning Field Inspection" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="frequency" label="Frequency" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="DAILY">Daily</Select.Option>
                <Select.Option value="WEEKLY">Weekly</Select.Option>
                <Select.Option value="MONTHLY">Monthly</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="flIds" label="Functional Locations (ordered)" rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one FL' }]}>
              <Select mode="multiple" placeholder="Select FLs in inspection order" showSearch filterOption={(input, option) => String(option?.children || '').toLowerCase().includes(input.toLowerCase())}>
                {flList.map((fl: any) => (
                  <Select.Option key={fl.id} value={fl.id}>{fl.name} — {fl.description || fl.type || ''}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="assignedDept" label="Assigned Department">
              <Input placeholder="e.g., Mechanical, Instrumentation" />
            </Form.Item>
            <Form.Item name="isActive" label="Status" initialValue={true}>
              <Select>
                <Select.Option value={true}>Active</Select.Option>
                <Select.Option value={false}>Inactive</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Execution Drawer */}
        <Drawer
          open={executeDrawerOpen}
          title={`Execute: ${selectedRound?.name || ''}`}
          width={640}
          onClose={() => { setExecuteDrawerOpen(false); setActiveExecution(null); setReadings([]); }}
          extra={
            <Space>
              <Button onClick={handleSaveReadings} loading={saving}>Save Progress</Button>
              <Button type="primary" icon={<CheckCircle className="w-4 h-4" />} onClick={handleCompleteExecution} loading={saving}>
                Complete Inspection
              </Button>
            </Space>
          }
        >
          {activeExecution && (
            <div>
              <Alert message={`Execution ID: ${activeExecution.id.slice(0, 8)}... — Started: ${dayjs(activeExecution.executedAt).format('DD-MM-YYYY HH:mm')}`} type="info" className="mb-4" />
              <List
                dataSource={readings}
                renderItem={(reading: any, index: number) => (
                  <Card size="small" className="mb-3" key={reading.flId}>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-teal-500" />
                      <span className="font-semibold text-sm">{reading.flName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Reading / Value</label>
                        <InputNumber
                          className="w-full mt-1"
                          placeholder="Enter value"
                          value={reading.value}
                          onChange={v => updateReading(index, 'value', v)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Unit</label>
                        <Input
                          className="mt-1"
                          placeholder="e.g., bar, °C, m³/h"
                          value={reading.unit}
                          onChange={e => updateReading(index, 'unit', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Status</label>
                        <Select
                          className="w-full mt-1"
                          value={reading.status || 'NORMAL'}
                          onChange={v => updateReading(index, 'status', v)}
                        >
                          <Select.Option value="NORMAL">Normal</Select.Option>
                          <Select.Option value="WARNING">Warning</Select.Option>
                          <Select.Option value="CRITICAL">Critical</Select.Option>
                          <Select.Option value="NOT_CHECKED">Not Checked</Select.Option>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500">Notes</label>
                        <Input.TextArea
                          rows={2}
                          className="mt-1"
                          placeholder="Observations..."
                          value={reading.notes}
                          onChange={e => updateReading(index, 'notes', e.target.value)}
                        />
                      </div>
                    </div>
                    {reading.status === 'CRITICAL' && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-xs font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Critical reading — will auto-create maintenance request on completion
                      </div>
                    )}
                  </Card>
                )}
              />
            </div>
          )}
        </Drawer>

        {/* View Execution Drawer */}
        <Drawer
          open={viewDrawerOpen}
          title="Inspection Execution Details"
          width={560}
          onClose={() => setViewDrawerOpen(false)}
        >
          {selectedExecution && (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-500">Round</div>
                  <div className="font-medium">{selectedExecution.round?.name || '—'}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-500">Executed By</div>
                  <div className="font-medium">{selectedExecution.executedBy}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-500">Started</div>
                  <div className="font-medium">{dayjs(selectedExecution.executedAt).format('DD-MM-YYYY HH:mm')}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-500">Completed</div>
                  <div className="font-medium">{selectedExecution.completedAt ? dayjs(selectedExecution.completedAt).format('DD-MM-YYYY HH:mm') : 'In Progress'}</div>
                </div>
              </div>
              <Divider>Readings</Divider>
              {(selectedExecution.readings || []).map((r: any, i: number) => (
                <Card size="small" key={i} className="mb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{r.flName}</div>
                      {r.value !== undefined && <div className="text-sm text-gray-600">{r.value} {r.unit}</div>}
                      {r.notes && <div className="text-xs text-gray-500 mt-1">{r.notes}</div>}
                    </div>
                    <Tag color={r.status === 'NORMAL' ? 'green' : r.status === 'WARNING' ? 'orange' : r.status === 'CRITICAL' ? 'red' : 'default'}>
                      {r.status || 'NOT_CHECKED'}
                    </Tag>
                  </div>
                </Card>
              ))}
              {selectedExecution.flaggedItems && selectedExecution.flaggedItems.length > 0 && (
                <>
                  <Divider><span className="text-red-600">Flagged Items</span></Divider>
                  {selectedExecution.flaggedItems.map((f: any, i: number) => (
                    <Alert key={i} type="error" message={f.flName} description={f.note} className="mb-2" showIcon icon={<Flag className="w-4 h-4" />} />
                  ))}
                </>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </Layout>
  );
};
