import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge, Popover, List, Button, Tag, Typography, Empty, Spin } from 'antd';
import { Bell, Check, CheckCheck, Clock } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

interface Notification {
  id: string;
  module: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  createdAt: string;
  entityType?: string;
  entityId?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  INFO: 'blue',
  MEDIUM: 'gold',
  HIGH: 'orange',
  CRITICAL: 'red',
};

const MODULE_COLORS: Record<string, string> = {
  maintenance: 'purple',
  assets: 'cyan',
  inventory: 'green',
  procurement: 'geekblue',
  users: 'magenta',
  reports: 'volcano',
  scheduling: 'lime',
  dashboard: 'blue',
};

const POLL_INTERVAL = 60_000;

export const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [markingAllRead, setMarkingAllRead] = useState<boolean>(false);
  const [readingIds, setReadingIds] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await axios.get<{ count: number }>('/api/notifications/unread-count');
      setUnreadCount(data.count);
    } catch {
      // silently ignore polling errors
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<{ data: Notification[]; pagination: unknown }>(
        '/api/notifications',
        { params: { pageSize: 20 } }
      );
      setNotifications(data.data);
    } catch {
      // keep existing list on error
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setReadingIds((prev) => new Set(prev).add(id));
    try {
      await axios.post(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    } finally {
      setReadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setMarkingAllRead(true);
    try {
      await axios.post('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setMarkingAllRead(false);
    }
  }, []);

  // Poll for unread count
  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchUnreadCount]);

  // Fetch notifications when popover opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const handleOpenChange = (visible: boolean) => {
    setOpen(visible);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.status !== 'READ') {
      markAsRead(notification.id);
    }
  };

  const getModuleColor = (module: string): string => {
    return MODULE_COLORS[module.toLowerCase()] || 'default';
  };

  const content = (
    <div style={{ width: 380 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0 12px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Title level={5} style={{ margin: 0 }}>
          Notifications
        </Title>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckCheck size={14} />}
            loading={markingAllRead}
            onClick={markAllAsRead}
          >
            Mark all as read
          </Button>
        )}
      </div>

      <div style={{ maxHeight: 440, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            description="No notifications"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => {
              const isUnread = item.status !== 'READ';
              const isReading = readingIds.has(item.id);
              return (
                <List.Item
                  onClick={() => handleNotificationClick(item)}
                  style={{
                    cursor: 'pointer',
                    padding: '10px 4px',
                    backgroundColor: isUnread ? '#f6f8ff' : 'transparent',
                    transition: 'background-color 0.3s ease',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        strong={isUnread}
                        style={{ fontSize: 13, flex: 1, marginRight: 8 }}
                      >
                        {item.title}
                      </Text>
                      {isUnread && !isReading && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#1677ff',
                            flexShrink: 0,
                            marginTop: 5,
                          }}
                        />
                      )}
                      {isReading && <Spin size="small" />}
                    </div>

                    <Text
                      type="secondary"
                      style={{
                        fontSize: 12,
                        display: 'block',
                        marginBottom: 6,
                        lineHeight: 1.4,
                      }}
                    >
                      {item.message}
                    </Text>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Tag
                        color={SEVERITY_COLORS[item.severity] || 'default'}
                        style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}
                      >
                        {item.severity}
                      </Tag>
                      <Tag
                        color={getModuleColor(item.module)}
                        style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}
                      >
                        {item.module}
                      </Tag>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#8c8c8c',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          marginLeft: 'auto',
                        }}
                      >
                        <Clock size={11} />
                        {dayjs(item.createdAt).fromNow()}
                      </span>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
      overlayStyle={{ maxWidth: 400 }}
      overlayInnerStyle={{ padding: '8px 12px' }}
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<Bell size={20} color="white" />}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 36,
            width: 36,
          }}
        />
      </Badge>
    </Popover>
  );
};
