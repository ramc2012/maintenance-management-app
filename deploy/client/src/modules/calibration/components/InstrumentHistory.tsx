import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, Empty, Row, Select, Skeleton, Table, Tag, Timeline } from 'antd';
import { Activity, ClipboardList, Wrench } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';

const resultColor = (value?: string) => {
  if (!value) return 'default';
  if (value.includes('PASS')) return 'green';
  if (value.includes('ADJUST')) return 'blue';
  if (value.includes('FAIL') || value.includes('OUT')) return 'red';
  return 'default';
};

export const InstrumentHistory: React.FC = () => {
  const [instruments, setInstruments] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInstruments = async () => {
      try {
        const response = await axios.get('/api/equipment/instruments');
        setInstruments(response.data || []);
      } catch (error) {
        console.error(error);
        setInstruments([]);
      }
    };
    fetchInstruments();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedTag) {
        setHistory(null);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(`/api/calibration/instruments/${encodeURIComponent(selectedTag)}/history`);
        setHistory(response.data);
      } catch (error) {
        console.error(error);
        setHistory(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedTag]);

  const timelineItems = useMemo(() => {
    if (!history) return [];

    const calibrationEvents = (history.calibrationEvents || []).map((event: any) => ({
      type: 'CALIBRATION',
      timestamp: event.calibrationDate,
      title: `Calibration ${event.certificateNo}`,
      subtitle: `${event.standardUsed?.tagId || 'Standard'} · ${event.performedBy || 'Unknown performer'}`,
      payload: {
        result: event.overallResultAsLeft || event.overallResultAsFound,
        nextDueDate: event.nextDueDate,
      },
    }));

    const maintenanceLogs = (history.maintenanceLogs || []).map((log: any) => ({
      type: 'MAINTENANCE',
      timestamp: log.date,
      title: `${log.jobType} maintenance activity`,
      subtitle: `${log.description} · ${log.createdBy || 'Unknown technician'}`,
      payload: {
        status: log.status,
        durationHours: log.durationHours,
        notificationNo: log.notificationNo,
      },
    }));

    return [...calibrationEvents, ...maintenanceLogs].sort(
      (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    );
  }, [history]);

  const calibrationColumns = [
    {
      title: 'Certificate',
      dataIndex: 'certificateNo',
      width: 180,
      render: (value: string) => <span className="font-mono font-semibold text-cyan-600">{value}</span>,
    },
    {
      title: 'Calibration Date',
      dataIndex: 'calibrationDate',
      width: 130,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
    },
    {
      title: 'Next Due',
      dataIndex: 'nextDueDate',
      width: 130,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
    },
    {
      title: 'Result',
      width: 130,
      render: (_: any, record: any) => {
        const result = record.overallResultAsLeft || record.overallResultAsFound || 'PENDING';
        return <Tag color={resultColor(result)}>{result}</Tag>;
      },
    },
    {
      title: 'Performed By',
      dataIndex: 'performedBy',
      width: 150,
    },
    {
      title: 'Standard',
      render: (_: any, record: any) => record.standardUsed?.tagId || '-',
    },
  ];

  const maintenanceColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 120,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
    },
    {
      title: 'Job Type',
      dataIndex: 'jobType',
      width: 90,
      render: (value: string) => <Tag color={value === 'PM' ? 'blue' : 'orange'}>{value}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (value: string) => <Tag color={value === 'Closed' ? 'green' : 'blue'}>{value}</Tag>,
    },
    {
      title: 'Duration',
      dataIndex: 'durationHours',
      width: 100,
      render: (value: number) => `${Number(value || 0).toFixed(1)} hrs`,
    },
    {
      title: 'By',
      dataIndex: 'createdBy',
      width: 120,
    },
  ];

  return (
    <div className="space-y-4">
      <Card size="small">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.6fr_1fr]">
          <Select
            showSearch
            allowClear
            placeholder="Select instrument tag"
            value={selectedTag || undefined}
            onChange={(value) => setSelectedTag(value || '')}
            optionFilterProp="children"
          >
            {instruments.map((instrument) => (
              <Select.Option key={instrument.tagId} value={instrument.tagId}>
                {instrument.tagId} - {instrument.description}
              </Select.Option>
            ))}
          </Select>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Instrument Scope</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {history?.instrument?.tagId || 'No instrument selected'}
            </div>
            <div className="text-xs text-gray-500">
              Instruments keep calibration history and field-report maintenance history only.
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
      ) : !history ? (
        <Card><Empty description="Choose an instrument to open its history" /></Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <Card size="small">
                <div className="text-xs uppercase tracking-wide text-gray-500">Calibration Events</div>
                <div className="mt-2 text-3xl font-bold text-cyan-600">{history.summary?.calibrationCount || 0}</div>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card size="small">
                <div className="text-xs uppercase tracking-wide text-gray-500">Maintenance Logs</div>
                <div className="mt-2 text-3xl font-bold text-amber-600">{history.summary?.maintenanceCount || 0}</div>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card size="small">
                <div className="text-xs uppercase tracking-wide text-gray-500">Latest Result</div>
                <div className="mt-2">
                  <Tag color={resultColor(history.summary?.latestResult)}>{history.summary?.latestResult || 'N/A'}</Tag>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card size="small">
                <div className="text-xs uppercase tracking-wide text-gray-500">Next Due</div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {history.summary?.nextDueDate ? dayjs(history.summary.nextDueDate).format('DD/MM/YYYY') : 'N/A'}
                </div>
              </Card>
            </Col>
          </Row>

          <Card
            title={(
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-600" />
                Instrument Timeline
              </span>
            )}
            size="small"
          >
            <Timeline
              items={timelineItems.map((item) => ({
                color: item.type === 'CALIBRATION' ? 'blue' : 'gold',
                dot: item.type === 'CALIBRATION'
                  ? <Activity className="h-4 w-4 text-cyan-600" />
                  : <Wrench className="h-4 w-4 text-amber-600" />,
                children: (
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-500">{dayjs(item.timestamp).format('DD/MM/YYYY HH:mm')}</div>
                      </div>
                      <Tag color={item.type === 'CALIBRATION' ? 'blue' : 'gold'}>{item.type}</Tag>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">{item.subtitle}</div>
                    {item.type === 'CALIBRATION' ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 md:grid-cols-4">
                        <div>Result: <strong>{item.payload.result || '-'}</strong></div>
                        <div>Next Due: <strong>{item.payload.nextDueDate ? dayjs(item.payload.nextDueDate).format('DD/MM/YYYY') : '-'}</strong></div>
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 md:grid-cols-4">
                        <div>Status: <strong>{item.payload.status || '-'}</strong></div>
                        <div>Duration: <strong>{Number(item.payload.durationHours || 0).toFixed(1)} hrs</strong></div>
                        <div>Notification: <strong>{item.payload.notificationNo || '-'}</strong></div>
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card
                title={(
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-600" />
                    Calibration History
                  </span>
                )}
                size="small"
              >
                <Table
                  dataSource={history.calibrationEvents || []}
                  columns={calibrationColumns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                  scroll={{ x: 760 }}
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card
                title={(
                  <span className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-amber-600" />
                    Maintenance History
                  </span>
                )}
                size="small"
              >
                <Table
                  dataSource={history.maintenanceLogs || []}
                  columns={maintenanceColumns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                  scroll={{ x: 720 }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};
