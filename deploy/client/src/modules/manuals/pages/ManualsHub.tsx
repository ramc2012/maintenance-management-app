import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../core/components/Layout';
import {
  FileText, Folder, Upload, Plus, Home, Wrench, Zap, Gauge,
  FolderPlus, Trash2, Download, Eye, X, Loader2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Tooltip, message, Popconfirm, Tag } from 'antd';
import { useTheme } from '../../../context/ThemeContext';
import { API_BASE_URL } from '../../../config/runtime';
import { disciplineToManualCategory, parseDiscipline } from '../../../utils/workspace';

const API = API_BASE_URL;

const categories = [
  { id: 'mechanical',       label: 'Mechanical',       icon: Wrench, color: 'text-blue-500'   },
  { id: 'electrical',       label: 'Electrical',       icon: Zap,    color: 'text-yellow-500' },
  { id: 'instrumentation',  label: 'Instrumentation',  icon: Gauge,  color: 'text-green-500'  },
];

interface Document {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: { id: string; username: string } | null;
}

interface ManualFolder {
  id: string;
  name: string;
  category: string;
  parentId: string | null;
  createdAt?: string;
  documents: Document[];
}

const formatSize = (bytes: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ManualsHub = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const isSepia = themeMode === 'sepia';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : isSepia ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200';
  const tx = isDark ? 'text-white' : isSepia ? 'text-amber-900' : 'text-gray-900';
  const sub = isDark ? 'text-gray-400' : isSepia ? 'text-amber-700' : 'text-gray-500';

  const token = localStorage.getItem('token');

  const [category, setCategory] = useState('mechanical');
  const [folders, setFolders] = useState<ManualFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFolder, setViewFolder] = useState<ManualFolder | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scopedDiscipline = parseDiscipline(searchParams.get('discipline'));

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('discipline', scopedDiscipline || category.toUpperCase());
      const res = await fetch(`${API}/manuals/repository?${params.toString()}`, { headers: authHeaders });
      if (res.ok) {
        const raw = await res.json();
        const data: ManualFolder[] = Array.isArray(raw) ? raw : raw.folders || [];
        setFolders(data);
        // Refresh viewFolder if it was open
        if (viewFolder) {
          const updated = data.find(f => f.id === viewFolder.id);
          if (updated) setViewFolder(updated);
        }
      }
    } catch (e) {
      console.error('Fetch folders error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (scopedDiscipline) {
      setCategory(disciplineToManualCategory(scopedDiscipline));
    } else if (categoryParam && categories.some((item) => item.id === categoryParam)) {
      setCategory(categoryParam);
    }
  }, [scopedDiscipline, searchParams]);

  useEffect(() => { fetchFolders(); }, [category, scopedDiscipline]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      setCreatingFolder(true);
      const res = await fetch(`${API}/manuals/folders`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), category }),
      });
      if (res.ok) {
        message.success('Folder created!');
        setShowNewFolder(false);
        setNewFolderName('');
        fetchFolders();
      } else {
        message.error('Failed to create folder');
      }
    } catch (e) {
      message.error('Error creating folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      const res = await fetch(`${API}/manuals/folders/${id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        message.success('Folder deleted');
        if (viewFolder?.id === id) setViewFolder(null);
        fetchFolders();
      } else {
        message.error('Failed to delete folder');
      }
    } catch (e) {
      message.error('Error deleting folder');
    }
  };

  const handleUpload = async (files: FileList, folderId: string) => {
    if (!files.length) return;
    try {
      setUploading(true);
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      const res = await fetch(`${API}/manuals/folders/${folderId}/documents`, {
        method: 'POST',
        headers: authHeaders,
        body: fd,
      });
      if (res.ok) {
        message.success(`${files.length} file(s) uploaded!`);
        fetchFolders();
      } else {
        message.error('Upload failed');
      }
    } catch (e) {
      message.error('Upload error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      const res = await fetch(`${API}/manuals/documents/${docId}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        message.success('Document deleted');
        fetchFolders();
      } else {
        message.error('Failed to delete document');
      }
    } catch (e) {
      message.error('Error deleting document');
    }
  };

  const handleViewDoc = async (doc: Document) => {
    try {
      const res = await fetch(`${API}/manuals/documents/${doc.id}/content`, { headers: authHeaders });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        message.error('Could not open file');
      }
    } catch (e) {
      message.error('Error opening file');
    }
  };

  const handleDownloadDoc = async (doc: Document) => {
    try {
      const res = await fetch(`${API}/manuals/documents/${doc.id}/content`, { headers: authHeaders });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = doc.originalName; a.click();
        URL.revokeObjectURL(url);
      } else {
        message.error('Could not download file');
      }
    } catch (e) {
      message.error('Error downloading file');
    }
  };

  const currentFolders = folders.filter(f => f.category === category && !f.parentId);

  const SidebarIcons = (
    <>
      {categories.map(cat => (
        <Tooltip key={cat.id} title={cat.label} placement="right">
          <button onClick={() => { setCategory(cat.id); setViewFolder(null); }}
            className={`w-full flex justify-center p-2 rounded ${category === cat.id ? 'bg-teal-100 dark:bg-teal-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <cat.icon className={`w-5 h-5 ${cat.color}`} />
          </button>
        </Tooltip>
      ))}
    </>
  );

  const SidebarContent = (
    <div className="space-y-4">
      <Button type="primary" icon={<Home className="w-4 h-4" />} onClick={() => navigate('/hub')} className="w-full" ghost>
        Maintenance Hub
      </Button>
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Categories</div>
      {categories.map(cat => (
        <button key={cat.id} onClick={() => { setCategory(cat.id); setViewFolder(null); }}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            category === cat.id
              ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
          <cat.icon className={`w-4 h-4 mr-3 ${cat.color}`} />
          {cat.label}
        </button>
      ))}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="dashed" icon={<FolderPlus className="w-4 h-4" />}
          onClick={() => setShowNewFolder(true)} className="w-full">
          New Folder
        </Button>
      </div>
    </div>
  );

  return (
    <Layout sidebarContent={SidebarContent} sidebarIcons={SidebarIcons}>
      <div className="h-full">
        {/* Header */}
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h2 className={`text-xl font-bold flex items-center gap-2 ${tx}`}>
              <FileText className="w-6 h-6 text-teal-500" />
              Manuals & Drawings — {categories.find(c => c.id === category)?.label}
            </h2>
            <p className={`text-sm ${sub}`}>Upload and manage technical documents on the server</p>
          </div>
          <Button type="primary" icon={<FolderPlus className="w-4 h-4" />}
            onClick={() => setShowNewFolder(true)}>
            New Folder
          </Button>
        </div>

        {/* New Folder inline form */}
        {showNewFolder && (
          <div className={`mb-4 flex items-center gap-2 p-3 rounded-lg border ${cardBg}`}>
            <input
              autoFocus
              type="text"
              placeholder="Folder name…"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); } }}
              className={`flex-1 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
            <Button type="primary" loading={creatingFolder} onClick={handleCreateFolder} size="small">Create</Button>
            <Button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} size="small" icon={<X className="w-4 h-4" />} />
          </div>
        )}

        {/* Folder Grid */}
        {!viewFolder ? (
          loading ? (
            <div className={`flex items-center justify-center py-16 ${sub}`}>
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
            </div>
          ) : currentFolders.length === 0 ? (
            <div className={`text-center py-16 ${sub}`}>
              <Folder className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No folders yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentFolders.map(folder => (
                <div
                  key={folder.id}
                  className={`border rounded-xl p-4 cursor-pointer hover:border-teal-500 transition-colors ${cardBg}`}
                  onClick={() => setViewFolder(folder)}
                >
                  <div className="flex items-start gap-3">
                    <Folder className="w-9 h-9 text-teal-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${tx}`}>{folder.name}</p>
                      <p className={`text-xs ${sub}`}>{folder.documents?.length || 0} document(s)</p>
                    </div>
                    <Popconfirm
                      title="Delete this folder and all its documents?"
                      onConfirm={(e) => { e?.stopPropagation(); handleDeleteFolder(folder.id); }}
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <button
                        onClick={e => e.stopPropagation()}
                        className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Folder detail view */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Button onClick={() => setViewFolder(null)}>← Back</Button>
              <h3 className={`text-lg font-semibold flex items-center gap-2 ${tx}`}>
                <Folder className="w-5 h-5 text-teal-500" />
                {viewFolder.name}
              </h3>
              <div className="flex-1" />
              {/* Upload trigger */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.jpg,.jpeg,.png,.pptx,.ppt"
                onChange={e => { if (e.target.files) handleUpload(e.target.files, viewFolder.id); e.target.value = ''; }}
              />
              <Button
                type="primary"
                icon={uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Documents
              </Button>
              <Popconfirm title="Delete folder and all its documents?" onConfirm={() => { handleDeleteFolder(viewFolder.id); }}>
                <Button danger icon={<Trash2 className="w-4 h-4" />} />
              </Popconfirm>
            </div>

            {/* Documents table */}
            {(!viewFolder.documents || viewFolder.documents.length === 0) ? (
              <div className={`text-center py-12 ${sub}`}>
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No documents yet. Upload some files.</p>
              </div>
            ) : (
              <div className={`border rounded-xl overflow-hidden ${cardBg}`}>
                <table className="w-full text-sm">
                  <thead className={`text-xs ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      {['Name', 'Type', 'Size', 'Uploaded', 'By', 'Actions'].map(h => (
                        <th key={h} className={`px-4 py-3 text-left font-semibold ${sub}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {viewFolder.documents.map(doc => {
                      const ext = doc.originalName?.split('.').pop()?.toUpperCase() || 'FILE';
                      return (
                        <tr key={doc.id} className={`transition-colors ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                          <td className={`px-4 py-3 font-medium ${tx} max-w-[200px] truncate`}>{doc.originalName}</td>
                          <td className="px-4 py-3">
                            <Tag color="blue">{ext}</Tag>
                          </td>
                          <td className={`px-4 py-3 ${sub}`}>{formatSize(doc.size)}</td>
                          <td className={`px-4 py-3 ${sub} whitespace-nowrap`}>
                            {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className={`px-4 py-3 ${sub}`}>{doc.uploadedBy?.username || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Tooltip title="View">
                                <Button size="small" type="text" icon={<Eye className="w-3.5 h-3.5 text-blue-500" />}
                                  onClick={() => handleViewDoc(doc)} />
                              </Tooltip>
                              <Tooltip title="Download">
                                <Button size="small" type="text" icon={<Download className="w-3.5 h-3.5 text-green-600" />}
                                  onClick={() => handleDownloadDoc(doc)} />
                              </Tooltip>
                              <Popconfirm title="Delete this document?" onConfirm={() => handleDeleteDoc(doc.id)}>
                                <Button size="small" type="text" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
                              </Popconfirm>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
