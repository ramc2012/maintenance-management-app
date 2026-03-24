import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, message, Card, Descriptions, InputNumber, Drawer } from 'antd';
import { Plus, Settings, Pencil, Component } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;

export const InternalFlowMeters = () => {
    const [meters, setMeters] = useState([]);
    const [instruments, setInstruments] = useState([]);
    const [products, setProducts] = useState([]);
    const [meterTypes, setMeterTypes] = useState([]);
    const [installations, setInstallations] = useState([]);
    const [instTypes, setInstTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // UI State
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedMeter, setSelectedMeter] = useState<any>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [addInstOpen, setAddInstOpen] = useState(false);
    const [selectedMeterType, setSelectedMeterType] = useState<any>(null);
    
    const [form] = Form.useForm();
    const [instForm] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [mRes, iRes, pRes, mtRes, instRes, typeRes] = await Promise.all([
                axios.get('/api/equipment/internal-meters'),
                axios.get('/api/equipment/instruments'),
                axios.get('/api/equipment/products'),
                axios.get('/api/equipment/meter-types'),
                axios.get('/api/equipment/installations'),
                axios.get('/api/equipment/types')
            ]);
            setMeters(mRes.data);
            setInstruments(iRes.data);
            setProducts(pRes.data);
            setMeterTypes(mtRes.data);
            setInstallations(instRes.data);
            setInstTypes(typeRes.data);
        } catch (error) {
            message.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleMeterTypeChange = (typeName: string) => {
        const type = meterTypes.find((t:any) => t.name === typeName);
        setSelectedMeterType(type);
    };

    const handleSubmit = async (values: any) => {
        try {
            const configData: any = {};
            if (selectedMeterType?.configSchema) {
                const schema = typeof selectedMeterType.configSchema === 'string' 
                    ? JSON.parse(selectedMeterType.configSchema) 
                    : selectedMeterType.configSchema;
                Object.keys(schema).forEach(key => {
                    if (values[key] !== undefined) {
                        configData[key] = values[key];
                        delete values[key];
                    }
                });
            }
            values.configData = Object.keys(configData).length > 0 ? configData : null;

            if (editMode && selectedMeter) {
                await axios.put(`/api/equipment/internal-meters/${selectedMeter.id}`, values);
                message.success('Updated');
            } else {
                await axios.post('/api/equipment/internal-meters', values);
                message.success('Created');
            }
            setOpen(false); setEditMode(false); setSelectedMeter(null); setSelectedMeterType(null);
            form.resetFields(); fetchData();
        } catch (error) {
            message.error('Failed');
        }
    };

    const handleAddInstrument = async (values: any) => {
        try {
            values.internalMeterId = selectedMeter.id;
            await axios.post('/api/equipment/instruments', values);
            message.success('Instrument created and linked');
            setAddInstOpen(false);
            instForm.resetFields();
            fetchData();
        } catch (error) {
            message.error('Failed to create instrument');
        }
    };

    const openEdit = (meter: any) => {
        setEditMode(true);
        setSelectedMeter(meter);
        const type = meterTypes.find((t:any) => t.name === meter.meterType);
        setSelectedMeterType(type);
        const formValues = { ...meter, ...(meter.configData || {}) };
        form.setFieldsValue(formValues);
        setOpen(true);
    };

    const openDetails = (meter: any) => { setSelectedMeter(meter); setDetailsOpen(true); };

    const meterInstruments = instruments.filter((i:any) => i.internalMeterId === selectedMeter?.id);

    const renderDynamicFields = () => {
        if (!selectedMeterType?.configSchema) return null;
        const schema = typeof selectedMeterType.configSchema === 'string' 
            ? JSON.parse(selectedMeterType.configSchema) 
            : selectedMeterType.configSchema;
        return Object.entries(schema).map(([key, config]: [string, any]) => (
            <Form.Item key={key} name={key} label={config.label || key}>
                {config.type === 'select' ? (
                    <Select allowClear>{(config.options || []).map((opt: string) => <Option key={opt} value={opt}>{opt}</Option>)}</Select>
                ) : config.type === 'number' ? (
                    <Input type="number" step="0.01"/>
                ) : <Input/>}
            </Form.Item>
        ));
    };

    const columns = [
        { title: 'Meter ID', dataIndex: 'meterId', render: (t:string, r:any) => <span className="font-mono font-bold text-blue-600 cursor-pointer" onClick={() => openDetails(r)}>{t}</span> },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Type', dataIndex: 'meterType', render: (t:string) => t ? <Tag color="purple">{t}</Tag> : '-' },
        { title: 'Product', dataIndex: 'product', render: (t:string) => t ? <Tag>{t}</Tag> : '-' },
        { title: 'Instruments', render: (_:any, r:any) => <Tag color="cyan">{instruments.filter((i:any) => i.internalMeterId === r.id).length}</Tag> },
        { title: 'Actions', render: (_:any, r:any) => <Button size="small" icon={<Settings className="w-3 h-3"/>} onClick={() => openEdit(r)}>Edit</Button> }
    ];

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <h2 className="text-lg font-bold dark:text-white">Internal Flow Meters</h2>
                <Button type="primary" icon={<Plus className="w-4 h-4"/>} onClick={() => {
                    setEditMode(false); setSelectedMeter(null); setSelectedMeterType(null); form.resetFields(); setOpen(true);
                }}>Add Meter</Button>
            </div>

            <Table dataSource={meters} columns={columns} rowKey="id" size="small" loading={loading} className="dark-table" onRow={(record) => ({ onClick: () => openDetails(record) })}/>

            {/* Create/Edit Meter Modal */}
            <Modal title={editMode ? "Edit Meter" : "Add Internal Meter"} open={open} onCancel={() => setOpen(false)} onOk={form.submit} width={650}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="meterId" label="Meter ID" rules={[{required: true}]}><Input disabled={editMode}/></Form.Item>
                        <Form.Item name="meterType" label="Meter Type">
                            <Select allowClear onChange={handleMeterTypeChange} showSearch optionFilterProp="children">
                                {meterTypes.map((t:any) => <Option key={t.id} value={t.name}>{t.name}</Option>)}
                            </Select>
                        </Form.Item>
                    </div>
                    <Form.Item name="description" label="Description" rules={[{required: true}]}><Input/></Form.Item>
                    <Form.Item name="location" label="Location"><Input/></Form.Item>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="product" label="Product">
                            <Select allowClear showSearch optionFilterProp="children">
                                {products.map((p:any) => <Option key={p.id} value={p.name}>{p.name}</Option>)}
                            </Select>
                        </Form.Item>
                        
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="pipeSize" label="Pipe Size"><Input placeholder="e.g., 6 inch"/></Form.Item>
                        <Form.Item name="elementSize" label="Element Size"><Input placeholder="e.g., 4 inch"/></Form.Item>
                    </div>
                    {selectedMeterType && (
                        <Card size="small" title={`${selectedMeterType.name} Configuration`} className="mb-4 bg-gray-50 dark:bg-gray-900">
                            <div className="grid grid-cols-2 gap-4">{renderDynamicFields()}</div>
                        </Card>
                    )}
                </Form>
            </Modal>

            {/* Meter Details Modal */}
            <Modal title={<span className="font-bold">{selectedMeter?.meterId}</span>} open={detailsOpen} onCancel={() => setDetailsOpen(false)}
                footer={[
                    <Button key="addInst" type="primary" icon={<Component className="w-3 h-3"/>} onClick={() => { setAddInstOpen(true); instForm.resetFields(); }}>Add Instrument</Button>,
                    <Button key="edit" icon={<Pencil className="w-3 h-3"/>} onClick={() => { setDetailsOpen(false); openEdit(selectedMeter); }}>Edit Meter</Button>,
                    <Button key="close" onClick={() => setDetailsOpen(false)}>Close</Button>
                ]} width={900}
            >
                {selectedMeter && (
                    <div className="space-y-4">
                        <Descriptions bordered size="small" column={2}>
                            <Descriptions.Item label="Description">{selectedMeter.description}</Descriptions.Item>
                            <Descriptions.Item label="Meter Type">{selectedMeter.meterType || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Location">{selectedMeter.location || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Product">{selectedMeter.product || '-'}</Descriptions.Item>
                            
                            <Descriptions.Item label="Pipe Size">{selectedMeter.pipeSize ? selectedMeter.pipeSize + " inch" : "-"}</Descriptions.Item><Descriptions.Item label="Element Size">{selectedMeter.elementSize ? selectedMeter.elementSize + " inch" : "-"}</Descriptions.Item>
                        </Descriptions>
                        {selectedMeter.configData && Object.keys(selectedMeter.configData).length > 0 && (
                            <Card size="small" title="Type Configuration">
                                <Descriptions size="small" column={2}>
                                    {Object.entries(selectedMeter.configData).map(([k, v]) => <Descriptions.Item key={k} label={k}>{String(v)}</Descriptions.Item>)}
                                </Descriptions>
                            </Card>
                        )}
                        <Card size="small" title={`Meter Instruments Registry (${meterInstruments.length})`} extra={<Button size="small" type="primary" icon={<Plus className="w-3 h-3"/>} onClick={() => { setAddInstOpen(true); instForm.resetFields(); }}>Add New</Button>}>
                            <Table 
                                dataSource={meterInstruments} 
                                rowKey="tagId"
                                size="small"
                                pagination={false}
                                columns={[
                                    { title: 'Tag ID', dataIndex: 'tagId', render: (t:string) => <span className="font-mono font-bold text-blue-600">{t}</span> },
                                    { title: 'Description', dataIndex: 'description' },
                                    { title: 'Make/Model', render: (_:any, r:any) => `${r.make||'-'} / ${r.model||'-'}` },
                                    { title: 'Range', render: (_:any, r:any) => (r.rangeMin !== undefined || r.rangeMax !== undefined) ? `${r.rangeMin ?? 0}-${r.rangeMax ?? 0} ${r.unit}` : '-' },
                                    { title: 'Cal Freq', dataIndex: 'calibrationFreqMonths', render: (d:number) => `${d}M` }
                                ]}
                            />
                        </Card>
                    </div>
                )}
            </Modal>

            {/* Add Instrument Drawer */}
            <Drawer title="Add New Instrument to Registry" width={500} open={addInstOpen} onClose={() => setAddInstOpen(false)}>
                <Form form={instForm} layout="vertical" onFinish={handleAddInstrument}>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="tagId" label="Tag ID" rules={[{ required: true }]}>
                            <Input placeholder="e.g. PT-101" />
                        </Form.Item>
                        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                            <Select showSearch>
                                {instTypes.map((t: any) => <Option key={t.name} value={t.name}>{t.name}</Option>)}
                            </Select>
                        </Form.Item>
                    </div>
                    <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="installationId" label="Installation" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="children">
                            {installations.map((i: any) => (
                                <Option key={i.id} value={i.id}>{i.installationId}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <div className="grid grid-cols-3 gap-4">
                        <Form.Item name="rangeMin" label="Min"><InputNumber style={{width:'100%'}}/></Form.Item>
                        <Form.Item name="rangeMax" label="Max"><InputNumber style={{width:'100%'}}/></Form.Item>
                        <Form.Item name="unit" label="Unit"><Input/></Form.Item>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="make" label="Make"><Input/></Form.Item>
                        <Form.Item name="model" label="Model"><Input/></Form.Item>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="serialNo" label="Serial No"><Input/></Form.Item>
                        <Form.Item name="modelYear" label="Year"><InputNumber style={{width:'100%'}}/></Form.Item>
                    </div>
                    <Form.Item name="calibrationFreqMonths" label="Cal Freq (Months)" initialValue={12}>
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>Register Instrument</Button>
                </Form>
            </Drawer>
        </div>
    );
};
