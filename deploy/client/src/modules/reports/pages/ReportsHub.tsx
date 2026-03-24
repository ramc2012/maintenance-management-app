import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Table, Card, Tag, Button, DatePicker, Select, Space, Modal, Typography, Segmented } from 'antd';
import { PlusOutlined, FileTextOutlined, CalendarOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { Layout } from '../../core/components/Layout';
import { DailyLogForm } from '../components/DailyLogForm';
import { AutoReportGenerator } from '../components/AutoReportGenerator';
import axios from 'axios';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

type PeriodFilter = 'daily' | 'monthly' | 'yearly';

export const ReportsHub = () => {
  const [activeTab, setActiveTab] = useState('entry');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [installations, setInstallations] = useState<any[]>([]);
  
  // Period Filter
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('daily');
  
  // Filters
  const [filterInstallation, setFilterInstallation] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [filterSection, setFilterSection] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

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
      const res = await axios.get('/api/equipment/installations');
      setInstallations(res.data);
    } catch (error) {
      console.error('Failed to fetch installations:', error);
    }
  };

  useEffect(() => {
    fetchInstallations();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [periodFilter, filterInstallation]);

  // Filter logs client-side for department, section, and date range
  const filteredLogs = useMemo(() => {
    let result = [...logs];
    
    if (filterDepartment) {
      result = result.filter(log => log.department === filterDepartment);
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
  }, [logs, filterDepartment, filterSection, filterDateRange]);

  // Get unique departments and sections from installations
  const departments = useMemo(() => {
    const types = [...new Set(installations.map(i => i.type))];
    return types.filter(Boolean);
  }, [installations]);

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
    return type === 'PM' 
      ? <Tag color="blue">PM</Tag> 
      : <Tag color="red">BD</Tag>;
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
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 100
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
    setFilterDepartment(null);
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
          }} />
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
                    { label: '�� Daily (All)', value: 'daily' },
                    { label: '📊 Monthly (★★+)', value: 'monthly' },
                    { label: '📈 Yearly (★★★)', value: 'yearly' }
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Filters */}
          <Card size="small" className="mb-4" title={<><FilterOutlined /> Filters</>}>
            <Space wrap>
              <Select
                placeholder="Installation"
                allowClear
                style={{ width: 160 }}
                onChange={setFilterInstallation}
                value={filterInstallation}
              >
                {installations.map((i: any) => (
                  <Option key={i.id} value={i.id}>
                    {i.installationId}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="Department"
                allowClear
                style={{ width: 140 }}
                onChange={setFilterDepartment}
                value={filterDepartment}
              >
                {departments.map((d: any) => (
                  <Option key={d} value={d}>{d}</Option>
                ))}
              </Select>
              <Select
                placeholder="Section"
                allowClear
                style={{ width: 140 }}
                onChange={setFilterSection}
                value={filterSection}
              >
                {sections.map((s) => (
                  <Option key={s} value={s}>{s}</Option>
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
        }} />
      </Modal>
    </Layout>
  );
};
