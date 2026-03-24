import React, { useState, useEffect } from 'react';
import { Tree, Button, Modal, Form, Input, Select, message, Tag, Spin, Empty, Tooltip, Popconfirm } from 'antd';
import { 
  Building2, Layers, Box, Cpu, Plus, ChevronRight, ChevronDown,
  Zap, Settings, Edit, Trash2, Wrench, Gauge
} from 'lucide-react';
import axios from 'axios';

const { Option } = Select;

interface Site { id: string; siteId: string; name: string; location?: string; areas: Area[]; }
interface Area { id: string; areaId: string; name: string; systems: System[]; }
interface System { id: string; systemTag: string; name: string; functionalLocations: FL[]; }
interface FL { id: string; flId: string; name: string; flType: string; positionType?: string; currentAsset?: any; childFls?: FL[]; assignments?: any[]; }

interface Props {
  onSelectFL?: (fl: FL | null) => void;
  selectedFlId?: string;
  isAdmin?: boolean;
}

export const HierarchyTree: React.FC<Props> = ({ onSelectFL, selectedFlId, isAdmin = true }) => {
  const [hierarchy, setHierarchy] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'site' | 'area' | 'system' | 'fl'>('site');
  const [editMode, setEditMode] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/fl/hierarchy');
      
      const withAssignments = await Promise.all(res.data.map(async (site: Site) => ({
        ...site,
        areas: await Promise.all(site.areas.map(async (area: Area) => ({
          ...area,
          systems: await Promise.all(area.systems.map(async (system: System) => ({
            ...system,
            functionalLocations: await Promise.all(system.functionalLocations.map(async (fl: FL) => {
              try {
                const assignRes = await axios.get(`/api/fl-assets/${fl.id}`);
                return { ...fl, assignments: assignRes.data || [] };
              } catch { return { ...fl, assignments: [] }; }
            }))
          })))
        })))
      })));
      
      setHierarchy(withAssignments);
      if (withAssignments.length > 0) {
        setExpandedKeys(withAssignments.map((s: Site) => `site-${s.id}`));
      }
    } catch (error) {
      message.error('Failed to load hierarchy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHierarchy(); }, []);

  const openCreateModal = (type: 'site' | 'area' | 'system' | 'fl', parentIdValue?: string) => {
    setModalType(type);
    setEditMode(false);
    setEditItem(null);
    setParentId(parentIdValue || null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (type: 'site' | 'area' | 'system' | 'fl', item: any) => {
    setModalType(type);
    setEditMode(true);
    setEditItem(item);
    form.setFieldsValue(item);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    try {
      let endpoint = '';
      let data = values;
      
      if (editMode && editItem) {
        endpoint = modalType === 'site' ? `/api/fl/sites/${editItem.id}` :
                   modalType === 'area' ? `/api/fl/areas/${editItem.id}` :
                   modalType === 'system' ? `/api/fl/systems/${editItem.id}` :
                   `/api/fl/locations/${editItem.id}`;
        await axios.put(endpoint, values);
        message.success('Updated successfully');
      } else {
        switch (modalType) {
          case 'site': endpoint = '/api/fl/sites'; break;
          case 'area': endpoint = '/api/fl/areas'; data = { ...values, siteId: parentId }; break;
          case 'system': endpoint = '/api/fl/systems'; data = { ...values, areaId: parentId }; break;
          case 'fl': endpoint = '/api/fl/locations'; data = { ...values, systemId: parentId }; break;
        }
        await axios.post(endpoint, data);
        message.success('Created successfully');
      }
      handleModalClose();
      fetchHierarchy();
    } catch (error) {
      message.error('Operation failed');
    }
  };

  const handleDelete = async (type: string, id: string) => {
    try {
      const endpoint = type === 'site' ? `/api/fl/sites/${id}` :
                       type === 'area' ? `/api/fl/areas/${id}` :
                       type === 'system' ? `/api/fl/systems/${id}` :
                       `/api/fl/locations/${id}`;
      await axios.delete(endpoint);
      message.success('Deleted');
      fetchHierarchy();
    } catch (error) {
      message.error('Delete failed');
    }
  };

  const handleNodeClick = (key: string) => {
    if (expandedKeys.includes(key)) {
      setExpandedKeys(expandedKeys.filter(k => k !== key));
    } else {
      setExpandedKeys([...expandedKeys, key]);
    }
  };

  const buildAssetNode = (assignment: any): any => {
    const isEquip = assignment.assetType === 'RUNNING_EQUIPMENT';
    const isMeter = assignment.assetType?.includes('METER');
    return {
      key: `asset-${assignment.id}`,
      title: (
        <div className="flex items-center gap-2 py-0.5">
          {isEquip && <Wrench className="w-3 h-3 text-green-500" />}
          {isMeter && <Gauge className="w-3 h-3 text-cyan-500" />}
          {!isEquip && !isMeter && <Settings className="w-3 h-3 text-gray-400" />}
          <Tooltip title={assignment.assetDetails?.description || assignment.assetTag}>
            <span className="font-mono text-xs text-green-400">{assignment.assetTag}</span>
          </Tooltip>
          <Tag color={assignment.function === 'DRIVER' ? 'orange' : assignment.function === 'DRIVEN' ? 'blue' : 'default'} className="text-[10px]">
            {assignment.function}
          </Tag>
        </div>
      ),
      isLeaf: true,
      selectable: false
    };
  };

  const buildFlNode = (fl: FL): any => {
    const assetNodes = (fl.assignments || []).map(a => buildAssetNode(a));
    const childFlNodes = fl.childFls?.map(child => buildFlNode(child)) || [];
    const allChildren = [...assetNodes, ...childFlNodes];
    
    return {
      key: `fl-${fl.id}`,
      title: (
        <div className="flex items-center gap-2 py-1 group cursor-pointer" onClick={() => handleNodeClick(`fl-${fl.id}`)}>
          <Cpu className={`w-4 h-4 ${fl.positionType === 'DRIVER' ? 'text-yellow-500' : fl.positionType === 'DRIVEN' ? 'text-blue-500' : 'text-gray-500'}`} />
          <Tooltip title={fl.name}><span className="font-mono text-sm font-bold">{fl.flId}</span></Tooltip>
          {fl.flType && <Tag color="purple" className="text-xs">{fl.flType}</Tag>}
          {(fl.assignments?.length || 0) > 0 && <Tag color="green" className="text-xs">{fl.assignments?.length} assets</Tag>}
          {isAdmin && (
            <span className="ml-2 opacity-0 group-hover:opacity-100">
              <Button size="small" type="text" icon={<Edit className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); openEditModal('fl', fl); }} />
              <Popconfirm title="Delete?" onConfirm={() => handleDelete('fl', fl.id)}><Button size="small" type="text" danger icon={<Trash2 className="w-3 h-3" />} onClick={(e) => e.stopPropagation()} /></Popconfirm>
            </span>
          )}
        </div>
      ),
      data: fl,
      children: allChildren,
      isLeaf: allChildren.length === 0
    };
  };

  const treeData = hierarchy.map((site) => ({
    key: `site-${site.id}`,
    title: (
      <div className="flex items-center gap-2 py-1 group cursor-pointer" onClick={() => handleNodeClick(`site-${site.id}`)}>
        <Building2 className="w-4 h-4 text-blue-600" />
        <Tooltip title={site.name}><span className="font-bold">{site.siteId}</span></Tooltip>
        <Button size="small" type="text" icon={<Plus className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); openCreateModal('area', site.id); }} />
        {isAdmin && (
          <span className="opacity-0 group-hover:opacity-100">
            <Button size="small" type="text" icon={<Edit className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); openEditModal('site', site); }} />
            <Popconfirm title="Delete?" onConfirm={() => handleDelete('site', site.id)}><Button size="small" type="text" danger icon={<Trash2 className="w-3 h-3" />} onClick={(e) => e.stopPropagation()} /></Popconfirm>
          </span>
        )}
      </div>
    ),
    children: site.areas.map((area) => ({
      key: `area-${area.id}`,
      title: (
        <div className="flex items-center gap-2 py-1 group cursor-pointer" onClick={() => handleNodeClick(`area-${area.id}`)}>
          <Layers className="w-4 h-4 text-green-600" />
          <Tooltip title={area.name}><span className="font-semibold">{area.areaId}</span></Tooltip>
          <Button size="small" type="text" icon={<Plus className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); openCreateModal('system', area.id); }} />
          {isAdmin && (
            <span className="opacity-0 group-hover:opacity-100">
              <Button size="small" type="text" icon={<Edit className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); openEditModal('area', area); }} />
              <Popconfirm title="Delete?" onConfirm={() => handleDelete('area', area.id)}><Button size="small" type="text" danger icon={<Trash2 className="w-3 h-3" />} onClick={(e) => e.stopPropagation()} /></Popconfirm>
            </span>
          )}
        </div>
      ),
      children: area.systems.map((system) => ({
        key: `system-${system.id}`,
        title: (
          <div className="flex items-center gap-2 py-1 group cursor-pointer" onClick={() => handleNodeClick(`system-${system.id}`)}>
            <Box className="w-4 h-4 text-orange-600" />
            <Tooltip title={system.name}><span className="font-mono">{system.systemTag}</span></Tooltip>
            <Button size="small" type="text" icon={<Plus className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); openCreateModal('fl', system.id); }} />
            {isAdmin && (
              <span className="opacity-0 group-hover:opacity-100">
                <Button size="small" type="text" icon={<Edit className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); openEditModal('system', system); }} />
                <Popconfirm title="Delete?" onConfirm={() => handleDelete('system', system.id)}><Button size="small" type="text" danger icon={<Trash2 className="w-3 h-3" />} onClick={(e) => e.stopPropagation()} /></Popconfirm>
              </span>
            )}
          </div>
        ),
        children: system.functionalLocations.map(fl => buildFlNode(fl))
      }))
    }))
  }));

  const handleSelect = (keys: any[], info: any) => {
    if (info.node?.data && onSelectFL) {
      onSelectFL(info.node.data);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Spin size="large" /></div>;
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <h3 className="font-bold text-sm dark:text-white">Asset Hierarchy</h3>
        <Button size="small" type="primary" icon={<Plus className="w-3 h-3" />} onClick={() => openCreateModal('site')}>Site</Button>
      </div>
      
      {/* Tree or Empty State */}
      {hierarchy.length === 0 ? (
        <div className="p-4">
          <Empty description="No hierarchy defined">
            <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => openCreateModal('site')}>Add First Site</Button>
          </Empty>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-2 bg-gray-50 dark:bg-gray-900">
          <Tree
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys as string[])}
            onSelect={handleSelect}
            selectedKeys={selectedFlId ? [`fl-${selectedFlId}`] : []}
            showLine={{ showLeafIcon: false }}
            switcherIcon={({ expanded }) => expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            className="bg-transparent"
          />
        </div>
      )}

      {/* Modal - Always rendered */}
      <Modal 
        title={`${editMode ? 'Edit' : 'Create'} ${modalType.toUpperCase()}`} 
        open={modalVisible} 
        onCancel={handleModalClose} 
        onOk={form.submit}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {modalType === 'site' && (
            <>
              <Form.Item name="siteId" label="Site ID" rules={[{ required: true }]}>
                <Input placeholder="e.g., VAD-PLANT-A" />
              </Form.Item>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="location" label="Location">
                <Input />
              </Form.Item>
            </>
          )}
          {modalType === 'area' && (
            <>
              <Form.Item name="areaId" label="Area ID" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </>
          )}
          {modalType === 'system' && (
            <>
              <Form.Item name="systemTag" label="System Tag" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </>
          )}
          {modalType === 'fl' && (
            <>
              <Form.Item name="flId" label="FL ID" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="flType" label="FL Type" rules={[{ required: true }]}>
                <Select>
                  <Option value="SKID">Skid</Option>
                  <Option value="POSITION">Position</Option>
                  <Option value="PROTECTION">Protection</Option>
                </Select>
              </Form.Item>
              <Form.Item name="positionType" label="Position Type">
                <Select allowClear>
                  <Option value="DRIVER">Driver</Option>
                  <Option value="DRIVEN">Driven</Option>
                </Select>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};
