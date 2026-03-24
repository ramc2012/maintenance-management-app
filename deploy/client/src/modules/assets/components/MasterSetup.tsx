import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, notification, List, Tag, Tabs, Switch, DatePicker, Popconfirm } from 'antd';
import { Plus, Trash2, Pencil, Calendar, Check, X } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;

export const MasterSetup = () => {
    const [installations, setInstallations] = useState([]);
    const [standards, setStandards] = useState([]);
    const [instTypes, setInstTypes] = useState([]);
    const [equipTypes, setEquipTypes] = useState([]);
    const [meterTypes, setMeterTypes] = useState([]);
    const [products, setProducts] = useState([]);
    const [performers, setPerformers] = useState([]);
    const [pmSchedules, setPmSchedules] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('instTypes');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [modalEntity, setModalEntity] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [activeRecord, setActiveRecord] = useState<any>(null);
    
    const [pmModalOpen, setPmModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<any>(null);
    const [pmTypeContext, setPmTypeContext] = useState<'inst' | 'equip'>('inst');
    
    const [form] = Form.useForm();
    const [pmForm] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [instRes, stdRes, instTypeRes, equipTypeRes, meterTypeRes, prodRes, perfRes] = await Promise.all([
                axios.get('/api/equipment/installations'),
                axios.get('/api/equipment/standards'),
                axios.get('/api/equipment/types'),
                axios.get('/api/equipment/equipment-types'),
                axios.get('/api/equipment/meter-types'),
                axios.get('/api/equipment/products'),
                axios.get('/api/equipment/performers')
            ]);
            setInstallations(instRes.data);
            setStandards(stdRes.data);
            setInstTypes(instTypeRes.data);
            setEquipTypes(equipTypeRes.data);
            setMeterTypes(meterTypeRes.data);
            setProducts(prodRes.data);
            setPerformers(perfRes.data);
        } catch (error) {
            notification.error({ message: 'Failed to fetch data' });
        } finally {
            setLoading(false);
        }
    };
    
    const fetchPMs = async (typeId: string, context: 'inst' | 'equip') => {
        const param = context === 'inst' ? `typeId=${typeId}` : `equipTypeId=${typeId}`;
        const res = await axios.get(`/api/equipment/pm-schedules?${param}`);
        setPmSchedules(res.data);
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = (entity: string) => {
        setModalEntity(entity);
        setEditMode(false);
        setActiveRecord(null);
        form.resetFields();
        if (entity === 'performers') form.setFieldsValue({ employmentType: 'Regular', company: 'ONGC' });
        if (entity === 'installations') form.setFieldsValue({ isActive: true });
        if (entity === 'standards') form.setFieldsValue({ isActive: true, category: 'Lab' });
        setModalOpen(true);
    };
    
    const openEdit = (entity: string, record: any) => {
        setModalEntity(entity);
        setEditMode(true);
        setActiveRecord(record);
        const formValues = { ...record };
        if (record.lastCalDate) formValues.lastCalDate = dayjs(record.lastCalDate);
        if (record.dueDate) formValues.dueDate = dayjs(record.dueDate);
        if (record.configSchema && typeof record.configSchema === 'object') {
            formValues.configSchema = JSON.stringify(record.configSchema, null, 2);
        }
        if (record.parameters && Array.isArray(record.parameters)) {
            formValues.parameters = record.parameters.join(', ');
        }
        form.setFieldsValue(formValues);
        setModalOpen(true);
    };
    
    const openPMManager = (type: any, context: 'inst' | 'equip') => {
        setSelectedType(type);
        setPmTypeContext(context);
        fetchPMs(type.id, context);
        pmForm.resetFields();
        setPmModalOpen(true);
    };

    const handleSubmit = async (values: any) => {
        try {
            let url = '';
            let idField = 'id';
            
            if (values.lastCalDate) values.lastCalDate = values.lastCalDate.toISOString();
            if (values.dueDate) values.dueDate = values.dueDate.toISOString();
            if (values.configSchema && typeof values.configSchema === 'string') {
                try { values.configSchema = JSON.parse(values.configSchema); } catch(e) { values.configSchema = {}; }
            }
            if (values.parameters && typeof values.parameters === 'string') {
                values.parameters = values.parameters.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            if (values.modelYear) values.modelYear = parseInt(values.modelYear);
            
            switch (modalEntity) {
                case 'installations': url = '/api/equipment/installations'; break;
                case 'standards': url = '/api/equipment/standards'; idField = 'tagId'; break;
                case 'instTypes': url = '/api/equipment/types'; break;
                case 'equipTypes': url = '/api/equipment/equipment-types'; break;
                case 'meterTypes': url = '/api/equipment/meter-types'; break;
                case 'products': url = '/api/equipment/products'; break;
                case 'performers': url = '/api/equipment/performers'; break;
            }

            if (editMode && activeRecord) {
                const id = activeRecord[idField];
                await axios.put(`${url}/${id}`, values);
                message.success('Updated');
            } else {
                await axios.post(url, values);
                message.success('Created');
            }
            
            setModalOpen(false);
            fetchData();
        } catch (error: any) {
            message.error(error?.response?.data?.error || 'Failed to save');
        }
    };
    
    const handleDelete = async (entity: string, record: any) => {
        try {
            let url = '';
            let id = record.id;
            switch (entity) {
                case 'products': url = `/api/equipment/products/${id}`; break;
                case 'meterTypes': url = `/api/equipment/meter-types/${id}`; break;
                default: message.warning('Delete not supported for this entity'); return;
            }
            await axios.delete(url);
            message.success('Deleted');
            fetchData();
        } catch (e) { message.error('Failed to delete'); }
    };
    
    const handleCreatePM = async (values: any) => {
        try {
            const pmData = {
                frequency: values.frequency,
                taskDescription: values.taskDescription,
                ...(pmTypeContext === 'inst' ? { instrumentTypeId: selectedType.id } : { equipmentTypeId: selectedType.id })
            };
            await axios.post('/api/equipment/pm-schedules', pmData);
            message.success('PM added');
            pmForm.resetFields();
            fetchPMs(selectedType.id, pmTypeContext);
        } catch (error) { message.error('Failed'); }
    };
    
    const handleDeletePM = async (id: string) => {
        try {
            await axios.delete(`/api/equipment/pm-schedules/${id}`);
            message.success('Deleted');
            fetchPMs(selectedType.id, pmTypeContext);
        } catch (e) { message.error('Failed'); }
    };

    // Action buttons helper
    const ActionButtons = ({ entity, record, showPM = false, pmContext = 'inst' }: any) => (
        <div className="flex gap-1">
            {showPM && <Button size="small" icon={<Calendar className="w-3 h-3"/>} onClick={() => openPMManager(record, pmContext)}>PMS</Button>}
            <Button size="small" type="text" icon={<Pencil className="w-3 h-3 text-blue-500"/>} onClick={() => openEdit(entity, record)}/>
            {['products', 'meterTypes'].includes(entity) && (
                <Popconfirm title="Delete?" onConfirm={() => handleDelete(entity, record)}>
                    <Button size="small" type="text" danger icon={<Trash2 className="w-3 h-3"/>}/>
                </Popconfirm>
            )}
        </div>
    );

    const instTypeColumns = [
        { title: 'Name', dataIndex: 'name' },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Actions', render: (_:any, r:any) => <ActionButtons entity="instTypes" record={r} showPM pmContext="inst"/> }
    ];
    
    const equipTypeColumns = [
        { title: 'Name', dataIndex: 'name' },
        { title: 'Category', dataIndex: 'category', render: (t:string) => <Tag color={t==='RUNNING'?'green':'orange'}>{t}</Tag> },
        { title: 'Make', dataIndex: 'make' },
        { title: 'Actions', render: (_:any, r:any) => <ActionButtons entity="equipTypes" record={r} showPM pmContext="equip"/> }
    ];
    
    const meterTypeColumns = [
        { title: 'Name', dataIndex: 'name' },
        { title: 'Config', render: (_:any, r:any) => {
            const schema = r.configSchema || {};
            return <span className="text-xs text-gray-500">{Object.keys(schema).length} fields</span>;
        }},
        { title: 'Actions', render: (_:any, r:any) => <ActionButtons entity="meterTypes" record={r}/> }
    ];
    
    const installColumns = [
        { title: 'ID', dataIndex: 'installationId' },
        { title: 'Location', dataIndex: 'location' },
        { title: 'Type', dataIndex: 'type' },
        { title: 'Active', dataIndex: 'isActive', render: (v:boolean) => v ? <Check className="w-4 h-4 text-green-500"/> : <X className="w-4 h-4 text-red-500"/> },
        { title: 'Actions', render: (_:any, r:any) => <ActionButtons entity="installations" record={r}/> }
    ];
    
    const stdColumns = [
        { title: 'Tag ID', dataIndex: 'tagId' },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Make/Model', render: (_:any, r:any) => `${r.make || '-'}/${r.model || '-'}` },
        { title: 'Category', dataIndex: 'category', render: (t:string) => <Tag color={t==='Lab'?'blue':'green'}>{t}</Tag> },
        { title: 'Parameters', dataIndex: 'parameters', render: (p:string[]) => p?.length ? <Tag>{p.length}</Tag> : '-' },
        { title: 'Due', dataIndex: 'dueDate', render: (d:string) => d ? dayjs(d).format('DD-MMM-YY') : '-' },
        { title: 'Active', dataIndex: 'isActive', render: (v:boolean) => v ? <Check className="w-4 h-4 text-green-500"/> : <X className="w-4 h-4 text-red-500"/> },
        { title: 'Actions', render: (_:any, r:any) => <ActionButtons entity="standards" record={r}/> }
    ];
    
    const productColumns = [
        { title: 'Name', dataIndex: 'name' },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Actions', render: (_:any, r:any) => <ActionButtons entity="products" record={r}/> }
    ];
    
    const performerColumns = [
        { title: 'Emp ID', dataIndex: 'employeeId' },
        { title: 'Name', dataIndex: 'name' },
        { title: 'Type', dataIndex: 'employmentType', render: (t:string) => <Tag color={t==='Regular'?'blue':'orange'}>{t}</Tag> },
        { title: 'Company', dataIndex: 'company' },
        { title: 'Designation', dataIndex: 'designation' },
        { title: 'Actions', render: (_:any, r:any) => <ActionButtons entity="performers" record={r}/> }
    ];

    const getTableData = () => {
        switch (activeTab) {
            case 'instTypes': return { data: instTypes, columns: instTypeColumns, rowKey: 'id' };
            case 'equipTypes': return { data: equipTypes, columns: equipTypeColumns, rowKey: 'id' };
            case 'meterTypes': return { data: meterTypes, columns: meterTypeColumns, rowKey: 'id' };
            case 'installations': return { data: installations, columns: installColumns, rowKey: 'id' };
            case 'standards': return { data: standards, columns: stdColumns, rowKey: 'tagId' };
            case 'products': return { data: products, columns: productColumns, rowKey: 'id' };
            case 'performers': return { data: performers, columns: performerColumns, rowKey: 'id' };
            default: return { data: [], columns: [], rowKey: 'id' };
        }
    };
    
    const { data, columns, rowKey } = getTableData();

    return (
        <div className="p-2 space-y-4 dark:text-gray-200">
            <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" className="dark-tabs">
                <TabPane tab="Instrument Types" key="instTypes"/>
                <TabPane tab="Equipment Types" key="equipTypes"/>
                <TabPane tab="Meter Types" key="meterTypes"/>
                <TabPane tab="Installations" key="installations"/>
                <TabPane tab="Standards" key="standards"/>
                <TabPane tab="Products" key="products"/>
                <TabPane tab="Performers" key="performers"/>
            </Tabs>
            
            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">Total: {data.length}</div>
                <Button type="primary" icon={<Plus className="w-4 h-4"/>} onClick={() => openCreate(activeTab)}>Add New</Button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <Table dataSource={data} columns={columns} rowKey={rowKey} size="small" pagination={{ pageSize: 10 }} className="dark-table" loading={loading}/>
            </div>
            
            {/* Create/Edit Modal */}
            <Modal title={`${editMode ? 'Edit' : 'Create'}`} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={form.submit} width={650}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    {modalEntity === 'instTypes' && (
                        <>
                            <Form.Item name="name" label="Name" rules={[{required:true}]}><Input/></Form.Item>
                            <Form.Item name="description" label="Description"><Input/></Form.Item>
                        </>
                    )}
                    {modalEntity === 'equipTypes' && (
                        <>
                            <Form.Item name="name" label="Name" rules={[{required:true}]}><Input/></Form.Item>
                            <Form.Item name="category" label="Category" rules={[{required:true}]}>
                                <Select><Option value="STATIC">Static</Option><Option value="RUNNING">Running</Option></Select>
                            </Form.Item>
                            <div className="grid grid-cols-2 gap-4">
                                <Form.Item name="make" label="Make"><Input/></Form.Item>
                                <Form.Item name="model" label="Model"><Input/></Form.Item>
                            </div>
                        </>
                    )}
                    {modalEntity === 'meterTypes' && (
                        <>
                            <Form.Item name="name" label="Type Name" rules={[{required:true}]}><Input placeholder="e.g., Orifice, Turbine"/></Form.Item>
                            <Form.Item name="configSchema" label="Config Schema (JSON)" help="Define dynamic fields">
                                <Input.TextArea rows={6} placeholder={`{\n  "betaRatio": { "label": "Beta Ratio", "type": "number" },\n  "kFactor": { "label": "K-Factor", "type": "number" }\n}`}/>
                            </Form.Item>
                        </>
                    )}
                    {modalEntity === 'installations' && (
                        <>
                            <Form.Item name="installationId" label="Installation ID" rules={[{required:true}]}><Input disabled={editMode}/></Form.Item>
                            <Form.Item name="location" label="Location" rules={[{required:true}]}><Input/></Form.Item>
                            <Form.Item name="type" label="Type" rules={[{required:true}]}>
                                <Select>
                                    <Option value="Surface">Surface</Option>
                                    <Option value="Drilling Rig">Drilling Rig</Option>
                                    <Option value="Workover Rig">Workover Rig</Option>
                                    <Option value="Mobile Units">Mobile Units</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="isActive" label="Active" valuePropName="checked"><Switch/></Form.Item>
                        </>
                    )}
                    {modalEntity === 'standards' && (
                        <>
                            <Form.Item name="tagId" label="Tag ID" rules={[{required:true}]}><Input disabled={editMode}/></Form.Item>
                            <Form.Item name="description" label="Description" rules={[{required:true}]}><Input/></Form.Item>
                            <div className="grid grid-cols-2 gap-4">
                                <Form.Item name="make" label="Make"><Input/></Form.Item>
                                <Form.Item name="model" label="Model"><Input/></Form.Item>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Form.Item name="category" label="Category" rules={[{required:true}]}>
                                    <Select><Option value="Lab">Lab</Option><Option value="Field">Field</Option></Select>
                                </Form.Item>
                                <Form.Item name="modelYear" label="Model Year"><Input type="number"/></Form.Item>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Form.Item name="lastCalDate" label="Last Cal Date"><DatePicker className="w-full"/></Form.Item>
                                <Form.Item name="dueDate" label="Due Date"><DatePicker className="w-full"/></Form.Item>
                            </div>
                            <Form.Item name="parameters" label="Parameters (comma-separated)" help="e.g., Pressure, Temperature, Flow">
                                <Input placeholder="Pressure, Temperature, Flow"/>
                            </Form.Item>
                            <Form.Item name="reportUrl" label="Report URL"><Input placeholder="https://..."/></Form.Item>
                            <Form.Item name="isActive" label="Active" valuePropName="checked"><Switch/></Form.Item>
                        </>
                    )}
                    {modalEntity === 'products' && (
                        <>
                            <Form.Item name="name" label="Product Name" rules={[{required:true}]}><Input placeholder="e.g., Crude, Naphtha, LPG"/></Form.Item>
                            <Form.Item name="description" label="Description"><Input/></Form.Item>
                        </>
                    )}
                    {modalEntity === 'performers' && (
                        <>
                            <Form.Item name="employeeId" label="Employee ID" rules={[{required:true}]}><Input disabled={editMode}/></Form.Item>
                            <Form.Item name="name" label="Name" rules={[{required:true}]}><Input/></Form.Item>
                            <Form.Item name="employmentType" label="Employment Type" rules={[{required:true}]}>
                                <Select onChange={(v) => { if(v==='Regular') form.setFieldValue('company', 'ONGC'); }}>
                                    <Option value="Regular">Regular</Option>
                                    <Option value="Contractual">Contractual</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="company" label="Company"><Input/></Form.Item>
                            <Form.Item name="designation" label="Designation"><Input/></Form.Item>
                        </>
                    )}
                </Form>
            </Modal>
            
            {/* PM Modal */}
            <Modal title={`PMS: ${selectedType?.name}`} open={pmModalOpen} onCancel={() => { setPmModalOpen(false); pmForm.resetFields(); }} footer={null} width={700}>
                <div className="mb-6 border-b pb-4">
                    <Form form={pmForm} layout="inline" onFinish={handleCreatePM}>
                        <Form.Item name="frequency" rules={[{required:true}]} style={{width: 150}}>
                            <Select placeholder="Frequency">
                                <Option value="DAILY">Daily</Option><Option value="MONTHLY">Monthly</Option><Option value="QUARTERLY">Quarterly</Option>
                                <Option value="HALF_YEARLY">Half Yearly</Option><Option value="YEARLY">Yearly</Option><Option value="MOH">MOH</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="taskDescription" rules={[{required:true}]} style={{flex:1}}><Input placeholder="Task description..."/></Form.Item>
                        <Button type="primary" htmlType="submit" icon={<Plus className="w-4 h-4"/>}>Add</Button>
                    </Form>
                </div>
                <List itemLayout="horizontal" dataSource={pmSchedules} locale={{ emptyText: 'No PMS' }} renderItem={(item: any) => (
                    <List.Item actions={[<Button type="text" danger icon={<Trash2 className="w-4 h-4"/>} onClick={() => handleDeletePM(item.id)}/>]}>
                        <List.Item.Meta avatar={<Tag color="blue">{item.frequency}</Tag>} title={item.taskDescription}/>
                    </List.Item>
                )}/>
            </Modal>
        </div>
    );
};
