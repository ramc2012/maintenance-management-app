import React, { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Button, Card, InputNumber, message, Row, Col } from 'antd';
import { Save } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

export const TrainingEntry: React.FC = () => {
  const [form] = Form.useForm();
  const [installations, setInstallations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/equipment/installations');
      setInstallations(res.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        startDate: values.dateRange?.[0]?.toISOString(),
        endDate: values.dateRange?.[1]?.toISOString(),
        createdBy: values.employeeName
      };
      
      await axios.post('/api/training', payload);
      message.success('Training record saved!');
      form.resetFields();
    } catch (error) {
      message.error('Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Record Training Attended</h2>
        <p className="text-gray-400 text-sm">Document training you have undergone</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* Person Details */}
          <div className="mb-4 pb-4 border-b border-gray-700">
            <h3 className="text-white font-semibold mb-3">Attendee Details</h3>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="employeeName" label="Employee Name" rules={[{ required: true }]}>
                  <Input placeholder="Your full name" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="employeeId" label="Employee ID" rules={[{ required: true }]}>
                  <Input placeholder="e.g., EMP-12345" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="department" label="Department">
                  <Select placeholder="Select">
                    <Option value="Mechanical">Mechanical</Option>
                    <Option value="Electrical">Electrical</Option>
                    <Option value="Instrumentation">Instrumentation</Option>
                    <Option value="Production">Production</Option>
                    <Option value="HSE">HSE</Option>
                    <Option value="Admin">Admin</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Training Details */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="Training Title" rules={[{ required: true }]}>
                <Input placeholder="e.g., Fire Safety Training" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trainingType" label="Type" rules={[{ required: true }]}>
                <Select placeholder="Select type">
                  <Option value="SAFETY">Safety</Option>
                  <Option value="TECHNICAL">Technical</Option>
                  <Option value="HSE">HSE</Option>
                  <Option value="SOFT_SKILLS">Soft Skills</Option>
                  <Option value="INDUCTION">Induction</Option>
                  <Option value="CERTIFICATION">Certification</Option>
                  <Option value="REFRESHER">Refresher</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="installationId" label="Installation" rules={[{ required: true }]}>
                <Select showSearch placeholder="Select installation" optionFilterProp="children">
                  {installations.map(i => (
                    <Option key={i.id} value={i.id}>{i.installationId}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dateRange" label="Training Dates" rules={[{ required: true }]}>
                <RangePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="duration" label="Duration">
                <Input placeholder="e.g., 2 days, 4 hours" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="venue" label="Venue">
                <Input placeholder="Training location" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="trainerName" label="Trainer/Institution">
                <Input placeholder="Name of trainer or institution" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="certificateNo" label="Certificate No">
                <Input placeholder="If certificate issued" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="description" label="Key Learnings / Topics Covered">
            <TextArea rows={3} placeholder="Describe what you learned in this training" />
          </Form.Item>
          
          <div className="flex justify-end">
            <Button type="primary" htmlType="submit" loading={loading} icon={<Save className="w-4 h-4" />}>
              Save Training Record
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default TrainingEntry;
