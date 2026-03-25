import React, { useState, useEffect } from 'react';
import { Layout } from '../../core/components/Layout';
import {
  ClipboardList, Plus, Search, CheckSquare, AlertCircle,
  Clock, Users, Wrench, ChevronRight, Home, BarChart,
  FileText, Calendar, ChevronDown, ChevronUp, X, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Table, Modal, Form, Input, Select, DatePicker,
  Tag, Card, Statistic, Row, Col, Tabs, Tooltip, Popconfirm,
  message, Steps, Divider, Badge, Drawer, Descriptions,
  Checkbox, Space, Timeline, Empty, InputNumber, Switch
} from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const MR_API = '/api/maintenance-requests';
const WO_API = '/api/workorders';
const token = () => localStorage.getItem('token');
const jsonHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const PRIORITY_COLORS: Record<string, string> = { LOW: 'green', NORMAL: 'blue', HIGH: 'orange', EMERGENCY: 'red' };
const STATUS_COLORS: Record<string, string> = {
  OPEN: 'blue', IN_PROGRESS: 'orange', COMPLETED: 'cyan', CLOSED: 'green',
  PENDING: 'default', APPROVED: 'green', REJECTED: 'red', CONVERTED: 'purple', CANCELLED: 'red'
};

const WORK_ROLES = ['SUPERVISOR', 'TECHNICIAN', 'HELPER', 'CONTRACTOR', 'SAFETY_OFFICER'];

