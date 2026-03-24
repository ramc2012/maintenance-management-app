import React, { useState } from 'react';
import { Form, Input, Select, DatePicker, Button, Card, InputNumber, message } from 'antd';
import { Save } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

export const NewJob: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        requestDate: values.requestDate?.toISOString() || new Date().toISOString(),
        createdBy: 'SYSTEM'
      };
      await axios.post('/api/workshop', payload);
      message.success('Job created successfully!');
      form.resetFields();
    } catch (error) {
      message.error('Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Create New Workshop Job</h2>
        <p className="text-gray-400 text-sm">Submit a new job request to the workshop</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="shopType" label="Shop" rules={[{ required: true }]}>
              <Select placeholder="Select shop">
                <Option value="FABRICATION">Fabrication Shop</Option>
                <Option value="DIESEL">Diesel Shop</Option>
                <Option value="MACHINE">Machine Shop</Option>
                <Option value="ELECTRICAL">Electrical Shop</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="title" label="Job Title" rules={[{ required: true }]}>
              <Input placeholder="Brief description of the work" />
            </Form.Item>
            
            <Form.Item name="requestedBy" label="Requested By" rules={[{ required: true }]}>
              <Input placeholder="Name / Department" />
            </Form.Item>
            
            <Form.Item name="priority" label="Priority" initialValue="NORMAL">
              <Select>
                <Option value="LOW">Low</Option>
                <Option value="NORMAL">Normal</Option>
                <Option value="HIGH">High</Option>
                <Option value="URGENT">Urgent</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="requestDate" label="Request Date">
              <DatePicker className="w-full" />
            </Form.Item>
            
            <Form.Item name="equipmentTag" label="Equipment / Tag No">
              <Input placeholder="Equipment identifier" />
            </Form.Item>
            
            <Form.Item name="estimatedHours" label="Estimated Hours">
              <InputNumber className="w-full" min={0} step={0.5} />
            </Form.Item>
            
            <Form.Item name="workOrderRef" label="Work Order Reference">
              <Input placeholder="WO number if applicable" />
            </Form.Item>
          </div>
          
          <Form.Item name="description" label="Detailed Description">
            <TextArea rows={4} placeholder="Describe the work required in detail" />
          </Form.Item>
          
          <div className="flex justify-end">
            <Button type="primary" htmlType="submit" loading={loading} icon={<Save className="w-4 h-4" />}>
              Submit Job Request
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default NewJob;
