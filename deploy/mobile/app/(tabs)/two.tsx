import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { NotificationBadge } from '@/components/NotificationBadge';
import { Text } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useAPI';

const moduleColors: Record<string, string> = {
  PROCUREMENT: '#9333ea',
  WORKSHOP: '#0f766e',
  INSPECTIONS: '#2563eb',
  KPI: '#0ea5e9',
  TRAINING: '#0891b2',
  CALIBRATION: '#16a34a',
};

export default function InboxScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const notificationsQuery = useNotifications(Boolean(token));
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = notificationsQuery.data?.data ?? [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} contentContainerStyle={styles.content}>
      <View style={[styles.summaryCard, { backgroundColor: theme.isDark ? colors.surface : '#0f172a' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>Notification center</Text>
          <Text style={styles.summaryText}>
            Real-time alerts from work orders, inspections, calibration, and planning workflows.
          </Text>
        </View>
        <NotificationBadge count={notifications.filter((item) => item.status === 'UNREAD').length} />
      </View>

      <Pressable
        style={[styles.markAllBtn, { backgroundColor: colors.primarySubtle, borderColor: colors.primaryMuted }, markAll.isPending && styles.disabledBtn]}
        onPress={() => markAll.mutate()}
        disabled={markAll.isPending}
      >
        <MaterialCommunityIcons name="check-all" size={18} color={colors.primary} />
        <Text style={[styles.markAllText, { color: colors.primary }]}>{markAll.isPending ? 'Marking...' : 'Mark all as read'}</Text>
      </Pressable>

      {notificationsQuery.isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading notification feed...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <MaterialCommunityIcons name="bell-check-outline" size={28} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No pending alerts</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            When new work orders, inspections, or planning alerts arrive, they will appear here.
          </Text>
        </View>
      ) : (
        notifications.map((item) => {
          const accent = moduleColors[item.module ?? ''] ?? colors.textSecondary;
          return (
            <Pressable
              key={item.id}
              style={[styles.notificationCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => {
                if (item.status === 'UNREAD') {
                  markOne.mutate(item.id);
                }
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
                <MaterialCommunityIcons name="bell-ring-outline" size={18} color={accent} />
              </View>
              <View style={styles.notificationCopy}>
                <View style={styles.notificationHeader}>
                  <Text style={[styles.notificationTitle, { color: colors.text }]}>{item.title}</Text>
                  {item.status === 'UNREAD' ? <NotificationBadge count={1} /> : null}
                </View>
                <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>{item.message}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: colors.textTertiary }]}>{item.module ?? 'GENERAL'}</Text>
                  <Text style={[styles.metaText, { color: colors.textTertiary }]}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  summaryText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#cbd5e1',
  },
  markAllBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  markAllText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  emptyState: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  notificationCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationCopy: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  notificationMessage: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaText: {
    fontSize: 11,
  },
});
