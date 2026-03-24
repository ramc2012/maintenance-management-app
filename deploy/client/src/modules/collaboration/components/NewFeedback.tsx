import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, message } from 'antd';
import { Save } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

interface Props { onSuccess?: () => void; }

export const NewFeedback: React.FC<Props> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await axios.post('/api/collaboration/feedback', {
        ...values,
        authorId: 'current-user',
        authorName: 'Current User'
      });
      message.success('Feedback submitted!');
      window.dispatchEvent(new Event('collaboration:update'));
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      message.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Submit Idea or Feedback</h2>
        <p className="text-gray-400 text-sm">Help us improve - share your suggestions</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Short summary of your idea" />
          </Form.Item>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="category" label="Category" rules={[{ required: true }]}>
              <Select placeholder="Select category">
                <Option value="FEATURE">New Feature</Option>
                <Option value="IMPROVEMENT">Improvement</Option>
                <Option value="BUG">Bug Report</Option>
                <Option value="PROCESS">Process Change</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="priority" label="Priority" initialValue="NORMAL">
              <Select>
                <Option value="LOW">Low</Option>
                <Option value="NORMAL">Normal</Option>
                <Option value="HIGH">High</Option>
              </Select>
            </Form.Item>
          </div>
          
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <TextArea rows={6} placeholder="Describe your idea in detail..." />
          </Form.Item>
          
          <div className="flex justify-end">
            <Button type="primary" htmlType="submit" loading={loading} icon={<Save className="w-4 h-4" />}>
              Submit Feedback
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default NewFeedback;
