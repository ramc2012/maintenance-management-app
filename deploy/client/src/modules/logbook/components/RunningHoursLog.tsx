import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { Plus, Trash2, TrendingUp, History, ActivitySquare, GaugeCircle, AlertTriangle, Cpu } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuth } from '../../../context/AuthContext';

interface RunningHoursLogProps {
  category?: 'mechanical' | 'electrical';
  discipline?: 'MECHANICAL' | 'ELECTRICAL';
}

const renderTrend = (points: number[], color: string) => {
  if (!points.length) return <Empty description="No trend data" />;
  const width = 360;
  const height = 120;
  const padding = 18;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const coords = points.map((value, index) => ({
    x: padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2),
    y: height - padding - ((value - min) / range) * (height - padding * 2),
  }));
  const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  return (
    <svg width={width} height={height} className="rounded-xl bg-slate-50">
      <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#cbd5e1" />
      <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#cbd5e1" />
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {coords.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="3.5" fill={color} />
      ))}
    </svg>
  );
};

export const RunningHoursLog: React.FC<RunningHoursLogProps> = ({ category = 'mechanical', discipline }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [logs, setLogs] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [installations, setInstallations] = useState<any[]>([]);
  const [modalEquipment, setModalEquipment] = useState<any[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [trendModal, setTrendModal] = useState<any>(null);
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
    fetchOperationalLogs();
    fetchOverview();
  }, [selectedInstallation]);

  const fetchOverview = async () => {
    try {
      const response = await axios.get('/api/operations/overview', {
        params: {
          ...(selectedInstallation ? { installationId: selectedInstallation } : {}),
          ...(discipline ? { discipline } : {}),
        },
      });
      setOverview(response.data);
    } catch (error) {
      console.error(error);
      setOverview(null);
    }
  };

  const fetchOperationalLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/operations/logs', {
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

  const fetchModalEquipment = async (installationId: string) => {
    try {
      const response = await axios.get('/api/equipment/running-equip', {
        params: { installationId, ...(discipline ? { discipline } : {}) },
      });
      setModalEquipment(response.data || []);
    } catch (error) {
      console.error(error);
      setModalEquipment([]);
    }
  };

  const loadAssetProfile = async (equipmentTag: string) => {
    try {
      const response = await axios.get(`/api/operations/assets/${encodeURIComponent(equipmentTag)}/profile`);
      setSelectedProfile(response.data.profile);
    } catch (error) {
      console.error(error);
      setSelectedProfile(null);
    }
  };

  const parameterColumns = useMemo(() => {
    const metricMap = new Map<string, any>();
    logs.forEach((log) => {
      (log.metrics || []).forEach((metric: any) => {
        if (!metricMap.has(metric.code)) {
          metricMap.set(metric.code, metric);
        }
      });
    });
    return [...metricMap.values()].slice(0, 6);
  }, [logs]);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'logDate',
      width: 110,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
    },
    {
      title: 'Equipment',
      dataIndex: 'equipmentTag',
      width: 170,
      render: (value: string, record: any) => (
        <Space>
          <Button type="link" size="small" className="p-0 font-semibold" onClick={() => setHistoryModal({ equipmentTag: value, logs: logs.filter((log) => log.equipmentTag === value) })}>
            {value}
          </Button>
          <Tooltip title="Trend">
            <Button type="text" size="small" icon={<TrendingUp className="w-3 h-3 text-blue-600" />} onClick={() => setTrendModal({ equipmentTag: value, logs: logs.filter((log) => log.equipmentTag === value).sort((a, b) => a.logDate.localeCompare(b.logDate)) })} />
          </Tooltip>
          {record.sourceMode !== 'MANUAL' && <Tag color="green">{record.sourceMode}</Tag>}
        </Space>
      ),
    },
    { title: 'Shift', dataIndex: 'shift', width: 90 },
    { title: 'Runtime', dataIndex: 'runtimeHours', width: 90, render: (value: number) => <span className="font-mono font-semibold text-blue-700">{value || 0}</span> },
    { title: 'Downtime', dataIndex: 'downtimeHours', width: 95, render: (value: number) => <span className="font-mono text-amber-700">{value || 0}</span> },
    { title: 'Standby', dataIndex: 'standbyHours', width: 90, render: (value: number) => <span className="font-mono">{value || 0}</span> },
    { title: 'Cumulative', dataIndex: 'cumulativeHours', width: 110, render: (value: number) => <span className="font-mono text-slate-700">{Number(value || 0).toLocaleString()}</span> },
    {
      title: 'State',
      dataIndex: 'operatingState',
      width: 110,
      render: (value: string) => <Tag color={value === 'RUNNING' ? 'green' : value === 'STOPPED' ? 'red' : 'blue'}>{value || '-'}</Tag>,
    },
    ...parameterColumns.map((metric) => ({
      title: metric.label,
      width: 110,
      render: (_: any, record: any) => {
        const value = record.parameters?.[metric.code];
        return <span className="font-mono">{value ?? '-'}</span>;
      },
    })),
    ...(isAdmin
      ? [
          {
            title: '',
            width: 50,
            render: (_: any, record: any) => (
              <Popconfirm title="Delete operational log?" onConfirm={async () => {
                try {
                  await axios.delete(`/api/operations/logs/${record.id}`);
                  message.success('Operational log deleted');
                  fetchOperationalLogs();
                  fetchOverview();
                } catch {
                  message.error('Delete failed');
                }
              }}>
                <Button type="text" danger size="small" icon={<Trash2 className="w-3.5 h-3.5" />} />
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  const handleSubmit = async (values: any) => {
    const runtimeHours = Number(values.runtimeHours || 0);
    const downtimeHours = Number(values.downtimeHours || 0);
    const standbyHours = Number(values.standbyHours || 0);

    if (runtimeHours + downtimeHours + standbyHours > 24) {
      message.error('Runtime + downtime + standby cannot exceed 24 hours for a daily log');
      return;
    }

    const parameters = (selectedProfile?.metrics || []).reduce((acc: Record<string, number>, metric: any) => {
      const value = values[`metric_${metric.code}`];
      if (value !== undefined && value !== null && value !== '') acc[metric.code] = value;
      return acc;
    }, {});

    try {
      await axios.post('/api/operations/logs', {
        logDate: values.logDate.format('YYYY-MM-DD'),
        shift: values.shift,
        installationId: values.installationId,
        equipmentTag: values.equipmentTag,
        runtimeHours,
        downtimeHours,
        standbyHours,
        cumulativeHours: values.cumulativeHours || 0,
        operatingState: values.operatingState,
        availabilityStatus: values.availabilityStatus,
        sourceMode: values.sourceMode,
        sourceStatus: values.sourceMode === 'AUTO' ? 'AUTO_CAPTURED' : 'REVIEWED',
        enteredBy: user?.username || 'system',
        remarks: values.remarks,
        parameters,
      });

      message.success('Operational log saved');
      setModalOpen(false);
      form.resetFields();
      setSelectedProfile(null);
      fetchOperationalLogs();
      fetchOverview();
    } catch (error) {
      console.error(error);
      message.error('Failed to save operational log');
    }
  };

  const trendRuntime = (trendModal?.logs || []).map((log: any) => Number(log.runtimeHours || 0));
  const trendDowntime = (trendModal?.logs || []).map((log: any) => Number(log.downtimeHours || 0));

  return (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic title="Operational Logs" value={overview?.stats?.submittedLogs || logs.length} prefix={<ActivitySquare className="w-4 h-4 text-blue-600" />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic title="Runtime" value={overview?.stats?.totalRuntime || 0} suffix="hrs" prefix={<GaugeCircle className="w-4 h-4 text-emerald-600" />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic title="Downtime" value={overview?.stats?.totalDowntime || 0} suffix="hrs" prefix={<AlertTriangle className="w-4 h-4 text-amber-600" />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic title="Auto / Hybrid" value={overview?.stats?.autoCapturedCount || 0} prefix={<Cpu className="w-4 h-4 text-violet-600" />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            title="Operations Logbook"
            extra={(
              <Space>
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
                  Daily Entry
                </Button>
              </Space>
            )}
          >
            <Table
              dataSource={logs}
              columns={columns as any}
              rowKey="id"
              size="small"
              loading={loading}
              pagination={{ pageSize: 12 }}
              scroll={{ x: 1200 }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="Operations Pattern" size="small">
            {overview?.trend?.length ? (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Runtime Trend</div>
                  {renderTrend((overview.trend || []).map((item: any) => Number(item.runtime || 0)), '#2563eb')}
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Downtime Trend</div>
                  {renderTrend((overview.trend || []).map((item: any) => Number(item.downtime || 0)), '#d97706')}
                </div>
                {(overview.topExceptionAssets || []).length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <div className="text-sm font-semibold text-red-700">Exception Assets</div>
                    <div className="mt-2 space-y-2">
                      {overview.topExceptionAssets.slice(0, 4).map((asset: any) => (
                        <div key={asset.equipmentTag}>
                          <div className="flex items-center justify-between text-xs">
                            <span>{asset.equipmentTag}</span>
                            <span>{asset.exceptions} issues</span>
                          </div>
                          <Progress percent={Math.min(100, asset.exceptions * 10)} strokeColor="#dc2626" showInfo={false} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Empty description="No operating trend yet" />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="Capture Daily Operations Log"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedProfile(null);
        }}
        footer={null}
        width={780}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            logDate: dayjs(),
            shift: 'GENERAL',
            operatingState: 'RUNNING',
            availabilityStatus: 'AVAILABLE',
            sourceMode: 'MANUAL',
          }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="logDate" label="Log Date" rules={[{ required: true }]}>
                <DatePicker className="w-full" format="DD-MM-YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="shift" label="Shift" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="GENERAL">General / Daily</Select.Option>
                  <Select.Option value="DAY">Day</Select.Option>
                  <Select.Option value="NIGHT">Night</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sourceMode" label="Source Mode" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="MANUAL">Manual</Select.Option>
                  <Select.Option value="HYBRID">Hybrid</Select.Option>
                  <Select.Option value="AUTO">Auto Captured</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="installationId" label="Installation" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="children"
                  onChange={(value: string) => {
                    fetchModalEquipment(value);
                    form.setFieldValue('equipmentTag', undefined);
                    setSelectedProfile(null);
                  }}
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
              <Form.Item name="equipmentTag" label="Running Equipment" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="children"
                  placeholder={modalEquipment.length ? 'Select running equipment' : 'Select installation first'}
                  onChange={(value: string) => loadAssetProfile(value)}
                  disabled={!modalEquipment.length}
                >
                  {modalEquipment.map((equipment) => (
                    <Select.Option key={equipment.equipmentTag} value={equipment.equipmentTag}>
                      {equipment.equipmentTag} - {equipment.description}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}><Form.Item name="runtimeHours" label="Runtime (hrs)"><InputNumber min={0} max={24} className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="downtimeHours" label="Downtime (hrs)"><InputNumber min={0} max={24} className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="standbyHours" label="Standby (hrs)"><InputNumber min={0} max={24} className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="cumulativeHours" label="Cumulative Hours"><InputNumber min={0} className="w-full" /></Form.Item></Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="operatingState" label="Operating State">
                <Select>
                  <Select.Option value="RUNNING">Running</Select.Option>
                  <Select.Option value="STOPPED">Stopped</Select.Option>
                  <Select.Option value="STANDBY">Standby</Select.Option>
                  <Select.Option value="TRIPPED">Tripped</Select.Option>
                  <Select.Option value="MAINTENANCE">Maintenance</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="availabilityStatus" label="Availability">
                <Select>
                  <Select.Option value="AVAILABLE">Available</Select.Option>
                  <Select.Option value="DEGRADED">Degraded</Select.Option>
                  <Select.Option value="UNAVAILABLE">Unavailable</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider>Profile Metrics</Divider>
          {!selectedProfile ? (
            <Empty description="Select a running equipment tag to load its operating profile" />
          ) : (
            <>
              <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                <div className="font-semibold text-blue-700">{selectedProfile.name}</div>
                <div className="text-blue-600">{selectedProfile.description}</div>
              </div>
              <Row gutter={16}>
                {selectedProfile.metrics.map((metric: any) => (
                  <Col span={12} key={metric.code}>
                    <Form.Item
                      name={`metric_${metric.code}`}
                      label={`${metric.label}${metric.unit ? ` (${metric.unit})` : ''}`}
                      rules={metric.required ? [{ required: true, message: `Enter ${metric.label}` }] : []}
                    >
                      <InputNumber className="w-full" />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </>
          )}

          <Form.Item name="remarks" label="Supervisor Remarks">
            <Input.TextArea rows={3} />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save Operational Log</Button>
          </div>
        </Form>
      </Modal>

      <Modal title={<span className="flex items-center gap-2"><History className="w-4 h-4" /> Asset Log History: {historyModal?.equipmentTag}</span>} open={!!historyModal} onCancel={() => setHistoryModal(null)} footer={null} width={900}>
        {historyModal?.logs?.length ? (
          <Table
            dataSource={historyModal.logs}
            columns={[
              { title: 'Date', dataIndex: 'logDate', render: (value: string) => dayjs(value).format('DD/MM/YYYY') },
              { title: 'Shift', dataIndex: 'shift' },
              { title: 'Runtime', dataIndex: 'runtimeHours' },
              { title: 'Downtime', dataIndex: 'downtimeHours' },
              { title: 'State', dataIndex: 'operatingState', render: (value: string) => <Tag>{value || '-'}</Tag> },
              { title: 'Source', dataIndex: 'sourceMode' },
            ]}
            rowKey="id"
            pagination={{ pageSize: 8 }}
            size="small"
          />
        ) : (
          <Empty description="No historical operations logs" />
        )}
      </Modal>

      <Modal title={<span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Trend View: {trendModal?.equipmentTag}</span>} open={!!trendModal} onCancel={() => setTrendModal(null)} footer={null} width={820}>
        {trendModal?.logs?.length ? (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-semibold">Runtime Trend</div>
              {renderTrend(trendRuntime, '#2563eb')}
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">Downtime Trend</div>
              {renderTrend(trendDowntime, '#d97706')}
            </div>
          </div>
        ) : (
          <Empty description="No trend data" />
        )}
      </Modal>
    </div>
  );
};
