import React, { useMemo, useState } from 'react';
import { Card, Button, Select, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

type ReportPeriod = 'monthly' | 'yearly';

interface Props {
  logs: any[];
}

const downloadJson = (payload: any, fileName: string) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadCsv = (rows: any[], fileName: string) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(','),
    ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export const AutoReportGenerator: React.FC<Props> = ({ logs }) => {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');

  const grouped = useMemo(() => {
    const bucket: Record<string, any[]> = {};
    logs.forEach((log) => {
      const dt = dayjs(log.date);
      const key = period === 'monthly' ? dt.format('YYYY-MM') : dt.format('YYYY');
      if (!bucket[key]) bucket[key] = [];
      bucket[key].push(log);
    });

    return Object.entries(bucket)
      .map(([key, items]) => {
        const totalHours = items.reduce((sum, x) => sum + Number(x.durationHours || 0), 0);
        const pmCount = items.filter((x) => x.jobType === 'PM').length;
        const bdCount = items.filter((x) => x.jobType === 'BD').length;
        const closedCount = items.filter((x) => (x.status || '').toLowerCase() === 'closed').length;

        return {
          period: key,
          records: items.length,
          totalHours: Number(totalHours.toFixed(2)),
          pmCount,
          bdCount,
          closureRate: items.length ? `${Math.round((closedCount / items.length) * 100)}%` : '0%'
        };
      })
      .sort((a, b) => b.period.localeCompare(a.period));
  }, [logs, period]);

  const exportName = `maintenance_auto_report_${period}_${dayjs().format('YYYYMMDD_HHmm')}`;

  return (
    <Card title="Auto Report Generation (Monthly / Yearly)">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Text strong>Period:</Text>
        <Select value={period} onChange={(v) => setPeriod(v)} style={{ width: 140 }} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
        <Tag color="blue">{grouped.length} report buckets</Tag>
        <Tag color="green">{logs.length} source logs</Tag>
        <Button onClick={() => downloadCsv(grouped, `${exportName}.csv`)} disabled={!grouped.length}>Export CSV</Button>
        <Button type="primary" onClick={() => downloadJson({ generatedAt: new Date().toISOString(), period, reports: grouped }, `${exportName}.json`)} disabled={!grouped.length}>Export JSON</Button>
      </div>

      <Table
        size="small"
        rowKey="period"
        dataSource={grouped}
        pagination={{ pageSize: 12 }}
        columns={[
          { title: 'Period', dataIndex: 'period' },
          { title: 'Records', dataIndex: 'records' },
          { title: 'Total Hours', dataIndex: 'totalHours' },
          { title: 'PM Jobs', dataIndex: 'pmCount' },
          { title: 'BD Jobs', dataIndex: 'bdCount' },
          { title: 'Closure Rate', dataIndex: 'closureRate' }
        ]}
      />
    </Card>
  );
};

export default AutoReportGenerator;
