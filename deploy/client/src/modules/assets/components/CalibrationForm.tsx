import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Input, Select, DatePicker, InputNumber, Button, Table, Tag, 
  message, Drawer, Descriptions, Alert, Row, Col, Statistic, Divider, Space
} from 'antd';
import { Plus, Calculator, CheckCircle, XCircle, FileText, AlertTriangle, Thermometer } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;

interface CalibrationPoint {
  sequence: number;
  stepPercent: number;
  direction: string;
  inputApplied: number;
  inputUnit: string;
  expectedReading: number;
  expectedUnit: string;
  asFoundReading?: number;
  asFoundError?: number;
  asFoundResult?: string;
  asLeftReading?: number;
  asLeftError?: number;
  asLeftResult?: string;
}

export const CalibrationForm: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [standards, setStandards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<any>(null);
  const [pointsTemplate, setPointsTemplate] = useState<CalibrationPoint[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  
  const [form] = Form.useForm();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/calibration/events');
      setEvents(res.data);
    } catch (error) {
      message.error('Failed to load calibration events');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstruments = async () => {
    try {
      const res = await axios.get('/api/equipment/instruments');
      setInstruments(res.data);
    } catch (error) {
      console.error('Error loading instruments');
    }
  };

  const fetchStandards = async () => {
    try {
      const res = await axios.get('/api/equipment/standards');
      setStandards(res.data.filter((s: any) => s.isActive));
    } catch (error) {
      console.error('Error loading standards');
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchInstruments();
    fetchStandards();
  }, []);

  const handleInstrumentSelect = async (tagId: string) => {
    const instrument = instruments.find(i => i.tagId === tagId);
    setSelectedInstrument(instrument);
    
    // Fetch 5-point template
    try {
      const res = await axios.get(`/api/calibration/template?instrumentTagId=${tagId}`);
      setPointsTemplate(res.data.points);
    } catch (error) {
      message.error('Failed to generate calibration points');
    }
  };

  const handlePointChange = (index: number, field: string, value: number) => {
    const updated = [...pointsTemplate];
    (updated[index] as any)[field] = value;
    setPointsTemplate(updated);
  };

  const handleSubmit = async (values: any) => {
    try {
      // 1. Create calibration event
      const eventRes = await axios.post('/api/calibration/events', {
        instrumentTagId: values.instrumentTagId,
        standardUsedId: values.standardUsedId,
        calibrationDate: values.calibrationDate?.toISOString() || new Date().toISOString(),
        ambientTemp: values.ambientTemp,
        humidity: values.humidity,
        performedBy: values.performedBy || 'Current User',
        overallResultAsFound: 'PENDING',
        overallResultAsLeft: 'PENDING'
      });
      
      const eventId = eventRes.data.id;
      
      // 2. Add calibration points
      const pointsToSave = pointsTemplate.map(p => ({
        ...p,
        eventId,
        asFoundReading: p.asFoundReading || p.expectedReading,
        asLeftReading: p.asLeftReading
      }));
      
      await axios.post('/api/calibration/points/batch', {
        eventId,
        points: pointsToSave
      });
      
      // 3. Calculate results
      const calcRes = await axios.post(`/api/calibration/events/${eventId}/calculate`);
      
      message.success(`Calibration recorded - ${calcRes.data.overallResultAsFound}`);
      setDrawerOpen(false);
      form.resetFields();
      setPointsTemplate([]);
      setSelectedInstrument(null);
      fetchEvents();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to save calibration');
    }
  };

  const viewCertificate = async (eventId: string) => {
    try {
      const res = await axios.get(`/api/calibration/certificate/${eventId}`);
      setCurrentEvent(res.data);
    } catch (error) {
      message.error('Failed to load certificate');
    }
  };

  const columns = [
    { 
      title: 'Certificate No', 
      dataIndex: 'certificateNo', 
      render: (t: string, r: any) => (
        <Button type="link" onClick={() => viewCertificate(r.id)}>{t}</Button>
      )
    },
    { 
      title: 'Instrument', 
      dataIndex: ['instrument', 'tagId'],
      render: (t: string, r: any) => (
        <div>
          <span className="font-mono font-bold">{t}</span>
          <br/>
          <span className="text-xs text-gray-500">{r.instrument?.description}</span>
        </div>
      )
    },
    { 
      title: 'Date', 
      dataIndex: 'calibrationDate',
      render: (d: string) => dayjs(d).format('DD/MM/YYYY')
    },
    { 
      title: 'Standard Used', 
      dataIndex: ['standardUsed', 'tagId'],
      render: (t: string) => <span className="text-xs">{t}</span>
    },
    { 
      title: 'As Found', 
      dataIndex: 'overallResultAsFound',
      render: (r: string) => (
        <Tag color={r === 'PASS' ? 'green' : r === 'FAIL' ? 'red' : 'gold'}>
          {r === 'PASS' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
          {r}
        </Tag>
      )
    },
    { 
      title: 'As Left', 
      dataIndex: 'overallResultAsLeft',
      render: (r: string) => (
        <Tag color={r === 'PASS' ? 'green' : r === 'FAIL' ? 'red' : 'orange'}>
          {r}
        </Tag>
      )
    },
    {
      title: 'Max Error',
      dataIndex: 'maxErrorFoundPct',
      render: (e: number, r: any) => (
        <span className={e > (r.instrument?.accuracyTolerancePct || 0.5) ? 'text-red-500' : 'text-green-500'}>
          {e?.toFixed(2)}%
        </span>
      )
    },
    { 
      title: 'Status', 
      dataIndex: 'status',
      render: (s: string) => <Tag color={s === 'APPROVED' ? 'blue' : 'default'}>{s}</Tag>
    }
  ];

  const pointColumns = [
    { title: 'Step', dataIndex: 'sequence', width: 60 },
    { title: '%', dataIndex: 'stepPercent', width: 60, render: (v: number) => `${v}%` },
    { 
      title: 'Input Applied', 
      key: 'input',
      render: (_: any, r: CalibrationPoint) => `${r.inputApplied?.toFixed(2)} ${r.inputUnit || ''}`
    },
    { 
      title: 'Expected', 
      key: 'expected',
      render: (_: any, r: CalibrationPoint) => `${r.expectedReading?.toFixed(2)} ${r.expectedUnit || ''}`
    },
    { 
      title: 'As Found',
      key: 'asFound',
      render: (_: any, r: CalibrationPoint, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: 100 }}
          value={r.asFoundReading}
          onChange={(v) => handlePointChange(idx, 'asFoundReading', v || 0)}
          placeholder="Reading"
        />
      )
    },
    { 
      title: 'As Left',
      key: 'asLeft',
      render: (_: any, r: CalibrationPoint, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: 100 }}
          value={r.asLeftReading}
          onChange={(v) => handlePointChange(idx, 'asLeftReading', v || 0)}
          placeholder="After adj."
        />
      )
    }
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
        <div className="flex items-center gap-4">
          <FileText className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold dark:text-white">Calibration Records (ISO 10012)</h2>
        </div>
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setDrawerOpen(true)}>
          New Calibration
        </Button>
      </div>

      {/* Events Table */}
      <Table
        dataSource={events}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
      />

      {/* New Calibration Drawer */}
      <Drawer
        title="New Calibration Event"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.resetFields(); }}
        width={900}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" icon={<Calculator className="w-4 h-4" />} onClick={form.submit}>
              Save & Calculate
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="instrumentTagId" label="Instrument" rules={[{ required: true }]}>
                <Select 
                  showSearch 
                  optionFilterProp="children" 
                  onChange={handleInstrumentSelect}
                  placeholder="Select instrument..."
                >
                  {instruments.map((i: any) => (
                    <Option key={i.tagId} value={i.tagId}>
                      {i.tagId} - {i.description}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="standardUsedId" label="Reference Standard" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="children" placeholder="Select standard...">
                  {standards.map((s: any) => (
                    <Option key={s.tagId} value={s.tagId}>
                      {s.tagId} - {s.description}
                      {s.validTo && new Date(s.validTo) < new Date() && 
                        <Tag color="red" className="ml-2">EXPIRED</Tag>
                      }
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {selectedInstrument && (
            <Alert
              type="info"
              className="mb-4"
              message={
                <div className="flex gap-8">
                  <span><strong>Range:</strong> {selectedInstrument.calibratedRangeMin ?? selectedInstrument.rangeMin} - {selectedInstrument.calibratedRangeMax ?? selectedInstrument.rangeMax} {selectedInstrument.engUnit || selectedInstrument.unit}</span>
                  <span><strong>Tolerance:</strong> ±{selectedInstrument.accuracyTolerancePct ?? 0.5}%</span>
                  {selectedInstrument.isSafetyCritical && (
                    <Tag color="red"><AlertTriangle className="w-3 h-3 inline" /> Safety Critical</Tag>
                  )}
                </div>
              }
            />
          )}

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="calibrationDate" label="Calibration Date" initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ambientTemp" label="Ambient Temp (°C)">
                <InputNumber style={{ width: '100%' }} prefix={<Thermometer className="w-3 h-3 text-gray-400" />} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="humidity" label="Humidity (%RH)">
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="performedBy" label="Performed By">
                <Input placeholder="Technician name" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>5-Point Calibration Check</Divider>

          {pointsTemplate.length > 0 ? (
            <Table
              dataSource={pointsTemplate}
              columns={pointColumns}
              rowKey="sequence"
              pagination={false}
              size="small"
              className="mb-4"
            />
          ) : (
            <Alert type="warning" message="Select an instrument to generate calibration points" />
          )}
        </Form>
      </Drawer>

      {/* Certificate View Modal */}
      <Drawer
        title={`Certificate: ${currentEvent?.certificateNo}`}
        open={!!currentEvent}
        onClose={() => setCurrentEvent(null)}
        width={800}
      >
        {currentEvent && (
          <div className="space-y-4">
            <Card title="Instrument Details" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Tag ID">{currentEvent.instrument.tagId}</Descriptions.Item>
                <Descriptions.Item label="Description">{currentEvent.instrument.description}</Descriptions.Item>
                <Descriptions.Item label="Manufacturer">{currentEvent.instrument.manufacturer}</Descriptions.Item>
                <Descriptions.Item label="Range">{currentEvent.instrument.calibratedRange}</Descriptions.Item>
                <Descriptions.Item label="Tolerance">{currentEvent.instrument.tolerance}</Descriptions.Item>
                <Descriptions.Item label="Location">{currentEvent.instrument.location}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Row gutter={16}>
              <Col span={8}>
                <Card size="small" className={currentEvent.results.overallAsFound === 'PASS' ? 'bg-green-50' : 'bg-red-50'}>
                  <Statistic 
                    title="As Found Result" 
                    value={currentEvent.results.overallAsFound}
                    valueStyle={{ color: currentEvent.results.overallAsFound === 'PASS' ? '#52c41a' : '#f5222d' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" className={currentEvent.results.overallAsLeft === 'PASS' ? 'bg-green-50' : 'bg-orange-50'}>
                  <Statistic 
                    title="As Left Result" 
                    value={currentEvent.results.overallAsLeft}
                    valueStyle={{ color: currentEvent.results.overallAsLeft === 'PASS' ? '#52c41a' : '#fa8c16' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic 
                    title="Max Error Found" 
                    value={currentEvent.results.maxErrorFound?.toFixed(2) || '-'}
                    suffix="%"
                  />
                </Card>
              </Col>
            </Row>

            <Card title="Calibration Points" size="small">
              <Table
                dataSource={currentEvent.points}
                rowKey="step"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Step', dataIndex: 'step' },
                  { title: '%', dataIndex: 'percent', render: (v: number) => `${v}%` },
                  { title: 'Input', dataIndex: 'inputApplied', render: (v: number, r: any) => `${v?.toFixed(2)} ${r.inputUnit || ''}` },
                  { title: 'Expected', dataIndex: 'expected', render: (v: number) => v?.toFixed(3) },
                  { 
                    title: 'As Found', 
                    dataIndex: 'asFound',
                    render: (v: number, r: any) => (
                      <span className={r.asFoundResult === 'FAIL' ? 'text-red-500 font-bold' : ''}>
                        {v?.toFixed(3)} ({r.asFoundError?.toFixed(2)}%)
                      </span>
                    )
                  },
                  { 
                    title: 'As Left', 
                    dataIndex: 'asLeft',
                    render: (v: number, r: any) => v ? (
                      <span className={r.asLeftResult === 'FAIL' ? 'text-red-500 font-bold' : 'text-green-500'}>
                        {v?.toFixed(3)} ({r.asLeftError?.toFixed(2)}%)
                      </span>
                    ) : '-'
                  }
                ]}
              />
            </Card>

            <Card title="Sign-off" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Performed By">{currentEvent.calibration.performedBy}</Descriptions.Item>
                <Descriptions.Item label="Approved By">{currentEvent.calibration.approvedBy || '-'}</Descriptions.Item>
                <Descriptions.Item label="Date">{dayjs(currentEvent.calibration.date).format('DD/MM/YYYY')}</Descriptions.Item>
                <Descriptions.Item label="Next Due">{dayjs(currentEvent.calibration.nextDueDate).format('DD/MM/YYYY')}</Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};
