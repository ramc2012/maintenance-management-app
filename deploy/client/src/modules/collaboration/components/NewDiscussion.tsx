import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, message } from 'antd';
import { Save } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

interface Props { onSuccess?: () => void; }

export const NewDiscussion: React.FC<Props> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await axios.post('/api/collaboration/discussions', {
        ...values,
        authorId: 'current-user',
        authorName: 'Current User'
      });
      message.success('Discussion created!');
      window.dispatchEvent(new Event('collaboration:update'));
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      message.error('Failed to create discussion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Start New Discussion</h2>
        <p className="text-gray-400 text-sm">Share your thoughts with the team</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="What would you like to discuss?" />
          </Form.Item>
          
          <Form.Item name="category" label="Category">
            <Select placeholder="Select category">
              <Option value="GENERAL">General</Option>
              <Option value="TECHNICAL">Technical</Option>
              <Option value="SAFETY">Safety</Option>
              <Option value="IDEAS">Ideas</Option>
              <Option value="ANNOUNCEMENT">Announcement</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="content" label="Content" rules={[{ required: true }]}>
            <TextArea rows={6} placeholder="Share your thoughts..." />
          </Form.Item>
          
          <div className="flex justify-end">
            <Button type="primary" htmlType="submit" loading={loading} icon={<Save className="w-4 h-4" />}>
              Post Discussion
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default NewDiscussion;
