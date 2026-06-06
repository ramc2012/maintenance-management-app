import React, { createContext, useContext, useMemo } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useUnreadNotifications } from '@/hooks/useAPI';

interface NotificationContextValue {
  unreadCount: number;
  isRefreshing: boolean;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const unreadQuery = useUnreadNotifications(Boolean(token));

  const value = useMemo(
    () => ({
      unreadCount: unreadQuery.data?.count ?? 0,
      isRefreshing: unreadQuery.isFetching,
    }),
    [unreadQuery.data?.count, unreadQuery.isFetching]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationsBadge() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationsBadge must be used within NotificationProvider');
  }
  return context;
}
