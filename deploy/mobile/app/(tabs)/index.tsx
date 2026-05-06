import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { HealthBadge } from '@/components/HealthBadge';
import { KPICard } from '@/components/KPICard';
import { ModuleCard, type ModuleCardProps } from '@/components/ModuleCard';
import { NotificationBadge } from '@/components/NotificationBadge';
import { Text } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { useNotificationsBadge } from '@/context/NotificationContext';
import { useHealthTable, useKpiSummary } from '@/hooks/useAPI';
import { getAssignedDisciplines, getDefaultDiscipline, disciplineToLabel, type Discipline } from '@/utils/workspace';

const DISCIPLINE_META: Record<Discipline, { icon: keyof typeof MaterialCommunityIcons.glyphMap; accent: string; bg: string; caption: string }> = {
  MECHANICAL: {
    icon: 'wrench-outline',
    accent: '#2563eb',
    bg: '#eff6ff',
    caption: 'Running equipment, work orders, daily logs, manuals, and requirements for mechanical execution.',
  },
  ELECTRICAL: {
    icon: 'lightning-bolt-outline',
    accent: '#d97706',
    bg: '#fff7ed',
    caption: 'Electrical work orders, tests, field reports, logbooks, manuals, and scoped procurement.',
  },
  INSTRUMENTATION: {
    icon: 'gauge',
    accent: '#059669',
    bg: '#ecfdf5',
    caption: 'Instrument work, calibration, history, manuals, field reporting, and requirement raising.',
  },
};

const FIELD_MODULES: Record<Discipline, ModuleCardProps[]> = {
  MECHANICAL: [
    { id: 'wo', name: 'My Work Orders', icon: 'clipboard-list-outline', color: '#2563eb', bg: '#eff6ff', link: '/modules/workorders?discipline=MECHANICAL' },
    { id: 'inspect', name: 'Inspections', icon: 'clipboard-check-outline', color: '#0f766e', bg: '#ecfdf5', link: '/modules/inspections' },
    { id: 'report', name: 'New Field Report', icon: 'file-document-edit-outline', color: '#059669', bg: '#ecfdf5', link: '/modules/reports?discipline=MECHANICAL' },
    { id: 'logbook', name: 'Digital Logbook', icon: 'book-open-page-variant', color: '#d97706', bg: '#fff7ed', link: '/modules/logbook?discipline=MECHANICAL' },
    { id: 'manuals', name: 'Manuals & Drawings', icon: 'file-document-outline', color: '#0f766e', bg: '#ecfeff', link: '/modules/manuals?discipline=MECHANICAL' },
    { id: 'proc', name: 'Raise Requirement', icon: 'cart-outline', color: '#7c3aed', bg: '#f5f3ff', link: '/modules/procurement?discipline=MECHANICAL' },
  ],
  ELECTRICAL: [
    { id: 'wo', name: 'My Work Orders', icon: 'clipboard-list-outline', color: '#d97706', bg: '#fff7ed', link: '/modules/workorders?discipline=ELECTRICAL' },
    { id: 'inspect', name: 'Inspections', icon: 'clipboard-check-outline', color: '#0f766e', bg: '#ecfdf5', link: '/modules/inspections' },
    { id: 'report', name: 'New Field Report', icon: 'file-document-edit-outline', color: '#2563eb', bg: '#eff6ff', link: '/modules/reports?discipline=ELECTRICAL' },
    { id: 'logbook', name: 'Digital Logbook', icon: 'book-open-page-variant', color: '#0f766e', bg: '#ecfeff', link: '/modules/logbook?discipline=ELECTRICAL' },
    { id: 'manuals', name: 'Manuals & Drawings', icon: 'file-document-outline', color: '#9333ea', bg: '#faf5ff', link: '/modules/manuals?discipline=ELECTRICAL' },
    { id: 'proc', name: 'Raise Requirement', icon: 'cart-outline', color: '#059669', bg: '#ecfdf5', link: '/modules/procurement?discipline=ELECTRICAL' },
  ],
  INSTRUMENTATION: [
    { id: 'wo', name: 'My Work Orders', icon: 'clipboard-list-outline', color: '#059669', bg: '#ecfdf5', link: '/modules/workorders?discipline=INSTRUMENTATION' },
    { id: 'inspect', name: 'Inspections', icon: 'clipboard-check-outline', color: '#0f766e', bg: '#ecfdf5', link: '/modules/inspections' },
    { id: 'cal', name: 'Calibration', icon: 'chart-bell-curve', color: '#2563eb', bg: '#eff6ff', link: '/modules/calibration?discipline=INSTRUMENTATION' },
    { id: 'history', name: 'Instrument History', icon: 'history', color: '#d97706', bg: '#fff7ed', link: '/modules/assets?discipline=INSTRUMENTATION' },
    { id: 'report', name: 'New Field Report', icon: 'file-document-edit-outline', color: '#7c3aed', bg: '#f5f3ff', link: '/modules/reports?discipline=INSTRUMENTATION' },
    { id: 'proc', name: 'Raise Requirement', icon: 'cart-outline', color: '#0f172a', bg: '#f8fafc', link: '/modules/procurement?discipline=INSTRUMENTATION' },
  ],
};

