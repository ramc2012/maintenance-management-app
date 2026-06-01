import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { HealthBadge } from '@/components/HealthBadge';
import { KPICard } from '@/components/KPICard';
import { ModuleCard, type ModuleCardProps } from '@/components/ModuleCard';
import { Text } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useHealthTable, useKpiSummary } from '@/hooks/useAPI';
import { useModuleSubscriptions } from '@/hooks/useModuleSubscriptions';
import { DEPARTMENT_SUBSCRIPTION_BY_DISCIPLINE, SUBSCRIBABLE_MODULES, type ModuleSubscriptionId } from '@/constants/moduleSubscriptions';
import { buildWebModuleUrl, WEB_MODULE_LINKS } from '@/constants/moduleRegistry';
import { getAssignedDisciplines, getDefaultDiscipline, disciplineToLabel, type Discipline } from '@/utils/workspace';

const DISCIPLINE_META: Record<Discipline, { icon: keyof typeof MaterialCommunityIcons.glyphMap; accent: string; bg: string; bgDark: string; caption: string }> = {
  MECHANICAL: {
    icon: 'wrench-outline',
    accent: '#2563eb',
    bg: '#eff6ff',
    bgDark: '#1e3a5f',
    caption: 'Running equipment, work orders, daily logs, manuals, and requirements for mechanical execution.',
  },
  ELECTRICAL: {
    icon: 'lightning-bolt-outline',
    accent: '#d97706',
    bg: '#fff7ed',
    bgDark: '#422006',
    caption: 'Electrical work orders, tests, field reports, logbooks, manuals, and scoped procurement.',
  },
  INSTRUMENTATION: {
    icon: 'gauge',
    accent: '#059669',
    bg: '#ecfdf5',
    bgDark: '#052e16',
    caption: 'Instrument work, calibration, history, manuals, field reporting, and requirement raising.',
  },
};

