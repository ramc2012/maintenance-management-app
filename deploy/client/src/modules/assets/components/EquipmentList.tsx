import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, message, Radio, InputNumber } from 'antd';
import { Plus, Pencil, Server, Zap } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;

export const EquipmentList = () => {
    const [equipment, setEquipment] = useState([]);
    const [installations, setInstallations] = useState([]);
    const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'STATIC' | 'RUNNING'>('ALL');
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eqRes, instRes, typesRes] = await Promise.all([
                axios.get('/api/equipment/running-equip'),
                axios.get('/api/equipment/installations'),
                axios.get('/api/equipment/equipment-types')
            ]);
            setEquipment(eqRes.data);
            setInstallations(instRes.data);
            setEquipmentTypes(typesRes.data);
        } catch (error) {
            message.error('Failed to load equipment');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (values: any) => {
        try {
            if (editMode && selectedItem) {
                await axios.put(`/api/equipment/running-equip/${selectedItem.equipmentTag}`, values);
                message.success('Equipment Updated');
            } else {
                await axios.post('/api/equipment/running-equip', values);
                message.success('Equipment Created');
            }
            setOpen(false);
            setEditMode(false);
            setSelectedItem(null);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error('Operation failed');
        }
    };

    const openEdit = (record: any) => {
        setEditMode(true);
        setSelectedItem(record);
        form.setFieldsValue({
            ...record,
            equipmentTypeId: record.equipmentTypeId
        });
        setOpen(true);
    };

    const handleTypeChange = (typeId: string) => {
        const selectedType = equipmentTypes.find(t => t.id === typeId);
        if (selectedType) {
            form.setFieldsValue({
                category: selectedType.category,
                make: selectedType.make || '',
                model: selectedType.model || ''
            });
        }
    };

    const filteredData = categoryFilter === 'ALL' 
        ? equipment 
        : equipment.filter((e:any) => e.category === categoryFilter);

    const columns = [
        { title: 'Tag', dataIndex: 'equipmentTag', render: (t:string) => <span className="font-mono font-bold">{t}</span> },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Type', dataIndex: ['equipmentType', 'name'], render: (t:string) => t ? <Tag color="purple">{t}</Tag> : '-' },
        { title: 'Category', dataIndex: 'category', render: (t:string) => <Tag color={t==='RUNNING'?'green':'orange'}>{t}</Tag> },
        { title: 'Installation', dataIndex: ['installation', 'installationId'], render: (id: string, r: any) => (
            <span>{id || '-'} <span className="text-xs text-gray-400">({r.installation?.location || ''})</span></span>
        )},
        { title: 'Make/Model', render: (_:any, r:any) => `${r.make || '-'}/${r.model || '-'}` },
        { title: 'PM Freq', dataIndex: 'pmFrequencyDays', render: (d:number) => d ? `${d} days` : '-' },
        { title: 'Action', render: (_:any, r:any) => <Button size="small" type="text" icon={<Pencil className="w-3 h-3 text-blue-500"/>} onClick={()=>openEdit(r)}/> }
    ];

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <div className="flex gap-4 items-center">
                    <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                        {categoryFilter === 'RUNNING' ? <Zap className="w-5 h-5 text-yellow-500"/> : <Server className="w-5 h-5 text-gray-500"/>}
                        Equipment Registry
                    </h2>
                    <Radio.Group value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} buttonStyle="solid">
                        <Radio.Button value="ALL">All</Radio.Button>
                        <Radio.Button value="STATIC">Static</Radio.Button>
                        <Radio.Button value="RUNNING">Running</Radio.Button>
                    </Radio.Group>
                </div>
                <Button type="primary" icon={<Plus className="w-4 h-4"/>} onClick={() => {
                    setEditMode(false);
                    setSelectedItem(null);
                    form.resetFields();
                    setOpen(true);
                }}>Add Equipment</Button>
            </div>

            <Table 
                dataSource={filteredData} 
                columns={columns} 
                rowKey="equipmentTag" 
                size="small"
                loading={loading}
                className="dark-table"
            />

            <Modal
                title={editMode ? "Edit Equipment" : "Add Equipment"}
                open={open}
                onCancel={() => setOpen(false)}
                onOk={form.submit}
                width={650}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="equipmentTypeId" label="Equipment Type">
                        <Select 
                            placeholder="Select Type (auto-fills category, make, model)" 
                            allowClear 
                            showSearch 
                            optionFilterProp="children"
                            onChange={handleTypeChange}
                        >
                            {equipmentTypes.map((t:any) => (
                                <Option key={t.id} value={t.id}>{t.name} ({t.category})</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-4">
                         <Form.Item name="equipmentTag" label="Equipment Tag" rules={[{required: true}]}><Input disabled={editMode}/></Form.Item>
                         <Form.Item name="category" label="Category" rules={[{required: true}]}>
                            <Select>
                                <Option value="STATIC">Static</Option>
                                <Option value="RUNNING">Running</Option>
                            </Select>
                         </Form.Item>
                    </div>
                    <Form.Item name="description" label="Description" rules={[{required: true}]}><Input/></Form.Item>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="installationId" label="Installation" rules={[{required: true}]}>
                            <Select showSearch optionFilterProp="children">
                                {installations.map((i:any) => (
                                    <Option key={i.id} value={i.id}>{i.installationId}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="pmFrequencyDays" label="PM Frequency (Days)" help="Preventive maintenance interval">
                            <InputNumber min={1} max={365} placeholder="e.g., 30"/>
                        </Form.Item>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <Form.Item name="make" label="Make"><Input/></Form.Item>
                        <Form.Item name="model" label="Model"><Input/></Form.Item>
                        <Form.Item name="powerRating" label="Rating"><Input placeholder="e.g 50KW"/></Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};
