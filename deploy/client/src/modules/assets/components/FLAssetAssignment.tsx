import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Button, Table, message, Tag, Tooltip, Empty, Tabs, Divider, Timeline } from 'antd';
import { 
  Plus, Trash2, ArrowRight, Settings, Zap, Gauge,
  Activity, Shield, Edit, RefreshCw
} from 'lucide-react';
import axios from 'axios';

const { Option } = Select;
const { TabPane } = Tabs;

interface Props {
  flId: string;
  flName: string;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FLAssetAssignment: React.FC<Props> = ({ flId, flName, visible, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [form] = Form.useForm();
  
  // Modes: ASSIGN, REPLACE, EDIT
  const [mode, setMode] = useState<'ASSIGN' | 'REPLACE' | 'EDIT'>('ASSIGN');
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignedRes, availableRes, historyRes] = await Promise.all([
        axios.get(`/api/fl-assets/${flId}`),
        axios.get(`/api/fl-assets/available?flId=${flId}`),
        axios.get(`/api/fl-assets/${flId}/history`)
      ]);
      setAssets(assignedRes.data);
      setAvailableAssets(availableRes.data.all);
      setHistory(historyRes.data);
    } catch (error) {
       // Silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && flId) fetchData();
  }, [visible, flId]);

  const handleSubmit = async (values: any) => {
    try {
      // Simulate user context (should verify role in real app)
      const performedBy = 'System Admin'; 
      
      const payload = { ...values, performedBy, reason: 'User Action' };

      if (mode === 'ASSIGN') {
         const selectedAsset = availableAssets.find(a => a.assetTag === values.assetTag);
         await axios.post('/api/fl-assets', {
           flId,
           ...payload,
           assetType: selectedAsset?.assetType
         });
         message.success('Assigned');
      } else if (mode === 'EDIT') {
         await axios.put(`/api/fl-assets/${selectedAssignment.id}`, payload);
         message.success('Updated');
      } else if (mode === 'REPLACE') {
         const selectedAsset = availableAssets.find(a => a.assetTag === values.newAssetTag);
         await axios.put(`/api/fl-assets/${selectedAssignment.id}/replace`, {
            ...payload,
            newAssetTag: values.newAssetTag,
            newAssetType: selectedAsset?.assetType,
         });
         message.success('Replaced');
      }

      form.resetFields();
      setMode('ASSIGN');
      setSelectedAssignment(null);
      fetchData();
      onSuccess();
    } catch (error: any) {
      message.error('Operation failed');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await axios.delete(`/api/fl-assets/${id}`, { data: { performedBy: 'System Admin', reason: 'Removal' } });
      message.success('Asset removed');
      fetchData();
      onSuccess();
    } catch (error) {
      message.error('Failed to remove');
    }
  };

  // Filter map items: Drive Train only
  const driveTrain = assets.filter(a => ['DRIVER', 'DRIVEN', 'CONTROLLER'].includes(a.function))
                         .sort((a,b) => (a.sequence || 0) - (b.sequence || 0));

  // Filter list items: Instruments etc
  const instruments = assets.filter(a => !['DRIVER', 'DRIVEN', 'CONTROLLER'].includes(a.function));

  const getFunctionIcon = (func: string) => {
    switch(func) {
      case 'DRIVER': return <Zap className="w-4 h-4 text-orange-500" />;
      case 'DRIVEN': return <Settings className="w-4 h-4 text-blue-500" />;
      case 'CONTROLLER': return <Activity className="w-4 h-4 text-purple-500" />;
      default: return <Gauge className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <Modal
      title={`Functional Location: ${flName}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1100}
    >
      <div className="flex gap-6">
        {/* Left: Visualization & List */}
        <div className="flex-1 space-y-6">
           
           {/* Drive Train Map */}
           <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-sm uppercase text-gray-500">Drive Train Sequence</h4>
                <Tag color="blue">Functional Block</Tag>
              </div>
              
              {driveTrain.length === 0 ? (
                <Empty description="No drive train defined (Add Driver/Driven)" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div className="flex items-center gap-2 overflow-x-auto p-2">
                    {driveTrain.map((item, idx) => (
                      <React.Fragment key={item.id}>
                        {idx > 0 && <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                        <div className="relative group border rounded p-3 min-w-[200px] bg-gray-50 dark:bg-gray-900">
                           <div className="flex justify-between items-start">
                              {getFunctionIcon(item.function)}
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="small" type="text" icon={<Edit className="w-3 h-3"/>} onClick={() => {
                                   setMode('EDIT'); setSelectedAssignment(item); form.setFieldsValue(item);
                                }}/>
                                <Button size="small" type="text" icon={<RefreshCw className="w-3 h-3"/>} onClick={() => {
                                   setMode('REPLACE'); setSelectedAssignment(item); form.resetFields();
                                }}/>
                                <Button size="small" type="text" danger icon={<Trash2 className="w-3 h-3"/>} onClick={() => handleRemove(item.id)}/>
                              </div>
                           </div>
                           <div className="mt-2 text-center">
                              <div className="font-bold text-blue-600">{item.assetTag}</div>
                              <div className="text-xs text-gray-500 truncate">{item.assetDetails?.description || item.assetType}</div>
                              <Tag className="mt-1 text-[10px]">{item.function}</Tag>
                           </div>
                        </div>
                      </React.Fragment>
                    ))}
                </div>
              )}
           </div>

           {/* Instruments / Protection List */}
           <div>
              <h4 className="font-bold text-sm uppercase text-gray-500 mb-2">Instruments & Protection Devices</h4>
              <Table 
                dataSource={instruments} 
                rowKey="id" 
                size="small"
                pagination={false}
                columns={[
                  { title: 'Tag', dataIndex: 'assetTag', render: (t) => <span className="font-bold">{t}</span> },
                  { title: 'Function', dataIndex: 'function', render: (t) => <Tag>{t}</Tag> },
                  { title: 'Type', dataIndex: 'assetType', render: (t) => <span className="text-xs text-gray-500">{t}</span> },
                  { title: 'Position', dataIndex: 'position' },
                  { title: 'Action', width: 100, render: (_, r) => (
                     <Button type="text" danger size="small" icon={<Trash2 className="w-4 h-4"/>} onClick={() => handleRemove(r.id)}/>
                  )}
                ]}
              />
           </div>
        </div>

        {/* Right: Actions & History */}
        <div className="w-[350px] border-l pl-4 flex flex-col h-[600px]">
           <Tabs defaultActiveKey="action">
             <TabPane tab="Actions" key="action">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4 border dark:border-gray-700">
                   <h4 className="font-bold mb-3 text-gray-800 dark:text-gray-100">
                      {mode === 'ASSIGN' ? 'Add Assignment' : mode === 'EDIT' ? `Edit ${selectedAssignment?.assetTag}` : `Replace ${selectedAssignment?.assetTag}`}
                   </h4>
                   <Form form={form} layout="vertical" onFinish={handleSubmit}>
                      {mode === 'REPLACE' ? (
                          <Form.Item name="newAssetTag" label="New Asset" rules={[{ required: true }]}>
                            <Select showSearch placeholder="Search asset..." optionFilterProp="children">
                              {availableAssets.map(a => (
                                <Option key={a.assetTag} value={a.assetTag}>{a.assetTag} - {a.description}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                      ) : (
                          mode === 'ASSIGN' && (
                            <Form.Item name="assetTag" label="Asset" rules={[{ required: true }]}>
                              <Select showSearch placeholder="Search asset..." optionFilterProp="children">
                                {availableAssets.map(a => (
                                  <Option key={a.assetTag} value={a.assetTag}>{a.assetTag} - {a.description}</Option>
                                ))}
                              </Select>
                            </Form.Item>
                          )
                      )}

                      {(mode === 'ASSIGN' || mode === 'EDIT') && (
                        <>
                          <Form.Item name="function" label="Function" rules={[{ required: true }]}>
                            <Select>
                              <Option value="DRIVER">Driver</Option>
                              <Option value="DRIVEN">Driven</Option>
                              <Option value="CONTROLLER">Controller</Option>
                              <Option value="SENSOR">Sensor</Option>
                              <Option value="PROTECTION">Protection Device</Option>
                              <Option value="METER">Meter</Option>
                            </Select>
                          </Form.Item>
                          <Form.Item name="position" label="Position">
                            <Select allowClear>
                              <Option value="SUCTION">Suction</Option>
                              <Option value="DISCHARGE">Discharge</Option>
                              <Option value="BEARING">Bearing DE/NDE</Option>
                            </Select>
                          </Form.Item>
                        </>
                      )}
                      
                      <Form.Item name="remarks" label="Remarks / Justification">
                         <Input.TextArea rows={2} />
                      </Form.Item>

                      <div className="flex gap-2">
                         {mode !== 'ASSIGN' && (
                            <Button onClick={() => { setMode('ASSIGN'); setSelectedAssignment(null); form.resetFields(); }}>Cancel</Button>
                         )}
                         <Button type="primary" htmlType="submit" block>
                            {mode === 'ASSIGN' ? 'Assign Asset' : 'Save Changes'}
                         </Button>
                      </div>
                   </Form>
                </div>
             </TabPane>
             
             <TabPane tab="Audit Trail" key="history">
                <Timeline className="mt-4 max-h-[500px] overflow-y-auto px-2">
                   {history.map(log => (
                      <Timeline.Item key={log.id} color={log.action === 'ASSIGN' ? 'green' : log.action === 'UNASSIGN' ? 'red' : 'blue'}>
                         <div className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</div>
                         <div className="font-bold text-sm">{log.action} {log.assetTag}</div>
                         <div className="text-xs text-gray-500">by {log.performedBy}</div>
                         {log.action === 'REPLACE' && <div className="text-xs">Replaced: {log.previousAssetTag}</div>}
                         {log.reason && <div className="text-xs italic mt-1">"{log.reason}"</div>}
                      </Timeline.Item>
                   ))}
                   {history.length === 0 && <Empty description="No history" image={Empty.PRESENTED_IMAGE_SIMPLE}/>}
                </Timeline>
             </TabPane>
           </Tabs>
        </div>
      </div>
    </Modal>
  );
};
