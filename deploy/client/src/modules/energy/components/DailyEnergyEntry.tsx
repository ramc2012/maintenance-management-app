import React, { useState, useEffect } from 'react';
import { Form, Select, DatePicker, InputNumber, Input, Button, Card, Table, message } from 'antd';
import { Save, Zap, Fuel } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;

const FUEL_UNITS: Record<string, string> = {
  DIESEL: 'L',
  NATURAL_GAS: 'm³',
  LPG: 'L'
};

export const DailyEnergyEntry: React.FC = () => {
  const [form] = Form.useForm();
  const [installations, setInstallations] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFuelType, setSelectedFuelType] = useState<string>('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [instRes, logsRes] = await Promise.all([
        axios.get('/api/equipment/installations'),
        axios.get('/api/energy/daily')
      ]);
      setInstallations(instRes.data || []);
      setRecentLogs((logsRes.data || []).slice(0, 10));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        date: values.date.toISOString(),
        fuelUnit: values.fuelType ? FUEL_UNITS[values.fuelType] : null,
        loggedBy: 'SYSTEM'
      };
      await axios.post('/api/energy/daily', payload);
      message.success('Daily energy log created!');
      form.resetFields();
      setSelectedFuelType('');
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to create log');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: 'Installation', dataIndex: ['installation', 'installationId'] },
    { title: 'Fuel Type', dataIndex: 'fuelType', render: (t: string) => t || '-' },
    { title: 'Fuel Qty', render: (_: any, r: any) => r.fuelQuantity ? `${r.fuelQuantity} ${r.fuelUnit || FUEL_UNITS[r.fuelType] || ''}` : '-' },
    { title: 'Electric (kWh)', dataIndex: 'electricityKwh', render: (k: number) => k?.toLocaleString() || '-' },
    { title: 'Gen Hours', dataIndex: 'generatorHours', render: (h: number) => h || '-' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Daily Energy Log</h2>
        <p className="text-gray-400 text-sm">Record daily fuel and electricity consumption (Cost entered in Dashboard)</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="installationId" label="Installation" rules={[{ required: true }]}>
              <Select showSearch placeholder="Select installation" optionFilterProp="children">
                {installations.map(i => (
                  <Option key={i.id} value={i.id}>{i.installationId}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item name="date" label="Date" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            
            <Form.Item name="fuelType" label="Fuel Type">
              <Select placeholder="Select fuel type" allowClear onChange={(v) => setSelectedFuelType(v)}>
                <Option value="DIESEL">Diesel (L)</Option>
                <Option value="NATURAL_GAS">Natural Gas (m³)</Option>
                <Option value="LPG">LPG (L)</Option>
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="fuelQuantity" label={<span><Fuel className="w-3 h-3 inline mr-1" />Fuel Quantity {selectedFuelType && `(${FUEL_UNITS[selectedFuelType]})`}</span>}>
              <InputNumber className="w-full" placeholder={selectedFuelType ? `Enter in ${FUEL_UNITS[selectedFuelType]}` : 'Select fuel type first'} min={0} addonAfter={selectedFuelType ? FUEL_UNITS[selectedFuelType] : null} />
            </Form.Item>
            <Form.Item name="electricityKwh" label={<span><Zap className="w-3 h-3 inline mr-1" />Electric (kWh)</span>}>
              <InputNumber className="w-full" min={0} addonAfter="kWh" />
            </Form.Item>
            <Form.Item name="generatorHours" label="Generator Hours">
              <InputNumber className="w-40" min={0} step={0.5} addonAfter="hrs" />
            </Form.Item>
          </div>

          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} />
          </Form.Item>

          <div className="flex justify-end">
            <Button type="primary" htmlType="submit" loading={loading} icon={<Save className="w-4 h-4" />}>
              Save Log
            </Button>
          </div>
        </Form>
      </Card>

      <Card title={<span className="text-white">Recent Logs</span>} className="bg-gray-800 border-gray-700">
        <Table
          dataSource={recentLogs}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default DailyEnergyEntry;
