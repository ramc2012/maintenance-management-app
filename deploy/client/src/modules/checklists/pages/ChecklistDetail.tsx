import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../core/components/Layout';
import {
  Card, Button, Tag, Spin, message, Space, Descriptions, Popconfirm, Alert, Empty,
} from 'antd';
import { ClipboardCheck, ArrowLeft, Edit, Trash2, Flag, AlertTriangle, Download } from 'lucide-react';
import dayjs from 'dayjs';
import { API, jsonHeaders } from '../api';
import type { ChecklistSubmission, Section, ItemStatus } from '../types';

const STATUS_COLORS: Record<string, string> = { DRAFT: 'default', SUBMITTED: 'success' };

const statusTag = (s?: ItemStatus) => {
  if (!s) return <Tag>—</Tag>;
  const color = s === 'ATTENTION' ? 'red' : s === 'NA' ? 'default' : 'green';
  return <Tag color={color}>{s}</Tag>;
};

export const ChecklistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<ChecklistSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/checklists/submissions/${id}`, { headers: jsonHeaders() });
      if (!res.ok) throw new Error();
      setSubmission(await res.json());
    } catch {
      message.error('Failed to load submission');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/checklists/submissions/${id}`, {
        method: 'DELETE',
        headers: jsonHeaders(),
      });
      if (!res.ok) throw new Error();
      message.success('Submission deleted');
      navigate('/checklists');
    } catch {
      message.error('Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    if (!id) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API}/checklists/submissions/${id}/export`, { headers: jsonHeaders() });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename=([^;]+)/);
      const fileName = match ? match[1].trim() : `DPR_${id}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const renderSection = (section: Section, responses: Record<string, any>) => {
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
                      <td className="py-2 pr-3 align-top font-medium text-gray-800 dark:text-gray-100">
                        {item.label}
                        {item.unit && <span className="text-xs text-gray-400 ml-1">({item.unit})</span>}
                      </td>
                      <td className="py-2 align-top text-gray-700 dark:text-gray-300">
                        {item.cols && item.cols.length > 0 ? (
                          <div className="flex flex-wrap gap-3">
                            {item.cols.map((col) => (
                              <span key={col.key}>
                                <span className="text-xs text-gray-400">{col.label}: </span>
                                {itemData[col.key] || '—'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span>{itemData.value || '—'}</span>
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
          <div className="space-y-1">
            {section.items.map((item) => {
              const itemData = data[item.key] || {};
              const st: ItemStatus | undefined = itemData.status;
              return (
                <div
                  key={item.key}
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg ${
                    st === 'ATTENTION' ? 'bg-red-50 dark:bg-red-900/20' : ''
                  }`}
                >
                  <span className="text-gray-800 dark:text-gray-100">{item.label}</span>
                  <span className="flex items-center gap-2">
                    {itemData.value && <span className="text-sm text-gray-500">{itemData.value}</span>}
                    {statusTag(st)}
                  </span>
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
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const itemData = data[item.key] || {};
                    const st: ItemStatus | undefined = itemData.status;
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center justify-between gap-2 p-2 rounded-lg ${
                          st === 'ATTENTION' ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700' : ''
                        }`}
                      >
                        <span className="text-gray-800 dark:text-gray-100">{item.label}</span>
                        <span className="flex items-center gap-2">
                          {itemData.remark && <span className="text-sm text-gray-500">{itemData.remark}</span>}
                          {statusTag(st)}
                        </span>
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
                  <div className="text-xs text-gray-500">Crew Details</div>
                  <div className="mb-2 text-gray-800 dark:text-gray-100">{shData.crew || '—'}</div>
                  <div className="text-xs text-gray-500">Job Details</div>
                  <div className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{shData.jobs || '—'}</div>
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
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="text-gray-800 dark:text-gray-100 font-medium">
                  {(data[item.key] as string) || '—'}
                </div>
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

  if (!submission) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto">
          <Card><Empty description="Submission not found" /></Card>
          <Button className="mt-4" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/checklists')}>
            Back to Checklists
          </Button>
        </div>
      </Layout>
    );
  }

  const template = submission.template;
  const isDraft = submission.status === 'DRAFT';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 rounded-lg"><ClipboardCheck className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {template?.name || 'Checklist Submission'}
              </h1>
              <p className="text-sm text-gray-500">
                {template?.code && <span>{template.code} · </span>}
                {dayjs(submission.date).format('DD-MM-YYYY')}
                {submission.shift && <span> · {submission.shift}</span>}
              </p>
            </div>
          </div>
          <Space>
            {isDraft && (
              <Button
                type="primary"
                icon={<Edit className="w-4 h-4" />}
                onClick={() =>
                  navigate(`/checklists/new/${submission.templateId}`, {
                    state: { submissionId: submission.id },
                  })
                }
              >
                Edit
              </Button>
            )}
            <Button
              type="primary"
              ghost
              loading={downloading}
              icon={<Download className="w-4 h-4" />}
              onClick={handleDownload}
            >
              Download Excel
            </Button>
            <Popconfirm title="Delete this submission?" onConfirm={handleDelete} okType="danger">
              <Button danger loading={deleting} icon={<Trash2 className="w-4 h-4" />}>Delete</Button>
            </Popconfirm>
            <Button icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/checklists')}>Back</Button>
          </Space>
        </div>

        {/* Summary */}
        <Card className="mb-4">
          <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLORS[submission.status] || 'default'}>{submission.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Flagged">
              {submission.flaggedCount > 0 ? (
                <Tag color="red" icon={<Flag className="w-3 h-3 inline" />}>{submission.flaggedCount}</Tag>
              ) : (
                <Tag color="green">0</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Submitted By">{submission.submittedBy || '—'}</Descriptions.Item>
            <Descriptions.Item label="Submitted At">
              {submission.submittedAt ? dayjs(submission.submittedAt).format('DD-MM-YYYY HH:mm') : '—'}
            </Descriptions.Item>
            {template?.headerFields?.map((f) => (
              <Descriptions.Item key={f.key} label={f.label}>
                {submission.header?.[f.key] || '—'}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>

        {submission.flaggedCount > 0 && (
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            icon={<AlertTriangle className="w-4 h-4" />}
            message={`${submission.flaggedCount} item(s) flagged for attention`}
          />
        )}

        {/* Sections */}
        {template ? (
          template.sections.map((section) => (
            <Card key={section.key} title={section.title} className="mb-4">
              {renderSection(section, submission.responses || {})}
            </Card>
          ))
        ) : (
          <Card><Empty description="Template details unavailable" /></Card>
        )}

        {/* Remarks */}
        {submission.remarks && (
          <Card title="Remarks" className="mb-4">
            <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{submission.remarks}</p>
          </Card>
        )}

        {/* Sign-offs */}
        {(submission.shiftInchargeSign || submission.deptInchargeSign) && (
          <Card title="Sign-offs" className="mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">Shift Incharge</div>
                <div className="font-medium text-gray-800 dark:text-gray-100">{submission.shiftInchargeSign || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Dept Incharge</div>
                <div className="font-medium text-gray-800 dark:text-gray-100">{submission.deptInchargeSign || '—'}</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};
