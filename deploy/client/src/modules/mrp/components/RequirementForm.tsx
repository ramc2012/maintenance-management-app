import React, { useState, useEffect } from 'react';
import { Form, Input, Select, InputNumber, Button, Table, Upload, message, Card, Divider, Row, Col, Tag, Space, Popconfirm } from 'antd';
import { Plus, Save, Download, Trash2, Upload as UploadIcon, File } from 'lucide-react';

const { Option } = Select;
const { TextArea } = Input;

interface RequirementFormProps {
  editData?: any;
  onComplete: () => void;
}

const categories = [
  { id: 'STORES', label: 'Stores', color: 'blue' },
  { id: 'SPARES', label: 'Spares', color: 'green' },
  { id: 'CAPITAL', label: 'Capital', color: 'purple' },
  { id: 'SERVICE', label: 'Service', color: 'orange' }
];

const getCurrentFY = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${(year + 1).toString().slice(-2)}`;
};

export const RequirementForm: React.FC<RequirementFormProps> = ({ editData, onComplete }) => {
  const [form] = Form.useForm();
  const [items, setItems] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemForm] = Form.useForm();

  useEffect(() => {
    if (editData) {
      form.setFieldsValue(editData);
      setItems(editData.items || []);
      setFiles(editData.files || []);
    } else {
      form.setFieldsValue({ financialYear: getCurrentFY() });
    }
  }, [editData]);

  const addItem = () => {
    itemForm.validateFields().then(values => {
      const newItem = { 
        ...values, 
        id: Date.now().toString(),
        total: (values.quantity || 0) * (values.unitPrice || 0)
      };
      setItems([...items, newItem]);
      itemForm.resetFields();
    });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleFileUpload = (info: any) => {
    if (info.file.originFileObj) {
      const newFile = {
        id: Date.now().toString(),
        name: info.file.name,
        type: info.file.type || 'application/octet-stream',
        size: info.file.size
      };
      setFiles([...files, newFile]);
      message.success(`${info.file.name} uploaded`);
    }
    return false;
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const saveDraft = () => {
    const values = form.getFieldsValue();
    const draft = {
      ...values,
      items,
      files: files.map(f => ({ id: f.id, name: f.name, type: f.type })),
      savedAt: new Date().toISOString(),
      id: editData?.id || Date.now().toString()
    };
    
    const drafts = JSON.parse(localStorage.getItem('mrpDrafts') || '[]');
    const existing = drafts.findIndex((d: any) => d.id === draft.id);
    if (existing >= 0) drafts[existing] = draft;
    else drafts.push(draft);
    localStorage.setItem('mrpDrafts', JSON.stringify(drafts));
    message.success('Draft saved!');
  };

  const exportToCSV = () => {
    const values = form.getFieldsValue();
    let csv = 'Material Requirement - ' + (values.vendorName || 'Unknown') + '\n';
    csv += 'Financial Year,' + (values.financialYear || getCurrentFY()) + '\n';
    csv += 'Category,' + (values.category || '') + '\n';
    csv += 'Department,' + (values.department || '') + '\n';
    csv += 'Vendor,' + (values.vendorName || '') + '\n\n';
    csv += 'Mat Code,Description,HSN Code,Qty,Unit,Y-1,Y-2,Y-3,Delivery Period,Unit Price,Total\n';
    
    items.forEach((item) => {
      csv += `"${item.matCode || ''}","${item.description}","${item.hsnCode || ''}",${item.quantity},"${item.unit}",${item.y1 || 0},${item.y2 || 0},${item.y3 || 0},"${item.deliveryPeriod || ''}",${item.unitPrice},${item.total}\n`;
    });
    
    csv += '\nGrand Total,,,,,,,,,,' + items.reduce((sum, i) => sum + (i.total || 0), 0);
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MRP_${values.vendorName || 'export'}_${values.financialYear || getCurrentFY()}.csv`;
    a.click();
    message.success('Exported to CSV');
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const requirement = {
        ...values,
        items,
        totalValue: items.reduce((sum, i) => sum + (i.total || 0), 0),
        status: 'PENDING',
        financialYear: values.financialYear || getCurrentFY(),
        createdAt: new Date().toISOString()
      };
      
      const requirements = JSON.parse(localStorage.getItem('mrpRequirements') || '[]');
      if (editData?.id) {
        const idx = requirements.findIndex((r: any) => r.id === editData.id);
        if (idx >= 0) requirements[idx] = { ...requirement, id: editData.id };
        else requirements.push({ ...requirement, id: Date.now().toString() });
      } else {
        requirements.push({ ...requirement, id: Date.now().toString() });
      }
      localStorage.setItem('mrpRequirements', JSON.stringify(requirements));
      
      message.success('Requirement saved!');
      onComplete();
    } catch (error) {
      message.error('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const itemColumns = [
    { title: 'Mat Code', dataIndex: 'matCode', width: 90 },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    { title: 'HSN', dataIndex: 'hsnCode', width: 80 },
    { title: 'Qty', dataIndex: 'quantity', width: 60 },
    { title: 'Unit', dataIndex: 'unit', width: 50 },
    { title: 'Y-1', dataIndex: 'y1', width: 50 },
    { title: 'Y-2', dataIndex: 'y2', width: 50 },
    { title: 'Y-3', dataIndex: 'y3', width: 50 },
    { title: 'Delivery', dataIndex: 'deliveryPeriod', width: 80 },
    { title: 'Price', dataIndex: 'unitPrice', render: (v: number) => `₹${(v || 0).toLocaleString()}`, width: 80 },
    { title: 'Total', dataIndex: 'total', render: (v: number) => `₹${(v || 0).toLocaleString()}`, width: 90 },
    { title: '', dataIndex: 'id', width: 40, render: (id: string) => (
      <Button type="text" danger size="small" icon={<Trash2 className="w-3 h-3" />} onClick={() => removeItem(id)} />
    )}
  ];

  const grandTotal = items.reduce((sum, i) => sum + (i.total || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
        <h3 className="font-bold text-lg dark:text-white">{editData ? 'Edit Requirement' : 'New Material Requirement'}</h3>
        <Space>
          <Button icon={<Save className="w-4 h-4" />} onClick={saveDraft}>Save Draft</Button>
          <Button icon={<Download className="w-4 h-4" />} onClick={exportToCSV}>Export CSV</Button>
        </Space>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={12}>
            <Card title="Vendor & Category" size="small">
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="financialYear" label="Financial Year" initialValue={getCurrentFY()}>
                    <Select>
                      <Option value="2024-25">2024-25</Option>
                      <Option value="2025-26">2025-26</Option>
                      <Option value="2026-27">2026-27</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                    <Select placeholder="Select">{categories.map(c => <Option key={c.id} value={c.id}><Tag color={c.color}>{c.label}</Tag></Option>)}</Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="vendorName" label="Vendor Name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="vendorContact" label="Contact"><Input /></Form.Item>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Requirement Info" size="small">
              <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="department" label="Department">
                <Select placeholder="Select"><Option value="Mechanical">Mechanical</Option><Option value="Electrical">Electrical</Option><Option value="Instrumentation">Instrumentation</Option><Option value="Production">Production</Option></Select>
              </Form.Item>
              <Form.Item name="priority" label="Priority">
                <Select placeholder="Priority"><Option value="LOW">Low</Option><Option value="MEDIUM">Medium</Option><Option value="HIGH">High</Option><Option value="URGENT">Urgent</Option></Select>
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Card title="Line Items" size="small" className="mt-4">
          <Form form={itemForm} layout="inline" className="flex flex-wrap gap-2 mb-4">
            <Form.Item name="matCode" className="mb-1"><Input placeholder="Mat Code" style={{ width: 90 }} /></Form.Item>
            <Form.Item name="description" className="mb-1" rules={[{ required: true }]}><Input placeholder="Description" style={{ width: 180 }} /></Form.Item>
            <Form.Item name="hsnCode" className="mb-1"><Input placeholder="HSN" style={{ width: 80 }} /></Form.Item>
            <Form.Item name="quantity" className="mb-1"><InputNumber placeholder="Qty" min={1} style={{ width: 70 }} /></Form.Item>
            <Form.Item name="unit" className="mb-1" initialValue="Nos"><Select style={{ width: 70 }}><Option value="Nos">Nos</Option><Option value="Kg">Kg</Option><Option value="Ltr">Ltr</Option><Option value="Mtr">Mtr</Option><Option value="Set">Set</Option></Select></Form.Item>
            <Form.Item name="y1" className="mb-1"><InputNumber placeholder="Y-1" style={{ width: 60 }} /></Form.Item>
            <Form.Item name="y2" className="mb-1"><InputNumber placeholder="Y-2" style={{ width: 60 }} /></Form.Item>
            <Form.Item name="y3" className="mb-1"><InputNumber placeholder="Y-3" style={{ width: 60 }} /></Form.Item>
            <Form.Item name="deliveryPeriod" className="mb-1"><Input placeholder="Delivery" style={{ width: 80 }} /></Form.Item>
            <Form.Item name="unitPrice" className="mb-1"><InputNumber placeholder="Price" min={0} style={{ width: 80 }} /></Form.Item>
            <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={addItem}>Add</Button>
          </Form>
          
          <Table dataSource={items} columns={itemColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 900 }}
            footer={() => <div className="flex justify-end text-lg font-bold">Grand Total: ₹{grandTotal.toLocaleString()}</div>} />
        </Card>

        <Card title="Attachments" size="small" className="mt-4">
          <Upload beforeUpload={() => false} onChange={handleFileUpload} showUploadList={false} accept=".pdf,.doc,.docx,.xls,.xlsx">
            <Button icon={<UploadIcon className="w-4 h-4" />}>Upload (PDF, Word, Excel)</Button>
          </Upload>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <File className="w-4 h-4 text-blue-500" /><span className="flex-1 text-sm">{f.name}</span>
                  <Tag>{f.type?.split('/')[1] || 'file'}</Tag>
                  <Button type="text" danger size="small" icon={<Trash2 className="w-3 h-3" />} onClick={() => removeFile(f.id)} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onComplete}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>{editData ? 'Update' : 'Submit Requirement'}</Button>
        </div>
      </Form>
    </div>
  );
};
