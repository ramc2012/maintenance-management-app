import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, message, Card, Row, Col, DatePicker, InputNumber, Drawer, Descriptions, Statistic } from 'antd';
import { Plus, Wrench, AlertTriangle, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const WO_TYPES = ['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'EMERGENCY'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];

export const WorkOrderList: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [closeDrawer, setCloseDrawer] = useState(false);
  const [selectedWO, setSelectedWO] = useState<any>(null);
  
  const [fls, setFls] = useState<any[]>([]);
  const [failureModes, setFailureModes] = useState<any[]>([]);
  const [causeCodes, setCauseCodes] = useState<any[]>([]);
  const [actionCodes, setActionCodes] = useState<any[]>([]);
  
  const [form] = Form.useForm();
  const [closeForm] = Form.useForm();

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('woType', typeFilter);
      const res = await axios.get(`/api/workorders?${params.toString()}`);
      setWorkOrders(res.data);
    } catch (error) {
      message.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/workorders/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Stats load error');
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [flRes, fmRes, ccRes, acRes] = await Promise.all([
        axios.get('/api/fl/locations'),
        axios.get('/api/workorders/codes/failure-modes'),
        axios.get('/api/workorders/codes/cause-codes'),
        axios.get('/api/workorders/codes/action-codes')
      ]);
      setFls(flRes.data);
      setFailureModes(fmRes.data);
      setCauseCodes(ccRes.data);
      setActionCodes(acRes.data);
    } catch (error) {
      console.error('Reference data load error');
    }
  };

  useEffect(() => { 
    fetchWorkOrders(); 
    fetchStats();
    fetchReferenceData();
  }, [statusFilter, typeFilter]);

  const handleCreate = async (values: any) => {
    try {
      await axios.post('/api/workorders', {
        ...values,
        scheduledDate: values.scheduledDate?.toISOString(),
        createdBy: 'Current User'
      });
      message.success('Work Order created');
      setModalOpen(false);
      form.resetFields();
      fetchWorkOrders();
      fetchStats();
    } catch (error) {
      message.error('Failed to create work order');
    }
  };

  const openCloseDrawer = (wo: any) => {
    setSelectedWO(wo);
    closeForm.resetFields();
    setCloseDrawer(true);
  };

  const handleClose = async (values: any) => {
    if (!selectedWO) return;
    try {
      await axios.post(`/api/workorders/${selectedWO.id}/close`, {
        ...values,
        closedBy: 'Current User'
      });
      message.success('Work Order closed');
      setCloseDrawer(false);
      setSelectedWO(null);
      closeForm.resetFields();
      fetchWorkOrders();
      fetchStats();
    } catch (error) {
      message.error('Failed to close work order');
    }
  };

  const columns = [
    { title: 'WO Number', dataIndex: 'woNumber', key: 'woNumber', render: (t: string) => <span className="font-mono font-bold">{t}</span> },
    { 
      title: 'FL', 
      key: 'fl', 
      render: (_: any, r: any) => (
        <span className="text-xs font-mono">{r.functionalLocation?.flId || '-'}</span>
      )
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { 
      title: 'Type', 
      dataIndex: 'woType', 
      key: 'woType', 
      render: (t: string) => <Tag color={t === 'PREVENTIVE' ? 'blue' : t === 'CORRECTIVE' ? 'orange' : 'purple'}>{t}</Tag>
    },
    { 
      title: 'Priority', 
      dataIndex: 'priority', 
      key: 'priority', 
      render: (p: string) => <Tag color={p === 'EMERGENCY' ? 'red' : p === 'HIGH' ? 'orange' : p === 'LOW' ? 'default' : 'blue'}>{p}</Tag>
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      render: (s: string) => (
        <Tag color={s === 'CLOSED' ? 'green' : s === 'OPEN' ? 'gold' : s === 'IN_PROGRESS' ? 'processing' : 'default'}>
          {s}
        </Tag>
      )
    },
    { 
      title: 'Scheduled', 
      dataIndex: 'scheduledDate', 
      key: 'scheduledDate',
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-'
    },
    {
      title: 'Failure Mode',
      dataIndex: 'failureMode',
      key: 'failureMode',
      render: (fm: string) => fm ? <Tag color="red">{fm}</Tag> : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: any) => (
        r.status !== 'CLOSED' && (
          <Button size="small" type="primary" onClick={() => openCloseDrawer(r)}>
            Close
          </Button>
        )
      )
    }
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
        <div className="flex items-center gap-4">
          <Wrench className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold dark:text-white">Work Orders</h2>
        </div>
        <div className="flex gap-2">
          <Select placeholder="Status" allowClear style={{ width: 150 }} onChange={setStatusFilter}>
            {STATUSES.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
          <Select placeholder="Type" allowClear style={{ width: 150 }} onChange={setTypeFilter}>
            {WO_TYPES.map(t => <Option key={t} value={t}>{t}</Option>)}
          </Select>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
            Create WO
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <Row gutter={16}>
          <Col span={5}>
            <Card size="small" className="bg-yellow-50 dark:bg-yellow-900/20">
              <Statistic title="Open" value={stats.counts.open} prefix={<Clock className="w-4 h-4 text-yellow-600" />} />
            </Card>
          </Col>
          <Col span={5}>
            <Card size="small" className="bg-blue-50 dark:bg-blue-900/20">
              <Statistic title="In Progress" value={stats.counts.inProgress} prefix={<Wrench className="w-4 h-4 text-blue-600" />} />
            </Card>
          </Col>
          <Col span={5}>
            <Card size="small" className="bg-green-50 dark:bg-green-900/20">
              <Statistic title="Closed" value={stats.counts.closed} prefix={<CheckCircle className="w-4 h-4 text-green-600" />} />
            </Card>
          </Col>
          <Col span={5}>
            <Card size="small" className="bg-red-50 dark:bg-red-900/20">
              <Statistic title="Overdue" value={stats.counts.overdue} prefix={<AlertTriangle className="w-4 h-4 text-red-600" />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="bg-purple-50 dark:bg-purple-900/20">
              <div className="text-xs text-gray-500">Top Failure</div>
              {stats.topFailureModes?.[0] ? (
                <div className="font-bold text-purple-600">{stats.topFailureModes[0][0]} ({stats.topFailureModes[0][1]})</div>
              ) : (
                <div className="text-gray-400">-</div>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Table */}
      <Table
        dataSource={workOrders}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        className="dark-table"
        pagination={{ pageSize: 15 }}
      />

      {/* Create Modal */}
      <Modal
        title="Create Work Order"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={form.submit}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="flId" label="Functional Location" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children" placeholder="Select FL">
              {fls.map((fl: any) => (
                <Option key={fl.id} value={fl.id}>{fl.flId} - {fl.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="woType" label="Type" rules={[{ required: true }]}>
                <Select>
                  {WO_TYPES.map(t => <Option key={t} value={t}>{t}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" initialValue="NORMAL">
                <Select>
                  {PRIORITIES.map(p => <Option key={p} value={p}>{p}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Describe the work to be done..." />
          </Form.Item>
          
          <Form.Item name="scheduledDate" label="Scheduled Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Close Drawer */}
      <Drawer
        title={`Close Work Order: ${selectedWO?.woNumber}`}
        open={closeDrawer}
        onClose={() => { setCloseDrawer(false); closeForm.resetFields(); }}
        width={500}
      >
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <Descriptions column={1}>
            <Descriptions.Item label="FL">{selectedWO?.functionalLocation?.flId}</Descriptions.Item>
            <Descriptions.Item label="Description">{selectedWO?.description}</Descriptions.Item>
            <Descriptions.Item label="Type"><Tag>{selectedWO?.woType}</Tag></Descriptions.Item>
          </Descriptions>
        </div>
        
        <Form form={closeForm} layout="vertical" onFinish={handleClose}>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <h4 className="font-bold mb-2 text-blue-800 dark:text-blue-200">ISO 14224 Closing Codes</h4>
            <Row gutter={8}>
              <Col span={8}>
                <Form.Item name="failureMode" label="Failure Mode">
                  <Select allowClear placeholder="Select...">
                    {failureModes.map((fm: any) => (
                      <Option key={fm.code} value={fm.code}>{fm.code} - {fm.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="causeCode" label="Cause Code">
                  <Select allowClear placeholder="Select...">
                    {causeCodes.map((cc: any) => (
                      <Option key={cc.code} value={cc.code}>{cc.code} - {cc.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="actionTaken" label="Action Taken">
                  <Select allowClear placeholder="Select...">
                    {actionCodes.map((ac: any) => (
                      <Option key={ac.code} value={ac.code}>{ac.code} - {ac.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="meterReading" label="Meter Reading">
                <InputNumber style={{ width: '100%' }} placeholder="Hours" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="labourHours" label="Labour Hours">
                <InputNumber style={{ width: '100%' }} min={0} step={0.5} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="downtime" label="Downtime (Hrs)">
                <InputNumber style={{ width: '100%' }} min={0} step={0.5} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="remarks" label="Remarks">
            <TextArea rows={3} placeholder="Closing remarks..." />
          </Form.Item>
          
          <Button type="primary" htmlType="submit" block size="large">
            Close Work Order
          </Button>
        </Form>
      </Drawer>
    </div>
  );
};