export const WorkOrderHub = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [woStats, setWoStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [createReqOpen, setCreateReqOpen] = useState(false);
  const [woDetailOpen, setWoDetailOpen] = useState(false);
  const [closeWoOpen, setCloseWoOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [reqForm] = Form.useForm();
  const [closeForm] = Form.useForm();
  const [convertForm] = Form.useForm();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Fetch data
  const fetchRequests = async () => {
    try {
      const res = await fetch(MR_API, { headers: jsonHeaders() });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch { message.error('Failed to load requests'); }
  };

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`${WO_API}?${params}`, { headers: jsonHeaders() });
      const data = await res.json();
      setWorkOrders(Array.isArray(data) ? data : []);
    } catch { message.error('Failed to load work orders'); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${WO_API}/stats`, { headers: jsonHeaders() });
      setWoStats(await res.json());
    } catch {}
  };

  const fetchWoDetail = async (id: string) => {
    try {
      const res = await fetch(`${WO_API}/${id}/detail`, { headers: jsonHeaders() });
      const data = await res.json();
      setSelectedWO(data);
      setTeamMembers(data?.teamMembers || []);
      setChecklist(data?.checklist || []);
    } catch {
      const res = await fetch(`${WO_API}/${id}`, { headers: jsonHeaders() });
      setSelectedWO(await res.json());
    }
  };

  useEffect(() => { fetchRequests(); fetchWorkOrders(); fetchStats(); }, [statusFilter]);

  const fetchAttachments = async (woId: string) => {
    try {
      const res = await fetch(`${WO_API}/${woId}/attachments`, { headers: jsonHeaders() });
      if (res.ok) setAttachments(await res.json());
    } catch {}
  };

  const handleUploadAttachment = async (woId: string, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', file);
      const res = await fetch(`${WO_API}/${woId}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      message.success('File uploaded');
      fetchAttachments(woId);
    } catch { message.error('Upload failed'); }
    setUploading(false);
  };

  const handleDeleteAttachment = async (woId: string, attachId: string) => {
    try {
      await fetch(`${WO_API}/${woId}/attachments/${attachId}`, { method: 'DELETE', headers: jsonHeaders() });
      message.success('Attachment deleted');
      fetchAttachments(woId);
    } catch { message.error('Delete failed'); }
  };

  const handleExportWOs = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`${WO_API}/export?${params}`, { headers: jsonHeaders() });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `WorkOrders_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { message.error('Export failed'); }
    setExporting(false);
  };

  // Create Maintenance Request
  const handleCreateRequest = async (values: any) => {
    try {
      const res = await fetch(MR_API, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ ...values, requestedAt: new Date().toISOString() })
      });
      if (!res.ok) throw new Error();
      message.success('Maintenance request submitted!');
      setCreateReqOpen(false);
      reqForm.resetFields();
      fetchRequests();
    } catch { message.error('Failed to create request'); }
  };

  // Approve Request
  const handleApprove = async (id: string) => {
    try {
      await fetch(`${MR_API}/${id}/approve`, { method: 'POST', headers: jsonHeaders() });
      message.success('Request approved');
      fetchRequests();
    } catch { message.error('Failed to approve'); }
  };

  // Reject Request
  const handleReject = async (id: string) => {
    try {
      await fetch(`${MR_API}/${id}/reject`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ rejectionReason: 'Rejected by manager' })
      });
      message.success('Request rejected');
      fetchRequests();
    } catch { message.error('Failed to reject'); }
  };

  // Convert to Work Order
  const openConvert = (req: any) => {
    setSelectedReq(req);
    setConvertOpen(true);
  };

  const handleConvert = async (values: any) => {
    try {
      const res = await fetch(`${MR_API}/${selectedReq.id}/convert`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(values)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Conversion failed');
      }
      message.success('Work Order created!');
      setConvertOpen(false);
      convertForm.resetFields();
      fetchRequests();
      fetchWorkOrders();
      fetchStats();
    } catch (e: any) { message.error(e.message || 'Failed to convert'); }
  };

  // Start Work Order
  const handleStart = async (id: string) => {
    try {
      await fetch(`${WO_API}/${id}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify({ status: 'IN_PROGRESS', startDate: new Date().toISOString() })
      });
      message.success('Work order started');
      fetchWorkOrders(); fetchStats();
    } catch { message.error('Failed to start WO'); }
  };

  // Add team member locally
  const addTeamMember = () => {
    setTeamMembers([...teamMembers, {
      id: Date.now().toString(),
      employeeName: '',
      designation: '',
      department: '',
      role: 'TECHNICIAN',
      isContractor: false,
      companyName: '',
      hoursWorked: 0
    }]);
  };

  const updateTeamMember = (idx: number, field: string, value: any) => {
    const updated = [...teamMembers];
    updated[idx] = { ...updated[idx], [field]: value };
    setTeamMembers(updated);
  };

  // Close Work Order
  const handleCloseWO = async (values: any) => {
    try {
      const payload = {
        ...values,
        teamMembers: teamMembers.filter(m => m.employeeName),
        closedBy: 'admin'
      };
      const res = await fetch(`${WO_API}/${selectedWO.id}/close`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      message.success('Work order closed! Maintenance log auto-created.');
      setCloseWoOpen(false);
      closeForm.resetFields();
      setTeamMembers([]);
      fetchWorkOrders(); fetchStats();
    } catch { message.error('Failed to close work order'); }
  };

  const openWODetail = async (wo: any) => {
    await fetchWoDetail(wo.id);
    fetchAttachments(wo.id);
    setWoDetailOpen(true);
  };

  const openCloseWO = async (wo: any) => {
    await fetchWoDetail(wo.id);
    setCloseWoOpen(true);
  };

  // Stats bar
  const counts = woStats.counts || {};

  const SidebarContent = (
    <div className="space-y-3">
      <Button icon={<Home className="w-4 h-4" />} onClick={() => navigate('/')} className="w-full" ghost>Maintenance Hub</Button>
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">Navigation</p>
        {[
          { tab: 'requests', label: 'Maintenance Requests', icon: FileText, badge: requests.filter(r => r.status === 'PENDING').length },
          { tab: 'workorders', label: 'Work Orders', icon: ClipboardList, badge: (counts.open || 0) + (counts.inProgress || 0) },
          { tab: 'dashboard', label: 'Dashboard', icon: BarChart, badge: 0 },
        ].map(({ tab, label, icon: Icon, badge }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md ${activeTab === tab ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/20' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
            <span className="flex items-center gap-2"><Icon className="w-4 h-4" />{label}</span>
            {badge > 0 && <Badge count={badge} size="small" />}
          </button>
        ))}
      </div>
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">WO Status Filter</p>
        {['', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`w-full text-left px-3 py-1 text-xs rounded-md ${statusFilter === s ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
    </div>
  );

  const requestColumns = [
    {
      title: 'Req No.', dataIndex: 'reqNumber', width: 140,
      render: (n: string) => <span className="font-mono text-xs font-bold text-teal-600">{n}</span>
    },
    {
      title: 'Title / Type', dataIndex: 'title',
      render: (t: string, r: any) => (
        <div>
          <div className="font-medium dark:text-white">{t}</div>
          <Tag color="blue" className="text-xs">{r.requestType}</Tag>
          {r.equipmentTag && <span className="text-xs text-gray-500 ml-1">• {r.equipmentTag}</span>}
        </div>
      )
    },
    { title: 'Priority', dataIndex: 'priority', width: 90, render: (p: string) => <Tag color={PRIORITY_COLORS[p]}>{p}</Tag> },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: string) => <Tag color={STATUS_COLORS[s]}>{s}</Tag> },
    {
      title: 'Requested By', width: 120,
      render: (_: any, r: any) => (
        <div className="text-xs">
          <div>{r.requestedBy}</div>
          <div className="text-gray-400">{dayjs(r.requestedAt).format('DD MMM YYYY')}</div>
        </div>
      )
    },
    {
      title: 'Actions', width: 180,
      render: (_: any, r: any) => (
        <Space size="small">
          {r.status === 'PENDING' && <>
            <Button size="small" type="primary" onClick={() => handleApprove(r.id)}>Approve</Button>
            <Popconfirm title="Reject?" onConfirm={() => handleReject(r.id)}>
              <Button size="small" danger>Reject</Button>
            </Popconfirm>
          </>}
          {r.status === 'APPROVED' && (
            <Button size="small" type="primary" icon={<Wrench className="w-3 h-3" />}
              onClick={() => openConvert(r)} style={{ background: '#7c3aed' }}>
              Create WO
            </Button>
          )}
          {r.status === 'CONVERTED' && r.workOrderId && (
            <Tag color="purple">WO Created</Tag>
          )}
        </Space>
      )
    }
  ];

  const woColumns = [
    {
      title: 'WO Number', dataIndex: 'woNumber', width: 160,
      render: (n: string) => <span className="font-mono text-xs font-bold text-blue-600">{n}</span>
    },
    {
      title: 'Description', dataIndex: 'description',
      render: (d: string, r: any) => (
        <div>
          <div className="font-medium dark:text-white truncate max-w-xs">{d}</div>
          <div className="text-xs text-gray-500">{r.functionalLocation?.flId || 'No FL'} • {r.woType}</div>
        </div>
      )
    },
    { title: 'Priority', dataIndex: 'priority', width: 90, render: (p: string) => <Tag color={PRIORITY_COLORS[p]}>{p}</Tag> },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: string) => <Tag color={STATUS_COLORS[s]}>{s}</Tag> },
    {
      title: 'Scheduled', dataIndex: 'scheduledDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD MMM YYYY') : '-'
    },
    {
      title: 'Actions', width: 200,
      render: (_: any, r: any) => (
        <Space size="small">
          <Tooltip title="View"><Button size="small" icon={<FileText className="w-3 h-3" />} onClick={() => openWODetail(r)} /></Tooltip>
          {r.status === 'OPEN' && (
            <Button size="small" type="primary" onClick={() => handleStart(r.id)}>Start</Button>
          )}
          {(r.status === 'IN_PROGRESS' || r.status === 'OPEN') && (
            <Button size="small" style={{ background: '#059669', color: '#fff', borderColor: '#059669' }}
              onClick={() => openCloseWO(r)}>
              Close
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <Layout sidebarContent={SidebarContent}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-teal-500" />
              Work Order Management
            </h2>
            <p className="text-sm text-gray-500">Maintenance requests → Work orders → Closure with team</p>
          </div>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateReqOpen(true)}>
            New Request
          </Button>
        </div>

        {/* Stats */}
        <Row gutter={12}>
          {[
            { label: 'Open', value: counts.open || 0, color: '#2563eb' },
            { label: 'In Progress', value: counts.inProgress || 0, color: '#d97706' },
            { label: 'Overdue', value: counts.overdue || 0, color: '#dc2626' },
            { label: 'Closed', value: counts.closed || 0, color: '#059669' },
          ].map(({ label, value, color }) => (
            <Col key={label} xs={12} sm={6}>
              <Card size="small">
                <Statistic title={label} value={value} valueStyle={{ color, fontSize: 22 }} />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Tabs */}
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'requests',
            label: (
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Maintenance Requests
                {requests.filter(r => r.status === 'PENDING').length > 0 &&
                  <Badge count={requests.filter(r => r.status === 'PENDING').length} size="small" />}
              </span>
            ),
            children: (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input prefix={<Search className="w-4 h-4 text-gray-400" />}
                    placeholder="Search requests..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="max-w-xs" />
                </div>
                <Table dataSource={requests.filter(r =>
                  r.title?.toLowerCase().includes(search.toLowerCase()) ||
                  r.reqNumber?.toLowerCase().includes(search.toLowerCase())
                )} rowKey="id" columns={requestColumns} size="small"
                  locale={{ emptyText: <Empty description="No maintenance requests. Click 'New Request' to create one." /> }} />
              </div>
            )
          },
          {
            key: 'workorders',
            label: (
              <span className="flex items-center gap-1">
                <ClipboardList className="w-4 h-4" />
                Work Orders
              </span>
            ),
            children: (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input prefix={<Search className="w-4 h-4 text-gray-400" />}
                    placeholder="Search work orders..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="max-w-xs" />
                  <Button icon={<Download className="w-4 h-4" />} onClick={handleExportWOs} loading={exporting}>Export Excel</Button>
                </div>
                <Table dataSource={workOrders.filter(w =>
                  w.woNumber?.toLowerCase().includes(search.toLowerCase()) ||
                  w.description?.toLowerCase().includes(search.toLowerCase())
                )} rowKey="id" columns={woColumns} loading={loading} size="small"
                  locale={{ emptyText: <Empty description="No work orders. Approve a request and convert it." /> }} />
              </div>
            )
          },
          {
            key: 'dashboard',
            label: <span className="flex items-center gap-1"><BarChart className="w-4 h-4" />Dashboard</span>,
            children: (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card title="Work Order Status Overview" size="small">
                    <div className="flex gap-6 flex-wrap">
                      {woStats.byType?.map((t: any) => (
                        <div key={t.woType} className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{t._count}</div>
                          <div className="text-xs text-gray-500">{t.woType}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Col>
                <Col span={24}>
                  <Card title="Top Failure Modes" size="small">
                    {woStats.topFailureModes?.length > 0 ? (
                      <div className="space-y-2">
                        {woStats.topFailureModes.map(([code, count]: [string, number]) => (
                          <div key={code} className="flex items-center gap-3">
                            <Tag color="red">{code}</Tag>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, count * 20)}%` }} />
                            </div>
                            <span className="text-sm font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    ) : <Empty description="No failure data yet" />}
                  </Card>
                </Col>
              </Row>
            )
          }
        ]} />
      </div>

      {/* Create Request Modal */}
      <Modal title="New Maintenance Request" open={createReqOpen}
        onCancel={() => { setCreateReqOpen(false); reqForm.resetFields(); }} footer={null} width={600}>
        <Form form={reqForm} layout="vertical" onFinish={handleCreateRequest}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Brief description of maintenance needed" />
          </Form.Item>
          <Form.Item name="description" label="Detailed Description" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Describe the issue or maintenance required in detail..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="requestType" label="Request Type" rules={[{ required: true }]} initialValue="CORRECTIVE">
                <Select>
                  <Option value="CORRECTIVE">Corrective</Option>
                  <Option value="PREVENTIVE">Preventive</Option>
                  <Option value="INSPECTION">Inspection</Option>
                  <Option value="MODIFICATION">Modification</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" initialValue="NORMAL">
                <Select>
                  <Option value="LOW"><Tag color="green">LOW</Tag></Option>
                  <Option value="NORMAL"><Tag color="blue">NORMAL</Tag></Option>
                  <Option value="HIGH"><Tag color="orange">HIGH</Tag></Option>
                  <Option value="EMERGENCY"><Tag color="red">EMERGENCY</Tag></Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="equipmentTag" label="Equipment Tag">
                <Input placeholder="e.g., P-101A, K-201" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="flId" label="Functional Location ID">
                <Input placeholder="e.g., FL-001" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remarks" label="Remarks">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="requestedBy" label="Requested By" rules={[{ required: true }]}>
            <Input placeholder="Your name / employee ID" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => { setCreateReqOpen(false); reqForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit">Submit Request</Button>
          </div>
        </Form>
      </Modal>

      {/* Convert to WO Modal */}
      <Modal title={`Create Work Order from ${selectedReq?.reqNumber}`}
        open={convertOpen} onCancel={() => setConvertOpen(false)} footer={null}>
        <Form form={convertForm} layout="vertical" onFinish={handleConvert}>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <strong>{selectedReq?.title}</strong><br />
            {selectedReq?.description}
          </p>
          <Form.Item name="flId" label="Functional Location ID" rules={[{ required: true, message: 'FL ID is required' }]}
            initialValue={selectedReq?.flId}>
            <Input placeholder="e.g., enter FL ID from Assets module" />
          </Form.Item>
          <Form.Item name="scheduledDate" label="Scheduled Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remarks" label="Additional Instructions">
            <TextArea rows={2} />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#7c3aed' }}>Create Work Order</Button>
          </div>
        </Form>
      </Modal>

      {/* WO Detail Drawer */}
      <Drawer title={selectedWO?.woNumber} open={woDetailOpen} onClose={() => setWoDetailOpen(false)} width={600}>
        {selectedWO && (
          <div className="space-y-4">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[selectedWO.status]}>{selectedWO.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Priority"><Tag color={PRIORITY_COLORS[selectedWO.priority]}>{selectedWO.priority}</Tag></Descriptions.Item>
              <Descriptions.Item label="Type">{selectedWO.woType}</Descriptions.Item>
              <Descriptions.Item label="FL">{selectedWO.functionalLocation?.flId || '-'}</Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>{selectedWO.description}</Descriptions.Item>
              <Descriptions.Item label="Scheduled">{selectedWO.scheduledDate ? dayjs(selectedWO.scheduledDate).format('DD MMM YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Started">{selectedWO.startDate ? dayjs(selectedWO.startDate).format('DD MMM YYYY HH:mm') : 'Not started'}</Descriptions.Item>
              {selectedWO.completionDate && <Descriptions.Item label="Closed">{dayjs(selectedWO.completionDate).format('DD MMM YYYY HH:mm')}</Descriptions.Item>}
              {selectedWO.failureMode && <Descriptions.Item label="Failure Mode">{selectedWO.failureMode}</Descriptions.Item>}
              {selectedWO.actionTaken && <Descriptions.Item label="Action Taken">{selectedWO.actionTaken}</Descriptions.Item>}
            </Descriptions>
            {selectedWO.teamMembers?.length > 0 && (
              <Card title={<span className="flex items-center gap-2"><Users className="w-4 h-4" />Team Members</span>} size="small">
                {selectedWO.teamMembers.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between py-1 border-b last:border-0">
                    <div>
                      <span className="font-medium">{m.employeeName}</span>
                      {m.designation && <span className="text-xs text-gray-500 ml-2">{m.designation}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag color="blue">{m.role}</Tag>
                      {m.hoursWorked && <span className="text-xs text-gray-500">{m.hoursWorked}h</span>}
                    </div>
                  </div>
                ))}
              </Card>
            )}
            {selectedWO.checklist?.length > 0 && (
              <Card title={<span className="flex items-center gap-2"><CheckSquare className="w-4 h-4" />Checklist</span>} size="small">
                {selectedWO.checklist.map((item: any) => (
                  <div key={item.id} className={`flex items-center gap-2 py-1 ${item.isCompleted ? 'line-through text-gray-400' : ''}`}>
                    <Checkbox checked={item.isCompleted} disabled />
                    <span className="text-sm">{item.description}</span>
                    {item.completedBy && <span className="text-xs text-gray-400">({item.completedBy})</span>}
                  </div>
                ))}
              </Card>
            )}
            {/* Attachments Section */}
            <Card
              title={<span className="flex items-center gap-2"><FileText className="w-4 h-4" />Attachments ({attachments.length})</span>}
              size="small"
              extra={
                <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-700 font-medium">
                  {uploading ? 'Uploading...' : '+ Upload'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={e => { if (e.target.files?.[0] && selectedWO) handleUploadAttachment(selectedWO.id, e.target.files[0]); e.target.value = ''; }}
                  />
                </label>
              }
            >
              {attachments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">No attachments yet. Upload photos or documents.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {attachments.map((att: any) => (
                    <div key={att.id} className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {att.mimeType?.startsWith('image/') ? (
                        <img
                          src={`/api/workorders/${selectedWO?.id}/attachments/${att.id}/file`}
                          alt={att.fileName}
                          className="w-full h-20 object-cover"
                        />
                      ) : (
                        <div className="w-full h-20 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700">
                          <FileText className="w-6 h-6 text-gray-400" />
                          <span className="text-[10px] text-gray-500 mt-1 text-center px-1 truncate w-full">{att.fileName}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={`/api/workorders/${selectedWO?.id}/attachments/${att.id}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white text-xs bg-blue-600 px-2 py-1 rounded"
                        >View</a>
                        <button
                          onClick={() => selectedWO && handleDeleteAttachment(selectedWO.id, att.id)}
                          className="text-white text-xs bg-red-600 px-2 py-1 rounded"
                        >Del</button>
                      </div>
                      {att.caption && <div className="text-[10px] text-gray-500 px-1 pb-1 truncate">{att.caption}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </Drawer>

      {/* Close WO Modal */}
      <Modal title={`Close Work Order: ${selectedWO?.woNumber}`}
        open={closeWoOpen} onCancel={() => { setCloseWoOpen(false); closeForm.resetFields(); setTeamMembers([]); }}
        footer={null} width={750}>
        <Form form={closeForm} layout="vertical" onFinish={handleCloseWO}>
          <Divider orientation="left">Closure Details (ISO 14224)</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="failureMode" label="Failure Mode">
                <Select allowClear placeholder="Select...">
                  {['BRD','LKG','STK','SHV','OHT','ELF','INL','CAL','WER','CRK','COR','ERO'].map(c =>
                    <Option key={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="causeCode" label="Cause Code">
                <Select allowClear placeholder="Select...">
                  {['LUB','WER','OVL','AGE','MIS','VIB','CON','COR','OPE','DES'].map(c =>
                    <Option key={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actionTaken" label="Action Taken">
                <Select allowClear placeholder="Select...">
                  {['REPLACE','REPAIR','ADJUST','CLEAN','LUBRICATE','CALIBRATE','INSPECT','NONE'].map(c =>
                    <Option key={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="labourHours" label="Labour Hours">
                <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="downtime" label="Downtime (hrs)">
                <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="meterReading" label="Meter Reading">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remarks" label="Work Done / Remarks">
            <TextArea rows={3} placeholder="Describe the work performed, findings, and results..." />
          </Form.Item>

          <Divider orientation="left">
            <span className="flex items-center gap-2"><Users className="w-4 h-4" />Team Members Involved</span>
          </Divider>
          <div className="space-y-2 mb-3">
            {teamMembers.map((m, idx) => (
              <div key={m.id} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
                <Input placeholder="Name" value={m.employeeName}
                  onChange={e => updateTeamMember(idx, 'employeeName', e.target.value)}
                  className="flex-1" size="small" />
                <Input placeholder="Designation" value={m.designation}
                  onChange={e => updateTeamMember(idx, 'designation', e.target.value)}
                  style={{ width: 120 }} size="small" />
                <Select value={m.role} onChange={v => updateTeamMember(idx, 'role', v)}
                  style={{ width: 130 }} size="small">
                  {WORK_ROLES.map(r => <Option key={r}>{r}</Option>)}
                </Select>
                <InputNumber placeholder="Hrs" value={m.hoursWorked}
                  onChange={v => updateTeamMember(idx, 'hoursWorked', v)}
                  style={{ width: 60 }} size="small" min={0} step={0.5} />
                <Switch size="small" checked={m.isContractor}
                  onChange={v => updateTeamMember(idx, 'isContractor', v)}
                  checkedChildren="Cont." unCheckedChildren="ONGC" />
                <Button size="small" danger icon={<X className="w-3 h-3" />}
                  onClick={() => setTeamMembers(teamMembers.filter((_, i) => i !== idx))} />
              </div>
            ))}
          </div>
          <Button type="dashed" icon={<Plus className="w-3 h-3" />} onClick={addTeamMember} size="small">
            Add Team Member
          </Button>

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-400">
            On closure, a maintenance log entry will be <strong>automatically saved</strong> to the equipment's maintenance record.
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => { setCloseWoOpen(false); closeForm.resetFields(); setTeamMembers([]); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#059669' }}>
              Close Work Order
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
};
