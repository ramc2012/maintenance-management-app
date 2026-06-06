import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import api from '@/services/api';
import { disciplineToLabel, type Discipline } from '@/utils/workspace';
import { useTheme } from '@/context/ThemeContext';

type SummaryCounts = {
  openWorkOrders: number;
  pendingRequests: number;
  activeProcurement: number;
  logbookEntries: number;
  historyItems: number;
  calibrationDue: number;
};

type PreviewItem = {
  id: string;
  title: string;
  meta: string;
  route: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
};

type QuickLinkItem = {
  label: string;
  caption: string;
  route: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
};

const DISCIPLINE_ACCENT: Record<Discipline, string> = {
  MECHANICAL: '#2563eb',
  ELECTRICAL: '#d97706',
  INSTRUMENTATION: '#059669',
};

function parseDiscipline(raw?: string | string[]): Discipline {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'ELECTRICAL' || value === 'INSTRUMENTATION' || value === 'MECHANICAL') {
    return value;
  }
  return 'MECHANICAL';
}

function countList(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function appendDiscipline(endpoint: string, discipline: Discipline) {
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}discipline=${encodeURIComponent(discipline)}`;
}

export default function DepartmentScreen() {
  const params = useLocalSearchParams<{ discipline?: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;
  const discipline = parseDiscipline(params.discipline);
  const label = disciplineToLabel(discipline);
  const accent = DISCIPLINE_ACCENT[discipline];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState<SummaryCounts>({
    openWorkOrders: 0,
    pendingRequests: 0,
    activeProcurement: 0,
    logbookEntries: 0,
    historyItems: 0,
    calibrationDue: 0,
  });
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartment = useCallback(async () => {
    try {
      const [
        workOrders,
        maintenanceRequests,
        workOrderStats,
        procurementCases,
        procurementAnalytics,
        equipmentLogs,
        healthTable,
        calibrationDue,
      ] = await Promise.all([
        api.get<any[]>(appendDiscipline('/workorders', discipline)).catch(() => []),
        api.get<any[]>(appendDiscipline('/maintenance-requests', discipline)).catch(() => []),
        api.get<any>(appendDiscipline('/workorders/stats', discipline)).catch(() => null),
        api.get<any[]>(appendDiscipline('/cases', discipline)).catch(() => []),
        api.get<any>(appendDiscipline('/cases/analytics', discipline)).catch(() => null),
        api.get<any[]>(appendDiscipline('/equipment-logs', discipline)).catch(() => []),
        api.get<{ equipment?: any[] }>('/kpi/health-table').catch(() => null),
        discipline === 'INSTRUMENTATION' ? api.get<any[]>('/calibration/due?days=30').catch(() => []) : Promise.resolve([]),
      ]);

      const openWorkOrders = Array.isArray(workOrders)
        ? workOrders.filter((wo) => wo.status !== 'CLOSED').length
        : Number(workOrderStats?.counts?.open ?? workOrderStats?.open ?? 0);
      const pendingRequests = Array.isArray(maintenanceRequests)
        ? maintenanceRequests.filter((request) => request.status !== 'CLOSED' && request.status !== 'REJECTED').length
        : 0;
      const activeProcurement = Array.isArray(procurementCases)
        ? procurementCases.filter((item) => item.currentStage !== 'Closed' && item.status !== 'CLOSED').length
        : Number(procurementAnalytics?.activeCount ?? 0);
      const recentLogs = discipline === 'INSTRUMENTATION' ? [] : (Array.isArray(equipmentLogs) ? equipmentLogs.slice(0, 3) : []);
      const weakestAssets = Array.isArray(healthTable?.equipment) ? healthTable.equipment.slice(0, 3) : [];
      const recentProcurement = Array.isArray(procurementCases) ? procurementCases.slice(0, 2) : [];

      setCounts({
        openWorkOrders,
        pendingRequests,
        activeProcurement,
        logbookEntries: discipline === 'INSTRUMENTATION' ? 0 : countList(equipmentLogs),
        historyItems: weakestAssets.length,
        calibrationDue: countList(calibrationDue),
      });

      setPreviews([
        ...((Array.isArray(workOrders) ? workOrders.slice(0, 2) : []).map((wo) => ({
          id: `wo-${wo.id ?? wo.woNumber}`,
          title: wo.description || wo.woNumber || 'Work order',
          meta: `${wo.woNumber ?? 'WO'} · ${wo.status ?? 'Open'}`,
          route: `/modules/workorders?discipline=${discipline}`,
          icon: 'clipboard-list-outline' as const,
          color: '#2563eb',
        }))),
        ...recentLogs.map((log, index) => ({
          id: `log-${log.id ?? index}`,
          title: log.equipmentTag || log.assetTag || 'Logbook entry',
          meta: log.remarks || log.runStatus ? 'Running log' : 'Maintenance history',
          route: `/modules/logbook?discipline=${discipline}`,
          icon: 'book-open-page-variant' as const,
          color: '#d97706',
        })),
        ...recentProcurement.map((item, index) => ({
          id: `proc-${item.id ?? index}`,
          title: item.title || item.caseNo || 'Procurement case',
          meta: `${item.type ?? 'MR'} · ${item.currentStage ?? item.status ?? 'Open'}`,
          route: `/modules/procurement?discipline=${discipline}`,
          icon: 'cart-outline' as const,
          color: '#7c3aed',
        })),
        ...weakestAssets.map((asset) => ({
          id: `asset-${asset.equipmentTag}`,
          title: asset.equipmentTag || 'Equipment',
          meta: `${asset.description ?? 'Health history'} · Score ${asset.score ?? '-'}`,
          route: `/modules/assets?discipline=${discipline}`,
          icon: 'history' as const,
          color: '#0f766e',
        })),
      ].slice(0, 6));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load department details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [discipline]);

  useEffect(() => {
    fetchDepartment();
  }, [fetchDepartment]);

  const quickLinks = useMemo(() => {
    const links: QuickLinkItem[] = [
      { label: 'WO', caption: 'Orders', route: `/modules/workorders?discipline=${discipline}`, icon: 'clipboard-list-outline' as const, color: '#2563eb' },
      { label: 'Proc', caption: 'MR', route: `/modules/procurement?discipline=${discipline}`, icon: 'cart-outline' as const, color: '#7c3aed' },
      { label: 'Rpt', caption: 'Report', route: `/modules/reports?mode=new&discipline=${discipline}`, icon: 'file-document-edit-outline' as const, color: '#059669' },
      { label: 'View', caption: 'Reports', route: `/modules/reports?mode=view&discipline=${discipline}`, icon: 'file-search-outline' as const, color: '#0f766e' },
      { label: 'Hist', caption: 'Assets', route: `/modules/assets?discipline=${discipline}`, icon: 'history' as const, color: '#0f766e' },
    ];

    if (discipline === 'INSTRUMENTATION') {
      links.splice(2, 0, { label: 'Cal', caption: 'Due', route: `/modules/calibration?discipline=${discipline}`, icon: 'chart-bell-curve' as const, color: '#2563eb' });
    } else {
      links.splice(2, 0, { label: 'Log', caption: 'Logbook', route: `/modules/logbook?discipline=${discipline}`, icon: 'book-open-page-variant' as const, color: '#d97706' });
    }

    return links;
  }, [discipline]);

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color={accent} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: `${label} Desk` }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDepartment(); }} tintColor={accent} />}
      >
        {error ? (
          <View style={[styles.notice, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
            <Text style={[styles.noticeText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.statGrid}>
          <StatCard label="Open WOs" value={counts.openWorkOrders} icon="clipboard-list-outline" color="#2563eb" colors={colors} />
          <StatCard label="Requests" value={counts.pendingRequests} icon="alert-circle-outline" color="#dc2626" colors={colors} />
          <StatCard label="Procurement" value={counts.activeProcurement} icon="cart-outline" color="#7c3aed" colors={colors} />
          {discipline !== 'INSTRUMENTATION' ? <StatCard label="Logs" value={counts.logbookEntries} icon="book-open-page-variant" color="#d97706" colors={colors} /> : null}
          <StatCard label="History" value={counts.historyItems} icon="history" color="#0f766e" colors={colors} />
          {discipline === 'INSTRUMENTATION' ? <StatCard label="Cal Due" value={counts.calibrationDue} icon="chart-bell-curve" color="#2563eb" colors={colors} /> : null}
        </View>

        <SectionTitle title={`${label} Actions`} colors={colors} />
        <View style={styles.quickGrid}>
          {quickLinks.map((link) => (
            <Pressable key={link.route} style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => router.push(link.route as any)}>
              <View style={[styles.quickIcon, { backgroundColor: `${link.color}18` }]}>
                <MaterialCommunityIcons name={link.icon} size={22} color={link.color} />
              </View>
              <Text style={[styles.quickLabel, { color: colors.text }]}>{link.label}</Text>
              <Text style={[styles.quickCaption, { color: colors.textTertiary }]}>{link.caption}</Text>
            </Pressable>
          ))}
        </View>

        <SectionTitle title={`${label} Relevant Details`} colors={colors} />
        <View style={[styles.listPanel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {previews.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No department records returned yet. New work orders, logs, requests, and history will appear here.</Text>
          ) : previews.map((item) => (
            <Pressable key={item.id} style={[styles.previewRow, { borderBottomColor: colors.divider }]} onPress={() => router.push(item.route as any)}>
              <View style={[styles.previewIcon, { backgroundColor: `${item.color}18` }]}>
                <MaterialCommunityIcons name={item.icon} size={18} color={item.color} />
              </View>
              <View style={styles.previewCopy}>
                <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.previewMeta, { color: colors.textTertiary }]} numberOfLines={1}>{item.meta}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, color, colors }: {
  label: string;
  value: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  colors: any;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.statTop}>
        <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
          <MaterialCommunityIcons name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, colors }: { title: string; colors: any }) {
  return <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  notice: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 14 },
  noticeText: { fontSize: 12, fontWeight: '600' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  statCard: { width: '31.5%', minHeight: 72, borderRadius: 14, borderWidth: 1, padding: 10, marginBottom: 10, justifyContent: 'space-between' },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 19, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700' },
  sectionTitle: { marginTop: 8, marginBottom: 10, fontSize: 16, fontWeight: '800' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickCard: { width: '31.5%', minHeight: 104, borderRadius: 14, borderWidth: 1, alignItems: 'center', padding: 10, marginBottom: 10 },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 12, fontWeight: '800' },
  quickCaption: { marginTop: 2, fontSize: 10, fontWeight: '600' },
  listPanel: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  previewRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  previewIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  previewCopy: { flex: 1, minWidth: 0 },
  previewTitle: { fontSize: 13, fontWeight: '700' },
  previewMeta: { marginTop: 2, fontSize: 11 },
  emptyText: { padding: 16, fontSize: 12, lineHeight: 18 },
});
