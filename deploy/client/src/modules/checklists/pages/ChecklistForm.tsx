import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../../core/components/Layout';
import {
  Card, Button, Input, Select, DatePicker, Segmented, Spin, message, Space, Tag, Alert,
} from 'antd';
import { ClipboardCheck, Save, Send, ArrowLeft, AlertTriangle, History } from 'lucide-react';
import dayjs from 'dayjs';
import { API, jsonHeaders } from '../api';
import type {
  ChecklistTemplate, ChecklistSubmission, Section, ItemStatus, SubmissionStatus,
} from '../types';

const STATUS_OPTIONS: { label: string; value: ItemStatus }[] = [
  { label: 'OK', value: 'OK' },
  { label: 'Att', value: 'ATTENTION' },
  { label: 'N/A', value: 'NA' },
];

const SHIFT_OPTIONS = [
  { label: 'Day', value: 'DAY' },
  { label: 'Night', value: 'NIGHT' },
  { label: 'General', value: 'GENERAL' },
];

// Compact numeric input width (values are small — max ~4 digits)
const NUM_W = 60;

// Zebra row helper — odd rows get a subtle tint.
const zebra = (i: number) =>
  i % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.03]' : 'bg-transparent';

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

// Build a responses object pre-seeded from the latest submission (status lists,
// inspection groups, and sign-offs) so the user only verifies & changes.
// Parameters and work-log jobs are left blank for fresh daily entry.
const seedFromLatest = (
  template: ChecklistTemplate,
  prev: Record<string, any> | null,
): Record<string, any> => {
  const seeded: Record<string, any> = {};
  for (const section of template.sections) {
    const prevSection = (prev && prev[section.key]) || {};
    if (section.type === 'STATUS_LIST') {
      seeded[section.key] = {};
      for (const it of section.items) {
        const p = prevSection[it.key] || {};
        seeded[section.key][it.key] = {
          status: p.status ?? 'OK',
          value: p.value ?? it.defaultValue ?? '',
        };
      }
    } else if (section.type === 'INSPECTION_GROUP') {
      seeded[section.key] = {};
      for (const g of section.groups) {
        for (const it of g.items) {
          const p = prevSection[it.key] || {};
          seeded[section.key][it.key] = { status: p.status ?? 'OK', remark: p.remark ?? '' };
        }
      }
    } else if (section.type === 'SIGNOFF') {
      seeded[section.key] = { ...prevSection };
    }
    // PARAMETERS & WORK_LOG: intentionally left blank for fresh entry.
  }
  return seeded;
};