const FIELD_MODULES: Record<Discipline, ModuleCardProps[]> = {
  MECHANICAL: [
    { id: 'operations', name: 'Operations', caption: 'Summary', icon: 'chart-arc', color: '#059669', bg: '#ecfdf5', link: '/modules/operations' },
    { id: 'workorders', name: 'Orders', caption: 'Assigned', icon: 'clipboard-list-outline', color: '#2563eb', bg: '#eff6ff', link: '/modules/workorders?discipline=MECHANICAL' },
    { id: 'reports', name: 'Report', caption: 'New', icon: 'file-document-edit-outline', color: '#059669', bg: '#ecfdf5', link: '/modules/reports?mode=new&discipline=MECHANICAL' },
    { id: 'reports', name: 'View Reports', caption: 'Past', icon: 'file-search-outline', color: '#0f766e', bg: '#ecfeff', link: '/modules/reports?mode=view&discipline=MECHANICAL' },
    { id: 'logbook', name: 'Run Hours', caption: 'Stats', icon: 'chart-timeline-variant', color: '#d97706', bg: '#fff7ed', link: '/modules/logbook?discipline=MECHANICAL' },
    { id: 'manuals', name: 'Manuals', caption: 'Docs', icon: 'file-document-outline', color: '#0f766e', bg: '#ecfeff', link: '/modules/manuals?discipline=MECHANICAL' },
    { id: 'procurement', name: 'Procurement', caption: 'MR', icon: 'cart-outline', color: '#7c3aed', bg: '#f5f3ff', link: '/modules/procurement?discipline=MECHANICAL' },
    { id: 'inspections', name: 'Rounds', caption: 'Optional', icon: 'clipboard-check-outline', color: '#0f766e', bg: '#ecfdf5', link: '/modules/inspections?discipline=MECHANICAL' },
  ],
  ELECTRICAL: [
    { id: 'operations', name: 'Operations', caption: 'Summary', icon: 'chart-arc', color: '#059669', bg: '#ecfdf5', link: '/modules/operations' },
    { id: 'workorders', name: 'Orders', caption: 'Assigned', icon: 'clipboard-list-outline', color: '#d97706', bg: '#fff7ed', link: '/modules/workorders?discipline=ELECTRICAL' },
    { id: 'reports', name: 'Report', caption: 'New', icon: 'file-document-edit-outline', color: '#2563eb', bg: '#eff6ff', link: '/modules/reports?mode=new&discipline=ELECTRICAL' },
    { id: 'reports', name: 'View Reports', caption: 'Past', icon: 'file-search-outline', color: '#0f766e', bg: '#ecfeff', link: '/modules/reports?mode=view&discipline=ELECTRICAL' },
    { id: 'logbook', name: 'Run Hours', caption: 'Stats', icon: 'chart-timeline-variant', color: '#0f766e', bg: '#ecfeff', link: '/modules/logbook?discipline=ELECTRICAL' },
    { id: 'manuals', name: 'Manuals', caption: 'Docs', icon: 'file-document-outline', color: '#9333ea', bg: '#faf5ff', link: '/modules/manuals?discipline=ELECTRICAL' },
    { id: 'procurement', name: 'Procurement', caption: 'MR', icon: 'cart-outline', color: '#059669', bg: '#ecfdf5', link: '/modules/procurement?discipline=ELECTRICAL' },
    { id: 'inspections', name: 'Rounds', caption: 'Optional', icon: 'clipboard-check-outline', color: '#0f766e', bg: '#ecfdf5', link: '/modules/inspections?discipline=ELECTRICAL' },
  ],
  INSTRUMENTATION: [
    { id: 'operations', name: 'Operations', caption: 'Summary', icon: 'chart-arc', color: '#059669', bg: '#ecfdf5', link: '/modules/operations' },
    { id: 'workorders', name: 'Orders', caption: 'Assigned', icon: 'clipboard-list-outline', color: '#059669', bg: '#ecfdf5', link: '/modules/workorders?discipline=INSTRUMENTATION' },
    { id: 'calibration', name: 'Calibrate', caption: 'Due', icon: 'chart-bell-curve', color: '#2563eb', bg: '#eff6ff', link: '/modules/calibration?discipline=INSTRUMENTATION' },
    { id: 'assets', name: 'Maintenance History', caption: 'Logs', icon: 'history', color: '#d97706', bg: '#fff7ed', link: '/modules/assets?discipline=INSTRUMENTATION' },
    { id: 'reports', name: 'Report', caption: 'New', icon: 'file-document-edit-outline', color: '#7c3aed', bg: '#f5f3ff', link: '/modules/reports?mode=new&discipline=INSTRUMENTATION' },
    { id: 'reports', name: 'View Reports', caption: 'Past', icon: 'file-search-outline', color: '#0f766e', bg: '#ecfeff', link: '/modules/reports?mode=view&discipline=INSTRUMENTATION' },
    { id: 'procurement', name: 'Procurement', caption: 'MR', icon: 'cart-outline', color: '#0f172a', bg: '#f8fafc', link: '/modules/procurement?discipline=INSTRUMENTATION' },
    { id: 'inspections', name: 'Rounds', caption: 'Optional', icon: 'clipboard-check-outline', color: '#0f766e', bg: '#ecfdf5', link: '/modules/inspections?discipline=INSTRUMENTATION' },
  ],
};

const MOBILE_MODULE_LINKS: Partial<Record<ModuleSubscriptionId, string>> = {
  assets: '/modules/assets',
  operations: '/modules/operations',
  workorders: '/modules/workorders',
  kpis: '/modules/kpis',
  inspections: '/modules/inspections',
  reports: '/modules/reports?mode=view',
  logbook: '/modules/logbook',
  manuals: '/modules/manuals',
  procurement: '/modules/procurement',
  stock: '/modules/mrp',
  workshop: '/modules/workshop',
  energy: '/modules/energy',
  training: '/modules/training',
  calibration: '/modules/calibration',
  collaboration: '/modules/collaboration',
  moh: '/modules/overhaul',
  manpower: '/modules/manpower',
  feedback: buildWebModuleUrl(WEB_MODULE_LINKS.find((module) => module.id === 'feedback')?.path ?? '/feedback'),
  contracts: buildWebModuleUrl(WEB_MODULE_LINKS.find((module) => module.id === 'contracts')?.path ?? '/contracts'),
  presentations: buildWebModuleUrl(WEB_MODULE_LINKS.find((module) => module.id === 'presentations')?.path ?? '/presentations'),
  settings: '/modules/settings',
};

