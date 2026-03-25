import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Input, Select, Space, Modal, Descriptions, Row, Col, Card } from 'antd';
import { Search, FileText, Eye, Download, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Option } = Select;

export const CalibrationRecords: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  // Filter states
  const [installations, setInstallations] = useState<any[]>([]);
  const [functionalLocations, setFunctionalLocations] = useState<any[]>([]);
  const [instrumentTypes, setInstrumentTypes] = useState<string[]>([]);
  
  const [filterInstallation, setFilterInstallation] = useState<string>('');
  const [filterFL, setFilterFL] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterTagNo, setFilterTagNo] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, installRes] = await Promise.all([
        axios.get('/api/calibration/events'),
        axios.get('/api/equipment/installations')
      ]);
      const eventsData = eventsRes.data || [];
      setEvents(eventsData);
      setInstallations(installRes.data || []);
      
      // Extract unique types from events
      const types = [...new Set(eventsData.map((e: any) => e.instrument?.type).filter(Boolean))];
      setInstrumentTypes(types as string[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load FLs when installation changes
  useEffect(() => {
    if (filterInstallation) {
      axios.get(`/api/fl?installationId=${filterInstallation}`).then(res => {
        setFunctionalLocations(res.data || []);
      }).catch(() => setFunctionalLocations([]));
    } else {
      setFunctionalLocations([]);
      setFilterFL('');
    }
  }, [filterInstallation]);

  const columns = [
    { 
      title: 'Certificate No', 
      dataIndex: 'certificateNo', 
      render: (t: string) => <span className="font-mono font-bold text-cyan-400">{t}</span>,
      sorter: (a: any, b: any) => a.certificateNo?.localeCompare(b.certificateNo)
    },
    { 
      title: 'Tag ID', 
      dataIndex: 'instrumentTagId',
      render: (t: string) => <span className="font-bold text-white">{t}</span>,
      sorter: (a: any, b: any) => a.instrumentTagId?.localeCompare(b.instrumentTagId)
    },
    { 
      title: 'Type', 
      dataIndex: ['instrument', 'type'],
      render: (t: string) => <Tag color="blue">{t || '-'}</Tag>
    },
    { 
      title: 'Calibration Date', 
      dataIndex: 'calibrationDate',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-',
      sorter: (a: any, b: any) => new Date(a.calibrationDate).getTime() - new Date(b.calibrationDate).getTime(),
      defaultSortOrder: 'descend' as const
    },
    { 
      title: 'Due Date', 
      dataIndex: 'nextDueDate',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-',
      sorter: (a: any, b: any) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
    },
    { 
      title: 'Result', 
      dataIndex: 'result',
      render: (r: string) => (
        <Tag color={r === 'PASS' ? 'green' : r === 'FAIL' ? 'red' : 'orange'}>
          {r || 'PENDING'}
        </Tag>
      ),
      filters: [
        { text: 'Pass', value: 'PASS' },
        { text: 'Fail', value: 'FAIL' },
        { text: 'Pending', value: 'PENDING' }
      ],
      onFilter: (value: any, record: any) => record.result === value
    },
    { title: 'Performed By', dataIndex: 'performedBy' },
    {
      title: 'Actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="text" icon={<Eye className="w-4 h-4" />} onClick={() => setSelectedEvent(record)} />
          <Button type="text" icon={<Download className="w-4 h-4" />} onClick={() => window.open(`/api/calibration/certificate/${record.id}`, '_blank')} />
        </Space>
      )
    }
  ];

  // Apply filters
  const filteredEvents = events.filter(e => {
    if (filterInstallation && e.instrument?.installationId !== filterInstallation) return false;
    if (filterType && e.instrument?.type !== filterType) return false;
    if (filterTagNo && !e.instrumentTagId?.toLowerCase().includes(filterTagNo.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button icon={<Home className="w-4 h-4" />} onClick={() => navigate('/')}>
            Main Menu
          </Button>
          <div>
            <h2 className="text-xl font-bold text-white">Calibration Records</h2>
            <p className="text-gray-400 text-sm">Browse all calibration certificates</p>
          </div>
        </div>
        <Button
          icon={<Download className="w-4 h-4" />}
          onClick={async () => {
            try {
              const res = await fetch('/api/calibration/export', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
              if (!res.ok) throw new Error();
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `Calibration_Records_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
              URL.revokeObjectURL(url);
            } catch { alert('Export failed'); }
          }}
        >Export Excel</Button>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700" size="small">
        <Row gutter={16}>
          <Col span={5}>
            <div className="text-xs text-gray-400 mb-1">Installation</div>
            <Select 
              value={filterInstallation} 
              onChange={setFilterInstallation}
              allowClear
              placeholder="All Installations"
              className="w-full"
            >
              {installations.map(i => (
                <Option key={i.id} value={i.id}>{i.installationId}</Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <div className="text-xs text-gray-400 mb-1">Functional Location</div>
            <Select 
              value={filterFL} 
              onChange={setFilterFL}
              allowClear
              placeholder="All FLs"
              className="w-full"
              disabled={!filterInstallation}
            >
              {functionalLocations.map(fl => (
                <Option key={fl.id} value={fl.id}>{fl.tagId} - {fl.name}</Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <div className="text-xs text-gray-400 mb-1">Instrument Type</div>
            <Select 
              value={filterType} 
              onChange={setFilterType}
              allowClear
              placeholder="All Types"
              className="w-full"
            >
              {instrumentTypes.map(t => (
                <Option key={t} value={t}>{t}</Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <div className="text-xs text-gray-400 mb-1">Tag No</div>
            <Input
              placeholder="Search tag..."
              prefix={<Search className="w-3 h-3 text-gray-400" />}
              value={filterTagNo}
              onChange={e => setFilterTagNo(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4} className="flex items-end">
            <Button onClick={() => { setFilterInstallation(''); setFilterFL(''); setFilterType(''); setFilterTagNo(''); }}>
              Clear Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Table
        dataSource={filteredEvents}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ 
          pageSize: 15, 
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`
        }}
        footer={() => (
          <div className="text-gray-400 text-sm">
            Showing <span className="text-white font-bold">{filteredEvents.length}</span> of <span className="text-white font-bold">{events.length}</span> total records
          </div>
        )}
      />

      {/* Detail Modal */}
      <Modal
        open={!!selectedEvent}
        onCancel={() => setSelectedEvent(null)}
        title={<span className="text-white">Certificate: {selectedEvent?.certificateNo}</span>}
        footer={null}
        width={700}
      >
        {selectedEvent && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Instrument">{selectedEvent.instrumentTagId}</Descriptions.Item>
            <Descriptions.Item label="Type">{selectedEvent.instrument?.type}</Descriptions.Item>
            <Descriptions.Item label="Calibration Date">{new Date(selectedEvent.calibrationDate).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="Due Date">{new Date(selectedEvent.nextDueDate).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="Result"><Tag color={selectedEvent.result === 'PASS' ? 'green' : 'red'}>{selectedEvent.result}</Tag></Descriptions.Item>
            <Descriptions.Item label="Status">{selectedEvent.status}</Descriptions.Item>
            <Descriptions.Item label="Performed By">{selectedEvent.performedBy}</Descriptions.Item>
            <Descriptions.Item label="Approved By">{selectedEvent.approvedBy || '-'}</Descriptions.Item>
            <Descriptions.Item label="As Found" span={2}>{selectedEvent.asFound || '-'}</Descriptions.Item>
            <Descriptions.Item label="As Left" span={2}>{selectedEvent.asLeft || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default CalibrationRecords;
