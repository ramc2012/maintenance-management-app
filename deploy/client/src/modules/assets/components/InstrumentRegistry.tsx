import React, { useState, useEffect } from 'react';
import { Table, Button, Drawer, Form, Input, Select, InputNumber, Tag, message, Space } from 'antd';
import { Plus, Search, Filter, Pencil } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;

export const InstrumentRegistry = () => {
    const [instruments, setInstruments] = useState([]);
    const [filteredInstruments, setFilteredInstruments] = useState([]);
    const [installations, setInstallations] = useState([]);
    const [types, setTypes] = useState([]);
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    // Filters
    const [filterInst, setFilterInst] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [instRes, installRes, typeRes] = await Promise.all([
                axios.get('/api/equipment/instruments'),
                axios.get('/api/equipment/installations'),
                axios.get('/api/equipment/types')
            ]);
            
            // Filter out instruments that are linked to meters
            const standaloneInstruments = instRes.data.filter((i: any) => !i.custodyMeterId && !i.internalMeterId);
            
            setInstruments(standaloneInstruments);
            setFilteredInstruments(standaloneInstruments);
            setInstallations(installRes.data);
            setTypes(typeRes.data);
        } catch (error) {
            message.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        let res = instruments;
        if (filterInst) res = res.filter((i: any) => i.installationId === filterInst);
        if (filterType) res = res.filter((i: any) => i.type === filterType);
        if (searchText) {
            const lower = searchText.toLowerCase();
            res = res.filter((i: any) => 
                i.tagId.toLowerCase().includes(lower) || 
                i.description.toLowerCase().includes(lower)
            );
        }
        setFilteredInstruments(res);
    }, [filterInst, filterType, searchText, instruments]);

    const handleCreate = async (values: any) => {
        try {
            if (editMode && activeTag) {
                await axios.put(`/api/equipment/instruments/${activeTag}`, values);
                message.success('Instrument updated');
            } else {
                await axios.post('/api/equipment/instruments', values);
                message.success('Instrument registered');
            }
            setOpen(false);
            setEditMode(false);
            setActiveTag(null);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error('Failed to save instrument');
        }
    };

    const columns = [
        { title: 'Tag ID', dataIndex: 'tagId', key: 'tagId', sorter: (a:any, b:any) => a.tagId.localeCompare(b.tagId), render: (t:string) => <span className="font-mono font-bold text-blue-600">{t}</span> },
        { title: 'Description', dataIndex: 'description', key: 'description' },
        { 
            title: 'Installation', 
            dataIndex: ['installation', 'installationId'], 
            key: 'installation',
            render: (id: string, r: any) => (
                <span>{id || '-'} <span className="text-xs text-gray-400">({r.installation?.location || ''})</span></span>
            )
        },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (t: string) => <Tag color="blue">{t}</Tag> },
        { title: 'Range', key: 'range', render: (_: any, r: any) => (r.rangeMin || r.rangeMax) ? `${r.rangeMin || 0} - ${r.rangeMax || ''} ${r.unit || ''}` : '-' },
        { title: 'Make/Model', render: (_:any, r:any) => `${r.make || '-'}/${r.model || '-'}` },
        { title: 'Cal Freq', dataIndex: 'calibrationFreqMonths', key: 'freq', render: (m:number) => m ? `${m} M` : '-' },
        { 
            title: 'Action', 
            render: (_:any, r:any) => (
                <Button 
                    type="text" 
                    icon={<Pencil className="w-3 h-3 text-blue-600"/>} 
                    onClick={() => {
                        setEditMode(true);
                        setActiveTag(r.tagId);
                        form.setFieldsValue(r);
                        setOpen(true);
                    }}
                />
            ) 
        }
    ];

    return (
        <div className="p-4 space-y-4">
             <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <div className="flex gap-4 items-center">
                    <h2 className="text-lg font-bold dark:text-white">Instrument Registry</h2>
                    <Tag color="orange">Standalone Only</Tag>
                </div>
                
                <div className="flex gap-2">
                    <Input 
                        prefix={<Search className="w-4 h-4 text-gray-400"/>} 
                        placeholder="Search Tag ID..." 
                        className="w-48" 
                        onChange={e => setSearchText(e.target.value)}
                    />
                     <Select 
                        placeholder="Installation" 
                        className="w-40" 
                        allowClear 
                        onChange={setFilterInst}
                    >
                        {installations.map((i: any) => <Option key={i.id} value={i.id}>{i.installationId}</Option>)}
                    </Select>
                    <Button type="primary" icon={<Plus className="w-4 h-4"/>} onClick={() => {
                        setEditMode(false);
                        setActiveTag(null);
                        form.resetFields();
                        setOpen(true);
                    }}>
                        Add Instrument
                    </Button>
                </div>
            </div>

            <Table 
                dataSource={filteredInstruments} 
                columns={columns} 
                rowKey="tagId" 
                loading={loading}
                size="small"
                className="dark-table" footer={() => <div className="flex gap-4 font-medium text-xs text-gray-500"><span>Total: {instruments.length}</span><span>Filtered: {filteredInstruments.length}</span></div>}
            />

            <Drawer
                title={editMode ? "Edit Instrument" : "Register New Instrument"}
                width={600}
                onClose={() => { setOpen(false); setEditMode(false); form.resetFields(); }}
                open={open}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="tagId" label="Tag ID" rules={[{ required: true }]}>
                            <Input placeholder="e.g. PT-101" disabled={editMode} />
                        </Form.Item>
                        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                            <Select showSearch>
                                {types.map((t: any) => <Option key={t.name} value={t.name}>{t.name}</Option>)}
                            </Select>
                        </Form.Item>
                    </div>
                    
                    <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    
                    <Form.Item name="installationId" label="Installation" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="children">
                            {installations.map((i: any) => (
                                <Option key={i.id} value={i.id}>{i.installationId}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <div className="grid grid-cols-3 gap-4">
                        <Form.Item name="rangeMin" label="Min">
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="rangeMax" label="Max">
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="unit" label="Unit">
                            <Input placeholder="e.g. bar" />
                        </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="make" label="Make"><Input /></Form.Item>
                        <Form.Item name="model" label="Model"><Input /></Form.Item>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="serialNo" label="Serial No"><Input /></Form.Item>
                        <Form.Item name="modelYear" label="Model Year"><InputNumber style={{ width: '100%' }} /></Form.Item>
                    </div>

                    <Form.Item name="calibrationFreqMonths" label="Cal Freq (Months)" initialValue={12}>
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block>{editMode ? "Update Instrument" : "Register Instrument"}</Button>
                </Form>
            </Drawer>
        </div>
    );
};