const MODULE_ACCENTS: Partial<Record<ModuleSubscriptionId, { color: string; bg: string }>> = {
  assets: { color: '#0f766e', bg: '#ecfeff' },
  operations: { color: '#059669', bg: '#ecfdf5' },
  workorders: { color: '#2563eb', bg: '#eff6ff' },
  kpis: { color: '#6366f1', bg: '#eef2ff' },
  inspections: { color: '#0f766e', bg: '#ecfdf5' },
  reports: { color: '#059669', bg: '#ecfdf5' },
  logbook: { color: '#d97706', bg: '#fff7ed' },
  manuals: { color: '#0f766e', bg: '#ecfeff' },
  procurement: { color: '#7c3aed', bg: '#f5f3ff' },
  stock: { color: '#475569', bg: '#f8fafc' },
  workshop: { color: '#d97706', bg: '#fff7ed' },
  energy: { color: '#ea580c', bg: '#fff7ed' },
  training: { color: '#2563eb', bg: '#eff6ff' },
  calibration: { color: '#16a34a', bg: '#ecfdf5' },
  collaboration: { color: '#7c3aed', bg: '#f5f3ff' },
  moh: { color: '#dc2626', bg: '#fef2f2' },
  manpower: { color: '#db2777', bg: '#fdf2f8' },
  feedback: { color: '#dc2626', bg: '#fef2f2' },
  contracts: { color: '#475569', bg: '#f8fafc' },
  presentations: { color: '#7c3aed', bg: '#f5f3ff' },
  settings: { color: '#64748b', bg: '#f8fafc' },
};