export const ChecklistForm = () => {
  const { templateId, id } = useParams<{ templateId?: string; id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const editId: string | undefined = id || (location.state as any)?.submissionId;

  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

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

        // Prefill status lists from the latest submission (verify & change).
        let prevResponses: Record<string, any> | null = null;
        let prevHeader: Record<string, any> = {};
        try {
          const latestRes = await fetch(
            `${API}/checklists/submissions?templateId=${tpl!.id}&limit=1`,
            { headers: jsonHeaders() },
          );
          if (latestRes.ok) {
            const arr: ChecklistSubmission[] = await latestRes.json();
            if (arr.length) {
              prevResponses = arr[0].responses || null;
              prevHeader = arr[0].header || {};
              setPrefilled(true);
            }
          }
        } catch { /* prefill is best-effort */ }

        // Carry forward header identity fields (well/rig/operation) too.
        setHeader({ ...prevHeader, ...defaults, ...(prevHeader.section ? {} : {}) });
        setResponses(seedFromLatest(tpl!, prevResponses));
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
      // ── Compact numeric parameter list (zebra striped) ──────────────────────
      case 'PARAMETERS':
        return (
          <div className="rounded-md overflow-hidden border border-gray-100 dark:border-gray-700">
            {section.items.map((item, i) => {
              const itemData = data[item.key] || {};
              return (
                <div
                  key={item.key}
                  className={`flex items-center gap-2 px-2 py-1 ${zebra(i)}`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{item.label}</span>
                    {item.unit && <span className="ml-1 text-[11px] text-gray-400">({item.unit})</span>}
                  </div>
                  {item.cols && item.cols.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      {item.cols.map((col) => (
                        <div key={col.key} className="flex items-center gap-1">
                          <span className="text-[11px] text-gray-500">{col.label}</span>
                          <Input
                            size="small"
                            style={{ width: NUM_W }}
                            maxLength={6}
                            value={itemData[col.key] ?? ''}
                            onChange={(e) => setParamValue(section.key, item.key, col.key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Input
                      size="small"
                      style={{ width: NUM_W }}
                      maxLength={6}
                      value={itemData.value ?? ''}
                      onChange={(e) => setParamValue(section.key, item.key, null, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );

      // ── Status list (prefilled, zebra striped, compact) ─────────────────────
      case 'STATUS_LIST':
        return (
          <div className="rounded-md overflow-hidden border border-gray-100 dark:border-gray-700">
            {section.items.map((item, i) => {
              const itemData = data[item.key] || {};
              const st: ItemStatus | undefined = itemData.status;
              const flagged = st === 'ATTENTION';
              return (
                <div
                  key={item.key}
                  className={`flex items-center gap-2 px-2 py-1 ${
                    flagged ? 'bg-red-50 dark:bg-red-900/20' : zebra(i)
                  }`}
                >
                  <div className="flex-1 min-w-0 text-sm text-gray-800 dark:text-gray-100 truncate">{item.label}</div>
                  <Segmented
                    size="small"
                    options={STATUS_OPTIONS}
                    value={st || 'OK'}
                    onChange={(v) => setStatusItem(section.key, item.key, 'status', v as string)}
                  />
                  <Input
                    size="small"
                    placeholder="—"
                    style={{ width: NUM_W }}
                    maxLength={10}
                    value={itemData.value ?? ''}
                    onChange={(e) => setStatusItem(section.key, item.key, 'value', e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        );

      // ── Inspection groups (prefilled, zebra striped) ────────────────────────
      case 'INSPECTION_GROUP':
        return (
          <div className="space-y-3">
            {section.groups.map((group) => (
              <div key={group.key} className="rounded-md overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700/50 text-[13px] font-semibold text-gray-700 dark:text-gray-200">
                  {group.title}
                </div>
                {group.items.map((item, i) => {
                  const itemData = data[item.key] || {};
                  const st: ItemStatus | undefined = itemData.status;
                  const flagged = st === 'ATTENTION';
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center gap-2 px-2 py-1 ${
                        flagged ? 'bg-amber-50 dark:bg-amber-900/20' : zebra(i)
                      }`}
                    >
                      <div className="flex-1 min-w-0 text-[13px] text-gray-800 dark:text-gray-100 truncate" title={item.label}>
                        {item.label}
                      </div>
                      <Segmented
                        size="small"
                        options={STATUS_OPTIONS}
                        value={st || 'OK'}
                        onChange={(v) => setStatusItem(section.key, item.key, 'status', v as string)}
                      />
                      {flagged && (
                        <Input
                          size="small"
                          placeholder="Remark"
                          style={{ width: 120 }}
                          value={itemData.remark ?? ''}
                          onChange={(e) => setStatusItem(section.key, item.key, 'remark', e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );

      case 'WORK_LOG':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.shifts.map((sh) => {
              const shData = data[sh.key] || {};
              return (
                <div key={sh.key} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="font-semibold text-[13px] text-gray-700 dark:text-gray-200 mb-1">{sh.label}</div>
                  <label className="text-[11px] text-gray-500">Crew</label>
                  <Input
                    size="small"
                    className="mb-2"
                    value={shData.crew ?? ''}
                    onChange={(e) => setWorkLog(section.key, sh.key, 'crew', e.target.value)}
                  />
                  <label className="text-[11px] text-gray-500">Jobs</label>
                  <Input.TextArea
                    rows={2}
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
                <label className="text-[11px] text-gray-500">{item.label}</label>
                <Input
                  size="small"
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
      <div className="max-w-6xl mx-auto pb-24">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
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

        {prefilled && (
          <Alert
            className="mb-3"
            type="info"
            showIcon
            icon={<History className="w-4 h-4" />}
            message="Status lists prefilled from the last report. Verify each value and change only what differs."
          />
        )}

        {flagged > 0 && (
          <Alert
            className="mb-3"
            type="warning"
            showIcon
            icon={<AlertTriangle className="w-4 h-4" />}
            message={`${flagged} item(s) flagged for attention`}
          />
        )}

        {/* Header fields */}
        <Card size="small" title="Report Details" className="mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-gray-500">Date</label>
              <DatePicker
                className="w-full"
                size="small"
                value={date}
                onChange={(v) => v && setDate(v)}
                format="DD-MM-YYYY"
                allowClear={false}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">Shift</label>
              <Select className="w-full" size="small" value={shift} onChange={setShift} options={SHIFT_OPTIONS} />
            </div>
            {template.headerFields.map((f) => (
              <div key={f.key}>
                <label className="text-[11px] text-gray-500">{f.label}</label>
                <Input
                  size="small"
                  value={header[f.key] ?? ''}
                  onChange={(e) => setHeader((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Compact data sections (parameters / status / inspection) sit side by
            side in 2 columns on desktop (masonry). */}
        <div className="lg:columns-2 lg:gap-4">
          {template.sections
            .filter((s) => s.type === 'PARAMETERS' || s.type === 'STATUS_LIST' || s.type === 'INSPECTION_GROUP')
            .map((section) => (
              <Card
                key={section.key}
                size="small"
                title={section.title}
                className="mb-4 break-inside-avoid"
              >
                {renderSection(section)}
              </Card>
            ))}
        </div>

        {/* Work log / sign-off span the full width for easier reading & entry. */}
        {template.sections
          .filter((s) => s.type === 'WORK_LOG' || s.type === 'SIGNOFF')
          .map((section) => (
            <Card key={section.key} size="small" title={section.title} className="mb-4">
              {renderSection(section)}
            </Card>
          ))}

        {/* Remarks — full width */}
        <Card size="small" title="Remarks" className="mb-4">
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
