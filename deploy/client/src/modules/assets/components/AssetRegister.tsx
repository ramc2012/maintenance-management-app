import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, message, Tabs, InputNumber, Card, Row, Col } from 'antd';
import { Plus, Pencil, Package, ArrowRightLeft } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;
const { TabPane } = Tabs;

const ASSET_CLASSES = ['MOTOR', 'PUMP', 'COMPRESSOR', 'GENERATOR', 'INSTRUMENT', 'VALVE', 'VESSEL', 'HEAT_EXCHANGER'];
const STATUS_OPTIONS = ['IN_STORE', 'INSTALLED', 'REPAIR', 'SCRAPPED'];

export const AssetRegister: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [specTemplates, setSpecTemplates] = useState<any>({});
  
  const [form] = Form.useForm();
  const [specForm] = Form.useForm();

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (classFilter) params.append('assetClass', classFilter);
      const res = await axios.get(`/api/assets?${params.toString()}`);
      setAssets(res.data);
    } catch (error) {
      message.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/api/assets/templates');
      setSpecTemplates(res.data);
    } catch (error) {
      console.error('Templates load error');
    }
  };

  useEffect(() => { fetchAssets(); fetchTemplates(); }, [statusFilter, classFilter]);

  const handleClassChange = (assetClass: string) => {
    form.setFieldsValue({ assetClass });
    if (specTemplates[assetClass]) {
      specForm.setFieldsValue(specTemplates[assetClass]);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const specs = specForm.getFieldsValue();
      const data = { ...values, specifications: specs };
      
      if (editMode && selectedAsset) {
        await axios.put(`/api/assets/${selectedAsset.id}`, data);
        message.success('Asset updated');
      } else {
        await axios.post('/api/assets', data);
        message.success('Asset created');
      }
      
      setModalOpen(false);
      setEditMode(false);
      setSelectedAsset(null);
      form.resetFields();
      specForm.resetFields();
      fetchAssets();
    } catch (error) {
      message.error('Failed to save asset');
    }
  };

  const openEdit = (asset: any) => {
    setEditMode(true);
    setSelectedAsset(asset);
    form.setFieldsValue(asset);
    if (asset.specifications) {
      specForm.setFieldsValue(asset.specifications);
    }
    setModalOpen(true);
  };

  const columns = [
    { title: 'Asset Code', dataIndex: 'assetCode', key: 'assetCode', render: (t: string) => <span className="font-mono font-bold text-blue-600">{t}</span> },
    { title: 'Class', dataIndex: 'assetClass', key: 'assetClass', render: (t: string) => <Tag color="purple">{t}</Tag> },
    { title: 'Manufacturer', dataIndex: 'manufacturer', key: 'manufacturer', render: (t: string) => t || '-' },
    { title: 'Model', dataIndex: 'model', key: 'model', render: (t: string) => t || '-' },
    { title: 'Serial No', dataIndex: 'serialNumber', key: 'serialNumber', render: (t: string) => t || '-' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      render: (s: string) => (
        <Tag color={s === 'INSTALLED' ? 'green' : s === 'IN_STORE' ? 'blue' : s === 'REPAIR' ? 'orange' : 'red'}>
          {s}
        </Tag>
      ) 
    },
    {
      title: 'Current Location',
      key: 'location',
      render: (_: any, r: any) => {
        const install = r.installations?.[0];
        if (install && !install.removalDate) {
          return <span className="text-xs">{install.functionalLocation?.flId}</span>;
        }
        return <span className="text-gray-400">-</span>;
      }
    },
    { 
      title: 'Actions', 
      key: 'actions',
      render: (_: any, r: any) => (
        <Button size="small" type="text" icon={<Pencil className="w-3 h-3 text-blue-500" />} onClick={() => openEdit(r)} />
      ) 
    }
  ];

  const renderSpecFields = () => {
    const assetClass = form.getFieldValue('assetClass');
    const template = specTemplates[assetClass];
    
    if (!template) return null;
    
    return (
      <Card size="small" title="Specifications" className="mt-4">
        <Form form={specForm} layout="vertical">
          <Row gutter={16}>
            {Object.keys(template).filter(k => k !== 'type').map((key) => (
              <Col span={8} key={key}>
                <Form.Item name={key} label={key.replace(/_/g, ' ').toUpperCase()}>
                  <InputNumber style={{ width: '100%' }} placeholder={`Enter ${key}`} />
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Form>
      </Card>
    );
  };

  const statusCounts = {
    total: assets.length,
    installed: assets.filter(a => a.status === 'INSTALLED').length,
    inStore: assets.filter(a => a.status === 'IN_STORE').length,
    repair: assets.filter(a => a.status === 'REPAIR').length
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
        <div className="flex items-center gap-4">
          <Package className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold dark:text-white">Asset Register</h2>
        </div>
        <div className="flex gap-2">
          <Select placeholder="Status" allowClear style={{ width: 150 }} onChange={setStatusFilter}>
            {STATUS_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
          <Select placeholder="Class" allowClear style={{ width: 150 }} onChange={setClassFilter}>
            {ASSET_CLASSES.map(c => <Option key={c} value={c}>{c}</Option>)}
          </Select>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => {
            setEditMode(false);
            setSelectedAsset(null);
            form.resetFields();
            specForm.resetFields();
            setModalOpen(true);
          }}>
            Add Asset
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small" className="bg-blue-50 dark:bg-blue-900/20">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.total}</div>
            <div className="text-xs text-gray-500">Total Assets</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="bg-green-50 dark:bg-green-900/20">
            <div className="text-2xl font-bold text-green-600">{statusCounts.installed}</div>
            <div className="text-xs text-gray-500">Installed</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="bg-gray-50 dark:bg-gray-700">
            <div className="text-2xl font-bold text-gray-600">{statusCounts.inStore}</div>
            <div className="text-xs text-gray-500">In Store</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="bg-orange-50 dark:bg-orange-900/20">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.repair}</div>
            <div className="text-xs text-gray-500">Under Repair</div>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Table
        dataSource={assets}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        className="dark-table"
        pagination={{ pageSize: 15 }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editMode ? 'Edit Asset' : 'Add New Asset'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); specForm.resetFields(); }}
        onOk={form.submit}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="assetCode" label="Asset Code" rules={[{ required: true }]}>
                <Input placeholder="e.g., MTR-001" disabled={editMode} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="assetClass" label="Asset Class" rules={[{ required: true }]}>
                <Select onChange={handleClassChange}>
                  {ASSET_CLASSES.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Status" initialValue="IN_STORE">
                <Select disabled={editMode && selectedAsset?.status === 'INSTALLED'}>
                  {STATUS_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="manufacturer" label="Manufacturer">
                <Input placeholder="e.g., ABB" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="model" label="Model">
                <Input placeholder="e.g., M3BP 280SMA" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="serialNumber" label="Serial Number">
                <Input placeholder="e.g., SN123456" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="modelYear" label="Model Year">
            <InputNumber style={{ width: '100%' }} placeholder="e.g., 2023" />
          </Form.Item>
        </Form>
        
        {renderSpecFields()}
      </Modal>
    </div>
  );
};
