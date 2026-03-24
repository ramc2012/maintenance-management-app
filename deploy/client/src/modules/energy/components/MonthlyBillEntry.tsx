import React, { useState, useEffect } from 'react';
import { Form, Select, InputNumber, DatePicker, Input, Button, Card, Table, Tag, message, Modal } from 'antd';
import { Save, Receipt, CheckCircle } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;

export const MonthlyBillEntry: React.FC = () => {
  const [form] = Form.useForm();
  const [installations, setInstallations] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => { fetchData(); }, [year]);

  const fetchData = async () => {
    try {
      const [instRes, billsRes] = await Promise.all([
        axios.get('/api/equipment/installations'),
        axios.get('/api/energy/bills', { params: { year } })
      ]);
      setInstallations(instRes.data || []);
      setBills(billsRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        billDate: values.billDate?.toISOString(),
        dueDate: values.dueDate?.toISOString(),
        totalAmount: (values.billAmount || 0) + (values.taxAmount || 0),
        createdBy: 'SYSTEM'
      };
      await axios.post('/api/energy/bills', payload);
      message.success('Bill created successfully!');
      form.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await axios.post(`/api/energy/bills/${id}/pay`, { paidDate: new Date().toISOString() });
      message.success('Bill marked as paid');
      fetchData();
    } catch (error) {
      message.error('Failed to mark bill paid');
    }
  };

  const formatCurrency = (n: number) => `₹${n?.toLocaleString() || 0}`;

  const columns = [
    { title: 'Installation', dataIndex: ['installation', 'installationId'] },
    { title: 'Month', render: (_: any, r: any) => `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][r.month-1]} ${r.year}` },
    { title: 'Units', dataIndex: 'unitsConsumed', render: (u: number) => `${u?.toLocaleString()} kWh` },
    { title: 'Demand', dataIndex: 'demandKva', render: (d: number) => d ? `${d} kVA` : '-' },
    { title: 'Bill Amt', dataIndex: 'billAmount', render: formatCurrency },
    { title: 'Tax', dataIndex: 'taxAmount', render: formatCurrency },
    { title: 'Total', dataIndex: 'totalAmount', render: formatCurrency },
    { title: 'Status', dataIndex: 'status', render: (s: string) => {
      const colors: any = { PENDING: 'orange', PAID: 'green', OVERDUE: 'red' };
      return <Tag color={colors[s]}>{s}</Tag>;
    }},
    { title: 'Actions', render: (_: any, r: any) => r.status !== 'PAID' && (
      <Button size="small" icon={<CheckCircle className="w-3 h-3" />} onClick={() => handleMarkPaid(r.id)}>
        Mark Paid
      </Button>
    )}
  ];

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Monthly Electricity Bills</h2>
          <p className="text-gray-400 text-sm">Record and track monthly electricity bills by installation</p>
        </div>
        <Select value={year} onChange={setYear} style={{ width: 120 }}>
          {[2024, 2025].map(y => <Option key={y} value={y}>{y}</Option>)}
        </Select>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-4 gap-4">
            <Form.Item name="installationId" label="Installation" rules={[{ required: true }]}>
              <Select showSearch placeholder="Select installation" optionFilterProp="children">
                {installations.map(i => (
                  <Option key={i.id} value={i.id}>{i.installationId}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item name="month" label="Month" rules={[{ required: true }]}>
              <Select placeholder="Select month">
                {MONTHS.map((m, idx) => <Option key={idx+1} value={idx+1}>{m}</Option>)}
              </Select>
            </Form.Item>
            
            <Form.Item name="year" label="Year" rules={[{ required: true }]} initialValue={year}>
              <Select>
                {[2024, 2025].map(y => <Option key={y} value={y}>{y}</Option>)}
              </Select>
            </Form.Item>
            
            <Form.Item name="billNumber" label="Bill Number">
              <Input placeholder="Bill reference" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Form.Item name="unitsConsumed" label="Units Consumed (kWh)" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="demandKva" label="Max Demand (kVA)">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="billAmount" label="Bill Amount (₹)" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="taxAmount" label="Tax Amount (₹)">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="billDate" label="Bill Date">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="dueDate" label="Due Date">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="status" label="Status" initialValue="PENDING">
              <Select>
                <Option value="PENDING">Pending</Option>
                <Option value="PAID">Paid</Option>
              </Select>
            </Form.Item>
          </div>

          <div className="flex justify-end">
            <Button type="primary" htmlType="submit" loading={loading} icon={<Save className="w-4 h-4" />}>
              Save Bill
            </Button>
          </div>
        </Form>
      </Card>

      <Card title={<span className="text-white"><Receipt className="w-4 h-4 inline mr-2" />Bills for {year}</span>} className="bg-gray-800 border-gray-700">
        <Table
          dataSource={bills}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 12, showTotal: (t) => `Total: ${t} bills` }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default MonthlyBillEntry;
