import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Select, Input, Card, Statistic, Row, Col, Popconfirm, message, Modal } from 'antd';
import { Search, Edit, Trash2, Download, Eye, FileText } from 'lucide-react';
import { DEMO_REQUIREMENTS } from '../demoData';

const { Option } = Select;

interface RequirementListProps {
  onEdit: (req: any) => void;
}

const categories = [
  { id: 'STORES', label: 'Stores', color: 'blue' },
  { id: 'SPARES', label: 'Spares', color: 'green' },
  { id: 'CAPITAL', label: 'Capital', color: 'purple' },
  { id: 'SERVICE', label: 'Service', color: 'orange' }
];

export const RequirementList: React.FC<RequirementListProps> = ({ onEdit }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [viewModal, setViewModal] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = () => {
    setLoading(true);
    // Load from localStorage
    const requirements = JSON.parse(localStorage.getItem('mrpRequirements') || '[]');
    const resolvedRequirements = requirements.length > 0 ? requirements : DEMO_REQUIREMENTS;
    setData(resolvedRequirements);
    setLoading(false);
  };

  const handleDelete = (id: string) => {
    const requirements = JSON.parse(localStorage.getItem('mrpRequirements') || '[]');
    const updated = requirements.filter((r: any) => r.id !== id);
    localStorage.setItem('mrpRequirements', JSON.stringify(updated));
    setData(updated);
    message.success('Deleted');
  };

  const exportToCSV = (req: any) => {
    let csv = 'Material Requirement - ' + (req.vendorName || 'Unknown') + '\n\n';
    csv += 'Category,' + (req.category || '') + '\n';
    csv += 'Vendor,' + (req.vendorName || '') + '\n';
    csv += 'Title,' + (req.title || '') + '\n\n';
    csv += 'Item No,Description,Quantity,Unit,Unit Price,Total\n';
    
    (req.items || []).forEach((item: any, idx: number) => {
      csv += `${idx + 1},"${item.description}",${item.quantity},${item.unit},${item.unitPrice},${item.total}\n`;
    });
    
    csv += '\nGrand Total,' + (req.totalValue || 0);
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MRP_${req.vendorName || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filter data
  const filteredData = data.filter(r => {
    if (filterCategory && r.category !== filterCategory) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (searchText && !r.vendorName?.toLowerCase().includes(searchText.toLowerCase()) && 
        !r.title?.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  // Stats
  const totalValue = data.reduce((sum, r) => sum + (r.totalValue || 0), 0);
  const pendingCount = data.filter(r => r.status === 'PENDING').length;

  const columns = [
    { title: 'Date', dataIndex: 'createdAt', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-', width: 100 },
    { title: 'Title', dataIndex: 'title', render: (t: string, r: any) => (
      <Button type="link" className="p-0" onClick={() => setViewModal(r)}>{t}</Button>
    )},
    { title: 'Vendor', dataIndex: 'vendorName' },
    { title: 'Category', dataIndex: 'category', width: 100, render: (c: string) => {
      const cat = categories.find(x => x.id === c);
      return cat ? <Tag color={cat.color}>{cat.label}</Tag> : c;
    }},
    { title: 'Items', dataIndex: 'items', render: (items: any[]) => items?.length || 0, width: 70 },
    { title: 'Value', dataIndex: 'totalValue', render: (v: number) => `₹${(v || 0).toLocaleString()}`, width: 100 },
    { title: 'Status', dataIndex: 'status', width: 90, render: (s: string) => (
      <Tag color={s === 'APPROVED' ? 'green' : s === 'PENDING' ? 'orange' : 'default'}>{s}</Tag>
    )},
    { title: 'Actions', dataIndex: 'id', width: 120, render: (id: string, r: any) => (
      <div className="flex gap-1">
        <Button size="small" type="text" icon={<Eye className="w-3 h-3" />} onClick={() => setViewModal(r)} />
        <Button size="small" type="text" icon={<Edit className="w-3 h-3" />} onClick={() => onEdit(r)} />
        <Button size="small" type="text" icon={<Download className="w-3 h-3" />} onClick={() => exportToCSV(r)} />
        <Popconfirm title="Delete?" onConfirm={() => handleDelete(id)}>
          <Button size="small" type="text" danger icon={<Trash2 className="w-3 h-3" />} />
        </Popconfirm>
      </div>
    )}
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <Row gutter={16}>
        <Col span={6}><Card size="small"><Statistic title="Total Requirements" value={data.length} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Pending" value={pendingCount} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Total Value" value={totalValue} prefix="₹" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Vendors" value={new Set(data.map(r => r.vendorName)).size} /></Card></Col>
      </Row>

      {/* Filters */}
      <div className="flex gap-2 bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
        <Select placeholder="Category" allowClear style={{ width: 130 }} onChange={v => setFilterCategory(v || '')}>
          {categories.map(c => <Option key={c.id} value={c.id}>{c.label}</Option>)}
        </Select>
        <Select placeholder="Status" allowClear style={{ width: 120 }} onChange={v => setFilterStatus(v || '')}>
          <Option value="PENDING">Pending</Option>
          <Option value="APPROVED">Approved</Option>
          <Option value="REJECTED">Rejected</Option>
        </Select>
        <Input prefix={<Search className="w-4 h-4 text-gray-400" />} placeholder="Search vendor/title..." className="w-48" onChange={e => setSearchText(e.target.value)} />
      </div>

      {/* Table */}
      <Table dataSource={filteredData} columns={columns} rowKey="id" size="small" loading={loading} pagination={{ pageSize: 10 }} />

      {/* View Modal */}
      <Modal title={viewModal?.title} open={!!viewModal} onCancel={() => setViewModal(null)} footer={null} width={700}>
        {viewModal && (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>Vendor:</strong> {viewModal.vendorName}</p>
                <p><strong>Contact:</strong> {viewModal.vendorContact}</p>
                <p><strong>Category:</strong> <Tag>{viewModal.category}</Tag></p>
              </Col>
              <Col span={12}>
                <p><strong>Department:</strong> {viewModal.department}</p>
                <p><strong>Priority:</strong> {viewModal.priority}</p>
                <p><strong>Status:</strong> <Tag color={viewModal.status === 'APPROVED' ? 'green' : 'orange'}>{viewModal.status}</Tag></p>
              </Col>
            </Row>
            
            <Table dataSource={viewModal.items || []} rowKey="id" size="small" pagination={false}
              columns={[
                { title: '#', dataIndex: 'id', render: (_: any, __: any, i: number) => i + 1, width: 40 },
                { title: 'Description', dataIndex: 'description' },
                { title: 'Qty', dataIndex: 'quantity', width: 60 },
                { title: 'Unit', dataIndex: 'unit', width: 60 },
                { title: 'Price', dataIndex: 'unitPrice', render: (v: number) => `₹${v}`, width: 80 },
                { title: 'Total', dataIndex: 'total', render: (v: number) => `₹${v}`, width: 80 }
              ]}
              footer={() => <div className="text-right font-bold">Total: ₹{(viewModal.totalValue || 0).toLocaleString()}</div>}
            />
            
            {viewModal.remarks && <p><strong>Remarks:</strong> {viewModal.remarks}</p>}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button icon={<Download className="w-4 h-4" />} onClick={() => exportToCSV(viewModal)}>Export CSV</Button>
              <Button type="primary" onClick={() => { onEdit(viewModal); setViewModal(null); }}>Edit</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