export default function HomeScreen() {
  const { user, token, logout, loading } = useAuth();
  const { unreadCount } = useNotificationsBadge();
  const router = useRouter();

  const kpiSummary = useKpiSummary(Boolean(token));
  const healthTable = useHealthTable(Boolean(token));
  const assignedDisciplines = useMemo(() => getAssignedDisciplines(user), [user]);
  const defaultDiscipline = useMemo(() => getDefaultDiscipline(user), [user]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(defaultDiscipline);

  useEffect(() => {
    if (!loading && !token) {
      router.replace('/login');
    }
  }, [loading, router, token]);

  useEffect(() => {
    if (user?.persona !== 'FIELD') {
      setSelectedDiscipline(defaultDiscipline);
      return;
    }

    if (assignedDisciplines.length === 1) {
      setSelectedDiscipline(defaultDiscipline ?? assignedDisciplines[0]);
      return;
    }

    if (selectedDiscipline && assignedDisciplines.includes(selectedDiscipline)) {
      return;
    }

    setSelectedDiscipline(defaultDiscipline);
  }, [assignedDisciplines, defaultDiscipline, selectedDiscipline, user?.persona]);

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
          <Text style={styles.eyebrow}>{user?.persona === 'FIELD' ? 'FIELD WORKSPACE' : 'MANAGER OVERVIEW'}</Text>
          <Text style={styles.title}>
            {user?.persona === 'FIELD' ? 'Discipline-first mobile workspace' : 'Mobile executive summary'}
          </Text>
          <Text style={styles.subtitle}>
            {user?.persona === 'FIELD'
              ? 'The mobile shell now hides unrelated modules and launches only the workflows relevant to your discipline.'
              : 'Managers and hybrid users see KPI summary, alerts, and department drill-downs instead of the old full module grid.'}
          </Text>
        </View>
        <View style={styles.heroMeta}>
          <View style={styles.userCard}>
            <View>
              <Text style={styles.userName}>{user?.username ?? 'User'}</Text>
              <Text style={styles.userRole}>{user?.role ?? 'Member'}{user?.persona ? ` · ${user.persona}` : ''}</Text>
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

      <SectionHeader title="KPI strip" actionLabel={kpiSummary.isRefetching ? 'Refreshing...' : 'Updated from live API'} />
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

      {user?.persona === 'FIELD' ? (
        <FieldWorkspaceSection
          assignedDisciplines={assignedDisciplines}
          selectedDiscipline={selectedDiscipline}
          onSelectDiscipline={setSelectedDiscipline}
        />
      ) : (
        <ManagerSection assignedDisciplines={assignedDisciplines} />
      )}

      <Pressable style={styles.kelvinFab} onPress={() => router.push('/modules/kelvin')}>
        <MaterialCommunityIcons name="robot-outline" size={20} color="#fff" />
        <Text style={styles.kelvinFabText}>Kelvin AI</Text>
      </Pressable>
    </ScrollView>
  );
}

