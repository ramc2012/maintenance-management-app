import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../core/components/Layout';
import {
  Card, Table, Button, Select, Tag, Badge, message, DatePicker, Space, Empty, Spin,
} from 'antd';
import { ClipboardCheck, Plus, Flag } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { API, jsonHeaders } from '../api';
import type { ChecklistTemplate, ChecklistSubmissionListItem } from '../types';

const STATUS_COLORS: Record<string, string> = { DRAFT: 'default', SUBMITTED: 'processing', COMPLETED: 'success' };

const DISCIPLINE_COLORS: Record<string, string> = {
  MECHANICAL: 'blue',
  ELECTRICAL: 'gold',
  INSTRUMENTATION: 'purple',
  DRILLING: 'volcano',
  PRODUCTION: 'green',
};

export const ChecklistHub = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [submissions, setSubmissions] = useState<ChecklistSubmissionListItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // History filters
  const [filterTemplate, setFilterTemplate] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch(`${API}/checklists/templates?active=true`, { headers: jsonHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      message.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const params = new URLSearchParams();
      if (filterTemplate) params.set('templateId', filterTemplate);
      if (dateRange) {
        params.set('from', dateRange[0].startOf('day').toISOString());
        params.set('to', dateRange[1].endOf('day').toISOString());
      }
      params.set('limit', '100');
      const res = await fetch(`${API}/checklists/submissions?${params.toString()}`, { headers: jsonHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch {
      message.error('Failed to load submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  }, [filterTemplate, dateRange]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (v: string) => dayjs(v).format('DD-MM-YYYY'),
    },
    {
      title: 'Template',
      key: 'template',
      render: (_: any, r: ChecklistSubmissionListItem) => (
        <span className="font-medium">{r.template?.name || r.templateId}</span>
      ),
    },
    {
      title: 'Discipline',
      key: 'discipline',
      width: 140,
      render: (_: any, r: ChecklistSubmissionListItem) => {
        const d = r.template?.discipline;
        return d ? <Tag color={DISCIPLINE_COLORS[d] || 'default'}>{d}</Tag> : '—';
      },
    },
    {
      title: 'Shift',
      dataIndex: 'shift',
      key: 'shift',
      width: 90,
      render: (v?: string) => v || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Flagged',
      dataIndex: 'flaggedCount',
      key: 'flaggedCount',
      width: 90,
      render: (v: number) =>
        v > 0
          ? <Tag color="red" icon={<Flag className="w-3 h-3 inline" />}>{v}</Tag>
          : <Tag color="green">0</Tag>,
    },
    {
      title: 'Submitted By',
      dataIndex: 'submittedBy',
      key: 'submittedBy',
      width: 150,
      render: (v?: string) => v || '—',
    },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 rounded-lg"><ClipboardCheck className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Checklist / DPR</h1>
              <p className="text-sm text-gray-500">Daily progress reports & inspection checklists</p>
            </div>
          </div>
        </div>

        {/* Template cards */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Active Checklists</h2>
          {loadingTemplates ? (
            <div className="flex justify-center py-10"><Spin /></div>
          ) : templates.length === 0 ? (
            <Card><Empty description="No active templates" /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <Card key={t.id} size="small" className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">{t.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.code}</div>
                    </div>
                    <Badge
                      count={t._count?.submissions || 0}
                      showZero
                      color="teal"
                      title="Total submissions"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Tag color={DISCIPLINE_COLORS[t.discipline] || 'default'}>{t.discipline}</Tag>
                    {t.rigType && <Tag color="geekblue">{t.rigType}</Tag>}
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{t.description}</p>
                  )}
                  <Button
                    type="primary"
                    icon={<Plus className="w-4 h-4" />}
                    className="mt-3 w-full"
                    onClick={() => navigate(`/checklists/new/${t.id}`)}
                  >
                    Fill Today's Checklist
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent submissions */}
        <Card
          title="Recent Submissions"
          extra={
            <Space wrap>
              <Select
                allowClear
                placeholder="Filter by template"
                style={{ minWidth: 200 }}
                value={filterTemplate}
                onChange={setFilterTemplate}
                options={templates.map((t) => ({ value: t.id, label: t.name }))}
              />
              <DatePicker.RangePicker
                value={dateRange as any}
                onChange={(v) => setDateRange(v as [Dayjs, Dayjs] | null)}
                format="DD-MM-YYYY"
              />
            </Space>
          }
        >
          <Table
            dataSource={submissions}
            columns={columns}
            rowKey="id"
            loading={loadingSubmissions}
            size="small"
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onClick: () => navigate(`/checklists/${record.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>
      </div>
    </Layout>
  );
};
