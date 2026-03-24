import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, message, Card, List, Divider } from 'antd';
import { Plus, Settings, Trash2, Calendar } from 'lucide-react';
import axios from 'axios';

const { Option } = Select;

export const EquipmentTypeManager = () => {
    const [types, setTypes] = useState([]);
    const [pms, setPms] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Modal State
    const [typeModal, setTypeModal] = useState(false);
    const [pmModal, setPmModal] = useState(false);
    const [selectedType, setSelectedType] = useState<any>(null);
    const [editMode, setEditMode] = useState(false);

    const [form] = Form.useForm();
    const [pmForm] = Form.useForm();

    const fetchTypes = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/equipment/equipment-types');
            setTypes(res.data);
        } catch (e) { message.error('Failed to load types'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTypes(); }, []);

    const fetchPMs = async (typeId: string) => {
        try {
            const res = await axios.get(`/api/equipment/pm-schedules?equipTypeId=${typeId}`);
            setPms(res.data);
        } catch (e) { message.error('Failed to load PMs'); }
    }

    const handleTypeSubmit = async (values: any) => {
        try {
            if (editMode && selectedType) {
                await axios.put(`/api/equipment/equipment-types/${selectedType.id}`, values);
                message.success('Type updated');
            } else {
                await axios.post('/api/equipment/equipment-types', values);
                message.success('Type created');
            }
            setTypeModal(false);
            setEditMode(false);
            form.resetFields();
            fetchTypes();
        } catch (e) { message.error('Failed to save type'); }
    };

    const handlePmSubmit = async (values: any) => {
        try {
            await axios.post('/api/equipment/pm-schedules', {
                ...values,
                equipmentTypeId: selectedType.id
            });
            message.success('PM Added');
            pmForm.resetFields();
            fetchPMs(selectedType.id);
        } catch (e) { message.error('Failed to add PM'); }
    };

    const deletePM = async (id: string) => {
        try {
            await axios.delete(`/api/equipment/pm-schedules/${id}`);
            message.success('PM Deleted');
            fetchPMs(selectedType.id);
        } catch (e) { message.error('Failed'); }
    };

    const openPmManager = (type: any) => {
        setSelectedType(type);
        fetchPMs(type.id);
        setPmModal(true);
    };

    const columns = [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Category', dataIndex: 'category', render: (t:string) => <Tag color={t==='RUNNING'?'green':'orange'}>{t}</Tag> },
        { title: 'Make', dataIndex: 'make' },
        { title: 'Model', dataIndex: 'model' },
        { 
            title: 'Actions', 
            render: (_:any, r:any) => (
                <div className="flex gap-2">
                    <Button size="small" icon={<Calendar className="w-3 h-3"/>} onClick={()=>openPmManager(r)}>PMs</Button>
                    <Button size="small" icon={<Settings className="w-3 h-3"/>} onClick={()=>{
                        setSelectedType(r); setEditMode(true); form.setFieldsValue(r); setTypeModal(true);
                    }}>Edit</Button>
                </div>
            )
        }
    ];

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <h2 className="text-lg font-bold dark:text-white">Equipment Types</h2>
                <Button type="primary" icon={<Plus className="w-4 h-4"/>} onClick={()=>{
                    setEditMode(false); form.resetFields(); setTypeModal(true);
                }}>Add Type</Button>
            </div>

            <Table 
                dataSource={types} 
                columns={columns} 
                rowKey="id" 
                size="small"
                loading={loading}
                className="dark-table"
            />

            {/* Type Modal */}
            <Modal
                title={editMode ? "Edit Type" : "Create Equipment Type"}
                open={typeModal}
                onCancel={()=>setTypeModal(false)}
                onOk={form.submit}
            >
                <Form form={form} layout="vertical" onFinish={handleTypeSubmit}>
                    <Form.Item name="name" label="Type Name (e.g. Centrifugal Pump)" rules={[{required: true}]}><Input/></Form.Item>
                    <Form.Item name="category" label="Category" rules={[{required: true}]}>
                        <Select>
                            <Option value="STATIC">Static</Option>
                            <Option value="RUNNING">Running</Option>
                        </Select>
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="make" label="Default Make"><Input/></Form.Item>
                        <Form.Item name="model" label="Default Model"><Input/></Form.Item>
                    </div>
                </Form>
            </Modal>

            {/* PM Modal */}
            <Modal
                title={`PM Schedules: ${selectedType?.name}`}
                open={pmModal}
                onCancel={()=>setPmModal(false)}
                footer={null}
                width={700}
            >
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700">
                    <h4 className="font-bold mb-2">Add Schedule</h4>
                    <Form form={pmForm} layout="inline" onFinish={handlePmSubmit}>
                        <Form.Item name="frequency" rules={[{required:true}]} style={{width: 150}}>
                            <Select placeholder="Frequency">
                                <Option value="DAILY">Daily</Option>
                                <Option value="MONTHLY">Monthly</Option>
                                <Option value="QUARTERLY">Quarterly</Option>
                                <Option value="HALF_YEARLY">Half Yearly</Option>
                                <Option value="YEARLY">Yearly</Option>
                                <Option value="MOH">MOH</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="taskDescription" rules={[{required:true}]} style={{flex:1}}>
                            <Input placeholder="Description..."/>
                        </Form.Item>
                        <Button type="primary" htmlType="submit">Add</Button>
                    </Form>
                </div>
                
                <List
                    dataSource={pms}
                    renderItem={(item: any) => (
                        <List.Item actions={[<Trash2 className="w-4 h-4 text-red-500 cursor-pointer" onClick={()=>deletePM(item.id)}/>]}>
                            <List.Item.Meta
                                title={<Tag color="blue">{item.frequency}</Tag>}
                                description={item.taskDescription}
                            />
                        </List.Item>
                    )}
                />
            </Modal>
        </div>
    );
};
