import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Dropdown, Tag, Button, Spin, Empty } from 'antd';
import { Bell, CheckCheck, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const API = '/api/notifications';
const token = () => localStorage.getItem('token');
const jsonHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const SEVERITY_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  HIGH: { color: 'red', icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> },
  MEDIUM: { color: 'orange', icon: <AlertCircle className="w-3.5 h-3.5 text-orange-500" /> },
  INFO: { color: 'blue', icon: <Info className="w-3.5 h-3.5 text-blue-500" /> },
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  module?: string | null;
  severity?: string | null;
  createdAt: string;
};

type NotificationResponse = {
  data?: NotificationItem[];
  pagination?: {
    total?: number;
  };
};

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API}?status=UNREAD&pageSize=20`, { headers: jsonHeaders() });
      if (!res.ok) return;
      const data: NotificationResponse = await res.json();
      const items = Array.isArray(data.data) ? data.data : [];
      setNotifications(items);
      setUnreadCount(data.pagination?.total ?? items.length);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      const res = await fetch(`${API}/${id}/read`, { method: 'POST', headers: jsonHeaders() });
      if (!res.ok) return;
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/read-all`, { method: 'POST', headers: jsonHeaders() });
      if (!res.ok) return;
      setNotifications([]);
      setUnreadCount(0);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const dropdownContent = (
    <div className="w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <span className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</span>
        {notifications.length > 0 && (
          <Button size="small" type="link" onClick={markAllRead} loading={loading} className="text-xs text-blue-600 p-0 h-auto">
            <CheckCheck className="w-3.5 h-3.5 inline mr-1" />Mark all read
          </Button>
        )}
      </div>
      {loading ? (
        <div className="p-6 text-center"><Spin /></div>
      ) : notifications.length === 0 ? (
        <div className="p-6"><Empty description="No new notifications" imageStyle={{ height: 40 }} /></div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {notifications.map(n => {
            const severityKey = n.severity || 'INFO';
            const sev = SEVERITY_CONFIG[severityKey] || SEVERITY_CONFIG.INFO;
            return (
              <div
                key={n.id}
                className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                onClick={() => markRead(n.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">{sev.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">{n.title}</span>
                      <Tag color={sev.color} className="text-[10px] flex-shrink-0">{n.module}</Tag>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-gray-400 mt-1 block">{timeAgo(n.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={v => { setOpen(v); if (v) fetchNotifications(); }}
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
    >
      <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Badge>
      </button>
    </Dropdown>
  );
};
