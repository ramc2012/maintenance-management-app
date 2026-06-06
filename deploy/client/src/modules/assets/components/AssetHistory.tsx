import React, { useState, useEffect } from 'react';
import { Timeline, Select, Card, Empty, Tag, Row, Col, Statistic, Spin, Table } from 'antd';
import { Search, History, RotateCcw, Activity } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;

interface AssetHistoryProps {
  initialTag?: string | null;
  discipline?: 'MECHANICAL' | 'ELECTRICAL' | 'INSTRUMENTATION';
}

export const AssetHistory: React.FC<AssetHistoryProps> = ({ initialTag, discipline }) => {
  const [tagId, setTagId] = useState('');
  const [instruments, setInstruments] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [replacements, setReplacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'instrument' | 'equipment'>('instrument');

  useEffect(() => {
    const params = discipline ? { discipline } : undefined;
    axios.get('/api/equipment/instruments', { params }).then(res => setInstruments(res.data || [])).catch(() => {});
    axios.get('/api/equipment/running-equip', { params }).then(res => setEquipment(res.data || [])).catch(() => {});
    if (discipline === 'INSTRUMENTATION') setSearchType('instrument');
    if (discipline === 'MECHANICAL' || discipline === 'ELECTRICAL') setSearchType('equipment');
  }, [discipline]);

  // Auto-select if initialTag is provided
  useEffect(() => {
    if (initialTag && !tagId) {
      setSearchType('equipment');
      handleSelect(initialTag);
    }
  }, [initialTag, equipment]);

  const handleSelect = async (val: string) => {
    setTagId(val);
    setLoading(true);
    try {
      const [logRes, repRes] = await Promise.all([
        axios.get(`/api/equipment/logs/${val}`).catch(() => ({ data: [] })),
        axios.get(`/api/equipment/replacements/${val}`).catch(() => ({ data: [] }))
      ]);
      setLogs(logRes.data || []);
      setReplacements(repRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const calColumns = [
    { title: 'Date', dataIndex: 'currentCalDate', render: (d: string) => d ? dayjs(d).format('DD-MMM-YYYY') : '-', width: 120 },
    { title: 'Result', dataIndex: 'result', render: (r: string) => <Tag color={r === 'PASS' ? 'green' : 'red'}>{r}</Tag>, width: 80 },
    { title: 'Performed By', dataIndex: 'performedBy', width: 150 },
    { title: 'Remarks', dataIndex: 'remarks', ellipsis: true },
  ];

  const repColumns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => d ? dayjs(d).format('DD-MMM-YYYY') : '-', width: 120 },
    { title: 'Replaced By', dataIndex: 'replacedBy', width: 150 },
    { title: 'New Serial No', dataIndex: 'newSerialNo', width: 150 },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Equipment / Instrument History</h1>
        <p className="text-gray-400">View calibration logs, replacement records, and maintenance history</p>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
          <Select value={searchType} onChange={v => { setSearchType(v); setTagId(''); setLogs([]); setReplacements([]); }} style={{ width: 160 }}>
            <Option value="instrument">Instrument</Option>
            <Option value="equipment">Equipment</Option>
          </Select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-400 mb-1">
            {searchType === 'instrument' ? 'Select Instrument' : 'Select Equipment'}
          </label>
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder={searchType === 'instrument' ? 'Search by Tag ID or Description' : 'Search Equipment Tag'}
            onChange={handleSelect}
            optionFilterProp="children"
            value={tagId || undefined}
          >
            {searchType === 'instrument'
              ? instruments.map((i: any) => (
                  <Option key={i.tagId} value={i.tagId}>{i.tagId} - {i.description}</Option>
                ))
              : equipment.map((e: any) => (
                  <Option key={e.equipmentTag} value={e.equipmentTag}>{e.equipmentTag} - {e.description}</Option>
                ))
            }
          </Select>
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Spin size="large" /></div>}

      {tagId && !loading && (
        <>
          <Row gutter={16}>
            <Col span={8}>
              <Card className="bg-gray-800 border-gray-700">
                <Statistic title={<span className="text-gray-400">Selected Tag</span>} value={tagId} valueStyle={{ color: '#60a5fa', fontSize: 16, fontFamily: 'monospace' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="bg-gray-800 border-gray-700">
                <Statistic title={<span className="text-gray-400">Calibration Records</span>} value={logs.length} prefix={<History className="w-4 h-4 text-green-400" />} valueStyle={{ color: '#4ade80' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="bg-gray-800 border-gray-700">
                <Statistic title={<span className="text-gray-400">Replacements</span>} value={replacements.length} prefix={<RotateCcw className="w-4 h-4 text-yellow-400" />} valueStyle={{ color: '#facc15' }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Card
                title={<span className="flex items-center gap-2 text-green-400"><History className="w-4 h-4" /> Calibration History</span>}
                className="bg-gray-800 border-gray-700"
                headStyle={{ borderBottom: '1px solid #374151' }}
              >
                {logs.length > 0 ? (
                  <Table dataSource={logs} columns={calColumns} rowKey={(r, i) => `cal-${i}`} size="small" pagination={{ pageSize: 10 }} />
                ) : (
                  <Empty description={<span className="text-gray-500">No calibration records</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card
                title={<span className="flex items-center gap-2 text-yellow-400"><RotateCcw className="w-4 h-4" /> Replacement History</span>}
                className="bg-gray-800 border-gray-700"
                headStyle={{ borderBottom: '1px solid #374151' }}
              >
                {replacements.length > 0 ? (
                  <Table dataSource={replacements} columns={repColumns} rowKey={(r, i) => `rep-${i}`} size="small" pagination={{ pageSize: 10 }} />
                ) : (
                  <Empty description={<span className="text-gray-500">No replacement records</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}

      {!tagId && !loading && (
        <div className="text-center py-20">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-400">Select an Instrument or Equipment</h3>
          <p className="text-gray-500 mt-2">Choose from the dropdown above to view its complete history</p>
        </div>
      )}
    </div>
  );
};
