import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../../core/components/Layout';
import {
  Card, Button, Input, Select, DatePicker, Segmented, Spin, message, Space, Tag, Alert,
} from 'antd';
import { ClipboardCheck, Save, Send, ArrowLeft, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import { API, jsonHeaders } from '../api';
import type {
  ChecklistTemplate, ChecklistSubmission, Section, ItemStatus, SubmissionStatus,
} from '../types';

const STATUS_OPTIONS: { label: string; value: ItemStatus }[] = [
  { label: 'OK', value: 'OK' },
  { label: 'Attention', value: 'ATTENTION' },
  { label: 'N/A', value: 'NA' },
];

const SHIFT_OPTIONS = [
  { label: 'Day', value: 'DAY' },
  { label: 'Night', value: 'NIGHT' },
  { label: 'General', value: 'GENERAL' },
];

const statusColor = (s?: ItemStatus) =>
  s === 'ATTENTION' ? 'red' : s === 'NA' ? 'default' : s === 'OK' ? 'green' : 'default';

// Count flagged (ATTENTION) items across STATUS_LIST and INSPECTION_GROUP sections.
const countFlagged = (template: ChecklistTemplate, responses: Record<string, any>): number => {
  let count = 0;
  for (const section of template.sections) {
    const data = responses[section.key] || {};
    if (section.type === 'STATUS_LIST') {
      for (const item of section.items) {
        if (data[item.key]?.status === 'ATTENTION') count++;
      }
    } else if (section.type === 'INSPECTION_GROUP') {
      for (const group of section.groups) {
        for (const item of group.items) {
          if (data[item.key]?.status === 'ATTENTION') count++;
        }
      }
    }
  }
  return count;
};

export const ChecklistForm = () => {
  const { templateId, id } = useParams<{ templateId?: string; id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // When editing an existing draft, this route is /checklists/new/:templateId but
  // an existing submission id may be passed via location.state.
  const editId: string | undefined = id || (location.state as any)?.submissionId;

  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(dayjs());
  const [shift, setShift] = useState<string>('DAY');
  const [header, setHeader] = useState<Record<string, string>>({});
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [remarks, setRemarks] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let tpl: ChecklistTemplate | null = null;
      if (editId) {
        const res = await fetch(`${API}/checklists/submissions/${editId}`, { headers: jsonHeaders() });
        if (!res.ok) throw new Error();
        const sub: ChecklistSubmission = await res.json();
        tpl = sub.template || null;
        if (!tpl && sub.templateId) {
          const tres = await fetch(`${API}/checklists/templates/${sub.templateId}`, { headers: jsonHeaders() });
          if (tres.ok) tpl = await tres.json();
        }
        setDate(dayjs(sub.date));
        setShift(sub.shift || 'DAY');
        setHeader(sub.header || {});
        setResponses(sub.responses || {});
        setRemarks(sub.remarks || '');
      } else if (templateId) {
        const res = await fetch(`${API}/checklists/templates/${templateId}`, { headers: jsonHeaders() });
        if (!res.ok) throw new Error();
        tpl = await res.json();
        // Prefill header defaults.
        const defaults: Record<string, string> = {};
        (tpl?.headerFields || []).forEach((f) => {
          if (f.default !== undefined) defaults[f.key] = f.default;
        });
        setHeader(defaults);
      }
      setTemplate(tpl);
    } catch {
      message.error('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  }, [templateId, editId]);

  useEffect(() => { load(); }, [load]);

  // ---- responses mutators ----
  const setParamValue = (sectionKey: string, itemKey: string, colKey: string | null, value: string) => {
    setResponses((prev) => {
      const section = { ...(prev[sectionKey] || {}) };
      if (colKey) {
        section[itemKey] = { ...(section[itemKey] || {}), [colKey]: value };
      } else {
        section[itemKey] = { value };
      }
      return { ...prev, [sectionKey]: section };
    });
  };

  const setStatusItem = (
    sectionKey: string, itemKey: string, field: 'status' | 'value' | 'remark', value: string,
  ) => {
    setResponses((prev) => {
      const section = { ...(prev[sectionKey] || {}) };
      section[itemKey] = { ...(section[itemKey] || {}), [field]: value };
      return { ...prev, [sectionKey]: section };
    });
  };

  const setWorkLog = (sectionKey: string, shiftKey: string, field: 'crew' | 'jobs', value: string) => {
    setResponses((prev) => {
      const section = { ...(prev[sectionKey] || {}) };
      section[shiftKey] = { ...(section[shiftKey] || {}), [field]: value };
      return { ...prev, [sectionKey]: section };
    });
  };

  const setSignoff = (sectionKey: string, itemKey: string, value: string) => {
    setResponses((prev) => {
      const section = { ...(prev[sectionKey] || {}) };
      section[itemKey] = value;
      return { ...prev, [sectionKey]: section };
    });
  };

  const save = async (status: SubmissionStatus) => {
    if (!template) return;
    setSaving(true);
    try {
      const body = {
        templateId: template.id,
        date: date.toISOString(),
        shift,
        header,
        responses,
        remarks,
        status,
        flaggedCount: countFlagged(template, responses),
      };
      const url = editId
        ? `${API}/checklists/submissions/${editId}`
        : `${API}/checklists/submissions`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: jsonHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      message.success(status === 'SUBMITTED' ? 'Checklist submitted' : 'Draft saved');
      navigate('/checklists');
    } catch {
      message.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (section: Section) => {
    const data = responses[section.key] || {};

    switch (section.type) {
      case 'PARAMETERS':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {section.items.map((item) => {
                  const itemData = data[item.key] || {};
                  return (
                    <tr key={item.key} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 pr-3 align-top">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{item.label}</div>
                        {item.unit && <div className="text-xs text-gray-400">{item.unit}</div>}
                        {item.note && <div className="text-xs text-gray-400 italic">{item.note}</div>}
                      </td>
                      <td className="py-2 align-top">
                        {item.cols && item.cols.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {item.cols.map((col) => (
                              <div key={col.key}>
                                <label className="text-xs text-gray-500">{col.label}</label>
                                <Input
                                  size="small"
                                  value={itemData[col.key] ?? ''}
                                  onChange={(e) => setParamValue(section.key, item.key, col.key, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Input
                            size="small"
                            value={itemData.value ?? ''}
                            onChange={(e) => setParamValue(section.key, item.key, null, e.target.value)}
                            addonAfter={item.unit || undefined}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case 'STATUS_LIST':
        return (
          <div className="space-y-2">
            {section.items.map((item) => {
              const itemData = data[item.key] || {};
              const st: ItemStatus | undefined = itemData.status;
              return (
                <div
                  key={item.key}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg ${
                    st === 'ATTENTION' ? 'bg-red-50 dark:bg-red-900/20' : ''
                  }`}
                >
                  <div className="flex-1 font-medium text-gray-800 dark:text-gray-100">{item.label}</div>
                  <Segmented
                    options={STATUS_OPTIONS}
                    value={st || item.defaultValue || undefined}
                    onChange={(v) => setStatusItem(section.key, item.key, 'status', v as string)}
                  />
                  <Input
                    size="small"
                    placeholder="Value"
                    style={{ maxWidth: 160 }}
                    value={itemData.value ?? ''}
                    onChange={(e) => setStatusItem(section.key, item.key, 'value', e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        );

      case 'INSPECTION_GROUP':
        return (
          <div className="space-y-4">
            {section.groups.map((group) => (
              <div key={group.key}>
                <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{group.title}</div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const itemData = data[item.key] || {};
                    const st: ItemStatus | undefined = itemData.status;
                    return (
                      <div
                        key={item.key}
                        className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg ${
                          st === 'ATTENTION' ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700' : ''
                        }`}
                      >
                        <div className="flex-1 text-gray-800 dark:text-gray-100">{item.label}</div>
                        <Segmented
                          options={STATUS_OPTIONS}
                          value={st || undefined}
                          onChange={(v) => setStatusItem(section.key, item.key, 'status', v as string)}
                        />
                        <Input
                          size="small"
                          placeholder="Remark"
                          style={{ maxWidth: 200 }}
                          value={itemData.remark ?? ''}
                          onChange={(e) => setStatusItem(section.key, item.key, 'remark', e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );

      case 'WORK_LOG':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.shifts.map((sh) => {
              const shData = data[sh.key] || {};
              return (
                <div key={sh.key} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{sh.label}</div>
                  <label className="text-xs text-gray-500">Crew Details</label>
                  <Input
                    className="mb-2"
                    value={shData.crew ?? ''}
                    onChange={(e) => setWorkLog(section.key, sh.key, 'crew', e.target.value)}
                  />
                  <label className="text-xs text-gray-500">Job Details</label>
                  <Input.TextArea
                    rows={3}
                    value={shData.jobs ?? ''}
                    onChange={(e) => setWorkLog(section.key, sh.key, 'jobs', e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        );

      case 'SIGNOFF':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.items.map((item) => (
              <div key={item.key}>
                <label className="text-xs text-gray-500">{item.label}</label>
                <Input
                  value={(data[item.key] as string) ?? ''}
                  onChange={(e) => setSignoff(section.key, item.key, e.target.value)}
                  placeholder="Name / signature"
                />
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20"><Spin size="large" /></div>
      </Layout>
    );
  }

  if (!template) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto">
          <Alert type="error" message="Checklist template not found" showIcon />
          <Button className="mt-4" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/checklists')}>
            Back to Checklists
          </Button>
        </div>
      </Layout>
    );
  }

  const flagged = countFlagged(template, responses);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-24">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 rounded-lg"><ClipboardCheck className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{template.name}</h1>
              <p className="text-sm text-gray-500">
                {template.code} · <Tag color="blue">{template.discipline}</Tag>
                {template.rigType && <Tag color="geekblue">{template.rigType}</Tag>}
              </p>
            </div>
          </div>
          <Button icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/checklists')}>Back</Button>
        </div>

        {flagged > 0 && (
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            icon={<AlertTriangle className="w-4 h-4" />}
            message={`${flagged} item(s) flagged for attention`}
          />
        )}

        {/* Header fields */}
        <Card title="Report Details" className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">Date</label>
              <DatePicker
                className="w-full"
                value={date}
                onChange={(v) => v && setDate(v)}
                format="DD-MM-YYYY"
                allowClear={false}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Shift</label>
              <Select
                className="w-full"
                value={shift}
                onChange={setShift}
                options={SHIFT_OPTIONS}
              />
            </div>
            {template.headerFields.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-gray-500">{f.label}</label>
                <Input
                  value={header[f.key] ?? ''}
                  onChange={(e) => setHeader((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Sections */}
        {template.sections.map((section) => (
          <Card key={section.key} title={section.title} className="mb-4">
            {renderSection(section)}
          </Card>
        ))}

        {/* Remarks */}
        <Card title="Remarks" className="mb-4">
          <Input.TextArea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Additional remarks..."
          />
        </Card>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-3 px-4 -mx-4 flex justify-end">
          <Space>
            <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={() => save('DRAFT')}>
              Save Draft
            </Button>
            <Button type="primary" icon={<Send className="w-4 h-4" />} loading={saving} onClick={() => save('SUBMITTED')}>
              Submit
            </Button>
          </Space>
        </div>
      </div>
    </Layout>
  );
};
