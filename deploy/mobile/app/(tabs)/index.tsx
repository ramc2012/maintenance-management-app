import React, { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { KPICard } from '@/components/KPICard';
import { HealthBadge } from '@/components/HealthBadge';
import { ModuleCard, type ModuleCardProps } from '@/components/ModuleCard';
import { NotificationBadge } from '@/components/NotificationBadge';
import { Text } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { useNotificationsBadge } from '@/context/NotificationContext';
import { useHealthTable, useKpiSummary } from '@/hooks/useAPI';

const OPERATIONS_MODULES = [
  { id: 'assets', name: 'Equipment Master', icon: 'database', color: '#2563eb', bg: '#eff6ff', link: '/modules/assets' },
  { id: 'calibration', name: 'Calibration', icon: 'chart-bell-curve', color: '#16a34a', bg: '#f0fdf4', link: '/modules/calibration' },
  { id: 'logbook', name: 'Digital Logbook', icon: 'book-open-page-variant', color: '#d97706', bg: '#fffbeb', link: '/modules/logbook' },
  { id: 'workshop', name: 'Workshop', icon: 'hammer', color: '#0f766e', bg: '#f0fdfa', link: '/modules/workshop' },
  { id: 'manuals', name: 'Manuals & Drawings', icon: 'file-document-outline', color: '#14b8a6', bg: '#ecfeff', link: '/modules/manuals' },
  { id: 'collab', name: 'Collaboration', icon: 'message-text-outline', color: '#7c3aed', bg: '#f5f3ff', link: '/modules/collaboration' },
] satisfies ModuleCardProps[];

const PLANNING_MODULES = [
  { id: 'procurement', name: 'Procurement', icon: 'cart-outline', color: '#9333ea', bg: '#faf5ff', link: '/modules/procurement' },
  { id: 'stock', name: 'Material Planner', icon: 'clipboard-list-outline', color: '#4f46e5', bg: '#eef2ff', link: '/modules/mrp' },
  { id: 'training', name: 'Training', icon: 'school-outline', color: '#0891b2', bg: '#ecfeff', link: '/modules/training' },
  { id: 'reports', name: 'Reports', icon: 'chart-box-outline', color: '#059669', bg: '#ecfdf5', link: '/modules/reports' },
  { id: 'energy', name: 'Energy', icon: 'lightning-bolt-outline', color: '#dc2626', bg: '#fef2f2', link: '/modules/energy' },
  { id: 'overhaul', name: 'Major Overhaul', icon: 'wrench-outline', color: '#ea580c', bg: '#fff7ed', link: '/modules/overhaul' },
] satisfies ModuleCardProps[];

const SUPPORT_MODULES = [
  { id: 'manpower', name: 'Manpower', icon: 'account-group-outline', color: '#db2777', bg: '#fdf2f7', link: '/modules/manpower' },
  { id: 'settings', name: 'Settings', icon: 'cog-outline', color: '#475569', bg: '#f8fafc', link: '/modules/settings' },
] satisfies ModuleCardProps[];

const ADMIN_MODULES = [
  { id: 'usermgmt', name: 'User Management', icon: 'account-cog-outline', color: '#0f172a', bg: '#f1f5f9', link: '/modules/usermanagement' },
] satisfies ModuleCardProps[];

export default function HomeScreen() {
  const { user, token, logout, loading } = useAuth();
  const { unreadCount } = useNotificationsBadge();
  const router = useRouter();

  const kpiSummary = useKpiSummary(Boolean(token));
  const healthTable = useHealthTable(Boolean(token));

  useEffect(() => {
    if (!loading && !token) {
      router.replace('/login');
    }
  }, [loading, router, token]);

  const criticalEquipment = useMemo(
    () => (healthTable.data?.equipment ?? []).slice(0, 3),
    [healthTable.data?.equipment]
  );

  const metrics = useMemo(() => {
    const kpis = kpiSummary.data?.kpis ?? {};
    const totals = kpiSummary.data?.totals ?? {};

    return [
      {
        label: 'PM Compliance',
        value: `${Number((kpis.pmCompliance as { value?: number } | undefined)?.value ?? 0)}%`,
        hint: `${totals.pmWOs ?? 0} PM work orders`,
        icon: 'shield-check-outline' as const,
        accent: '#2563eb',
      },
      {
        label: 'Availability',
        value: `${Number((kpis.availability as { value?: number } | undefined)?.value ?? 0)}%`,
        hint: `${Math.round(Number((kpis.availability as { totalDowntime?: number } | undefined)?.totalDowntime ?? 0))} hrs downtime`,
        icon: 'sine-wave' as const,
        accent: '#0f766e',
      },
      {
        label: 'Overdue WOs',
        value: String(Number((kpis.overdueWOs as { value?: number } | undefined)?.value ?? 0)),
        hint: `${totals.allWOs ?? 0} total work orders`,
        icon: 'calendar-alert-outline' as const,
        accent: '#dc2626',
      },
      {
        label: 'Response Time',
        value: `${Number((kpis.avgResponseTime as { value?: number } | undefined)?.value ?? 0)} min`,
        hint: `${Number((kpis.avgResponseTime as { sampleSize?: number } | undefined)?.sampleSize ?? 0)} events`,
        icon: 'timer-outline' as const,
        accent: '#d97706',
      },
    ];
  }, [kpiSummary.data?.kpis, kpiSummary.data?.totals]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (loading || !token) {
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>FIELD OPERATIONS</Text>
          <Text style={styles.title}>Mobile maintenance control room</Text>
          <Text style={styles.subtitle}>
            Track live work, inspect equipment health, and move between field modules without returning to the web console.
          </Text>
        </View>
        <View style={styles.heroMeta}>
          <View style={styles.userCard}>
            <View>
              <Text style={styles.userName}>{user?.username ?? 'User'}</Text>
              <Text style={styles.userRole}>{user?.role ?? 'Member'}</Text>
            </View>
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <MaterialCommunityIcons name="logout" size={18} color="#334155" />
            </Pressable>
          </View>
          <Pressable style={styles.inboxCard} onPress={() => router.push('/(tabs)/two')}>
            <View>
              <Text style={styles.inboxLabel}>Unread alerts</Text>
              <Text style={styles.inboxValue}>{unreadCount}</Text>
            </View>
            <NotificationBadge count={unreadCount} />
          </Pressable>
        </View>
      </View>

      <SectionHeader
        title="KPI strip"
        actionLabel={kpiSummary.isRefetching ? 'Refreshing...' : 'Updated from live API'}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiStrip}>
        {metrics.map((metric) => (
          <KPICard key={metric.label} {...metric} />
        ))}
      </ScrollView>

      <SectionHeader
        title="Health watch"
        actionLabel={healthTable.isLoading ? 'Loading health table...' : `${healthTable.data?.total ?? 0} assets scored`}
      />
      <View style={styles.healthPanel}>
        {criticalEquipment.length > 0 ? criticalEquipment.map((equipment) => (
          <Pressable
            key={equipment.equipmentTag}
            style={styles.healthRow}
            onPress={() => router.push('/modules/assets')}
          >
            <View style={styles.healthCopy}>
              <Text style={styles.healthTag}>{equipment.equipmentTag}</Text>
              <Text style={styles.healthDesc} numberOfLines={1}>{equipment.description}</Text>
            </View>
            <View style={styles.healthMeta}>
              <HealthBadge grade={equipment.grade} />
              <Text style={styles.healthScore}>{equipment.score}</Text>
            </View>
          </Pressable>
        )) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Health data will appear here</Text>
            <Text style={styles.emptyText}>
              The mobile shell is wired to `/api/kpi/health-table`. Once the backend responds, this panel will surface the weakest assets first.
            </Text>
          </View>
        )}
      </View>

      <ModuleSection title="Operations" subtitle="Execution-heavy modules for technicians and supervisors.">
        {OPERATIONS_MODULES.map((module) => (
          <ModuleCard key={module.id} {...module} />
        ))}
      </ModuleSection>

      <ModuleSection title="Planning & Analysis" subtitle="Planning, reporting, and support workflows.">
        {PLANNING_MODULES.map((module) => (
          <ModuleCard key={module.id} {...module} />
        ))}
      </ModuleSection>

      <ModuleSection title="Support" subtitle="Shared team utilities and workspace setup.">
        {SUPPORT_MODULES.map((module) => (
          <ModuleCard key={module.id} {...module} />
        ))}
      </ModuleSection>

      {user?.role === 'ADMIN' ? (
        <ModuleSection title="Admin" subtitle="Restricted controls for administrative users.">
          {ADMIN_MODULES.map((module) => (
            <ModuleCard key={module.id} {...module} />
          ))}
        </ModuleSection>
      ) : null}

      <Pressable style={styles.kelvinFab} onPress={() => router.push('/modules/kelvin')}>
        <MaterialCommunityIcons name="robot-outline" size={20} color="#fff" />
        <Text style={styles.kelvinFabText}>Kelvin AI</Text>
      </Pressable>
    </ScrollView>
  );
}

function SectionHeader({ title, actionLabel }: { title: string; actionLabel?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? <Text style={styles.sectionAction}>{actionLabel}</Text> : null}
    </View>
  );
}

function ModuleSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.moduleSection}>
      <Text style={styles.moduleTitle}>{title}</Text>
      <Text style={styles.moduleSubtitle}>{subtitle}</Text>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  hero: {
    backgroundColor: '#0f172a',
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
  },
  heroCopy: {
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#93c5fd',
  },
  title: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: '#cbd5e1',
  },
  heroMeta: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  userRole: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748b',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inboxLabel: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  inboxValue: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionAction: {
    fontSize: 12,
    color: '#64748b',
  },
  kpiStrip: {
    paddingBottom: 8,
    marginBottom: 24,
  },
  healthPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 24,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 16,
  },
  healthCopy: {
    flex: 1,
    marginRight: 16,
  },
  healthTag: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  healthDesc: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748b',
  },
  healthMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  healthScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  emptyPanel: {
    padding: 18,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
  },
  moduleSection: {
    marginBottom: 28,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  moduleSubtitle: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kelvinFab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4338ca',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#312e81',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  kelvinFabText: {
    marginLeft: 8,
    color: '#ffffff',
    fontWeight: '700',
  },
});
