import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Select, Tooltip as AntTooltip } from 'antd';
import { Zap, Fuel, DollarSign, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';
import axios from 'axios';

interface Props { showReports?: boolean; }

export const EnergyDashboard: React.FC<Props> = ({ showReports }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [installationId, setInstallationId] = useState<string>('');
  const [installations, setInstallations] = useState<any[]>([]);

  useEffect(() => { fetchInstallations(); }, []);
  useEffect(() => { fetchDashboard(); }, [year, installationId]);

  const fetchInstallations = async () => {
    try {
      const res = await axios.get('/api/equipment/installations');
      setInstallations(res.data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchDashboard = async () => {
    try {
      const params: any = { year };
      if (installationId) params.installationId = installationId;
      const res = await axios.get('/api/energy/dashboard', { params });
      setData(res.data);
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatLakh = (n: number) => { if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`; return formatCurrency(n); };

  if (loading) return <div className="text-white">Loading...</div>;

  const { summary, recentLogs, monthlyTrend } = data || {};

  // Prepare chart data
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const chartData = months.map((m, idx) => {
    const monthData = monthlyTrend?.filter((t: any) => t.month === idx + 1) || [];
    return {
      month: m,
      units: monthData.reduce((s: number, t: any) => s + (t.units || 0), 0),
      amount: monthData.reduce((s: number, t: any) => s + (t.amount || 0), 0)
    };
  });

  const maxUnits = Math.max(...chartData.map(d => d.units), 1);
  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);

  // Fuel data from recent logs
  const fuelByType: Record<string, number> = {};
  recentLogs?.forEach((l: any) => {
    if (l.fuelType && l.fuelQuantity) {
      fuelByType[l.fuelType] = (fuelByType[l.fuelType] || 0) + l.fuelQuantity;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><BarChart2 className="w-5 h-5" />Energy Dashboard</h2>
          <p className="text-gray-400 text-sm">Fuel & electricity consumption analytics</p>
        </div>
        <div className="flex gap-3">
          <Select value={installationId || 'all'} onChange={v => setInstallationId(v === 'all' ? '' : v)} style={{ width: 200 }}>
            <Select.Option value="all">All Installations (Cumulative)</Select.Option>
            {installations.map(i => <Select.Option key={i.id} value={i.id}>{i.installationId}</Select.Option>)}
          </Select>
          <Select value={year} onChange={setYear} style={{ width: 100 }}>
            {[2024, 2025].map(y => <Select.Option key={y} value={y}>{y}</Select.Option>)}
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <Row gutter={16}>
        <Col span={6}>
          <Card className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border-yellow-700">
            <Statistic title={<span className="text-yellow-300">Fuel (30 days)</span>} value={summary?.totalFuelQty || 0} valueStyle={{ color: '#fbbf24' }} prefix={<Fuel className="w-5 h-5" />} suffix="L" />
            <div className="text-xs text-yellow-400 mt-1">{formatLakh(summary?.totalFuelCost || 0)}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 border-blue-700">
            <Statistic title={<span className="text-blue-300">Electric (30 days)</span>} value={summary?.totalElectricKwh || 0} valueStyle={{ color: '#60a5fa' }} prefix={<Zap className="w-5 h-5" />} suffix="kWh" />
            <div className="text-xs text-blue-400 mt-1">{formatLakh(summary?.totalElectricCost || 0)}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-green-700">
            <Statistic title={<span className="text-green-300">Annual Bill Total</span>} value={summary?.totalBillAmount || 0} valueStyle={{ color: '#4ade80', fontSize: '20px' }} prefix={<DollarSign className="w-5 h-5" />} formatter={(v) => formatLakh(Number(v))} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gradient-to-br from-red-900/50 to-pink-900/50 border-red-700">
            <Statistic title={<span className="text-red-300">Pending Bills</span>} value={summary?.pendingBillsCount || 0} valueStyle={{ color: '#f87171' }} prefix={<AlertTriangle className="w-5 h-5" />} />
            {summary?.overdueBillsCount > 0 && <div className="text-xs text-red-400 mt-1">{summary.overdueBillsCount} overdue</div>}
          </Card>
        </Col>
      </Row>

      {/* Interactive Bar Charts */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title={<span className="text-white flex items-center gap-2"><Zap className="w-4 h-4 text-blue-400" />Monthly Electricity Consumption (kWh)</span>} className="bg-gray-800 border-gray-700">
            <div className="h-48 flex items-end gap-1 px-2">
              {chartData.map((d, i) => (
                <AntTooltip key={i} title={`${d.month}: ${d.units.toLocaleString()} kWh (${formatCurrency(d.amount)})`}>
                  <div className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t cursor-pointer hover:from-blue-500 hover:to-blue-300 transition-all"
                      style={{ height: `${(d.units / maxUnits) * 140}px`, minHeight: d.units > 0 ? '4px' : '0' }}
                    />
                    <div className="text-[10px] text-gray-400 mt-1">{d.month}</div>
                  </div>
                </AntTooltip>
              ))}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<span className="text-white flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-400" />Monthly Bill Amount (₹)</span>} className="bg-gray-800 border-gray-700">
            <div className="h-48 flex items-end gap-1 px-2">
              {chartData.map((d, i) => (
                <AntTooltip key={i} title={`${d.month}: ${formatCurrency(d.amount)}`}>
                  <div className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t cursor-pointer hover:from-green-500 hover:to-green-300 transition-all"
                      style={{ height: `${(d.amount / maxAmount) * 140}px`, minHeight: d.amount > 0 ? '4px' : '0' }}
                    />
                    <div className="text-[10px] text-gray-400 mt-1">{d.month}</div>
                  </div>
                </AntTooltip>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Fuel Breakdown */}
      {Object.keys(fuelByType).length > 0 && (
        <Card title={<span className="text-white flex items-center gap-2"><Fuel className="w-4 h-4 text-amber-400" />Fuel Consumption by Type (Last 30 Days)</span>} className="bg-gray-800 border-gray-700">
          <div className="flex gap-6">
            {Object.entries(fuelByType).map(([type, qty]) => (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold text-amber-400">{qty.toLocaleString()} L</div>
                <div className="text-xs text-gray-400">{type.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default EnergyDashboard;