export default function HomeScreen() {
  const { user, token, loading } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();

  const kpiSummary = useKpiSummary(Boolean(token));
  const healthTable = useHealthTable(Boolean(token));
  const moduleSubscriptions = useModuleSubscriptions();
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

  if (loading || !token) {
    return null;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} contentContainerStyle={styles.content}>
      <Pressable style={[styles.hero, { backgroundColor: colors.heroSurface, borderColor: colors.cardBorder, shadowColor: colors.shadow }]} onPress={() => router.push('/modules/settings')}>
        <View style={styles.heroCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>MAINTENANCE MANAGEMENT</Text>
          <Text style={[styles.title, { color: colors.heroText }]}>Maintenance Hub</Text>
          <Text style={[styles.subtitle, { color: colors.heroTextSecondary }]} numberOfLines={1}>
            {user?.username ?? 'User'} · {user?.role ?? 'Member'}{user?.persona ? ` · ${user.persona}` : ''}
          </Text>
        </View>
        <View style={[styles.accountBadge, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons name="account-cog-outline" size={20} color={colors.textSecondary} />
        </View>
      </Pressable>

      {user?.persona === 'FIELD' ? (
        <FieldWorkspaceSection
          assignedDisciplines={assignedDisciplines}
          selectedDiscipline={selectedDiscipline}
          onSelectDiscipline={setSelectedDiscipline}
          isSubscribed={moduleSubscriptions.isSubscribed}
        />
      ) : (
        <ManagerSection assignedDisciplines={assignedDisciplines} isSubscribed={moduleSubscriptions.isSubscribed} />
      )}

      <SectionHeader title="KPI strip" actionLabel={kpiSummary.isRefetching ? 'Refreshing...' : 'Updated from live API'} colors={colors} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiStrip}>
        {metrics.map((metric) => (
          <KPICard key={metric.label} {...metric} />
        ))}
      </ScrollView>

      <SectionHeader
        title="Health watch"
        actionLabel={healthTable.isLoading ? 'Loading health table...' : `${healthTable.data?.total ?? 0} assets scored`}
        colors={colors}
      />
      <View style={[styles.healthPanel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {criticalEquipment.length > 0 ? criticalEquipment.map((equipment) => (
          <Pressable
            key={equipment.equipmentTag}
            style={[styles.healthRow, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => router.push('/modules/assets')}
          >
            <View style={styles.healthCopy}>
              <Text style={[styles.healthTag, { color: colors.text }]}>{equipment.equipmentTag}</Text>
              <Text style={[styles.healthDesc, { color: colors.textSecondary }]} numberOfLines={1}>{equipment.description}</Text>
            </View>
            <View style={styles.healthMeta}>
              <HealthBadge grade={equipment.grade} />
              <Text style={[styles.healthScore, { color: colors.text }]}>{equipment.score}</Text>
            </View>
          </Pressable>
        )) : (
          <View style={[styles.emptyPanel, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Health data will appear here</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              The mobile shell is wired to `/api/kpi/health-table`. Once the backend responds, this panel will surface the weakest assets first.
            </Text>
          </View>
        )}
      </View>

      <Pressable style={[styles.kelvinFab, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={() => router.push('/modules/kelvin')}>
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
  isSubscribed,
}: {
  assignedDisciplines: Discipline[];
  selectedDiscipline: Discipline | null;
  onSelectDiscipline: (discipline: Discipline | null) => void;
  isSubscribed: (id: ModuleSubscriptionId) => boolean;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  if (assignedDisciplines.length === 0) {
    return (
      <View style={[styles.assignmentCard, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
        <Text style={[styles.assignmentTitle, { color: colors.warning }]}>Discipline assignment required</Text>
        <Text style={[styles.assignmentText, { color: colors.warning }]}>
          Your account is authenticated, but no field discipline is assigned yet. Ask an administrator or HOD to assign Mechanical, Electrical, or Instrumentation access.
        </Text>
      </View>
    );
  }

  if (assignedDisciplines.length > 1 && !selectedDiscipline) {
    return (
      <View>
        <SectionHeader title="Choose Workspace" actionLabel="Multiple disciplines assigned" colors={colors} />
        <View style={styles.workspaceGrid}>
          {assignedDisciplines.map((discipline) => {
            const meta = DISCIPLINE_META[discipline];
            return (
              <Pressable key={discipline} style={[styles.workspaceCard, { backgroundColor: theme.isDark ? meta.bgDark : meta.bg, borderColor: colors.cardBorder }]} onPress={() => onSelectDiscipline(discipline)}>
                <MaterialCommunityIcons name={meta.icon} size={28} color={meta.accent} />
                <Text style={[styles.workspaceName, { color: colors.text }]}>{disciplineToLabel(discipline)}</Text>
                <Text style={[styles.workspaceCopy, { color: colors.textSecondary }]}>{meta.caption}</Text>
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
        colors={colors}
      />
      <View style={[styles.workspaceHero, { backgroundColor: theme.isDark ? meta.bgDark : meta.bg }]}>
        <View style={styles.workspaceHeroCopy}>
          <MaterialCommunityIcons name={meta.icon} size={28} color={meta.accent} />
          <Text style={[styles.workspaceHeroTitle, { color: colors.text }]}>{disciplineToLabel(workspace)}</Text>
          <Text style={[styles.workspaceHeroText, { color: colors.textSecondary }]}>{meta.caption}</Text>
        </View>
        {assignedDisciplines.length > 1 ? (
          <Pressable style={[styles.switchBtn, { backgroundColor: colors.card }]} onPress={() => onSelectDiscipline(null)}>
            <Text style={[styles.switchBtnText, { color: colors.text }]}>Switch</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.grid}>
        {FIELD_MODULES[workspace].filter((module) => isSubscribed(module.id as ModuleSubscriptionId)).map((module) => (
          <ModuleCard key={`${module.id}-${module.name}`} {...module} />
        ))}
      </View>
    </View>
  );
}

function ManagerSection({ assignedDisciplines, isSubscribed }: { assignedDisciplines: Discipline[]; isSubscribed: (id: ModuleSubscriptionId) => boolean }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const disciplines = assignedDisciplines.length
    ? assignedDisciplines
    : (['MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION'] as Discipline[]);
  const visibleDisciplines = disciplines.filter((discipline) => isSubscribed(DEPARTMENT_SUBSCRIPTION_BY_DISCIPLINE[discipline]));
  const subscribedModules = SUBSCRIBABLE_MODULES
    .filter((module) => module.category !== 'department' && module.id !== 'hub' && module.id !== 'inbox')
    .filter((module) => isSubscribed(module.id) && MOBILE_MODULE_LINKS[module.id])
    .map<ModuleCardProps>((module) => {
      const accent = MODULE_ACCENTS[module.id] ?? { color: colors.primary, bg: colors.primarySubtle };
      return {
        id: module.id,
        name: module.name,
        icon: module.icon,
        color: accent.color,
        bg: theme.isDark ? colors.card : accent.bg,
        link: MOBILE_MODULE_LINKS[module.id]!,
      };
    });
  const unsupportedSubscribed = SUBSCRIBABLE_MODULES
    .filter((module) => module.category !== 'department' && module.id !== 'hub' && module.id !== 'inbox')
    .filter((module) => isSubscribed(module.id) && !MOBILE_MODULE_LINKS[module.id]);

  return (
    <View>
      <SectionHeader title="Workspaces" actionLabel="View access" colors={colors} />
      <View style={styles.grid}>
        {visibleDisciplines.map((discipline) => {
          const meta = DISCIPLINE_META[discipline];
          return (
            <ModuleCard
              key={discipline}
              id={`${discipline}-dashboard`}
              name={discipline === 'MECHANICAL' ? 'Mech' : discipline === 'ELECTRICAL' ? 'Elec' : 'Instr'}
              icon={meta.icon}
              color={meta.accent}
              bg={theme.isDark ? meta.bgDark : meta.bg}
              link={`/modules/department?discipline=${discipline}`}
            />
          );
        })}
      </View>

      <SectionHeader
        title="Subscribed Modules"
        actionLabel={unsupportedSubscribed.length ? `${unsupportedSubscribed.length} web only` : 'From Settings'}
        colors={colors}
      />
      <View style={styles.grid}>
        {subscribedModules.map((module) => (
          <ModuleCard key={module.id} {...module} />
        ))}
      </View>
      {visibleDisciplines.length === 0 && subscribedModules.length === 0 ? (
        <View style={[styles.emptyPanel, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No subscribed modules</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Open Settings and subscribe to the modules you want on this dashboard.</Text>
        </View>
      ) : null}
    </View>
  );
}

function SectionHeader({ title, actionLabel, colors }: { title: string; actionLabel?: string; colors: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {actionLabel ? <Text style={[styles.sectionAction, { color: colors.textTertiary }]}>{actionLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 104 },
  hero: {
    borderRadius: 20,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  heroCopy: { flex: 1, minWidth: 0, gap: 4 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 18, lineHeight: 22, fontWeight: '800' },
  subtitle: { fontSize: 12, lineHeight: 16 },
  heroMeta: { flexDirection: 'row', gap: 10 },
  userCard: { borderRadius: 14, padding: 12, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userName: { fontSize: 14, fontWeight: '800' },
  userRole: { marginTop: 2, fontSize: 11 },
  accountBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inboxCard: { width: 116, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inboxLabel: { color: '#bfdbfe', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  inboxValue: { marginTop: 2, color: '#ffffff', fontSize: 22, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionAction: { fontSize: 12 },
  kpiStrip: { paddingBottom: 10 },
  healthPanel: { borderRadius: 22, borderWidth: 1, padding: 14, marginBottom: 8, gap: 10 },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, padding: 14 },
  healthCopy: { flex: 1, paddingRight: 12 },
  healthTag: { fontSize: 13, fontWeight: '800' },
  healthDesc: { marginTop: 4, fontSize: 12 },
  healthMeta: { alignItems: 'flex-end', gap: 6 },
  healthScore: { fontSize: 18, fontWeight: '800' },
  emptyPanel: { borderRadius: 16, padding: 16 },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptyText: { marginTop: 6, fontSize: 12, lineHeight: 18 },
  workspaceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  workspaceCard: { width: '47%', borderRadius: 16, padding: 14, marginBottom: 12, minHeight: 148, borderWidth: 1 },
  workspaceName: { marginTop: 10, fontSize: 15, fontWeight: '800' },
  workspaceCopy: { marginTop: 6, fontSize: 11, lineHeight: 16 },
  workspaceHero: { borderRadius: 16, padding: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  workspaceHeroCopy: { flex: 1, gap: 6 },
  workspaceHeroTitle: { fontSize: 17, fontWeight: '800' },
  workspaceHeroText: { fontSize: 12, lineHeight: 17 },
  switchBtn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  switchBtnText: { fontSize: 12, fontWeight: '700' },
  assignmentCard: { borderRadius: 22, borderWidth: 1, padding: 20, marginTop: 8 },
  assignmentTitle: { fontSize: 18, fontWeight: '800' },
  assignmentText: { marginTop: 8, fontSize: 13, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 0 },
  kelvinFab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  kelvinFabText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
