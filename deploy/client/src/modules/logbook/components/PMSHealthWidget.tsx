import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, message } from 'antd';
import { Clock, CheckCircle } from 'lucide-react';
import axios from 'axios';

interface PMSStatus {
    id: string;
    taskName: string;
    frequency: number;
    lastDone: number;
    nextDue: number;
    remaining: number;
    status: 'Good' | 'Due Soon' | 'Overdue';
}

export const PMSHealthWidget = ({ equipmentTag }: { equipmentTag: string }) => {
    const [pmsList, setPmsList] = useState<PMSStatus[]>([]);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<PMSStatus | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        if (equipmentTag) fetchPMSStatus();
    }, [equipmentTag]);

    const fetchPMSStatus = async () => {
        try {
            const res = await axios.get(`/api/pms/status/${equipmentTag}`);
            setPmsList(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleQuickComplete = (task: PMSStatus) => {
        setSelectedTask(task);
        // Pre-fill modal with current meter guess (task.nextDue) or just leave blank?
        // Ideally we fetch current meter log.
        // For now, let user input.
        setIsCompleteModalOpen(true);
    };

    const submitComplete = async (values: any) => {
        if (!selectedTask) return;
        try {
            await axios.post('/api/pms/complete', {
                equipmentTag,
                pmsScheduleId: selectedTask.id,
                meterReading: values.meterReading,
                remarks: values.remarks,
                performedBy: 'System User' // Should come from Auth Context
            });
            message.success('PMS Recorded!');
            setIsCompleteModalOpen(false);
            form.resetFields();
            fetchPMSStatus(); // Specific refresh
        } catch (error) {
            message.error('Failed to complete PMS');
        }
    };

    const columns = [
        { title: 'Task', dataIndex: 'taskName', render: (t:string) => <span className="font-semibold">{t}</span> },
        { title: 'Freq (Hrs)', dataIndex: 'frequency' },
        { title: 'Last Done', dataIndex: 'lastDone', render: (v:number) => v.toLocaleString() },
        { title: 'Next Due', dataIndex: 'nextDue', render: (v:number) => v.toLocaleString() },
        { 
            title: 'Remaining', 
            dataIndex: 'remaining', 
            render: (v: number, r: PMSStatus) => {
                let color = 'green';
                if (r.status === 'Overdue') color = 'red';
                if (r.status === 'Due Soon') color = 'orange';
                return (
                    <Tag color={color} className="font-bold">
                        {v > 0 ? `${v.toLocaleString()} Hrs Left` : `${Math.abs(v).toLocaleString()} Hrs Overdue`}
                    </Tag>
                );
            }
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, r: PMSStatus) => (
                <Button 
                    size="small" 
                    type={r.status === 'Good' ? 'default' : 'primary'} 
                    danger={r.status === 'Overdue'}
                    icon={<CheckCircle className="w-3 h-3"/>}
                    onClick={() => handleQuickComplete(r)}
                >
                    Complete
                </Button>
            )
        }
    ];

    if (!pmsList.length) return <div className="p-4 text-gray-400 italic">No PMS Schedule defined for this equipment.</div>;

    return (
        <Card title={<div className="flex items-center gap-2"><Clock className="w-4 h-4"/> PMS Health Card</div>} size="small" className="border-l-4 border-l-blue-500 shadow-sm">
            <Table 
                dataSource={pmsList} 
                columns={columns} 
                rowKey="id" 
                pagination={false} 
                size="small"
            />

            <Modal title={`Complete Task: ${selectedTask?.taskName}`} open={isCompleteModalOpen} onCancel={() => setIsCompleteModalOpen(false)} onOk={form.submit}>
                <Form form={form} layout="vertical" onFinish={submitComplete}>
                    <Form.Item name="meterReading" label="Current Meter Reading" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="remarks" label="Remarks">
                        <Input.TextArea />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};
