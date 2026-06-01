import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Statistic,
  Table,
  Tag,
  message,
} from 'antd';
import { Flame, Gauge, Plus, Thermometer, Trash2, TrendingUp } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuth } from '../../../context/AuthContext';

interface CompressionLogProps {
  showParameters?: boolean;
  discipline?: 'MECHANICAL';
}

const renderMiniTrend = (values: number[], color: string) => {
  if (!values.length) return <Empty description="No trend data" />;
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-28 items-end gap-2">
      {values.map((value, index) => (
        <div key={index} className="flex-1 rounded-t" style={{ height: `${(value / max) * 100}%`, backgroundColor: color }} />
      ))}
    </div>
  );
};

export const CompressionLog: React.FC<CompressionLogProps> = ({ showParameters = false, discipline }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [logs, setLogs] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [modalCompressors, setModalCompressors] = useState<any[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchInstallations = async () => {
      try {
        const response = await axios.get('/api/equipment/installations');
        setInstallations(response.data || []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchInstallations();
  }, []);

  useEffect(() => {
    fetchCompressionLogs();
  }, [discipline, selectedInstallation]);

  const filterGasCompressors = (equipment: any[]) =>
    (equipment || []).filter((item) => {
      const tag = String(item.equipmentTag || '').toUpperCase();
      const desc = String(item.description || '').toUpperCase();
      const gasLike =
        tag.includes('COMP') ||
        desc.includes('COMPRESSOR') ||
        desc.includes('GAS BOOST') ||
        desc.includes('OFF GAS') ||
        desc.includes('LP GAS') ||
        desc.includes('MP GAS') ||
        desc.includes('HP GAS');
      const airLike = desc.includes('AIR COMP') || tag.includes('AIR');
      return gasLike && !airLike;
    });

  const fetchModalCompressors = async (installationId: string) => {
    try {
      const response = await axios.get('/api/equipment/running-equip', { params: { installationId } });
      setModalCompressors(filterGasCompressors(response.data || []));
    } catch (error) {
      console.error(error);
      setModalCompressors([]);
    }
  };

  const fetchCompressionLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/operations/compressors/logs', {
        params: {
          ...(selectedInstallation ? { installationId: selectedInstallation } : {}),
          ...(discipline ? { discipline } : {}),
        },
      });
      setLogs(response.data || []);
    } catch (error) {
      console.error(error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    return logs.reduce(
      (acc, item) => {
        acc.outputGas += item.outputGasVolume ?? item.gasCompressed ?? 0;
        acc.inputGas += item.inputGasVolume ?? 0;
        acc.fuelGas += item.fuelGasVolume ?? 0;
        acc.trips += item.tripCount ?? 0;
        acc.avgEfficiency += item.efficiencyPct ?? 0;
        acc.efficiencySamples += item.efficiencyPct ? 1 : 0;
        return acc;
      },
      { outputGas: 0, inputGas: 0, fuelGas: 0, trips: 0, avgEfficiency: 0, efficiencySamples: 0 },
    );
  }, [logs]);

  const columns = !showParameters
    ? [
        { title: 'Date', dataIndex: 'logDate', render: (value: string) => dayjs(value).format('DD/MM/YYYY'), width: 110 },
        { title: 'Shift', dataIndex: 'shift', width: 90 },
        { title: 'Compressor', dataIndex: 'compressorId', width: 180, render: (value: string) => <span className="font-semibold">{value}</span> },
        { title: 'Input Gas (m³)', dataIndex: 'inputGasVolume', render: (value: number) => Number(value || 0).toLocaleString(), width: 120 },
        { title: 'Output Gas (m³)', dataIndex: 'outputGasVolume', render: (value: number, record: any) => Number(value ?? record.gasCompressed ?? 0).toLocaleString(), width: 130 },
        { title: 'Fuel Gas (m³)', dataIndex: 'fuelGasVolume', render: (value: number) => Number(value || 0).toLocaleString(), width: 120 },
        { title: 'Run Hrs', dataIndex: 'runHours', width: 90 },
        { title: 'Load %', dataIndex: 'loadPct', width: 90 },
        { title: 'Efficiency %', dataIndex: 'efficiencyPct', width: 100 },
        { title: 'Trips', dataIndex: 'tripCount', width: 80 },
        { title: 'Source', dataIndex: 'sourceMode', width: 95, render: (value: string) => <Tag color={value === 'AUTO' ? 'green' : value === 'HYBRID' ? 'blue' : 'default'}>{value}</Tag> },
        ...(isAdmin
          ? [
              {
                title: '',
                width: 50,
                render: (_: any, record: any) => (
                  <Popconfirm
                    title="Delete compressor log?"
                    onConfirm={async () => {
                      try {
                        await axios.delete(`/api/operations/compressors/logs/${record.id}`);
                        message.success('Compressor log deleted');
                        fetchCompressionLogs();
                      } catch {
                        message.error('Delete failed');
                      }
                    }}
                  >
                    <Button type="text" danger size="small" icon={<Trash2 className="w-3.5 h-3.5" />} />
                  </Popconfirm>
                ),
              },
            ]
          : []),
      ]
    : [
        { title: 'Date', dataIndex: 'logDate', render: (value: string) => dayjs(value).format('DD/MM/YYYY'), width: 110 },
        { title: 'Compressor', dataIndex: 'compressorId', width: 180, render: (value: string) => <span className="font-semibold">{value}</span> },
        { title: 'Suction P', dataIndex: 'suctionPressure', width: 100 },
        { title: 'Discharge P', dataIndex: 'dischargePressure', width: 110 },
        { title: 'Interstage P', dataIndex: 'interstagePressure', width: 110 },
        { title: 'Suction T', dataIndex: 'suctionTemp', width: 95 },
        { title: 'Discharge T', dataIndex: 'dischargeTemp', width: 105 },
        { title: 'Lube Oil P', dataIndex: 'lubeOilPressure', width: 105 },
        { title: 'Lube Oil T', dataIndex: 'lubeOilTemp', width: 105 },
        { title: 'Jacket Water T', dataIndex: 'jacketWaterTemp', width: 120 },
        { title: 'Vibration', dataIndex: 'vibration', width: 95 },
        { title: 'Shutdown', dataIndex: 'shutdownReason', ellipsis: true },
      ];

  const handleSubmit = async (values: any) => {
    try {
      await axios.post('/api/operations/compressors/logs', {
        logDate: values.logDate.format('YYYY-MM-DD'),
        shift: values.shift,
        installationId: values.installationId,
        compressorId: values.compressorId,
        inputGasVolume: values.inputGasVolume || 0,
        outputGasVolume: values.outputGasVolume || 0,
        fuelGasVolume: values.fuelGasVolume || 0,
        recycleGasVolume: values.recycleGasVolume || 0,
        flareGasVolume: values.flareGasVolume || 0,
        runHours: values.runHours || 0,
        loadPct: values.loadPct || 0,
        efficiencyPct: values.efficiencyPct || 0,
        flowRate: values.flowRate || 0,
        suctionPressure: values.suctionPressure,
        dischargePressure: values.dischargePressure,
        interstagePressure: values.interstagePressure,
        suctionTemp: values.suctionTemp,
        dischargeTemp: values.dischargeTemp,
        lubeOilPressure: values.lubeOilPressure,
        lubeOilTemp: values.lubeOilTemp,
        jacketWaterTemp: values.jacketWaterTemp,
        vibration: values.vibration,
        tripCount: values.tripCount || 0,
        shutdownReason: values.shutdownReason,
        sourceMode: values.sourceMode,
        enteredBy: user?.username || 'system',
        remarks: values.remarks,
      });
      message.success('Compressor process log saved');
      setModalOpen(false);
      form.resetFields();
      fetchCompressionLogs();
    } catch (error) {
      console.error(error);
      message.error('Failed to save compressor log');
    }
  };

  return (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic title="Output Gas" value={stats.outputGas} suffix="m³" prefix={<Flame className="w-4 h-4 text-red-500" />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic title="Fuel Gas" value={stats.fuelGas} suffix="m³" prefix={<Gauge className="w-4 h-4 text-amber-500" />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic title="Trip Count" value={stats.trips} prefix={<TrendingUp className="w-4 h-4 text-violet-600" />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic title="Avg Efficiency" value={stats.efficiencySamples ? stats.avgEfficiency / stats.efficiencySamples : 0} precision={1} suffix="%" prefix={<Thermometer className="w-4 h-4 text-blue-600" />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            title={showParameters ? 'Compressor Parameters' : 'Compressor Process Log'}
            extra={(
              <div className="flex gap-2">
                <Select
                  allowClear
                  placeholder="Installation"
                  style={{ width: 180 }}
                  value={selectedInstallation || undefined}
                  onChange={(value) => setSelectedInstallation(value || '')}
                >
                  {installations.map((installation) => (
                    <Select.Option key={installation.id} value={installation.id}>
                      {installation.installationId}
                    </Select.Option>
                  ))}
                </Select>
                <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
                  Add Entry
                </Button>
              </div>
            )}
          >
            <Table dataSource={logs} columns={columns as any} rowKey="id" size="small" loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 1300 }} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="Compression Trend" size="small">
            {logs.length ? (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Output Gas</div>
                  {renderMiniTrend(logs.slice().reverse().map((item) => Number(item.outputGasVolume ?? item.gasCompressed ?? 0)), '#dc2626')}
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Load %</div>
                  {renderMiniTrend(logs.slice().reverse().map((item) => Number(item.loadPct || 0)), '#2563eb')}
                </div>
              </div>
            ) : (
              <Empty description="No compressor trend data" />
            )}
          </Card>
        </Col>
      </Row>

      <Modal title="Capture Compressor Process Log" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={860}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            logDate: dayjs(),
            shift: 'GENERAL',
            sourceMode: 'HYBRID',
          }}
        >
          <Row gutter={16}>
            <Col span={8}><Form.Item name="logDate" label="Log Date" rules={[{ required: true }]}><DatePicker className="w-full" format="DD-MM-YYYY" /></Form.Item></Col>
            <Col span={8}><Form.Item name="shift" label="Shift" rules={[{ required: true }]}><Select><Select.Option value="GENERAL">General / Daily</Select.Option><Select.Option value="DAY">Day</Select.Option><Select.Option value="NIGHT">Night</Select.Option></Select></Form.Item></Col>
            <Col span={8}><Form.Item name="sourceMode" label="Source Mode" rules={[{ required: true }]}><Select><Select.Option value="MANUAL">Manual</Select.Option><Select.Option value="HYBRID">Hybrid</Select.Option><Select.Option value="AUTO">Auto</Select.Option></Select></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="installationId" label="Installation" rules={[{ required: true }]}>
                <Select
                  onChange={(value: string) => {
                    fetchModalCompressors(value);
                    form.setFieldValue('compressorId', undefined);
                  }}
                  showSearch
                  optionFilterProp="children"
                >
                  {installations.map((installation) => (
                    <Select.Option key={installation.id} value={installation.id}>
                      {installation.installationId}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="compressorId" label="Compressor" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="children" disabled={!modalCompressors.length} placeholder={modalCompressors.length ? 'Select compressor' : 'Select installation first'}>
                  {modalCompressors.map((compressor) => (
                    <Select.Option key={compressor.equipmentTag} value={compressor.equipmentTag}>
                      {compressor.equipmentTag} - {compressor.description}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="inputGasVolume" label="Input Gas (m³)"><InputNumber min={0} className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="outputGasVolume" label="Output Gas (m³)"><InputNumber min={0} className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="fuelGasVolume" label="Fuel Gas (m³)"><InputNumber min={0} className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="runHours" label="Run Hours"><InputNumber min={0} max={24} className="w-full" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="loadPct" label="Load %"><InputNumber min={0} max={100} className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="efficiencyPct" label="Efficiency %"><InputNumber min={0} max={100} className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="tripCount" label="Trip Count"><InputNumber min={0} className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="flowRate" label="Flow Rate (m³/hr)"><InputNumber min={0} className="w-full" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="suctionPressure" label="Suction P"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="dischargePressure" label="Discharge P"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="interstagePressure" label="Interstage P"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="suctionTemp" label="Suction T"><InputNumber className="w-full" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="dischargeTemp" label="Discharge T"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="lubeOilPressure" label="Lube Oil P"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="lubeOilTemp" label="Lube Oil T"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="jacketWaterTemp" label="Jacket Water T"><InputNumber className="w-full" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="vibration" label="Vibration"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={8}><Form.Item name="recycleGasVolume" label="Recycle Gas (m³)"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={8}><Form.Item name="flareGasVolume" label="Flare Gas (m³)"><InputNumber className="w-full" /></Form.Item></Col>
          </Row>
          <Form.Item name="shutdownReason" label="Shutdown Reason"><Input /></Form.Item>
          <Form.Item name="remarks" label="Remarks"><Input.TextArea rows={3} /></Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save Compressor Log</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
