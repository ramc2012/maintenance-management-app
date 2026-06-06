import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, Empty, Row, Select, Skeleton, Tag, Timeline } from 'antd';
import { Activity, Flame, Wrench } from 'lucide-react';
import axios from 'axios';

const timelineColor = (type: string) => {
  if (type === 'COMPRESSOR_LOG') return 'red';
  if (type === 'MAINTENANCE_LOG') return 'gold';
  return 'blue';
};

const timelineIcon = (type: string) => {
  if (type === 'COMPRESSOR_LOG') return <Flame className="w-4 h-4 text-red-500" />;
  if (type === 'MAINTENANCE_LOG') return <Wrench className="w-4 h-4 text-amber-500" />;
  return <Activity className="w-4 h-4 text-blue-500" />;
};

export const AssetTimeline: React.FC<{ discipline?: 'MECHANICAL' | 'ELECTRICAL' }> = ({ discipline }) => {
  const [installations, setInstallations] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [installationId, setInstallationId] = useState<string>('');
  const [equipmentTag, setEquipmentTag] = useState<string>('');
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInstallations = async () => {
      try {
        const response = await axios.get('/api/equipment/installations');
        setInstallations(response.data || []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchInstallations();
  }, []);

  useEffect(() => {
    const fetchEquipment = async () => {
      if (!installationId) {
        setEquipment([]);
        setEquipmentTag('');
        return;
      }
      try {
        const response = await axios.get('/api/equipment/running-equip', {
          params: { installationId, ...(discipline ? { discipline } : {}) },
        });
        setEquipment(response.data || []);
      } catch (error) {
        console.error(error);
        setEquipment([]);
      }
    };
    fetchEquipment();
  }, [installationId]);

  useEffect(() => {
    const fetchTimeline = async () => {
      if (!equipmentTag) {
        setTimeline(null);
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get(`/api/operations/assets/${encodeURIComponent(equipmentTag)}/timeline`, {
          params: discipline ? { discipline } : undefined,
        });
        setTimeline(response.data);
      } catch (error) {
        console.error(error);
        setTimeline(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [discipline, equipmentTag]);

  const counters = useMemo(() => {
    const items = timeline?.timeline || [];
    return {
      operational: items.filter((item: any) => item.type === 'OPERATIONAL_LOG').length,
      maintenance: items.filter((item: any) => item.type === 'MAINTENANCE_LOG').length,
      process: items.filter((item: any) => item.type === 'COMPRESSOR_LOG').length,
    };
  }, [timeline]);

  return (
    <div className="space-y-4">
      <Card size="small">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select
            allowClear
            placeholder="Select Installation"
            value={installationId || undefined}
            onChange={(value) => {
              setInstallationId(value || '');
              setEquipmentTag('');
            }}
          >
            {installations.map((installation) => (
              <Select.Option key={installation.id} value={installation.id}>
                {installation.installationId}
              </Select.Option>
            ))}
          </Select>
          <Select
            showSearch
            allowClear
            placeholder={installationId ? 'Select Equipment' : 'Select installation first'}
            value={equipmentTag || undefined}
            onChange={(value) => setEquipmentTag(value || '')}
            disabled={!installationId}
            optionFilterProp="children"
          >
            {equipment.map((item) => (
              <Select.Option key={item.equipmentTag} value={item.equipmentTag}>
                {item.equipmentTag} - {item.description}
              </Select.Option>
            ))}
          </Select>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Selected Asset</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{timeline?.equipment?.equipmentTag || 'No asset selected'}</div>
            <div className="text-xs text-gray-500">{timeline?.equipment?.description || 'Timeline merges operations, field work, and compressor process logs.'}</div>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
      ) : !timeline ? (
        <Card><Empty description="Choose an equipment tag to open its asset timeline" /></Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card size="small">
                <div className="text-xs uppercase tracking-wide text-gray-500">Operational Logs</div>
                <div className="mt-2 text-3xl font-bold text-blue-600">{counters.operational}</div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small">
                <div className="text-xs uppercase tracking-wide text-gray-500">Maintenance Events</div>
                <div className="mt-2 text-3xl font-bold text-amber-600">{counters.maintenance}</div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small">
                <div className="text-xs uppercase tracking-wide text-gray-500">Process Logs</div>
                <div className="mt-2 text-3xl font-bold text-red-600">{counters.process}</div>
              </Card>
            </Col>
          </Row>

          <Card title="Unified Asset Timeline" size="small">
            <Timeline
              items={(timeline.timeline || []).map((item: any) => ({
                color: timelineColor(item.type),
                dot: timelineIcon(item.type),
                children: (
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</div>
                      </div>
                      <Tag color={timelineColor(item.type)}>{item.type.replace('_', ' ')}</Tag>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">{item.subtitle}</div>
                    {item.type === 'OPERATIONAL_LOG' && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 md:grid-cols-4">
                        <div>Runtime: <strong>{item.payload.runtimeHours} hrs</strong></div>
                        <div>Downtime: <strong>{item.payload.downtimeHours} hrs</strong></div>
                        <div>State: <strong>{item.payload.operatingState || '-'}</strong></div>
                        <div>Source: <strong>{item.payload.sourceMode}</strong></div>
                      </div>
                    )}
                    {item.type === 'MAINTENANCE_LOG' && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 md:grid-cols-4">
                        <div>Section: <strong>{item.payload.section}</strong></div>
                        <div>Status: <strong>{item.payload.status}</strong></div>
                        <div>Duration: <strong>{item.payload.durationHours} hrs</strong></div>
                        <div>By: <strong>{item.payload.createdBy}</strong></div>
                      </div>
                    )}
                    {item.type === 'COMPRESSOR_LOG' && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 md:grid-cols-4">
                        <div>Output Gas: <strong>{(item.payload.outputGasVolume ?? item.payload.gasCompressed ?? 0).toLocaleString()} m³</strong></div>
                        <div>Fuel Gas: <strong>{(item.payload.fuelGasVolume ?? 0).toLocaleString()} m³</strong></div>
                        <div>Load: <strong>{item.payload.loadPct ?? 0}%</strong></div>
                        <div>Trips: <strong>{item.payload.tripCount ?? 0}</strong></div>
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          </Card>
        </>
      )}
    </div>
  );
};
