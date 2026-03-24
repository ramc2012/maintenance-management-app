import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Tag, Space } from 'antd';
import { Plus, Edit, Trash2, Target } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;

export const StandardsRegistry: React.FC = () => {
  const [standards, setStandards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStandard, setEditingStandard] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchStandards();
  }, []);

  const fetchStandards = async () => {
    try {
      const res = await axios.get('/api/equipment/standards');
      setStandards(res.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        lastCalDate: values.lastCalDate?.toISOString(),
        dueDate: values.dueDate?.toISOString()
      };
      
      if (editingStandard) {
        await axios.put(`/api/equipment/standards/${editingStandard.tagId}`, payload);
        message.success('Standard updated');
      } else {
        await axios.post('/api/equipment/standards', payload);
        message.success('Standard created');
      }
      
      setModalVisible(false);
      form.resetFields();
      setEditingStandard(null);
      fetchStandards();
    } catch (error) {
      message.error('Operation failed');
    }
  };

  const openEdit = (record: any) => {
    setEditingStandard(record);
    form.setFieldsValue({
      ...record,
      lastCalDate: record.lastCalDate ? dayjs(record.lastCalDate) : null,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null
    });
    setModalVisible(true);
  };

  const columns = [
    { 
      title: 'Tag ID', 
      dataIndex: 'tagId', 
      render: (t: string) => <span className="font-mono font-bold text-green-400">{t}</span>
    },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    { 
      title: 'Category', 
      dataIndex: 'category',
      render: (c: string) => <Tag color={c === 'Lab' ? 'purple' : 'cyan'}>{c}</Tag>
    },
    { title: 'Make', dataIndex: 'make' },
    { title: 'Model', dataIndex: 'model' },
    { 
      title: 'Last Cal', 
      dataIndex: 'lastCalDate',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-'
    },
    { 
      title: 'Due Date', 
      dataIndex: 'dueDate',
      render: (d: string) => {
        if (!d) return '-';
        const due = new Date(d);
        const isOverdue = due < new Date();
        return <Tag color={isOverdue ? 'red' : 'green'}>{due.toLocaleDateString()}</Tag>;
      }
    },
    {
      title: 'Actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="text" icon={<Edit className="w-4 h-4" />} onClick={() => openEdit(record)} />
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Calibration Standards Registry
          </h2>
          <p className="text-gray-400 text-sm">Reference standards for instrument calibration</p>
        </div>
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingStandard(null); form.resetFields(); setModalVisible(true); }}>
          Add Standard
        </Button>
      </div>

      <Table
        dataSource={standards}
        columns={columns}
        rowKey="tagId"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        open={modalVisible}
        onCancel={() => { setModalVisible(false); setEditingStandard(null); form.resetFields(); }}
        title={editingStandard ? 'Edit Standard' : 'Add New Standard'}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="tagId" label="Tag ID" rules={[{ required: true }]}>
              <Input disabled={!!editingStandard} />
            </Form.Item>
            <Form.Item name="category" label="Category" rules={[{ required: true }]}>
              <Select>
                <Option value="Lab">Lab Standard</Option>
                <Option value="Field">Field Standard</Option>
              </Select>
            </Form.Item>
            <Form.Item name="description" label="Description" className="col-span-2" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="make" label="Make">
              <Input />
            </Form.Item>
            <Form.Item name="model" label="Model">
              <Input />
            </Form.Item>
            <Form.Item name="lastCalDate" label="Last Calibration Date">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="dueDate" label="Next Due Date">
              <DatePicker className="w-full" />
            </Form.Item>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default StandardsRegistry;
