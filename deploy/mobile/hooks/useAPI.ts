import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query';

import api from '@/services/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  status: 'UNREAD' | 'READ';
  module?: string | null;
  createdAt: string;
}

interface NotificationResponse {
  data: NotificationItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface KpiSummaryResponse {
  period: {
    from: string;
    to: string;
  };
  kpis: Record<string, unknown>;
  totals: Record<string, number>;
}

interface HealthTableItem {
  equipmentTag: string;
  description: string;
  grade: 'A' | 'B' | 'C' | 'D';
  score: number;
}

export function useAppQuery<TData>(
  queryKey: readonly unknown[],
  endpoint: string,
  options?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData>({
    queryKey,
    queryFn: () => api.get<TData>(endpoint),
    ...options,
  });
}

export function useAppMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    ...options,
  });
}

export function useUnreadNotifications(enabled = true) {
  return useAppQuery<{ count: number }>(
    ['notifications', 'unread-count'],
    '/notifications/unread-count',
    {
      enabled,
      refetchInterval: 60_000,
      refetchIntervalInBackground: true,
    }
  );
}

export function useNotifications(enabled = true) {
  return useAppQuery<NotificationResponse>(
    ['notifications', 'feed'],
    '/notifications?page=1&pageSize=20',
    {
      enabled,
      refetchInterval: 60_000,
    }
  );
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useAppMutation<unknown, string>(
    (notificationId) => api.post(`/notifications/${notificationId}/read`, {}),
    {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['notifications', 'feed'] }),
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
        ]);
      },
    }
  );
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useAppMutation<unknown, void>(
    () => api.post('/notifications/read-all', {}),
    {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['notifications', 'feed'] }),
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
        ]);
      },
    }
  );
}

export function useKpiSummary(enabled = true) {
  return useAppQuery<KpiSummaryResponse>(
    ['kpi', 'summary'],
    '/kpi/summary',
    {
      enabled,
    }
  );
}

export function useHealthTable(enabled = true) {
  return useAppQuery<{ equipment: HealthTableItem[]; total: number }>(
    ['kpi', 'health-table'],
    '/kpi/health-table',
    {
      enabled,
    }
  );
}
