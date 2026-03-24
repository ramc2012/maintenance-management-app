import React, { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Button, Card, InputNumber, message } from 'antd';
import { Save, Link2 } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

export const InitiateMOH: React.FC = () => {
  const [form] = Form.useForm();
  const [installations, setInstallations] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState<string>('');

  useEffect(() => { fetchInstallations(); }, []);
  useEffect(() => { if (selectedInstallation) fetchEquipment(); }, [selectedInstallation]);

  const fetchInstallations = async () => {
    try {
      const res = await axios.get('/api/equipment/installations');
      setInstallations(res.data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchEquipment = async () => {
    try {
      const res = await axios.get('/api/fl-assets', { 
        params: { installationId: selectedInstallation }
      });
      setEquipment(res.data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const handleInstallationChange = (value: string) => {
    setSelectedInstallation(value);
    form.setFieldsValue({ 
      equipmentTag: undefined, 
      equipmentName: undefined,
      currentRunHours: undefined,
      dCheckInterval: undefined
    });
    setEquipment([]);
  };

  const handleEquipmentChange = (tagNumber: string) => {
    const selected = equipment.find(e => e.tagNumber === tagNumber);
    if (selected) {
      form.setFieldsValue({
        equipmentName: selected.name,
        currentRunHours: selected.runningHours,
        dCheckInterval: selected.dCheckInterval
      });
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        lastMOHDate: values.lastMOHDate?.toISOString(),
        plannedStartDate: values.plannedStartDate?.toISOString(),
        createdBy: 'SYSTEM'
      };
      await axios.post('/api/moh', payload);
      message.success('MOH initiated successfully!');
      form.resetFields();
      setSelectedInstallation('');
      setEquipment([]);
    } catch (error) {
      message.error('Failed to initiate MOH');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Initiate New MOH</h2>
        <p className="text-gray-400 text-sm">Create a new Major Overhaul workflow</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="installationId" label="Installation" rules={[{ required: true, message: 'Select installation' }]}>
              <Select 
                showSearch 
                placeholder="Select installation first" 
                optionFilterProp="children"
                onChange={handleInstallationChange}
              >
                {installations.map(i => (
                  <Option key={i.id} value={i.id}>{i.installationId}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item name="equipmentTag" label="Equipment Tag" rules={[{ required: true, message: 'Select equipment' }]}>
              <Select 
                showSearch 
                placeholder={selectedInstallation ? "Select equipment from registry" : "Select installation first"} 
                optionFilterProp="children"
                disabled={!selectedInstallation}
                onChange={handleEquipmentChange}
              >
                {equipment.map(e => (
                  <Option key={e.id} value={e.tagNumber}>
                    {e.tagNumber} - {e.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item name="equipmentName" label="Equipment Name">
              <Input placeholder="Auto-populated from registry" disabled />
            </Form.Item>
            
            <Form.Item name="priority" label="Priority" initialValue="NORMAL">
              <Select>
                <Option value="LOW">Low</Option>
                <Option value="NORMAL">Normal</Option>
                <Option value="HIGH">High</Option>
                <Option value="CRITICAL">Critical</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="lastMOHDate" label="Last MOH Date">
              <DatePicker className="w-full" />
            </Form.Item>
            
            <Form.Item name="currentRunHours" label="Current Running Hours">
              <InputNumber className="w-full" min={0} addonAfter="hrs" />
            </Form.Item>
            
            <Form.Item name="dCheckInterval" label="D-Check Interval (from PMS)">
              <InputNumber className="w-full" min={0} addonAfter="hrs" />
            </Form.Item>
            
            <Form.Item name="plannedStartDate" label="Planned Start Date">
              <DatePicker className="w-full" />
            </Form.Item>
            
            <Form.Item name="estimatedCost" label="Estimated Cost (₹)">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            
            <Form.Item name="assignedTo" label="Assigned To">
              <Input placeholder="Team or person" />
            </Form.Item>
          </div>
          
          <Form.Item name="scopeOfWork" label="Scope of Work">
            <TextArea rows={4} placeholder="Describe the overhaul scope, components to check, etc." />
          </Form.Item>
          
          <div className="flex justify-end gap-3">
            <Button icon={<Link2 className="w-4 h-4" />}>
              Link to Procurement
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<Save className="w-4 h-4" />}>
              Initiate MOH
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default InitiateMOH;