function FieldWorkspaceSection({
  assignedDisciplines,
  selectedDiscipline,
  onSelectDiscipline,
}: {
  assignedDisciplines: Discipline[];
  selectedDiscipline: Discipline | null;
  onSelectDiscipline: (discipline: Discipline | null) => void;
}) {
  if (assignedDisciplines.length === 0) {
    return (
      <View style={styles.assignmentCard}>
        <Text style={styles.assignmentTitle}>Discipline assignment required</Text>
        <Text style={styles.assignmentText}>
          Your account is authenticated, but no field discipline is assigned yet. Ask an administrator or HOD to assign Mechanical, Electrical, or Instrumentation access.
        </Text>
      </View>
    );
  }

  if (assignedDisciplines.length > 1 && !selectedDiscipline) {
    return (
      <View>
        <SectionHeader title="Choose Workspace" actionLabel="Multiple disciplines assigned" />
        <View style={styles.workspaceGrid}>
          {assignedDisciplines.map((discipline) => {
            const meta = DISCIPLINE_META[discipline];
            return (
              <Pressable key={discipline} style={[styles.workspaceCard, { backgroundColor: meta.bg }]} onPress={() => onSelectDiscipline(discipline)}>
                <MaterialCommunityIcons name={meta.icon} size={28} color={meta.accent} />
                <Text style={styles.workspaceName}>{disciplineToLabel(discipline)}</Text>
                <Text style={styles.workspaceCopy}>{meta.caption}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const workspace = selectedDiscipline ?? assignedDisciplines[0];
  const meta = DISCIPLINE_META[workspace];

  return (
    <View>
      <SectionHeader
        title={`${disciplineToLabel(workspace)} Workspace`}
        actionLabel={assignedDisciplines.length > 1 ? 'Switch workspace' : 'Assigned discipline'}
      />
      <View style={[styles.workspaceHero, { backgroundColor: meta.bg }]}>
        <View style={styles.workspaceHeroCopy}>
          <MaterialCommunityIcons name={meta.icon} size={28} color={meta.accent} />
          <Text style={styles.workspaceHeroTitle}>{disciplineToLabel(workspace)}</Text>
          <Text style={styles.workspaceHeroText}>{meta.caption}</Text>
        </View>
        {assignedDisciplines.length > 1 ? (
          <Pressable style={styles.switchBtn} onPress={() => onSelectDiscipline(null)}>
            <Text style={styles.switchBtnText}>Switch</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.grid}>
        {FIELD_MODULES[workspace].map((module) => (
          <ModuleCard key={module.id} {...module} />
        ))}
      </View>
    </View>
  );
}

function ManagerSection({ assignedDisciplines }: { assignedDisciplines: Discipline[] }) {
  const disciplines = assignedDisciplines.length
    ? assignedDisciplines
    : (['MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION'] as Discipline[]);

  return (
    <View>
      <SectionHeader title="Department Dashboards" actionLabel="Manager and hybrid users" />
      <View style={styles.grid}>
        {disciplines.map((discipline) => {
          const meta = DISCIPLINE_META[discipline];
          return (
            <ModuleCard
              key={discipline}
              id={`${discipline}-dashboard`}
              name={`${disciplineToLabel(discipline)} Dashboard`}
              icon={meta.icon}
              color={meta.accent}
              bg={meta.bg}
              link={`/modules/reports?discipline=${discipline}`}
            />
          );
        })}
        <ModuleCard id="kpis" name="KPI Dashboard" icon="chart-box-outline" color="#6366f1" bg="#eef2ff" link="/modules/kpis" />
        <ModuleCard id="inspections" name="Inspections" icon="clipboard-check-outline" color="#0f766e" bg="#ecfdf5" link="/modules/inspections" />
        <ModuleCard id="inbox" name="Inbox & Alerts" icon="bell-outline" color="#7c3aed" bg="#f5f3ff" link="/(tabs)/two" />
        <ModuleCard id="settings" name="Settings" icon="cog-outline" color="#334155" bg="#f8fafc" link="/modules/settings" />
      </View>
    </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 18, paddingBottom: 110 },
  hero: { borderRadius: 28, backgroundColor: '#0f172a', padding: 22, marginBottom: 24, gap: 18 },
  heroCopy: { gap: 10 },
  eyebrow: { color: '#93c5fd', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#ffffff', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  subtitle: { color: '#cbd5e1', fontSize: 14, lineHeight: 22 },
  heroMeta: { gap: 12 },
  userCard: { borderRadius: 18, padding: 16, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  userRole: { marginTop: 4, fontSize: 12, color: '#64748b' },
  logoutBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  inboxCard: { borderRadius: 18, padding: 16, backgroundColor: '#1d4ed8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inboxLabel: { color: '#bfdbfe', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  inboxValue: { marginTop: 4, color: '#ffffff', fontSize: 28, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  sectionAction: { fontSize: 12, color: '#64748b' },
  kpiStrip: { paddingBottom: 10 },
  healthPanel: { borderRadius: 22, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', padding: 14, marginBottom: 8, gap: 10 },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, backgroundColor: '#f8fafc', padding: 14 },
  healthCopy: { flex: 1, paddingRight: 12 },
  healthTag: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  healthDesc: { marginTop: 4, fontSize: 12, color: '#64748b' },
  healthMeta: { alignItems: 'flex-end', gap: 6 },
  healthScore: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptyPanel: { borderRadius: 16, backgroundColor: '#f8fafc', padding: 16 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  emptyText: { marginTop: 6, fontSize: 12, lineHeight: 18, color: '#64748b' },
  workspaceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  workspaceCard: { width: '47%', borderRadius: 20, padding: 18, marginBottom: 14, minHeight: 180, borderWidth: 1, borderColor: '#e2e8f0' },
  workspaceName: { marginTop: 14, fontSize: 16, fontWeight: '800', color: '#0f172a' },
  workspaceCopy: { marginTop: 8, fontSize: 12, lineHeight: 18, color: '#475569' },
  workspaceHero: { borderRadius: 22, padding: 18, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  workspaceHeroCopy: { flex: 1, gap: 8 },
  workspaceHeroTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  workspaceHeroText: { fontSize: 13, lineHeight: 20, color: '#334155' },
  switchBtn: { borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 9 },
  switchBtnText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  assignmentCard: { borderRadius: 22, borderWidth: 1, borderColor: '#fcd34d', backgroundColor: '#fffbeb', padding: 20, marginTop: 8 },
  assignmentTitle: { fontSize: 18, fontWeight: '800', color: '#92400e' },
  assignmentText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: '#92400e' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  kelvinFab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    borderRadius: 999,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  kelvinFabText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
