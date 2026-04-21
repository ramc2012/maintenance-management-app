import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, Empty, Progress, Row, Select, Statistic, Tag } from 'antd';
import { Activity, AlertTriangle, BarChart3, Clock3, Cpu, Gauge, TimerReset } from 'lucide-react';
import axios from 'axios';

interface OperationsOverviewProps {
  focus?: 'mechanical' | 'electrical' | 'process';
}

const formatNumber = (value: number) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

export const OperationsOverview: React.FC<OperationsOverviewProps> = ({ focus = 'mechanical' }) => {
  const [installations, setInstallations] = useState<any[]>([]);
  const [installationId, setInstallationId] = useState<string>('');
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const accent = useMemo(() => {
    if (focus === 'electrical') return { primary: '#f59e0b', secondary: '#92400e', title: 'Electrical Operations Overview' };
    if (focus === 'process') return { primary: '#dc2626', secondary: '#7f1d1d', title: 'Process Operations Overview' };
    return { primary: '#2563eb', secondary: '#1e3a8a', title: 'Mechanical Operations Overview' };
  }, [focus]);

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
    const fetchOverview = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/operations/overview', {
          params: installationId ? { installationId } : {},
        });
        setOverview(response.data);
      } catch (error) {
        console.error(error);
        setOverview(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [installationId]);

  const maxTrend = Math.max(
    1,
    ...(overview?.trend || []).flatMap((item: any) => [item.runtime || 0, item.downtime || 0]),
  );

  return (
    <div className="space-y-4">
      <Card size="small" loading={loading}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-gray-500">Digital Logbook</div>
            <h2 className="mt-1 text-xl font-bold" style={{ color: accent.secondary }}>{accent.title}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Runtime, downtime, auto-captured coverage, and compressor throughput in one operating view.
            </p>
          </div>
          <Select
            allowClear
            placeholder="All Installations"
            style={{ width: 240 }}
            value={installationId || undefined}
            onChange={(value) => setInstallationId(value || '')}
          >
            {installations.map((installation) => (
              <Select.Option key={installation.id} value={installation.id}>
                {installation.installationId}
              </Select.Option>
            ))}
          </Select>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small" loading={loading}>
            <Statistic title="Runtime" value={overview?.stats?.totalRuntime || 0} suffix="hrs" prefix={<Clock3 className="w-4 h-4" style={{ color: accent.primary }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small" loading={loading}>
            <Statistic title="Downtime" value={overview?.stats?.totalDowntime || 0} suffix="hrs" prefix={<TimerReset className="w-4 h-4 text-amber-600" />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small" loading={loading}>
            <Statistic title="Pending Logs Today" value={overview?.stats?.pendingLogsToday || 0} prefix={<AlertTriangle className="w-4 h-4 text-red-500" />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title={focus === 'process' ? 'Output Gas' : 'Auto / Hybrid Logs'}
              value={focus === 'process' ? overview?.compressorStats?.outputGas || 0 : overview?.stats?.autoCapturedCount || 0}
              suffix={focus === 'process' ? 'm³' : 'logs'}
              prefix={focus === 'process' ? <Gauge className="w-4 h-4 text-red-500" /> : <Cpu className="w-4 h-4 text-emerald-600" />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> 7-Day Runtime vs Downtime</span>}
            size="small"
            loading={loading}
          >
            {!overview?.trend?.length ? (
              <Empty description="No operational trend data" />
            ) : (
              <div className="grid grid-cols-7 gap-3 items-end h-56">
                {overview.trend.map((item: any) => (
                  <div key={item.date} className="flex flex-col items-center gap-2">
                    <div className="w-full h-40 flex items-end justify-center gap-1">
                      <div
                        className="w-4 rounded-t"
                        style={{ height: `${((item.runtime || 0) / maxTrend) * 140 + 4}px`, background: accent.primary }}
                      />
                      <div
                        className="w-4 rounded-t bg-amber-400"
                        style={{ height: `${((item.downtime || 0) / maxTrend) * 140 + 4}px` }}
                      />
                    </div>
                    <div className="text-[11px] text-gray-500">{item.date.slice(5)}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full" style={{ background: accent.primary }} /> Runtime</span>
              <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Downtime</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Operational Priorities" size="small" loading={loading}>
            {!overview?.topRuntimeAssets?.length ? (
              <Empty description="No ranked assets yet" />
            ) : (
              <div className="space-y-4">
                {(overview.topRuntimeAssets || []).slice(0, 5).map((asset: any) => (
                  <div key={asset.equipmentTag}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-medium">{asset.description}</div>
                      <div className="font-mono text-gray-500">{formatNumber(asset.runtime)} hrs</div>
                    </div>
                    <Progress percent={Math.min(100, Math.round((asset.runtime / Math.max(1, overview.stats?.totalRuntime || 1)) * 100))} showInfo={false} strokeColor={accent.primary} />
                  </div>
                ))}
                {(overview.topExceptionAssets || []).length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <div className="text-sm font-semibold text-red-700">Exception Queue</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {overview.topExceptionAssets.map((asset: any) => (
                        <Tag key={asset.equipmentTag} color="red">
                          {asset.equipmentTag}: {asset.exceptions}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
                {focus === 'process' && (
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Fuel Gas</div>
                      <div className="mt-1 text-lg font-semibold">{formatNumber(overview?.compressorStats?.fuelGas || 0)} m³</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Trips</div>
                      <div className="mt-1 text-lg font-semibold">{overview?.compressorStats?.tripCount || 0}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Average Efficiency</div>
                      <Progress percent={Math.min(100, Number(overview?.compressorStats?.avgEfficiency || 0))} strokeColor="#dc2626" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
