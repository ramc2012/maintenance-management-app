import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Table, Card, Tag, Button, DatePicker, Select, Space, Modal, Typography, Segmented } from 'antd';
import { PlusOutlined, FileTextOutlined, CalendarOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { Layout } from '../../core/components/Layout';
import { DailyLogForm } from '../components/DailyLogForm';
import { AutoReportGenerator } from '../components/AutoReportGenerator';
import axios from 'axios';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useSearchParams } from 'react-router-dom';
import { disciplineToLabel, parseDiscipline } from '../../../utils/workspace';
import { canonicalServiceKey, displayService, uniqueServiceOptions } from '../../../utils/serviceGroups';

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

type PeriodFilter = 'daily' | 'monthly' | 'yearly';

export const ReportsHub = () => {
  const [searchParams] = useSearchParams();
  const discipline = parseDiscipline(searchParams.get('discipline'));
  const [activeTab, setActiveTab] = useState('entry');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [installations, setInstallations] = useState<any[]>([]);
  
  // Period Filter
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('daily');
  
  // Filters
  const [filterInstallation, setFilterInstallation] = useState<string | null>(null);
  const [filterService, setFilterService] = useState<string | null>(null);
  const [filterSection, setFilterSection] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  useEffect(() => {
    if (discipline) {
      setFilterSection(disciplineToLabel(discipline));
    }
  }, [discipline]);

  // Fetch logs based on period
  const fetchLogs = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/maintenance/logs';
      const params: any = {};
      
      if (periodFilter === 'monthly') {
        endpoint = '/api/maintenance/reports/monthly';
      } else if (periodFilter === 'yearly') {
        endpoint = '/api/maintenance/reports/annual';
      }
      
      if (filterInstallation) params.installationId = filterInstallation;
      if (discipline) params.discipline = discipline;
      
      const res = await axios.get(endpoint, { params });
      setLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallations = async () => {
    try {
      const res = await axios.get('/api/equipment/installations', {
        params: discipline ? { discipline } : undefined,
      });
      setInstallations(res.data);
    } catch (error) {
      console.error('Failed to fetch installations:', error);
    }
  };

  useEffect(() => {
    fetchInstallations();
  }, [discipline]);

  useEffect(() => {
    fetchLogs();
  }, [discipline, periodFilter, filterInstallation]);

  // Filter logs client-side for service, section, and date range
  const filteredLogs = useMemo(() => {
    let result = [...logs];
    
    if (filterService) {
      result = result.filter(log => canonicalServiceKey(log.department) === filterService);
    }
    if (filterSection) {
      result = result.filter(log => log.section === filterSection);
    }
    if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
      result = result.filter(log => 
        dayjs(log.date).isBetween(filterDateRange[0], filterDateRange[1], 'day', '[]')
      );
    }
    
    return result;
  }, [logs, filterService, filterSection, filterDateRange]);

  // Get unique services and sections from installations
  const services = useMemo(() => {
    return uniqueServiceOptions(installations.map(i => i.type));
  }, [installations]);

  const filteredInstallations = useMemo(() => {
    if (!filterService) return installations;
    return installations.filter((installation) => canonicalServiceKey(installation.type) === filterService);
  }, [filterService, installations]);

  const sections = ['Mechanical', 'Electrical', 'Instrumentation'];

  const getCriticalityTag = (level: number) => {
    switch (level) {
      case 1: return <Tag color="default">★ Routine</Tag>;
      case 2: return <Tag color="orange">★★ Monthly</Tag>;
      case 3: return <Tag color="red">★★★ Annual</Tag>;
      default: return <Tag>Unknown</Tag>;
    }
  };

  const getJobTypeTag = (type: string) => {
    const colors: Record<string, string> = {
      PM: 'blue',
      BD: 'red',
      CM: 'purple',
      ERECTION: 'cyan',
      DISMANTLING: 'orange',
    };
    return <Tag color={colors[type] || 'default'}>{type || 'NA'}</Tag>;
  };

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      'Open': 'default',
      'In Progress': 'processing',
      'Closed': 'success'
    };
    return <Tag color={colors[status] || 'default'}>{status}</Tag>;
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      render: (d: string) => dayjs(d).format('DD-MMM-YY'),
      sorter: (a: any, b: any) => dayjs(a.date).unix() - dayjs(b.date).unix()
    },
    {
      title: 'Location',
      dataIndex: ['installation', 'installationId'],
      key: 'location',
      width: 120
    },
    {
      title: 'Service',
      dataIndex: 'department',
      key: 'department',
      width: 120,
      render: (service: string) => displayService(service),
    },
    {
      title: 'Section',
      dataIndex: 'section',
      key: 'section',
      width: 110
    },
    {
      title: 'Type',
      dataIndex: 'jobType',
      key: 'jobType',
      width: 60,
      render: (t: string) => getJobTypeTag(t)
    },
    {
      title: 'Level',
      dataIndex: 'reportCriticality',
      key: 'criticality',
      width: 100,
      render: (c: number) => getCriticalityTag(c)
    },
    {
      title: 'Equipment',
      dataIndex: 'equipmentTag',
      key: 'equipment',
      width: 120,
      ellipsis: true
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Hours',
      dataIndex: 'durationHours',
      key: 'hours',
      width: 70,
      render: (h: number) => <Text strong>{h}h</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => getStatusTag(s)
    },
  ];

  const clearFilters = () => {
    setFilterInstallation(null);
    setFilterService(null);
    setFilterSection(null);
    setFilterDateRange(null);
  };

  const tabItems = [
    {
      key: 'entry',
      label: (
        <span>
          <PlusOutlined />
          New Log Entry
        </span>
      ),
      children: (
        <Card className="max-w-4xl mx-auto">
          <DailyLogForm onSuccess={() => {
            fetchLogs();
            setActiveTab('view');
          }} discipline={discipline ?? undefined} />
        </Card>
      )
    },
    {
      key: 'view',
      label: (
        <span>
          <CalendarOutlined />
          View Reports
        </span>
      ),
      children: (
        <div>
          {/* Period Selector */}
          <Card size="small" className="mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Text strong>View:</Text>
                <Segmented
                  value={periodFilter}
                  onChange={(v) => setPeriodFilter(v as PeriodFilter)}
                  options={[
                    { label: 'Daily (All)', value: 'daily' },
                    { label: 'Monthly (Level 2+)', value: 'monthly' },
                    { label: 'Yearly (Level 3)', value: 'yearly' }
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Filters */}
          <Card size="small" className="mb-4" title={<><FilterOutlined /> Filters</>}>
            <Space wrap>
              <Select
                placeholder="Service"
                allowClear
                style={{ width: 140 }}
                onChange={(value) => {
                  setFilterService(value);
                  setFilterInstallation(null);
                }}
                value={filterService}
              >
                {services.map((service) => (
                  <Option key={service.value} value={service.value}>{service.label}</Option>
                ))}
              </Select>
              <Select
                placeholder="Section"
                allowClear
                style={{ width: 140 }}
                onChange={setFilterSection}
                value={filterSection}
                disabled={Boolean(discipline)}
              >
                {sections.map((s) => (
                  <Option key={s} value={s}>{s}</Option>
                ))}
              </Select>
              <Select
                placeholder={filterService ? 'Installation' : 'Select service first'}
                allowClear
                style={{ width: 160 }}
                onChange={setFilterInstallation}
                value={filterInstallation}
                disabled={!filterService}
              >
                {filteredInstallations.map((i: any) => (
                  <Option key={i.id} value={i.id}>
                    {i.installationId}
                  </Option>
                ))}
              </Select>
              <RangePicker 
                onChange={(dates) => setFilterDateRange(dates as any)} 
                format="DD-MM-YYYY"
                value={filterDateRange}
              />
              <Button onClick={clearFilters}>Clear</Button>
              <Button icon={<ReloadOutlined />} onClick={fetchLogs}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setActiveTab('entry')}>
                New Log
              </Button>
            </Space>
          </Card>
          
          {/* Summary */}
          <div className="mb-4 flex gap-4 text-sm">
            <Tag color="blue">{filteredLogs.length} records</Tag>
            <Tag color="green">
              {filteredLogs.reduce((sum, log) => sum + (log.durationHours || 0), 0).toFixed(1)} total hours
            </Tag>
          </div>

          {/* Table */}
          <Table
            dataSource={filteredLogs}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{ pageSize: 15, showSizeChanger: true }}
            scroll={{ x: 1200 }}
            onRow={(record) => ({
              onClick: () => setSelectedLog(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      )
    },
    {
      key: 'auto',
      label: (
        <span>
          <FileTextOutlined />
          Auto Reports
        </span>
      ),
      children: <AutoReportGenerator logs={filteredLogs} />
    }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Title level={3} className="!mb-1 dark:text-white">
            📋 Daily Activity Reports
          </Title>
          <Text type="secondary" className="dark:text-gray-400">
            Log maintenance activities • Daily / Monthly / Yearly views
          </Text>
          {discipline ? (
            <div className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              Discipline scope: {disciplineToLabel(discipline)}
            </div>
          ) : null}
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={tabItems}
          type="card"
        />
      </div>

      {/* Modal for editing */}
      <Modal
        title="Edit Log Entry"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={900}
        footer={null}
      >
        <DailyLogForm onSuccess={() => {
          setModalOpen(false);
          fetchLogs();
        }} discipline={discipline ?? undefined} />
      </Modal>

      <Modal
        title="Maintenance Report"
        open={Boolean(selectedLog)}
        onCancel={() => setSelectedLog(null)}
        footer={null}
        width={900}
      >
        {selectedLog ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <Text type="secondary">Date</Text>
                <div className="font-semibold">{dayjs(selectedLog.date).format('DD-MMM-YYYY')}</div>
              </div>
              <div>
                <Text type="secondary">Installation</Text>
                <div className="font-semibold">{selectedLog.installation?.installationId || '-'}</div>
              </div>
              <div>
                <Text type="secondary">Service</Text>
                <div className="font-semibold">{displayService(selectedLog.department) || '-'}</div>
              </div>
              <div>
                <Text type="secondary">Section</Text>
                <div className="font-semibold">{selectedLog.section || '-'}</div>
              </div>
              <div>
                <Text type="secondary">Type</Text>
                <div>{getJobTypeTag(selectedLog.jobType)}</div>
              </div>
              <div>
                <Text type="secondary">Status</Text>
                <div>{getStatusTag(selectedLog.status)}</div>
              </div>
              <div>
                <Text type="secondary">Notification</Text>
                <div className="font-semibold">{selectedLog.notificationNo || '-'}</div>
              </div>
              <div>
                <Text type="secondary">Duration</Text>
                <div className="font-semibold">{selectedLog.durationHours ?? 0} h</div>
              </div>
            </div>
            <div>
              <Text type="secondary">Description</Text>
              <div className="mt-1 font-medium">{selectedLog.description}</div>
            </div>
            <div>
              <Text type="secondary">Original full report</Text>
              <pre className="mt-2 max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs leading-5 text-gray-800">
                {selectedLog.remarks || 'No original report text stored for this log.'}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </Layout>
  );
};
