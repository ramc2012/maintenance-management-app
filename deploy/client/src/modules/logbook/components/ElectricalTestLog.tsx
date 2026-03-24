import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Card, Statistic, Row, Col, Tag, Empty } from 'antd';
import { Plus, History, TrendingUp, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;

interface ElectricalTestLogProps {
  testType: 'Earth Pit Resistance' | 'IR Value';
}

export const ElectricalTestLog: React.FC<ElectricalTestLogProps> = ({ testType }) => {
  const [data, setData] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [filterInstallation, setFilterInstallation] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => { fetchInstallations(); }, []);
  useEffect(() => { fetchData(); }, [testType, filterInstallation]);

  const fetchInstallations = async () => {
    try {
      const res = await axios.get('/api/equipment/installations');
      setInstallations(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/logbook/electrical-tests`, { params: { testType, installationId: filterInstallation || undefined } });
      setData(res.data || []);
    } catch (error) {
      // Mock data
      setData([
        { id: '1', date: new Date().toISOString(), tag: 'EP-001', location: 'Substation A', value: testType === 'Earth Pit Resistance' ? 2.5 : 500, unit: testType === 'Earth Pit Resistance' ? 'Ω' : 'MΩ', status: 'Good', testedBy: 'Tech A', installation: 'CTF-ANK' },
        { id: '2', date: new Date().toISOString(), tag: 'EP-002', location: 'Control Room', value: testType === 'Earth Pit Resistance' ? 3.2 : 350, unit: testType === 'Earth Pit Resistance' ? 'Ω' : 'MΩ', status: 'Acceptable', testedBy: 'Tech B', installation: 'CTF-ANK' },
        { id: '3', date: new Date().toISOString(), tag: 'M-101-A', location: 'Pump House', value: testType === 'Earth Pit Resistance' ? 1.8 : 800, unit: testType === 'Earth Pit Resistance' ? 'Ω' : 'MΩ', status: 'Good', testedBy: 'Tech A', installation: 'CPF-GANDHAR' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (values: any) => {
    try {
      const entry = {
        ...values,
        date: values.date?.toISOString(),
        testType,
        status: getStatus(values.value),
        unit: testType === 'Earth Pit Resistance' ? 'Ω' : 'MΩ'
      };
      
      try {
        await axios.post('/api/equipment-logs', entry);
      } catch {
        // Fallback: save to localStorage if server endpoint not available
        const logs = JSON.parse(localStorage.getItem(`electricalLogs_${testType}`) || '[]');
        logs.push({ ...entry, id: Date.now().toString() });
        localStorage.setItem(`electricalLogs_${testType}`, JSON.stringify(logs));
      }
      message.success('Log entry saved!');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('Failed to save');
    }
  };

  const getStatus = (value: number) => {
    if (testType === 'Earth Pit Resistance') {
      if (value <= 2) return 'Good';
      if (value <= 5) return 'Acceptable';
      return 'Poor';
    } else {
      if (value >= 500) return 'Good';
      if (value >= 200) return 'Acceptable';
      return 'Poor';
    }
  };

  const viewHistory = (tag: string) => {
    const history = data.filter(d => d.tag === tag);
    setHistoryModal({ tag, logs: history });
  };

  // Stats
  const goodCount = data.filter(d => d.status === 'Good').length;
  const poorCount = data.filter(d => d.status === 'Poor').length;
  const threshold = testType === 'Earth Pit Resistance' ? '≤ 2Ω' : '≥ 500MΩ';

  const columns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-', width: 100 },
    { title: 'Tag', dataIndex: 'tag', render: (t: string) => (
      <Button type="link" size="small" className="p-0 font-semibold" onClick={() => viewHistory(t)}>{t}</Button>
    ), width: 100 },
    { title: 'Location', dataIndex: 'location', ellipsis: true },
    { title: testType === 'Earth Pit Resistance' ? 'Resistance' : 'IR Value', dataIndex: 'value', 
      render: (v: number, r: any) => <span className="font-mono">{v} {r.unit}</span>, width: 120 },
    { title: 'Status', dataIndex: 'status', width: 100, render: (s: string) => (
      <Tag color={s === 'Good' ? 'green' : s === 'Acceptable' ? 'orange' : 'red'}>{s}</Tag>
    )},
    { title: 'Tested By', dataIndex: 'testedBy', width: 100 },
    { title: 'Installation', dataIndex: 'installation', width: 100 },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <Row gutter={16}>
        <Col span={6}><Card size="small"><Statistic title="Total Records" value={data.length} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Good" value={goodCount} valueStyle={{ color: '#10b981' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Needs Attention" value={poorCount} valueStyle={{ color: '#ef4444' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Threshold" value={threshold} /></Card></Col>
      </Row>

      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
        <div className="flex items-center gap-2">
          {testType === 'Earth Pit Resistance' ? <TrendingUp className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-yellow-500" />}
          <h2 className="font-bold text-lg dark:text-white">{testType} Log</h2>
        </div>
        <div className="flex gap-2">
          <Select placeholder="Installation" allowClear style={{ width: 140 }} onChange={v => setFilterInstallation(v || '')} value={filterInstallation || undefined}>
            {installations.map(i => <Option key={i.id} value={i.id}>{i.installationId}</Option>)}
          </Select>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>Add Entry</Button>
        </div>
      </div>

      {/* Table */}
      <Table dataSource={data} columns={columns} rowKey="id" size="small" loading={loading} pagination={{ pageSize: 15 }} />

      {/* Add Modal */}
      <Modal title={`Add ${testType} Entry`} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="date" label="Date" rules={[{ required: true }]}><DatePicker className="w-full" /></Form.Item></Col>
            <Col span={12}><Form.Item name="installation" label="Installation" rules={[{ required: true }]}>
              <Select placeholder="Select">{installations.map(i => <Option key={i.id} value={i.installationId}>{i.installationId}</Option>)}</Select>
            </Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="tag" label="Equipment Tag" rules={[{ required: true }]}><Input placeholder="EP-001 or M-101-A" /></Form.Item></Col>
            <Col span={12}><Form.Item name="location" label="Location"><Input placeholder="Substation A" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="value" label={testType === 'Earth Pit Resistance' ? 'Resistance (Ω)' : 'IR Value (MΩ)'} rules={[{ required: true }]}>
                <InputNumber min={0} step={0.1} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="testedBy" label="Tested By"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="remarks" label="Remarks"><Input.TextArea rows={2} /></Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save</Button>
          </div>
        </Form>
      </Modal>

      {/* History Modal */}
      <Modal title={<span className="flex items-center gap-2"><History className="w-4 h-4" /> History: {historyModal?.tag}</span>} 
        open={!!historyModal} onCancel={() => setHistoryModal(null)} footer={null} width={600}>
        {historyModal?.logs?.length > 0 ? (
          <Table dataSource={historyModal.logs} columns={columns.slice(0, 5)} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
        ) : (
          <Empty description="No history" />
        )}
      </Modal>
    </div>
  );
};
