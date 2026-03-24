import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Modal, Form, InputNumber, DatePicker, message, Card, Statistic, Row, Col, Select, Popconfirm } from 'antd';
import { Search, Plus, Gauge, Activity, Thermometer, Droplet, ExternalLink, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

interface CompressionLogProps {
  showParameters?: boolean;
}

export const CompressionLog: React.FC<CompressionLogProps> = ({ showParameters = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [installations, setInstallations] = useState<any[]>([]);
  const [filterInstallation, setFilterInstallation] = useState<string>('');
  const [compressors, setCompressors] = useState<any[]>([]);
  const [modalCompressors, setModalCompressors] = useState<any[]>([]);

  useEffect(() => { fetchData(); fetchInstallations(); }, [filterInstallation]);

  const filterGasCompressors = (data: any[]) => {
    return (data || []).filter((eq: any) => {
      const tag = (eq.equipmentTag || '').toUpperCase();
      const desc = (eq.description || '').toUpperCase();
      const isGasCompressor = (
        tag.includes('GAS-COMP') || tag.includes('GAS_COMP') ||
        tag.includes('GCP') || tag.includes('GLC') ||
        desc.includes('GAS COMP') || desc.includes('GAS BOOST') ||
        desc.includes('OFF GAS') || desc.includes('LP GAS') ||
        desc.includes('MP GAS') || desc.includes('HP GAS')
      );
      const isAirCompressor = desc.includes('AIR COMP') || tag.includes('AIR-COMP') || tag.includes('AIR_COMP');
      return isGasCompressor && !isAirCompressor;
    });
  };

  const fetchModalCompressors = async (instId: string) => {
    try {
      const res = await axios.get('/api/equipment/running-equip', { params: { installationId: instId } });
      setModalCompressors(filterGasCompressors(res.data));
    } catch (e) { console.error(e); setModalCompressors([]); }
  };

  const fetchInstallations = async () => {
    try {
      const res = await axios.get('/api/equipment/installations');
      setInstallations(res.data || []);
    } catch (error) { console.error(error); }
  };

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/logbook/compression', { params: filterInstallation ? { installationId: filterInstallation } : {} });
      setData(res.data || []);
    } catch (error) {
      // Mock data
      setData([
        { id: '1', date: '2025-12-18', compressorId: 'GC-101', gasCompressed: 15200, suctionPressure: 45.2, dischargePressure: 180.5, suctionTemp: 35, dischargeTemp: 85, runHours: 23.5, flowRate: 650 },
        { id: '2', date: '2025-12-18', compressorId: 'GC-102', gasCompressed: 12800, suctionPressure: 42.8, dischargePressure: 175.2, suctionTemp: 33, dischargeTemp: 82, runHours: 22, flowRate: 580 },
        { id: '3', date: '2025-12-19', compressorId: 'GC-101', gasCompressed: 14900, suctionPressure: 44.5, dischargePressure: 178.8, suctionTemp: 34, dischargeTemp: 84, runHours: 24, flowRate: 620 },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (values: any) => {
    try {
      await axios.post('/api/logbook/compression', { ...values, date: values.date?.toISOString(), installationId: filterInstallation });
      message.success('Compression log added!');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('Failed to add entry');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try { await axios.delete(`/api/logbook/compression/${id}`); message.success('Deleted'); fetchData(); } catch { message.error('Failed to delete'); }
  };

  const compressionColumns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Compressor', dataIndex: 'compressorId', render: (t: string) => <Button type="link" size="small" className="p-0 font-mono font-semibold" onClick={() => navigate(`/assets?view=history&tag=${encodeURIComponent(t)}`)}>{t} <ExternalLink className="w-3 h-3 inline ml-1" /></Button> },
    { title: 'Gas Compressed (m³)', dataIndex: 'gasCompressed', render: (v: number) => <span className="font-bold text-green-600">{v?.toLocaleString()}</span> },
    { title: 'Run Hours', dataIndex: 'runHours' },
    { title: 'Flow Rate (m³/hr)', dataIndex: 'flowRate' },
    ...(isAdmin ? [{ title: '', width: 50, render: (_: any, r: any) => <Popconfirm title="Delete?" onConfirm={() => handleDeleteEntry(r.id)}><Button type="text" size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} /></Popconfirm> }] : []),
  ];

  const parameterColumns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Compressor', dataIndex: 'compressorId', render: (t: string) => <Button type="link" size="small" className="p-0 font-mono font-semibold" onClick={() => navigate(`/assets?view=history&tag=${encodeURIComponent(t)}`)}>{t} <ExternalLink className="w-3 h-3 inline ml-1" /></Button> },
    { title: 'Suction P (bar)', dataIndex: 'suctionPressure', render: (v: number) => <span className="text-cyan-600">{v}</span> },
    { title: 'Discharge P (bar)', dataIndex: 'dischargePressure', render: (v: number) => <span className="text-orange-600">{v}</span> },
    { title: 'Suction T (°C)', dataIndex: 'suctionTemp', render: (v: number) => <span className="text-cyan-600">{v}</span> },
    { title: 'Discharge T (°C)', dataIndex: 'dischargeTemp', render: (v: number) => <span className="text-red-600">{v}</span> },
  ];

  const totalGas = data.reduce((sum, d) => sum + (d.gasCompressed || 0), 0);
  const avgFlow = data.length ? data.reduce((sum, d) => sum + (d.flowRate || 0), 0) / data.length : 0;

  return (
    <div className="space-y-4">
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card className="bg-gradient-to-r from-green-500 to-green-600 border-none">
            <Statistic title={<span className="text-white/80">Total Gas Compressed</span>} value={totalGas} valueStyle={{ color: '#fff' }} suffix="m³" prefix={<Gauge className="w-4 h-4 mr-1" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-none">
            <Statistic title={<span className="text-white/80">Avg Flow Rate</span>} value={avgFlow.toFixed(0)} valueStyle={{ color: '#fff' }} suffix="m³/hr" prefix={<Activity className="w-4 h-4 mr-1" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 border-none">
            <Statistic title={<span className="text-white/80">Log Entries</span>} value={data.length} valueStyle={{ color: '#fff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Select value={filterInstallation || 'all'} onChange={v => setFilterInstallation(v === 'all' ? '' : v)} className="w-full">
            <Select.Option value="all">All Installations</Select.Option>
            {installations.map(i => <Select.Option key={i.id} value={i.id}>{i.installationId}</Select.Option>)}
          </Select>
        </Col>
      </Row>
      
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
        <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
          {showParameters ? <><Thermometer className="w-5 h-5 text-red-500" /> Compressor Parameters</> : <><Gauge className="w-5 h-5 text-green-500" /> Gas Compression Log</>}
        </h2>
        <div className="flex gap-2">
          <Input prefix={<Search className="w-4 h-4 text-gray-400" />} placeholder="Search..." className="w-48" />
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>Add Entry</Button>
        </div>
      </div>
      <Table dataSource={data} columns={showParameters ? parameterColumns : compressionColumns} rowKey="id" size="small" loading={loading}
        className="dark-table" footer={() => <div className="text-xs text-gray-500">Total: {data.length} Records</div>} />
      
      <Modal title="Log Gas Compression" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={700}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="date" label="Date" rules={[{ required: true }]}><DatePicker className="w-full" /></Form.Item>
            <Form.Item name="installationId" label="Installation" rules={[{ required: true, message: 'Select installation' }]}>
              <Select placeholder="Select Installation" onChange={(v: string) => { fetchModalCompressors(v); form.setFieldValue('compressorId', undefined); }} allowClear onClear={() => setModalCompressors([])}>
                {installations.map(i => <Select.Option key={i.id} value={i.id}>{i.installationId}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="compressorId" label="Gas Compressor" rules={[{ required: true }]}><Select showSearch placeholder={modalCompressors.length ? "Select Compressor" : "Select installation first"} optionFilterProp="children" disabled={!modalCompressors.length}>{modalCompressors.map((c: any) => <Select.Option key={c.equipmentTag} value={c.equipmentTag}>{c.equipmentTag} - {c.description}</Select.Option>)}</Select></Form.Item>
            <Form.Item name="gasCompressed" label="Gas Compressed (m³)" rules={[{ required: true }]}><InputNumber className="w-full" min={0} /></Form.Item>
            <Form.Item name="runHours" label="Run Hours"><InputNumber className="w-full" min={0} /></Form.Item>
            <Form.Item name="flowRate" label="Flow Rate (m³/hr)"><InputNumber className="w-full" min={0} /></Form.Item>
            <Form.Item name="suctionPressure" label="Suction Pressure (bar)"><InputNumber className="w-full" min={0} step={0.1} /></Form.Item>
            <Form.Item name="dischargePressure" label="Discharge Pressure (bar)"><InputNumber className="w-full" min={0} step={0.1} /></Form.Item>
            <Form.Item name="suctionTemp" label="Suction Temp (°C)"><InputNumber className="w-full" /></Form.Item>
            <Form.Item name="dischargeTemp" label="Discharge Temp (°C)"><InputNumber className="w-full" /></Form.Item>
          </div>
          <Form.Item name="remarks" label="Remarks"><Input.TextArea rows={2} /></Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
