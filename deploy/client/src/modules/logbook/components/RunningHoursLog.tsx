import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Card, Statistic, Row, Col, Tag, Popconfirm, Empty, Divider, Space, Tooltip } from 'antd';
import { Plus, Save, History, Settings, Trash2, Copy, TrendingUp, LineChart } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;

interface RunningHoursLogProps {
  category?: 'mechanical' | 'electrical';
}

const defaultParameters: Record<string, string[]> = {
  'Motor': ['Voltage (V)', 'Current (A)', 'Bearing Temp (°C)', 'Winding Temp (°C)', 'Vibration (mm/s)'],
  'Pump': ['Suction Pressure (bar)', 'Discharge Pressure (bar)', 'Flow Rate (m³/hr)', 'Bearing Temp (°C)'],
  'Compressor': ['Suction Pressure (bar)', 'Discharge Pressure (bar)', 'Suction Temp (°C)', 'Discharge Temp (°C)', 'Oil Pressure (bar)'],
  'Generator': ['Voltage (V)', 'Current (A)', 'Frequency (Hz)', 'Power (kW)', 'Bearing Temp (°C)'],
  'Default': ['Temp (°C)', 'Pressure (bar)', 'Vibration (mm/s)']
};

export const RunningHoursLog: React.FC<RunningHoursLogProps> = ({ category = 'mechanical' }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [data, setData] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [trendModal, setTrendModal] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [filterInstallation, setFilterInstallation] = useState<string>('');
  const [customColumns, setCustomColumns] = useState<string[]>(['Temp (°C)', 'Pressure (bar)']);
  const [newColumnName, setNewColumnName] = useState('');
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [selectedEquipType, setSelectedEquipType] = useState<string>('');
  const [equipment, setEquipment] = useState<any[]>([]);
  const [modalEquipment, setModalEquipment] = useState<any[]>([]);

  useEffect(() => { fetchInstallations(); loadTemplates(); }, []);
  useEffect(() => { fetchData(); }, [category, filterInstallation]);

  const fetchEquipment = async (instId?: string) => {
    try {
      const params: any = {};
      if (instId) params.installationId = instId;
      const res = await axios.get('/api/equipment/running-equip', { params });
      setEquipment(res.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchModalEquipment = async (instId: string) => {
    try {
      const params: any = { installationId: instId };
      const res = await axios.get('/api/equipment/running-equip', { params });
      setModalEquipment(res.data || []);
    } catch (e) { console.error(e); setModalEquipment([]); }
  };

  const fetchInstallations = async () => {
    try { const res = await axios.get('/api/equipment/installations'); setInstallations(res.data); } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/logbook/running-hours', { params: { category, installationId: filterInstallation || undefined } });
      setData(res.data || []);
    } catch (error) {
      setData([
        { id: '1', date: new Date().toISOString(), equipmentTag: 'CPF--EQ-001', shift: 'Day', runHours: 8, cumulativeHours: 5000, parameters: { 'Temp (°C)': 45, 'Pressure (bar)': 5.2 }, status: 'Running' },
        { id: '2', date: dayjs().subtract(1, 'day').toISOString(), equipmentTag: 'CPF--EQ-001', shift: 'Night', runHours: 6, cumulativeHours: 4994, parameters: { 'Temp (°C)': 44 }, status: 'Running' },
        { id: '3', date: dayjs().subtract(2, 'day').toISOString(), equipmentTag: 'CPF--EQ-001', shift: 'Day', runHours: 8, cumulativeHours: 4988, parameters: { 'Temp (°C)': 46 }, status: 'Running' },
        { id: '4', date: new Date().toISOString(), equipmentTag: 'CPF--EQ-002', shift: 'Night', runHours: 6, cumulativeHours: 4200, parameters: { 'Temp (°C)': 42 }, status: 'Running' },
      ]);
    } finally { setLoading(false); }
  };

  const loadTemplates = () => { const saved = localStorage.getItem('runningHoursTemplates'); if (saved) setTemplates(JSON.parse(saved)); };

  const saveTemplate = () => {
    const templateName = prompt('Enter template name:'); if (!templateName) return;
    const template = { id: Date.now().toString(), name: templateName, columns: customColumns, equipmentType: selectedEquipType };
    const newTemplates = [...templates, template]; setTemplates(newTemplates); localStorage.setItem('runningHoursTemplates', JSON.stringify(newTemplates)); message.success('Template saved!');
  };

  const loadTemplate = (t: any) => { setCustomColumns(t.columns); setSelectedEquipType(t.equipmentType); message.success('Template loaded!'); };
  const deleteTemplate = (id: string) => { const newT = templates.filter(t => t.id !== id); setTemplates(newT); localStorage.setItem('runningHoursTemplates', JSON.stringify(newT)); message.success('Deleted'); };
  const addCustomColumn = () => { if (!newColumnName.trim()) return; if (customColumns.includes(newColumnName)) { message.warning('Exists'); return; } setCustomColumns([...customColumns, newColumnName.trim()]); setNewColumnName(''); };
  const removeCustomColumn = (c: string) => { setCustomColumns(customColumns.filter(x => x !== c)); };
  const loadDefaultParams = (et: string) => { setCustomColumns(defaultParameters[et] || defaultParameters['Default']); setSelectedEquipType(et); };

  const handleSubmit = async (values: any) => {
    try {
      const parameters: Record<string, number> = {}; customColumns.forEach(c => { if (values[`param_${c}`] !== undefined) parameters[c] = values[`param_${c}`]; });
      const payload = { ...values, date: values.date?.toISOString(), parameters, category };
      await axios.post('/api/logbook/running-hours', payload); message.success('Entry added!'); setModalOpen(false); form.resetFields(); fetchData();
    } catch (error) { message.error('Failed'); }
  };

  const viewHistory = (tag: string) => { const history = data.filter(d => d.equipmentTag === tag).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); setHistoryModal({ equipmentTag: tag, logs: history }); };
  
  const viewTrend = (tag: string) => {
    const history = data.filter(d => d.equipmentTag === tag).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setTrendModal({ equipmentTag: tag, logs: history });
  };

  const handleDeleteLog = async (id: string) => {
    try { await axios.delete(`/api/logbook/running-hours/${id}`); message.success('Entry deleted'); fetchData(); } catch { message.error('Failed to delete'); }
  };

  const totalHours = data.reduce((sum, d) => sum + (d.runHours || 0), 0);
  const equipmentCount = new Set(data.map(d => d.equipmentTag)).size;
  const parameterColumns = customColumns.length > 0 ? customColumns : [...new Set(data.flatMap(d => Object.keys(d.parameters || {})))].slice(0, 5);

  const columns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-', width: 100 },
    { title: 'Equipment', dataIndex: 'equipmentTag', render: (t: string) => (
      <Space>
        <Button type="link" size="small" onClick={() => viewHistory(t)} className="p-0 font-semibold">{t}</Button>
        <Tooltip title="View Trend"><Button type="text" size="small" icon={<TrendingUp className="w-3 h-3 text-blue-500" />} onClick={() => viewTrend(t)} /></Tooltip>
      </Space>
    ), width: 150 },
    { title: 'Shift', dataIndex: 'shift', width: 70 },
    { title: 'Run Hrs', dataIndex: 'runHours', render: (h: number) => <span className="font-mono">{h || 0}</span>, width: 80 },
    { title: 'Cumulative', dataIndex: 'cumulativeHours', render: (h: number) => <span className="font-mono text-blue-600">{(h || 0).toLocaleString()}</span>, width: 100 },
    ...parameterColumns.map(p => ({ title: <Tooltip title={p}><span className="truncate max-w-16 inline-block">{p.split(' ')[0]}</span></Tooltip>, dataIndex: ['parameters', p], render: (_: any, r: any) => <span className="font-mono">{r.parameters?.[p] ?? '-'}</span>, width: 80 })),
    { title: 'Status', dataIndex: 'status', width: 80, render: (s: string) => <Tag color={s === 'Running' ? 'green' : s === 'Stopped' ? 'red' : 'default'}>{s || '-'}</Tag> },
    ...(isAdmin ? [{ title: '', width: 50, render: (_: any, r: any) => <Popconfirm title="Delete?" onConfirm={() => handleDeleteLog(r.id)}><Button type="text" size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} /></Popconfirm> }] : []),
  ];

  // Simple SVG trend chart
  const renderTrendChart = (logs: any[], paramName: string) => {
    if (logs.length < 2) return <Empty description="Not enough data" />;
    const values = logs.map(l => l.parameters?.[paramName] || 0);
    const max = Math.max(...values) || 1;
    const min = Math.min(...values);
    const range = max - min || 1;
    const width = 400;
    const height = 150;
    const padding = 30;
    const points = values.map((v, i) => ({ x: padding + (i / (values.length - 1)) * (width - 2 * padding), y: height - padding - ((v - min) / range) * (height - 2 * padding) }));
    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    return (
      <svg width={width} height={height} className="bg-gray-50 dark:bg-gray-800 rounded">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ccc" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ccc" />
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#3b82f6" />)}
        <text x={padding} y={height - 5} fontSize="10" fill="#888">{logs[0]?.date ? dayjs(logs[0].date).format('DD/MM') : ''}</text>
        <text x={width - padding - 30} y={height - 5} fontSize="10" fill="#888">{logs[logs.length - 1]?.date ? dayjs(logs[logs.length - 1].date).format('DD/MM') : ''}</text>
        <text x={5} y={padding + 5} fontSize="10" fill="#888">{max.toFixed(1)}</text>
        <text x={5} y={height - padding} fontSize="10" fill="#888">{min.toFixed(1)}</text>
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      <Row gutter={16}>
        <Col span={6}><Card size="small"><Statistic title="Total Run Hours Today" value={totalHours} suffix="hrs" valueStyle={{ color: '#3b82f6' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Equipment Logged" value={equipmentCount} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Log Entries" value={data.length} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Parameters Tracked" value={parameterColumns.length} /></Card></Col>
      </Row>

      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
        <h2 className="text-lg font-bold dark:text-white">Running Hours Log</h2>
        <div className="flex gap-2">
          <Select placeholder="Installation" allowClear style={{ width: 140 }} onChange={v => setFilterInstallation(v || '')} value={filterInstallation || undefined}>
            {installations.map(i => <Option key={i.id} value={i.id}>{i.installationId}</Option>)}
          </Select>
          <Button icon={<Settings className="w-4 h-4" />} onClick={() => setShowColumnConfig(true)}>Columns</Button>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>Add Entry</Button>
        </div>
      </div>

      <Table dataSource={data} columns={columns} rowKey="id" size="small" loading={loading} scroll={{ x: 1000 }} pagination={{ pageSize: 15 }} />

      {/* Add Modal */}
      <Modal title="Add Running Hours Entry" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={600}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}><Col span={12}><Form.Item name="date" label="Date" rules={[{ required: true }]}><DatePicker className="w-full" /></Form.Item></Col><Col span={12}><Form.Item name="shift" label="Shift" initialValue="Day"><Select><Option value="Day">Day</Option><Option value="Night">Night</Option></Select></Form.Item></Col></Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="installationId" label="Installation" rules={[{ required: true, message: 'Select installation' }]}>
                <Select placeholder="Select Installation" onChange={(v: string) => { fetchModalEquipment(v); form.setFieldValue('equipmentTag', undefined); }} allowClear onClear={() => setModalEquipment([])}>
                  {installations.map(i => <Option key={i.id} value={i.id}>{i.installationId}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="equipmentTag" label="Equipment" rules={[{ required: true }]}>
                <Select showSearch placeholder={modalEquipment.length ? "Select Equipment" : "Select installation first"} optionFilterProp="children" disabled={!modalEquipment.length}>{modalEquipment.map((eq: any) => <Option key={eq.equipmentTag} value={eq.equipmentTag}>{eq.equipmentTag} - {eq.description}</Option>)}</Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}><Col span={8}><Form.Item name="runHours" label="Run Hours"><InputNumber min={0} max={24} className="w-full" /></Form.Item></Col><Col span={8}><Form.Item name="cumulativeHours" label="Cumulative Hours"><InputNumber min={0} className="w-full" /></Form.Item></Col><Col span={8}><Form.Item name="status" label="Status" initialValue="Running"><Select><Option value="Running">Running</Option><Option value="Stopped">Stopped</Option><Option value="Standby">Standby</Option></Select></Form.Item></Col></Row>
          <Divider>Operating Parameters</Divider>
          <Row gutter={16}>{customColumns.map(c => <Col span={12} key={c}><Form.Item name={`param_${c}`} label={c}><InputNumber className="w-full" /></Form.Item></Col>)}</Row>
          <div className="flex justify-end gap-2 mt-4"><Button onClick={() => setModalOpen(false)}>Cancel</Button><Button type="primary" htmlType="submit">Save</Button></div>
        </Form>
      </Modal>

      {/* Column Config Modal */}
      <Modal title="Configure Parameters" open={showColumnConfig} onCancel={() => setShowColumnConfig(false)} footer={null} width={500}>
        <div className="space-y-4">
          <div><p className="font-semibold mb-2">Load Preset:</p><Space wrap>{Object.keys(defaultParameters).map(t => <Button key={t} size="small" onClick={() => loadDefaultParams(t)}>{t}</Button>)}</Space></div>
          <Divider />
          <div><p className="font-semibold mb-2">Current Columns:</p><div className="flex flex-wrap gap-2">{customColumns.map(c => <Tag key={c} closable onClose={() => removeCustomColumn(c)}>{c}</Tag>)}</div></div>
          <div className="flex gap-2"><Input placeholder="New column" value={newColumnName} onChange={e => setNewColumnName(e.target.value)} onPressEnter={addCustomColumn} /><Button icon={<Plus className="w-4 h-4" />} onClick={addCustomColumn}>Add</Button></div>
          <Divider />
          <div className="flex justify-between"><Button icon={<Save className="w-4 h-4" />} onClick={saveTemplate}>Save as Template</Button><Button onClick={() => setShowColumnConfig(false)}>Done</Button></div>
          {templates.length > 0 && (<><Divider /><p className="font-semibold mb-2">Saved Templates:</p><div className="space-y-2">{templates.map(t => <div key={t.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded"><span>{t.name}</span><Space><Button size="small" icon={<Copy className="w-3 h-3" />} onClick={() => loadTemplate(t)}>Load</Button><Popconfirm title="Delete?" onConfirm={() => deleteTemplate(t.id)}><Button size="small" danger icon={<Trash2 className="w-3 h-3" />} /></Popconfirm></Space></div>)}</div></>)}
        </div>
      </Modal>

      {/* History Modal */}
      <Modal title={<span className="flex items-center gap-2"><History className="w-4 h-4" /> History: {historyModal?.equipmentTag}</span>} open={!!historyModal} onCancel={() => setHistoryModal(null)} footer={null} width={700}>
        {historyModal?.logs?.length > 0 ? <Table dataSource={historyModal.logs} columns={columns.slice(0, 6)} rowKey="id" size="small" pagination={{ pageSize: 10 }} /> : <Empty description="No history" />}
      </Modal>

      {/* Trend Modal */}
      <Modal title={<span className="flex items-center gap-2"><LineChart className="w-4 h-4" /> Trend: {trendModal?.equipmentTag}</span>} open={!!trendModal} onCancel={() => setTrendModal(null)} footer={null} width={500}>
        {trendModal?.logs?.length > 0 ? (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Run Hours Trend</h4>
              {renderTrendChart(trendModal.logs.map((l: any) => ({ ...l, parameters: { 'Run Hours': l.runHours } })), 'Run Hours')}
            </div>
            {customColumns.slice(0, 2).map(param => (
              <div key={param}>
                <h4 className="font-semibold mb-2">{param} Trend</h4>
                {renderTrendChart(trendModal.logs, param)}
              </div>
            ))}
          </div>
        ) : <Empty description="No data for trends" />}
      </Modal>
    </div>
  );
};
