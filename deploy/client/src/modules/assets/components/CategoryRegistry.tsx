import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Tag, Card, Statistic, Row, Col, Tabs, Tooltip, Empty } from 'antd';
import { Plus, Edit, Trash2, Search, Database, CheckCircle, XCircle, AlertTriangle, Zap, Cog, Thermometer } from 'lucide-react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { parseDiscipline } from '../../../utils/workspace';

const { Option } = Select;
const { TabPane } = Tabs;

export const CategoryRegistry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const discipline = parseDiscipline(searchParams.get('discipline'));
  const [items, setItems] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('MECHANICAL');
  const [searchText, setSearchText] = useState('');
  const [installationFilter, setInstallationFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form] = Form.useForm();

  const disciplineTab = discipline === 'INSTRUMENTATION' ? 'INSTRUMENT' : discipline;
  const availableTabs = disciplineTab ? [disciplineTab] : ['MECHANICAL', 'ELECTRICAL', 'INSTRUMENT'];

  useEffect(() => {
    if (disciplineTab) {
      setActiveTab(disciplineTab);
      setSearchText('');
      setInstallationFilter(null);
      setStatusFilter(null);
    }
  }, [disciplineTab]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url: string;
      const params: Record<string, string> = {};
      if (discipline) params.discipline = discipline;
      if (activeTab === 'INSTRUMENT') {
        url = '/api/equipment/instruments';
      } else {
        url = `/api/equipment/category/${activeTab}`;
      }
      const res = await axios.get(url, { params });
      setItems(res.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  const fetchInstallations = async () => {
    try {
      const res = await axios.get('/api/equipment/installations');
      setInstallations(res.data || []);
    } catch {}
  };

  useEffect(() => { fetchItems(); }, [activeTab, discipline]);
  useEffect(() => { fetchInstallations(); }, []);

  const installationMap = useMemo(() => {
    const m: Record<string, string> = {};
    installations.forEach((i: any) => { m[i.id] = i.installationId; });
    return m;
  }, [installations]);

  const installationOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      const name = installationMap[i.installationId] || i.installation?.installationId;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [items, installationMap]);

  const getStatus = (item: any): string => {
    const s = (item.specifications?.runningStatus || item.runningStatus || '').trim().toLowerCase();
    if (s === 'working') return 'Working';
    if (s.includes('not working') || s === 'notworking') return 'Not Working';
    if (s.includes('moh') || s === 'under moh') return 'Under MOH';
    if (s.includes('overhauling')) return 'Overhauling';
    if (s === 'unknown' || s === '') return 'Unknown';
    return item.specifications?.runningStatus || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    if (status === 'Working') return 'green';
    if (status === 'Not Working') return 'red';
    if (status === 'Under MOH' || status === 'Overhauling') return 'orange';
    return 'default';
  };

  const filteredItems = items.filter(item => {
    const tag = (item.equipmentTag || item.tagId || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const make = (item.make || item.manufacturer || '').toLowerCase();
    const model = (item.model || item.modelNo || '').toLowerCase();
    const serial = (item.specifications?.serialNo || item.serialNo || '').toLowerCase();
    const search = searchText.toLowerCase();
    const matchesSearch = !search || tag.includes(search) || desc.includes(search) || make.includes(search) || model.includes(search) || serial.includes(search);

    const instName = installationMap[item.installationId] || item.installation?.installationId || '';
    const matchesInstallation = !installationFilter || instName === installationFilter;

    if (activeTab === 'INSTRUMENT') return matchesSearch && matchesInstallation;
    const status = getStatus(item);
    const matchesStatus = !statusFilter || status === statusFilter;
    return matchesSearch && matchesInstallation && matchesStatus;
  });

  const workingCount = items.filter(i => getStatus(i) === 'Working').length;
  const notWorkingCount = items.filter(i => getStatus(i) === 'Not Working').length;
  const mohCount = items.filter(i => ['Under MOH', 'Overhauling'].includes(getStatus(i))).length;

  const handleDelete = async (record: any) => {
    try {
      if (activeTab === 'INSTRUMENT') {
        await axios.delete(`/api/instruments/${record.id || record.tagId}`);
      } else {
        await axios.delete(`/api/equipment/category/${record.equipmentTag || record.id}`);
      }
      message.success('Deleted');
      fetchItems();
    } catch { message.error('Failed to delete'); }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (activeTab === 'INSTRUMENT') {
        if (editingItem) {
          await axios.put(`/api/instruments/${editingItem.id || editingItem.tagId}`, values);
        } else {
          await axios.post('/api/instruments', {
            ...values,
            ...(discipline ? { primaryDiscipline: discipline } : { primaryDiscipline: 'INSTRUMENTATION' }),
          });
        }
      } else {
        const payload = {
          equipmentTag: values.equipmentTag,
          description: values.description,
          make: values.make,
          model: values.model,
          category: activeTab,
          ...(discipline ? { primaryDiscipline: discipline } : {}),
          installationId: values.installationId,
          specifications: {
            serialNo: values.serialNo || '',
            runningStatus: values.runningStatus || 'Working',
            notWorkingReason: values.notWorkingReason || '',
          }
        };
        if (editingItem) {
          await axios.put(`/api/equipment/category/${editingItem.equipmentTag || editingItem.id}`, payload);
        } else {
          await axios.post('/api/equipment/category', payload);
        }
      }
      message.success(editingItem ? 'Updated' : 'Created');
      setModalOpen(false);
      form.resetFields();
      setEditingItem(null);
      fetchItems();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (record: any) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      serialNo: record.specifications?.serialNo || record.serialNo,
      runningStatus: record.specifications?.runningStatus || record.runningStatus,
      notWorkingReason: record.specifications?.notWorkingReason,
    });
    setModalOpen(true);
  };

  const equipmentColumns: any[] = [
    {
      title: 'Installation', width: 130, fixed: 'left' as const,
      render: (_: any, r: any) => {
        const name = installationMap[r.installationId] || r.installation?.installationId || '-';
        return <span className="font-medium text-xs">{name}</span>;
      },
      sorter: (a: any, b: any) => (installationMap[a.installationId] || '').localeCompare(installationMap[b.installationId] || ''),
    },
    {
      title: 'Equipment', dataIndex: 'description', ellipsis: true, width: 200,
      sorter: (a: any, b: any) => (a.description || '').localeCompare(b.description || ''),
    },
    { title: 'Make', render: (_: any, r: any) => r.make || r.manufacturer || '-', width: 160, ellipsis: true },
    { title: 'Model', render: (_: any, r: any) => r.model || r.modelNo || '-', width: 140, ellipsis: true },
    {
      title: 'Serial No', width: 130,
      render: (_: any, r: any) => <span className="text-xs font-mono">{r.specifications?.serialNo || r.serialNo || '-'}</span>,
    },
    {
      title: 'Status', width: 120,
      render: (_: any, r: any) => {
        const status = getStatus(r);
        return <Tag color={getStatusColor(status)}>{status}</Tag>;
      },
      sorter: (a: any, b: any) => getStatus(a).localeCompare(getStatus(b)),
      filters: [
        { text: 'Working', value: 'Working' },
        { text: 'Not Working', value: 'Not Working' },
        { text: 'Under MOH', value: 'Under MOH' },
      ],
      onFilter: (value: any, record: any) => getStatus(record) === value,
    },
    {
      title: 'Reason (if not working)', width: 220, ellipsis: true,
      render: (_: any, r: any) => {
        const reason = r.specifications?.notWorkingReason;
        if (!reason || reason.length < 3) return <span className="text-gray-400">-</span>;
        return <Tooltip title={reason}><span className="text-xs text-red-500">{reason}</span></Tooltip>;
      },
    },
    {
      title: '', width: 70, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <div className="flex gap-1">
          <Button size="small" type="text" icon={<Edit className="w-3 h-3" />} onClick={() => handleEdit(record)} />
          <Button size="small" type="text" danger icon={<Trash2 className="w-3 h-3" />} onClick={() => handleDelete(record)} />
        </div>
      )
    }
  ];

  const instrumentColumns: any[] = [
    {
      title: 'Installation', width: 130,
      render: (_: any, r: any) => {
        const name = installationMap[r.installationId] || r.installation?.installationId || '-';
        return <span className="font-medium text-xs">{name}</span>;
      },
    },
    { title: 'Tag ID', dataIndex: 'tagId', width: 130, render: (t: string) => <span className="font-mono font-bold text-blue-600 text-xs">{t}</span> },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    { title: 'Type', dataIndex: 'type', width: 100, render: (t: string) => t ? <Tag color="purple">{t}</Tag> : '-' },
    { title: 'Make', dataIndex: 'make', width: 140, ellipsis: true, render: (t: string, r: any) => t || r.manufacturer || '-' },
    { title: 'Model', dataIndex: 'model', width: 120, ellipsis: true, render: (t: string, r: any) => t || r.modelNo || '-' },
    { title: 'Range', dataIndex: 'range', width: 120 },
    {
      title: '', width: 70,
      render: (_: any, record: any) => (
        <div className="flex gap-1">
          <Button size="small" type="text" icon={<Edit className="w-3 h-3" />} onClick={() => handleEdit(record)} />
          <Button size="small" type="text" danger icon={<Trash2 className="w-3 h-3" />} onClick={() => handleDelete(record)} />
        </div>
      )
    }
  ];

  const tabIcon = activeTab === 'ELECTRICAL' ? <Zap className="w-4 h-4 text-yellow-500" /> : activeTab === 'INSTRUMENT' ? <Thermometer className="w-4 h-4 text-red-500" /> : <Cog className="w-4 h-4 text-blue-500" />;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
        <div className="flex items-center gap-4">
          {tabIcon}
          <div>
            <h2 className="text-lg font-bold dark:text-white">Equipment & Instrument Registry</h2>
            <p className="text-xs text-gray-500">{activeTab === 'MECHANICAL' ? '519 Mechanical equipment from all installations' : activeTab === 'ELECTRICAL' ? 'Electrical equipment registry' : '613 instruments from all installations'}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select placeholder="Installation" allowClear style={{ width: 160 }} onChange={setInstallationFilter} showSearch optionFilterProp="children">
            {installationOptions.map(n => <Option key={n} value={n}>{n}</Option>)}
          </Select>
          {activeTab !== 'INSTRUMENT' && (
            <Select placeholder="Status" allowClear style={{ width: 130 }} onChange={setStatusFilter}>
              <Option value="Working">Working</Option>
              <Option value="Not Working">Not Working</Option>
              <Option value="Under MOH">Under MOH</Option>
              <Option value="Unknown">Unknown</Option>
            </Select>
          )}
          <Input placeholder="Search..." prefix={<Search className="w-4 h-4 text-gray-400" />} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 200 }} />
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingItem(null); form.resetFields(); setModalOpen(true); }}>Add</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={(k) => { setActiveTab(k); setSearchText(''); setInstallationFilter(null); setStatusFilter(null); }} type="card">
        {availableTabs.includes('MECHANICAL') ? <TabPane tab={<span><Cog className="w-3 h-3 inline mr-1" /> Mechanical ({activeTab === 'MECHANICAL' ? items.length : ''})</span>} key="MECHANICAL" /> : null}
        {availableTabs.includes('ELECTRICAL') ? <TabPane tab={<span><Zap className="w-3 h-3 inline mr-1" /> Electrical ({activeTab === 'ELECTRICAL' ? items.length : ''})</span>} key="ELECTRICAL" /> : null}
        {availableTabs.includes('INSTRUMENT') ? <TabPane tab={<span><Thermometer className="w-3 h-3 inline mr-1" /> Instruments ({activeTab === 'INSTRUMENT' ? items.length : ''})</span>} key="INSTRUMENT" /> : null}
      </Tabs>

      {/* Stats */}
      {activeTab !== 'INSTRUMENT' ? (
        <Row gutter={16}>
          <Col span={6}><Card size="small"><Statistic title={`Total ${activeTab === 'MECHANICAL' ? 'Mechanical' : 'Electrical'}`} value={items.length} prefix={<Database className="w-4 h-4 text-blue-500 inline" />} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Working" value={workingCount} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircle className="w-4 h-4 inline" />} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Not Working" value={notWorkingCount} valueStyle={{ color: '#ff4d4f' }} prefix={<XCircle className="w-4 h-4 inline" />} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Under MOH / Overhaul" value={mohCount} valueStyle={{ color: '#fa8c16' }} prefix={<AlertTriangle className="w-4 h-4 inline" />} /></Card></Col>
        </Row>
      ) : (
        <Row gutter={16}>
          <Col span={8}><Card size="small"><Statistic title="Total Instruments" value={items.length} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Showing" value={filteredItems.length} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Installations" value={installationOptions.length} /></Card></Col>
        </Row>
      )}

      {/* Table */}
      {activeTab === 'ELECTRICAL' && items.length === 0 && !loading ? (
        <Card>
          <Empty description="No electrical equipment added yet. Data will be provided separately." />
        </Card>
      ) : (
        <Table
          dataSource={filteredItems}
          columns={activeTab === 'INSTRUMENT' ? instrumentColumns : equipmentColumns}
          rowKey={activeTab === 'INSTRUMENT' ? (r => r.tagId || r.id) : (r => r.equipmentTag || r.id)}
          loading={loading}
          size="small"
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={editingItem ? 'Edit Record' : `Add ${activeTab === 'INSTRUMENT' ? 'Instrument' : activeTab === 'ELECTRICAL' ? 'Electrical Equipment' : 'Mechanical Equipment'}`}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingItem(null); form.resetFields(); }}
        onOk={form.submit}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {activeTab === 'INSTRUMENT' ? (
            <>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="tagId" label="Tag ID" rules={[{ required: true }]}><Input disabled={!!editingItem} /></Form.Item></Col>
                <Col span={12}>
                  <Form.Item name="installationId" label="Installation">
                    <Select placeholder="Select installation" showSearch optionFilterProp="children" allowClear>
                      {installations.map((inst: any) => <Option key={inst.id} value={inst.id}>{inst.installationId}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input /></Form.Item>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="type" label="Type"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="make" label="Make"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="model" label="Model"><Input /></Form.Item></Col>
              </Row>
              <Form.Item name="range" label="Range"><Input /></Form.Item>
            </>
          ) : (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="equipmentTag" label="Equipment Tag" rules={[{ required: true }]}>
                    <Input placeholder="e.g., ANK-GGS-2-ODP1-PUMP" disabled={!!editingItem} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="installationId" label="Installation" rules={[{ required: true }]}>
                    <Select placeholder="Select installation" showSearch optionFilterProp="children">
                      {installations.map((inst: any) => <Option key={inst.id} value={inst.id}>{inst.installationId}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="Equipment Name / Description" rules={[{ required: true }]}>
                <Input placeholder="e.g., ODP-1 Pump, Gas Compressor #A" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="make" label="Make"><Input placeholder="Manufacturer" /></Form.Item></Col>
                <Col span={8}><Form.Item name="model" label="Model"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="serialNo" label="Serial No"><Input /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="runningStatus" label="Running Status" initialValue="Working">
                    <Select>
                      <Option value="Working">Working</Option>
                      <Option value="Not working">Not Working</Option>
                      <Option value="Under MOH">Under MOH</Option>
                      <Option value="Overhauling">Overhauling</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="notWorkingReason" label="Reason (if not working)">
                    <Input.TextArea rows={1} placeholder="Reason for not working" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};
