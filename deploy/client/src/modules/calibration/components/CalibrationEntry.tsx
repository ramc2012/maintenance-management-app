import React, { useState, useEffect } from 'react';
import { Form, Select, DatePicker, Input, Button, Card, Table, InputNumber, message, Tag, Alert } from 'antd';
import { Save, Home, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;

export const CalibrationEntry: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [instruments, setInstruments] = useState<any[]>([]);
  const [standards, setStandards] = useState<any[]>([]);
  const [performers, setPerformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<any[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<any>(null);
  const [calculatedResult, setCalculatedResult] = useState<{ asFound: string; asLeft: string; pass: boolean } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [instrRes, stdRes, perfRes] = await Promise.all([
        axios.get('/api/instruments'),
        axios.get('/api/equipment/standards'),
        axios.get('/api/equipment/performers')
      ]);
      setInstruments(instrRes.data || []);
      setStandards(stdRes.data || []);
      setPerformers(perfRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleInstrumentChange = (tagId: string) => {
    const inst = instruments.find(i => i.tagId === tagId);
    setSelectedInstrument(inst);
    setCalculatedResult(null);
    
    if (inst?.rangeMin !== undefined && inst?.rangeMax !== undefined) {
      const range = inst.rangeMax - inst.rangeMin;
      const newPoints = [0, 25, 50, 75, 100].map((pct, idx) => ({
        key: idx,
        percentage: pct,
        nominal: inst.rangeMin + (range * pct / 100),
        asFoundUp: null,
        asFoundDown: null,
        asLeftUp: null,
        asLeftDown: null
      }));
      setPoints(newPoints);
    }
  };

  // Auto-calculate As Found/As Left based on entered data
  useEffect(() => {
    if (!selectedInstrument || points.length === 0) return;
    
    const tolerance = selectedInstrument.tolerance || 0.5; // Default 0.5% tolerance
    const range = (selectedInstrument.rangeMax || 0) - (selectedInstrument.rangeMin || 0);
    const toleranceValue = (range * tolerance) / 100;
    
    let asFoundInTolerance = true;
    let asLeftInTolerance = true;
    let hasAsFoundData = false;
    let hasAsLeftData = false;
    
    points.forEach(p => {
      if (p.asFoundUp !== null || p.asFoundDown !== null) {
        hasAsFoundData = true;
        const errorUp = Math.abs((p.asFoundUp || 0) - p.nominal);
        const errorDown = Math.abs((p.asFoundDown || 0) - p.nominal);
        if (errorUp > toleranceValue || errorDown > toleranceValue) {
          asFoundInTolerance = false;
        }
      }
      if (p.asLeftUp !== null || p.asLeftDown !== null) {
        hasAsLeftData = true;
        const errorUp = Math.abs((p.asLeftUp || 0) - p.nominal);
        const errorDown = Math.abs((p.asLeftDown || 0) - p.nominal);
        if (errorUp > toleranceValue || errorDown > toleranceValue) {
          asLeftInTolerance = false;
        }
      }
    });
    
    if (hasAsFoundData || hasAsLeftData) {
      setCalculatedResult({
        asFound: hasAsFoundData ? (asFoundInTolerance ? 'IN_TOLERANCE' : 'OUT_OF_TOLERANCE') : 'NOT_TESTED',
        asLeft: hasAsLeftData ? (asLeftInTolerance ? 'IN_TOLERANCE' : 'OUT_OF_TOLERANCE') : 'NOT_TESTED',
        pass: hasAsLeftData ? asLeftInTolerance : asFoundInTolerance
      });
    }
  }, [points, selectedInstrument]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const certNo = `CAL-${dayjs().format('YYYY')}-${String(Date.now()).slice(-4)}`;
      
      const payload = {
        certificateNo: certNo,
        instrumentTagId: values.instrumentTagId,
        calibrationDate: values.calibrationDate.toISOString(),
        nextDueDate: values.calibrationDate.add(values.frequency || 12, 'month').toISOString(),
        performedBy: values.performedBy,
        standardUsed: values.standardUsed,
        asFound: calculatedResult?.asFound || values.asFound,
        asLeft: calculatedResult?.asLeft || values.asLeft,
        result: calculatedResult?.pass ? 'PASS' : 'FAIL',
        remarks: values.remarks,
        status: 'PENDING_APPROVAL'
      };
      
      const eventRes = await axios.post('/api/calibration/events', payload);
      
      if (points.length > 0 && eventRes.data.id) {
        await axios.post('/api/calibration/points/batch', {
          eventId: eventRes.data.id,
          points: points.filter(p => p.asFoundUp !== null)
        });
      }
      
      message.success(`Calibration event ${certNo} created successfully!`);
      form.resetFields();
      setPoints([]);
      setSelectedInstrument(null);
      setCalculatedResult(null);
    } catch (error) {
      message.error('Failed to create calibration event');
    } finally {
      setLoading(false);
    }
  };

  const pointColumns = [
    { title: '%', dataIndex: 'percentage', width: 60, render: (v: number) => <Tag>{v}%</Tag> },
    { title: 'Nominal', dataIndex: 'nominal', render: (v: number) => v?.toFixed(2) },
    { 
      title: 'As Found ↑', 
      render: (_: any, record: any, idx: number) => (
        <InputNumber 
          size="small" 
          value={record.asFoundUp}
          onChange={v => updatePoint(idx, 'asFoundUp', v)}
          className="w-full"
        />
      )
    },
    { 
      title: 'As Found ↓', 
      render: (_: any, record: any, idx: number) => (
        <InputNumber 
          size="small" 
          value={record.asFoundDown}
          onChange={v => updatePoint(idx, 'asFoundDown', v)}
          className="w-full"
        />
      )
    },
    { 
      title: 'As Left ↑', 
      render: (_: any, record: any, idx: number) => (
        <InputNumber 
          size="small" 
          value={record.asLeftUp}
          onChange={v => updatePoint(idx, 'asLeftUp', v)}
          className="w-full"
        />
      )
    },
    { 
      title: 'As Left ↓', 
      render: (_: any, record: any, idx: number) => (
        <InputNumber 
          size="small" 
          value={record.asLeftDown}
          onChange={v => updatePoint(idx, 'asLeftDown', v)}
          className="w-full"
        />
      )
    }
  ];

  const updatePoint = (idx: number, field: string, value: any) => {
    const newPoints = [...points];
    newPoints[idx] = { ...newPoints[idx], [field]: value };
    setPoints(newPoints);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button icon={<Home className="w-4 h-4" />} onClick={() => navigate('/')}>
          Main Menu
        </Button>
        <div>
          <h2 className="text-xl font-bold text-white">New Calibration Entry</h2>
          <p className="text-gray-400 text-sm">Record calibration data with 5-point verification</p>
        </div>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="instrumentTagId" label="Instrument" rules={[{ required: true }]}>
              <Select 
                showSearch 
                placeholder="Select instrument" 
                optionFilterProp="children"
                onChange={handleInstrumentChange}
              >
                {instruments.map(i => (
                  <Option key={i.tagId} value={i.tagId}>{i.tagId} - {i.description}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item name="calibrationDate" label="Calibration Date" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            
            <Form.Item name="frequency" label="Frequency (months)" initialValue={12}>
              <Select>
                <Option value={3}>3 Months</Option>
                <Option value={6}>6 Months</Option>
                <Option value={12}>12 Months</Option>
                <Option value={24}>24 Months</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="performedBy" label="Performed By" rules={[{ required: true }]}>
              <Select showSearch placeholder="Select performer" optionFilterProp="children">
                {performers.map(p => (
                  <Option key={p.employeeId} value={p.name}>{p.employeeId} - {p.name}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item name="standardUsed" label="Reference Standard">
              <Select showSearch placeholder="Select standard" optionFilterProp="children" allowClear>
                {standards.map(s => (
                  <Option key={s.tagId} value={s.tagId}>{s.tagId} - {s.description}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item name="remarks" label="Remarks">
              <Input.TextArea rows={1} />
            </Form.Item>
          </div>

          {/* 5-Point Data Entry */}
          {points.length > 0 && (
            <div className="mt-6">
              <h4 className="text-white font-bold mb-2">5-Point Verification Data</h4>
              <p className="text-gray-400 text-xs mb-3">
                Range: {selectedInstrument?.rangeMin} - {selectedInstrument?.rangeMax} {selectedInstrument?.unit || ''} 
                | Tolerance: ±{selectedInstrument?.tolerance || 0.5}%
              </p>
              <Table
                dataSource={points}
                columns={pointColumns}
                rowKey="key"
                pagination={false}
                size="small"
              />
            </div>
          )}

          {/* Auto-Calculated Result */}
          {calculatedResult && (
            <div className="mt-6">
              <Alert
                type={calculatedResult.pass ? 'success' : 'error'}
                icon={calculatedResult.pass ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                message={
                  <span className="font-bold">
                    {calculatedResult.pass ? 'CALIBRATION PASS' : 'CALIBRATION FAIL'}
                  </span>
                }
                description={
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <span className="text-gray-500">As Found: </span>
                      <Tag color={calculatedResult.asFound === 'IN_TOLERANCE' ? 'green' : 'orange'}>
                        {calculatedResult.asFound?.replace('_', ' ')}
                      </Tag>
                    </div>
                    <div>
                      <span className="text-gray-500">As Left: </span>
                      <Tag color={calculatedResult.asLeft === 'IN_TOLERANCE' ? 'green' : 'orange'}>
                        {calculatedResult.asLeft?.replace('_', ' ')}
                      </Tag>
                    </div>
                  </div>
                }
                showIcon
              />
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button type="primary" htmlType="submit" loading={loading} icon={<Save className="w-4 h-4" />}>
              Save Calibration Event
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default CalibrationEntry;
