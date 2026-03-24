import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, RefreshControl } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';

interface ReportMetric {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
}

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<ReportMetric[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      // Aggregate data from multiple endpoints
      const [casesAnalytics, workshop, moh, energy] = await Promise.all([
        api.get<any>('/cases/analytics').catch(() => null),
        api.get<any>('/workshop/dashboard').catch(() => null),
        api.get<any>('/moh/dashboard').catch(() => null),
        api.get<any>('/energy/dashboard').catch(() => null),
      ]);

      const summaryMetrics: ReportMetric[] = [
        { label: 'Active Cases', value: casesAnalytics?.activeCount || 0, icon: 'briefcase-clock', color: '#9333ea', bg: '#faf5ff' },
        { label: 'Closed Cases', value: casesAnalytics?.closedCount || 0, icon: 'briefcase-check', color: '#22c55e', bg: '#f0fdf4' },
        { label: 'Workshop Jobs', value: (workshop?.stats?.pending || 0) + (workshop?.stats?.inProgress || 0), icon: 'wrench', color: '#eab308', bg: '#fefce8' },
        { label: 'Completed Jobs', value: workshop?.stats?.completed || 0, icon: 'check-circle', color: '#22c55e', bg: '#f0fdf4' },
        { label: 'MOH Planned', value: moh?.stats?.planned || 0, icon: 'calendar', color: '#3b82f6', bg: '#eff6ff' },
        { label: 'MOH In Progress', value: moh?.stats?.inProgress || 0, icon: 'progress-clock', color: '#f97316', bg: '#fff7ed' },
        { label: 'Energy (30d)', value: formatCurrency(energy?.summary?.totalFuelCost || 0), icon: 'fuel', color: '#dc2626', bg: '#fef2f2' },
        { label: 'Power Usage', value: `${((energy?.summary?.totalElectricKwh || 0)/1000).toFixed(0)} MWh`, icon: 'flash', color: '#0891b2', bg: '#ecfeff' },
      ];

      setMetrics(summaryMetrics);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const formatCurrency = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${n.toLocaleString()}`;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#059669" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>Error: {error}</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Reports & Analytics' }} />
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
        <View style={styles.header}>
          <MaterialCommunityIcons name="chart-arc" size={40} color="#059669" />
          <Text style={styles.headerTitle}>Operations Summary</Text>
          <Text style={styles.headerSub}>Pull to refresh</Text>
        </View>

        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          {metrics.map((m, i) => (
            <View key={i} style={[styles.metricCard, { backgroundColor: m.bg }]}>
              <MaterialCommunityIcons name={m.icon as any} size={24} color={m.color} />
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Report Categories</Text>
        {[
          { name: 'Procurement Status', icon: 'cart', color: '#9333ea' },
          { name: 'Equipment Availability', icon: 'engine', color: '#2563eb' },
          { name: 'Maintenance Summary', icon: 'wrench', color: '#eab308' },
          { name: 'Budget Utilization', icon: 'currency-inr', color: '#059669' },
        ].map((report, i) => (
          <Pressable key={i} style={styles.reportCard}>
            <View style={styles.reportLeft}>
              <MaterialCommunityIcons name={report.icon as any} size={24} color={report.color} />
              <Text style={styles.reportName}>{report.name}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
          </Pressable>
        ))}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={20} color="#0891b2" />
          <Text style={styles.infoText}>Detailed reports with charts and export options available on web dashboard</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#ef4444' },
  header: { alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 12 },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12, marginTop: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { width: '48%', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  metricValue: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  metricLabel: { fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'center' },
  reportCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  reportLeft: { flexDirection: 'row', alignItems: 'center' },
  reportName: { fontSize: 14, fontWeight: '500', color: '#0f172a', marginLeft: 12 },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfeff', padding: 14, borderRadius: 12, marginTop: 16 },
  infoText: { fontSize: 12, color: '#0891b2', marginLeft: 10, flex: 1 },
});
