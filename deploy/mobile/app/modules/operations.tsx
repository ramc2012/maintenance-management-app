import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import api from '@/services/api';

type OperationMetric = {
  source: string;
  label: string;
  value: string | number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  link: string;
};

const formatCurrency = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString()}`;

export default function OperationsSummaryScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const [metrics, setMetrics] = useState<OperationMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const today = new Date().toISOString().slice(0, 10);
      const [casesAnalytics, workshop, moh, energy, logbookToday, calibrationEvents, calibrationDue] = await Promise.all([
        api.get<any>('/cases/analytics').catch(() => null),
        api.get<any>('/workshop/dashboard').catch(() => null),
        api.get<any>('/moh/dashboard').catch(() => null),
        api.get<any>('/energy/dashboard').catch(() => null),
        api.get<any>(`/operations/overview?from=${today}&to=${today}`).catch(() => null),
        api.get<any[]>('/calibration/events').catch(() => []),
        api.get<any[]>('/calibration/due?days=0').catch(() => []),
      ]);
      const calibrationDoneToday = Array.isArray(calibrationEvents)
        ? calibrationEvents.filter((event) => String(event.calibrationDate || '').slice(0, 10) === today).length
        : 0;

      setMetrics([
        { source: 'Procurement', label: 'Active Cases', value: casesAnalytics?.activeCount || 0, icon: 'briefcase-clock', color: '#9333ea', link: '/modules/procurement' },
        { source: 'Procurement', label: 'Closed Cases', value: casesAnalytics?.closedCount || 0, icon: 'briefcase-check', color: '#22c55e', link: '/modules/procurement' },
        { source: 'Workshop', label: 'Open Jobs', value: (workshop?.overall?.pending || 0) + (workshop?.overall?.inProgress || 0), icon: 'wrench', color: '#eab308', link: '/modules/workshop' },
        { source: 'Workshop', label: 'Completed Jobs', value: workshop?.overall?.completed || 0, icon: 'check-circle', color: '#22c55e', link: '/modules/workshop' },
        { source: 'Major Overhaul', label: 'Planned', value: moh?.stats?.planned || 0, icon: 'calendar', color: '#3b82f6', link: '/modules/overhaul' },
        { source: 'Major Overhaul', label: 'In Progress', value: moh?.stats?.inProgress || 0, icon: 'progress-clock', color: '#f97316', link: '/modules/overhaul' },
        { source: 'Energy', label: 'Fuel Cost (30d)', value: formatCurrency(energy?.summary?.totalFuelCost || 0), icon: 'fuel', color: '#dc2626', link: '/modules/energy' },
        { source: 'Energy', label: 'Power Usage', value: `${((energy?.summary?.totalElectricKwh || 0) / 1000).toFixed(0)} MWh`, icon: 'flash', color: '#0891b2', link: '/modules/energy' },
        { source: 'Logbook', label: 'Logs Today', value: logbookToday?.stats?.submittedLogs || 0, icon: 'clipboard-list-outline', color: '#2563eb', link: '/modules/logbook' },
        { source: 'Logbook', label: 'Pending Today', value: logbookToday?.stats?.pendingLogsToday || 0, icon: 'gauge', color: '#d97706', link: '/modules/logbook' },
        { source: 'Calibration', label: 'Done Today', value: calibrationDoneToday, icon: 'check-circle-outline', color: '#059669', link: '/modules/calibration' },
        { source: 'Calibration', label: 'Due Today', value: Array.isArray(calibrationDue) ? calibrationDue.length : 0, icon: 'chart-bell-curve', color: '#db2777', link: '/modules/calibration' },
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color="#059669" /></View>;
  }

  if (error) {
    return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><Text style={{ color: colors.error }}>Error: {error}</Text></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: 'Operations Summary' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchData(); }} tintColor="#059669" />}
      >
        <View style={styles.header}>
          <MaterialCommunityIcons name="chart-arc" size={32} color="#059669" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Operations Summary</Text>
        </View>

        <View style={styles.metricsGrid}>
          {metrics.map((metric) => (
            <Pressable key={`${metric.source}-${metric.label}`} style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => router.push(metric.link as any)}>
              <View style={styles.metricTopRow}>
                <View style={[styles.metricIcon, { backgroundColor: `${metric.color}18` }]}>
                  <MaterialCommunityIcons name={metric.icon} size={21} color={metric.color} />
                </View>
                <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
              </View>
              <Text style={[styles.metricSource, { color: colors.textTertiary }]} numberOfLines={1}>{metric.source}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>{metric.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Linked Views</Text>
        {[
          { name: 'Procurement Status', icon: 'cart', color: '#9333ea', link: '/modules/procurement' },
          { name: 'Equipment Availability', icon: 'engine', color: '#2563eb', link: '/modules/assets' },
          { name: 'Maintenance Summary', icon: 'wrench', color: '#eab308', link: '/modules/workorders' },
          { name: 'Energy & Power', icon: 'lightning-bolt', color: '#ef4444', link: '/modules/energy' },
        ].map((item) => (
          <Pressable key={item.name} style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => router.push(item.link as any)}>
            <View style={styles.linkLeft}>
              <MaterialCommunityIcons name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={23} color={item.color} />
              <Text style={[styles.linkName, { color: colors.text }]}>{item.name}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 19, fontWeight: '800', marginTop: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { width: '48%', borderRadius: 12, borderWidth: 1, padding: 13, marginBottom: 12 },
  metricTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  metricIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 20, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
  metricSource: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 12 },
  metricLabel: { fontSize: 12, marginTop: 3, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 10, marginBottom: 10 },
  linkCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 10 },
  linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkName: { fontSize: 14, fontWeight: '700' },
});
