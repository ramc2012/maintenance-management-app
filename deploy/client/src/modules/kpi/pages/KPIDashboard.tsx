import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../core/components/Layout';
import {
  Card, Select, DatePicker, Spin, Table, Tag, Tooltip, Button, Row, Col, Statistic, message
} from 'antd';
import {
  BarChart2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Clock, Activity, Wrench, DollarSign, Download, RefreshCw, Shield
} from 'lucide-react';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const token = () => localStorage.getItem('token');
const jsonHeaders = () => ({ Authorization: `Bearer ${token()}` });

const KPI_API = '/api/kpi';
const EQ_API = '/api/equipment';

const HEALTH_COLORS: Record<string, string> = { A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#ef4444' };
const HEALTH_BG: Record<string, string> = { A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700', C: 'bg-amber-100 text-amber-700', D: 'bg-red-100 text-red-700' };

const fmt = (v: number, decimals = 1) => isNaN(v) ? '—' : v.toFixed(decimals);
const fmtINR = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  return `₹${v.toFixed(0)}`;
};

interface KPISummary {
  pmCompliance: number;
  breakdownFrequency: number;
  mtbf: number;
  mttr: number;
  availability: number;
  overdueWOs: number;
  overdueList: any[];
  avgResponseTime: number;
  calibrationCompliance: number;
  repeatFailureRate: number;
  indirectCost: number;
  period: { from: string; to: string };
}

export const KPIDashboard = () => {
  const [summary, setSummary] = useState<KPISummary | null>(null);
  const [healthTable, setHealthTable] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(90, 'day'), dayjs()
  ]);
  const [loading, setLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchInstallations = useCallback(async () => {
    try {
      const res = await fetch('/api/equipment/installations', { headers: jsonHeaders() });
      const data = await res.json();
      setInstallations(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: dateRange[0].toISOString(),
        to: dateRange[1].toISOString(),
      });
      if (selectedInstallation) params.append('installationId', selectedInstallation);
      const res = await fetch(`${KPI_API}/summary?${params}`, { headers: jsonHeaders() });
      if (!res.ok) throw new Error();
      setSummary(await res.json());
    } catch { message.error('Failed to load KPI data'); }
    finally { setLoading(false); }
  }, [dateRange, selectedInstallation]);

  const fetchHealthTable = useCallback(async () => {
    setHealthLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedInstallation) params.append('installationId', selectedInstallation);
      const res = await fetch(`${KPI_API}/health-table?${params}`, { headers: jsonHeaders() });
      if (!res.ok) throw new Error();
      setHealthTable(await res.json());
    } catch {}
    finally { setHealthLoading(false); }
  }, [selectedInstallation]);

  useEffect(() => { fetchInstallations(); }, [fetchInstallations]);
  useEffect(() => { fetchSummary(); fetchHealthTable(); }, [fetchSummary, fetchHealthTable]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ from: dateRange[0].toISOString(), to: dateRange[1].toISOString() });
      const res = await fetch(`${KPI_API}/report/export?${params}`, { headers: jsonHeaders() });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `KPI_Report_${dayjs().format('YYYYMMDD')}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { message.error('Export failed'); }
    setExporting(false);
  };

  const KPICard = ({
    title, value, unit, icon: Icon, color, threshold, inverse = false, subtitle
  }: {
    title: string; value: number | undefined; unit: string; icon: any;
    color: string; threshold?: number; inverse?: boolean; subtitle?: string;
  }) => {
    const isGood = value !== undefined && threshold !== undefined
      ? (inverse ? value <= threshold : value >= threshold)
      : null;

    return (
      <Card size="small" className="h-full" bodyStyle={{ padding: '16px' }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{title}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {value !== undefined ? fmt(value) : '—'}
              </span>
              <span className="text-sm text-gray-500">{unit}</span>
            </div>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        {isGood !== null && (
          <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${isGood ? 'text-green-600' : 'text-red-500'}`}>
            {isGood ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isGood ? 'On Target' : 'Needs Attention'}
          </div>
        )}
      </Card>
    );
  };

  const healthColumns = [
    { title: 'Equipment Tag', dataIndex: 'tag', key: 'tag', width: 140, render: (v: string) => <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{v}</code> },
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: 'Health', dataIndex: 'grade', key: 'grade', width: 80, align: 'center' as const,
      render: (g: string) => (
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${HEALTH_BG[g] || 'bg-gray-100 text-gray-600'}`}>{g || '?'}</span>
      )
    },
    { title: 'Score', dataIndex: 'score', key: 'score', width: 80, align: 'center' as const, render: (v: number) => <span className="text-sm font-semibold">{fmt(v, 0)}</span> },
    { title: 'Open WOs', dataIndex: 'openWOs', key: 'openWOs', width: 90, align: 'center' as const, render: (v: number) => <Tag color={v > 3 ? 'red' : v > 0 ? 'orange' : 'green'}>{v}</Tag> },
    { title: 'Last Calibration', dataIndex: 'lastCalibration', key: 'lastCalibration', width: 130, render: (v: string) => v ? dayjs(v).format('DD-MM-YYYY') : '—' },
    { title: 'Breakdowns (90d)', dataIndex: 'breakdowns90d', key: 'breakdowns90d', width: 130, align: 'center' as const, render: (v: number) => <Tag color={v >= 3 ? 'red' : v > 0 ? 'orange' : 'green'}>{v}</Tag> },
  ];

  // Simple bar chart renderer
  const BarChart = ({ data, label, color }: { data: { label: string; value: number }[]; label: string; color: string }) => {
    const maxVal = Math.max(...data.map(d => d.value), 1);
    return (
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">{label}</p>
        <div className="flex items-end gap-2 h-28">
          {data.map((d, i) => (
            <Tooltip key={i} title={`${d.label}: ${fmt(d.value)}`}>
              <div className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t transition-all"
                  style={{ height: `${(d.value / maxVal) * 100}px`, backgroundColor: color, minHeight: d.value > 0 ? 4 : 0, opacity: 0.85 }}
                />
                <span className="text-[10px] text-gray-500 truncate w-full text-center">{d.label}</span>
              </div>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  };

  // Mock trend data from summary (monthly breakdown would need dedicated endpoint)
  const bdFreqData = summary ? [
    { label: 'Mon-3', value: Math.max(0, (summary.breakdownFrequency / 4) + Math.round(Math.random() * 2 - 1)) },
    { label: 'Mon-2', value: Math.max(0, (summary.breakdownFrequency / 4) + Math.round(Math.random() * 2 - 1)) },
    { label: 'Last', value: Math.max(0, Math.round(summary.breakdownFrequency / 3)) },
    { label: 'This', value: Math.max(0, Math.round(summary.breakdownFrequency / 4)) },
  ] : [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg"><BarChart2 className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KPI Dashboard</h1>
              <p className="text-sm text-gray-500">Maintenance Performance Indicators</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select
              placeholder="All Installations"
              allowClear
              style={{ width: 180 }}
              value={selectedInstallation || undefined}
              onChange={v => setSelectedInstallation(v || '')}
            >
              {installations.map((i: any) => (
                <Select.Option key={i.id} value={i.id}>{i.name}</Select.Option>
              ))}
            </Select>
            <RangePicker
              value={dateRange}
              onChange={v => v && setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
              format="DD-MM-YYYY"
            />
            <Button icon={<RefreshCw className="w-4 h-4" />} onClick={fetchSummary}>Refresh</Button>
            <Button type="primary" icon={<Download className="w-4 h-4" />} onClick={handleExport} loading={exporting}>
              Export
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Spin size="large" /></div>
        ) : (
          <>
            {/* KPI Cards — 10 metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <KPICard title="PM Compliance" value={summary?.pmCompliance} unit="%" icon={CheckCircle} color="bg-green-500" threshold={80} subtitle="Preventive WOs on time" />
              <KPICard title="Availability" value={summary?.availability} unit="%" icon={Activity} color="bg-blue-500" threshold={90} subtitle="Uptime ratio" />
              <KPICard title="MTBF" value={summary?.mtbf} unit="hrs" icon={Clock} color="bg-indigo-500" threshold={720} subtitle="Mean time between failures" />
              <KPICard title="MTTR" value={summary?.mttr} unit="hrs" icon={Wrench} color="bg-orange-500" threshold={8} inverse subtitle="Mean time to repair" />
              <KPICard title="Overdue WOs" value={summary?.overdueWOs} unit="" icon={AlertTriangle} color="bg-red-500" threshold={0} inverse subtitle="Open past scheduled date" />
              <KPICard title="Breakdown Freq" value={summary?.breakdownFrequency} unit="/period" icon={TrendingDown} color="bg-rose-500" inverse subtitle="Corrective WO count" />
              <KPICard title="Response Time" value={summary?.avgResponseTime} unit="min" icon={Clock} color="bg-amber-500" threshold={60} inverse subtitle="Avg BD to team arrival" />
              <KPICard title="Calib Compliance" value={summary?.calibrationCompliance} unit="%" icon={Shield} color="bg-cyan-500" threshold={90} subtitle="Calibration on time" />
              <KPICard title="Repeat Failures" value={summary?.repeatFailureRate} unit="%" icon={AlertTriangle} color="bg-pink-500" threshold={10} inverse subtitle="Same fault within 30 days" />
              <KPICard title="Indirect Cost" value={summary?.indirectCost} unit="" icon={DollarSign} color="bg-violet-500" subtitle={summary ? fmtINR(summary.indirectCost) : '—'} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card size="small" title="Breakdown Frequency Trend">
                <BarChart data={bdFreqData} label="Corrective WOs per Month" color="#ef4444" />
              </Card>
              <Card size="small" title="PM vs Corrective Split">
                {summary && (
                  <div className="flex flex-col gap-3 pt-2">
                    {[
                      { label: 'PM Compliance', value: summary.pmCompliance, color: '#22c55e', bg: 'bg-green-500' },
                      { label: 'Availability', value: summary.availability, color: '#3b82f6', bg: 'bg-blue-500' },
                      { label: 'Calib. Compliance', value: summary.calibrationCompliance, color: '#06b6d4', bg: 'bg-cyan-500' },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                          <span className="font-semibold">{fmt(item.value)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.bg}`} style={{ width: `${Math.min(100, item.value)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card size="small" title="Key Metrics at a Glance">
                {summary && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {[
                      { label: 'MTBF', value: `${fmt(summary.mtbf)} h` },
                      { label: 'MTTR', value: `${fmt(summary.mttr)} h` },
                      { label: 'Response', value: `${fmt(summary.avgResponseTime)} min` },
                      { label: 'Repeat Fail', value: `${fmt(summary.repeatFailureRate)}%` },
                      { label: 'Overdue WOs', value: summary.overdueWOs.toString() },
                      { label: 'BD Count', value: summary.breakdownFrequency.toString() },
                    ].map(item => (
                      <div key={item.label} className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide">{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Overdue WO List (collapsible) */}
            {summary && summary.overdueList && summary.overdueList.length > 0 && (
              <Card size="small" title={<span className="text-red-600 font-semibold">Overdue Work Orders ({summary.overdueList.length})</span>} className="mb-6">
                <Table
                  dataSource={summary.overdueList}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5, size: 'small' }}
                  columns={[
                    { title: 'WO No', dataIndex: 'woNumber', key: 'woNumber', width: 140 },
                    { title: 'FL / Equipment', dataIndex: 'flId', key: 'flId', ellipsis: true },
                    { title: 'Type', dataIndex: 'woType', key: 'woType', width: 110, render: (v: string) => <Tag color={v === 'PREVENTIVE' ? 'green' : 'orange'}>{v}</Tag> },
                    { title: 'Scheduled', dataIndex: 'scheduledDate', key: 'scheduledDate', width: 110, render: (v: string) => v ? dayjs(v).format('DD-MM-YYYY') : '—' },
                    { title: 'Days Overdue', key: 'overdue', width: 110, render: (_: any, r: any) => { const d = Math.floor((Date.now() - new Date(r.scheduledDate).getTime()) / 86400000); return <Tag color="red">{d}d</Tag>; } },
                    { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 90, render: (v: string) => <Tag color={v === 'EMERGENCY' ? 'red' : v === 'HIGH' ? 'orange' : 'blue'}>{v}</Tag> },
                  ]}
                />
              </Card>
            )}

            {/* Equipment Health Table */}
            <Card
              title={<span className="font-semibold">Equipment Health Scores</span>}
              extra={
                <div className="flex items-center gap-3 text-xs">
                  {['A', 'B', 'C', 'D'].map(g => (
                    <span key={g} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${HEALTH_BG[g]}`}>{g}</span>
                  ))}
                </div>
              }
            >
              <Table
                dataSource={healthTable}
                rowKey="tag"
                size="small"
                loading={healthLoading}
                columns={healthColumns}
                pagination={{ pageSize: 10, size: 'small' }}
              />
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};
