import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ExportButton } from '@/components/ExportButton';
import { HealthBadge } from '@/components/HealthBadge';
import { Text } from '@/components/Themed';
import { useHealthTable, useKpiSummary } from '@/hooks/useAPI';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

type KPIMetric = {
  key: string;
  label: string;
  value: string;
  numericValue: number;
  unit: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent: string;
  threshold: number;
  inverse?: boolean;
  hint?: string;
};

export default function KPIDashboardScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const kpiQuery = useKpiSummary(Boolean(token));
  const healthQuery = useHealthTable(Boolean(token));
  const [showAllHealth, setShowAllHealth] = useState(false);

  const metrics: KPIMetric[] = useMemo(() => {
    const kpis = kpiQuery.data?.kpis ?? {};
    const extract = (key: string): number => {
      const entry = kpis[key] as { value?: number } | undefined;
      return Number(entry?.value ?? 0);
    };

    return [
      { key: 'pmCompliance', label: 'PM Compliance', value: `${extract('pmCompliance').toFixed(1)}%`, numericValue: extract('pmCompliance'), unit: '%', icon: 'shield-check-outline', accent: '#22c55e', threshold: 80, hint: 'Preventive WOs completed on time' },
      { key: 'availability', label: 'Availability', value: `${extract('availability').toFixed(1)}%`, numericValue: extract('availability'), unit: '%', icon: 'sine-wave', accent: '#3b82f6', threshold: 90, hint: 'Equipment uptime ratio' },
      { key: 'mtbf', label: 'MTBF', value: `${extract('mtbf').toFixed(0)} h`, numericValue: extract('mtbf'), unit: 'hrs', icon: 'clock-outline', accent: '#6366f1', threshold: 720, hint: 'Mean time between failures' },
      { key: 'mttr', label: 'MTTR', value: `${extract('mttr').toFixed(1)} h`, numericValue: extract('mttr'), unit: 'hrs', icon: 'wrench-outline', accent: '#f59e0b', threshold: 8, inverse: true, hint: 'Mean time to repair' },
      { key: 'overdueWOs', label: 'Overdue WOs', value: String(extract('overdueWOs')), numericValue: extract('overdueWOs'), unit: '', icon: 'calendar-alert-outline', accent: '#ef4444', threshold: 0, inverse: true, hint: 'Open past scheduled date' },
      { key: 'breakdownFrequency', label: 'Breakdowns', value: String(extract('breakdownFrequency')), numericValue: extract('breakdownFrequency'), unit: '/period', icon: 'alert-octagon-outline', accent: '#dc2626', threshold: 5, inverse: true, hint: 'Corrective WO count' },
      { key: 'avgResponseTime', label: 'Response Time', value: `${extract('avgResponseTime').toFixed(0)} min`, numericValue: extract('avgResponseTime'), unit: 'min', icon: 'timer-outline', accent: '#d97706', threshold: 60, inverse: true, hint: 'BD to team arrival' },
      { key: 'calibrationCompliance', label: 'Calib Compliance', value: `${extract('calibrationCompliance').toFixed(1)}%`, numericValue: extract('calibrationCompliance'), unit: '%', icon: 'target', accent: '#06b6d4', threshold: 90, hint: 'Calibration on time' },
      { key: 'repeatFailureRate', label: 'Repeat Failures', value: `${extract('repeatFailureRate').toFixed(1)}%`, numericValue: extract('repeatFailureRate'), unit: '%', icon: 'reload-alert', accent: '#ec4899', threshold: 10, inverse: true, hint: 'Same fault within 30 days' },
      { key: 'indirectCost', label: 'Indirect Cost', value: formatCost(extract('indirectCost')), numericValue: extract('indirectCost'), unit: '', icon: 'currency-inr', accent: '#7c3aed', threshold: 0, hint: 'Labor + procurement spend' },
    ];
  }, [kpiQuery.data]);

  const healthItems = useMemo(
    () => healthQuery.data?.equipment ?? [],
    [healthQuery.data]
  );

  const visibleHealth = showAllHealth ? healthItems : healthItems.slice(0, 6);

  const isOnTarget = (m: KPIMetric) => {
    if (m.threshold === 0 && !m.inverse) return null;
    return m.inverse ? m.numericValue <= m.threshold : m.numericValue >= m.threshold;
  };

  if (kpiQuery.isLoading) {
    return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: 'KPI Dashboard', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={kpiQuery.isRefetching} onRefresh={() => { kpiQuery.refetch(); healthQuery.refetch(); }} tintColor={colors.primary} />}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: theme.isDark ? colors.surface : '#0f172a' }]}>
          <View style={[styles.heroIcon, { backgroundColor: theme.isDark ? colors.backgroundTertiary : '#1e293b' }]}>
            <MaterialCommunityIcons name="chart-box-outline" size={28} color="#93c5fd" />
          </View>
          <Text style={styles.heroTitle}>Maintenance KPIs</Text>
          <View style={styles.heroActions}>
            <ExportButton endpoint="/kpi/report/export" fileName="KPI_Report.xlsx" label="Export Report" />
          </View>
        </View>

        {/* KPI Grid */}
        <SectionHeader title="Performance Metrics" action={`${kpiQuery.data?.period?.from?.slice(0, 10) ?? ''} to ${kpiQuery.data?.period?.to?.slice(0, 10) ?? ''}`} colors={colors} />
        <View style={styles.kpiGrid}>
          {metrics.map((m) => {
            const target = isOnTarget(m);
            return (
              <View key={m.key} style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.kpiCardHeader}>
                  <View style={[styles.kpiIconWrap, { backgroundColor: `${m.accent}15` }]}>
                    <MaterialCommunityIcons name={m.icon} size={18} color={m.accent} />
                  </View>
                  {target !== null && (
                    <View style={[styles.targetDot, { backgroundColor: target ? '#22c55e' : '#ef4444' }]} />
                  )}
                </View>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{m.value}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{m.label}</Text>
                {m.hint && <Text style={[styles.kpiHint, { color: colors.textTertiary }]}>{m.hint}</Text>}
                {target !== null && (
                  <Text style={[styles.kpiTarget, { color: target ? colors.success : colors.error }]}>
                    {target ? 'On Target' : 'Needs Attention'}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Progress Bars */}
        <SectionHeader title="Compliance Overview" colors={colors} />
        <View style={[styles.progressPanel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {[
            { label: 'PM Compliance', value: metrics[0]?.numericValue ?? 0, color: '#22c55e' },
            { label: 'Availability', value: metrics[1]?.numericValue ?? 0, color: '#3b82f6' },
            { label: 'Calib Compliance', value: metrics[7]?.numericValue ?? 0, color: '#06b6d4' },
          ].map((bar) => (
            <View key={bar.label} style={styles.progressRow}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{bar.label}</Text>
                <Text style={[styles.progressValue, { color: bar.color }]}>{bar.value.toFixed(1)}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.backgroundTertiary }]}>
                <View style={[styles.progressFill, { width: `${Math.min(100, bar.value)}%`, backgroundColor: bar.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Equipment Health */}
        <SectionHeader title="Equipment Health" action={`${healthQuery.data?.total ?? 0} assets scored`} colors={colors} />
        <View style={[styles.healthPanel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.healthLegend, { borderBottomColor: colors.divider }]}>
            {(['A', 'B', 'C', 'D'] as const).map((grade) => (
              <View key={grade} style={styles.legendItem}>
                <HealthBadge grade={grade} />
                <Text style={[styles.legendText, { color: colors.textTertiary }]}>{grade === 'A' ? 'Excellent' : grade === 'B' ? 'Good' : grade === 'C' ? 'Fair' : 'Poor'}</Text>
              </View>
            ))}
          </View>
          {healthQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : healthItems.length === 0 ? (
            <View style={[styles.emptyPanel, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No health data available. Scores are computed from calibration, breakdown history, and open work orders.</Text>
            </View>
          ) : (
            <>
              {visibleHealth.map((item) => (
                <View key={item.equipmentTag} style={[styles.healthRow, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={styles.healthInfo}>
                    <Text style={[styles.healthTag, { color: colors.text }]}>{item.equipmentTag}</Text>
                    <Text style={[styles.healthDesc, { color: colors.textTertiary }]} numberOfLines={1}>{item.description}</Text>
                  </View>
                  <View style={styles.healthEnd}>
                    <HealthBadge grade={item.grade} />
                    <Text style={[styles.healthScore, { color: colors.text }]}>{item.score}</Text>
                  </View>
                </View>
              ))}
              {healthItems.length > 6 && (
                <Pressable style={styles.showMoreBtn} onPress={() => setShowAllHealth(!showAllHealth)}>
                  <Text style={[styles.showMoreText, { color: colors.primary }]}>{showAllHealth ? 'Show less' : `Show all ${healthItems.length} assets`}</Text>
                  <MaterialCommunityIcons name={showAllHealth ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, action, colors }: { title: string; action?: string; colors: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action && <Text style={[styles.sectionAction, { color: colors.textTertiary }]}>{action}</Text>}
    </View>
  );
}

function formatCost(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)} L`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(Math.round(value));
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { borderRadius: 18, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#ffffff' },
  heroActions: { marginLeft: 'auto' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionAction: { fontSize: 11 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  kpiCard: { width: '48%', borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
  kpiCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  kpiIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  targetDot: { width: 8, height: 8, borderRadius: 4 },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  kpiLabel: { marginTop: 4, fontSize: 13, fontWeight: '600' },
  kpiHint: { marginTop: 4, fontSize: 11 },
  kpiTarget: { marginTop: 8, fontSize: 11, fontWeight: '700' },
  progressPanel: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 20, gap: 16 },
  progressRow: { gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, fontWeight: '600' },
  progressValue: { fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  healthPanel: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 20 },
  healthLegend: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 11 },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 8 },
  healthInfo: { flex: 1, paddingRight: 12 },
  healthTag: { fontSize: 13, fontWeight: '700' },
  healthDesc: { marginTop: 3, fontSize: 11 },
  healthEnd: { alignItems: 'flex-end', gap: 4 },
  healthScore: { fontSize: 16, fontWeight: '800' },
  emptyPanel: { padding: 16, borderRadius: 12 },
  emptyText: { fontSize: 12, lineHeight: 18 },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 12 },
  showMoreText: { fontSize: 13, fontWeight: '600' },
});
