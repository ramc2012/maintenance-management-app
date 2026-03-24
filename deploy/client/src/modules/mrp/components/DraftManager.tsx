import React, { useState, useEffect } from 'react';
import { Table, Button, Empty, Popconfirm, message, Tag } from 'antd';
import { FileText, Trash2, Upload, Clock } from 'lucide-react';

interface DraftManagerProps {
  onLoadDraft: (draft: any) => void;
}

export const DraftManager: React.FC<DraftManagerProps> = ({ onLoadDraft }) => {
  const [drafts, setDrafts] = useState<any[]>([]);

  useEffect(() => { loadDrafts(); }, []);

  const loadDrafts = () => {
    const saved = JSON.parse(localStorage.getItem('mrpDrafts') || '[]');
    setDrafts(saved);
  };

  const deleteDraft = (id: string) => {
    const updated = drafts.filter(d => d.id !== id);
    localStorage.setItem('mrpDrafts', JSON.stringify(updated));
    setDrafts(updated);
    message.success('Draft deleted');
  };

  const columns = [
    { title: 'Saved At', dataIndex: 'savedAt', render: (d: string) => d ? new Date(d).toLocaleString() : '-', width: 180 },
    { title: 'Title', dataIndex: 'title', render: (t: string) => t || 'Untitled' },
    { title: 'Vendor', dataIndex: 'vendorName' },
    { title: 'Category', dataIndex: 'category', render: (c: string) => <Tag>{c || '-'}</Tag>, width: 100 },
    { title: 'Items', dataIndex: 'items', render: (items: any[]) => items?.length || 0, width: 70 },
    { title: 'Actions', dataIndex: 'id', width: 120, render: (id: string, r: any) => (
      <div className="flex gap-1">
        <Button size="small" type="primary" icon={<Upload className="w-3 h-3" />} onClick={() => onLoadDraft(r)}>Load</Button>
        <Popconfirm title="Delete draft?" onConfirm={() => deleteDraft(id)}>
          <Button size="small" danger icon={<Trash2 className="w-3 h-3" />} />
        </Popconfirm>
      </div>
    )}
  ];

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">No Saved Drafts</h3>
        <p className="text-sm text-gray-500">When you save a draft, it will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
        <Clock className="w-5 h-5 text-gray-500" />
        <h3 className="font-bold dark:text-white">Saved Drafts</h3>
        <span className="text-sm text-gray-500">({drafts.length} drafts)</span>
      </div>
      
      <Table dataSource={drafts} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
    </div>
  );
};
