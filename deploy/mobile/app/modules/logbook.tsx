import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import api from '@/services/api';
import { canonicalServiceKey, uniqueServiceOptions } from '@/utils/serviceGroups';
import { disciplineToLabel, type Discipline } from '@/utils/workspace';

type EquipmentLog = {
  id?: string | number;
  equipmentTag?: string;
  assetTag?: string;
  installationId?: string;
  installation?: string | { name?: string; installationId?: string };
  functionalLocation?: string;
  date?: string;
  runHours?: number | string;
  runningHours?: number | string;
  runStatus?: boolean | string;
  status?: string;
  remarks?: string;
};

type InstallationOption = {
  id: string;
  installationId: string;
  name?: string | null;
  type?: string | null;
};

type RunningEquipmentRef = {
  equipmentTag?: string;
  tagId?: string;
  installationId?: string;
  installation?: { installationId?: string; type?: string | null };
};

type EquipmentGroup = {
  tag: string;
  installation: string;
  installationId: string;
  service: string;
  logs: EquipmentLog[];
  latest?: EquipmentLog;
  running: number;
  stopped: number;
  totalHours: number;
  runDaysFy: number;
  sinceBHours: number;
  dueInHours: number;
};

type CheckCode = 'B' | 'C' | 'D';

type CheckSummary = {
  code: CheckCode;
  sinceHours: number;
  dueInHours: number;
  intervalHours: number;
  lastDate?: string;
};

const DISCIPLINES: Discipline[] = ['MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION'];
const CHECK_INTERVAL_HOURS: Record<CheckCode, number> = { B: 250, C: 1000, D: 4000 };

function parseDiscipline(raw?: string | string[]): Discipline | null {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase();
  return DISCIPLINES.includes(value as Discipline) ? (value as Discipline) : null;
}

function appendDiscipline(endpoint: string, discipline: Discipline | null) {
  return discipline ? `${endpoint}?discipline=${encodeURIComponent(discipline)}` : endpoint;
}

function tagOf(log: EquipmentLog) {
  return log.equipmentTag || log.assetTag || 'Unknown equipment';
}

function installationOf(log: EquipmentLog) {
  if (typeof log.installation === 'object') {
    return log.installation.name || log.installation.installationId || log.installationId || log.functionalLocation || 'Unassigned';
  }
  return log.installation || log.installationId || log.functionalLocation || 'Unassigned';
}

function hoursOf(log: EquipmentLog) {
  return Number(log.runHours ?? log.runningHours ?? 0) || 0;
}

function isRunning(log: EquipmentLog) {
  if (typeof log.runStatus === 'boolean') return log.runStatus;
  const status = String(log.runStatus ?? log.status ?? '').toLowerCase();
  return status.includes('run') || status === 'true' || status === 'normal';
}

function sortByDate(logs: EquipmentLog[]) {
  return [...logs].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
}

function dateKey(date?: string) {
  if (!date) return '';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function financialYearStart(now = new Date()) {
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 3, 1);
}

function fiscalRunDays(logs: EquipmentLog[]) {
  const start = financialYearStart().getTime();
  const runningDays = new Set<string>();
  logs.forEach((log) => {
    const time = new Date(log.date ?? 0).getTime();
    const key = dateKey(log.date);
    if (key && time >= start && isRunning(log)) {
      runningDays.add(key);
    }
  });
  return runningDays.size;
}

function checkCodeOf(log: EquipmentLog): CheckCode | null {
  const text = `${log.remarks ?? ''} ${log.status ?? ''}`.toUpperCase();
  const match = text.match(/\b([BCD])\s*[-/]?\s*CHECK\b|\bCHECK\s*[-/]?\s*([BCD])\b/);
  const code = match?.[1] || match?.[2];
  return code === 'B' || code === 'C' || code === 'D' ? code : null;
}

function checkSummaries(logs: EquipmentLog[]): CheckSummary[] {
  const ordered = sortByDate(logs);
  return (['B', 'C', 'D'] as CheckCode[]).map((code) => {
    const checkIndex = ordered.findIndex((log) => checkCodeOf(log) === code);
    const logsSinceCheck = checkIndex >= 0 ? ordered.slice(0, checkIndex) : ordered;
    const sinceHours = logsSinceCheck.reduce((sum, log) => sum + hoursOf(log), 0);
    const intervalHours = CHECK_INTERVAL_HOURS[code];
    return {
      code,
      sinceHours,
      intervalHours,
      dueInHours: Math.max(0, intervalHours - sinceHours),
      lastDate: checkIndex >= 0 ? ordered[checkIndex]?.date : undefined,
    };
  });
}

export default function LogbookScreen() {
  const params = useLocalSearchParams<{ discipline?: string; equipmentTag?: string }>();
  const router = useRouter();
  const discipline = parseDiscipline(params.discipline);
  const { theme } = useTheme();
  const { colors } = theme;
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<EquipmentLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentGroup | null>(null);
  const [dismissedEquipmentTag, setDismissedEquipmentTag] = useState<string | null>(null);
  const [installationsRef, setInstallationsRef] = useState<InstallationOption[]>([]);
  const [equipmentRef, setEquipmentRef] = useState<RunningEquipmentRef[]>([]);
  const [selectedService, setSelectedService] = useState('all');
  const [selectedInstallationId, setSelectedInstallationId] = useState('all');
  const [formData, setFormData] = useState({ equipmentTag: '', runStatus: true, remarks: '', runHours: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, installationRes, equipmentRes] = await Promise.all([
        api.get<EquipmentLog[]>(appendDiscipline('/equipment-logs', discipline)),
        api.get<InstallationOption[]>(appendDiscipline('/equipment/installations', discipline)).catch(() => []),
        api.get<RunningEquipmentRef[]>(appendDiscipline('/equipment/running-equip', discipline)).catch(() => []),
      ]);
      setLogs(Array.isArray(res) ? res : []);
      setInstallationsRef(Array.isArray(installationRes) ? installationRes : []);
      setEquipmentRef(Array.isArray(equipmentRes) ? equipmentRes : []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [discipline]);

  const installationLookup = useMemo(() => {
    const byAnyId = new Map<string, InstallationOption>();
    installationsRef.forEach((installation) => {
      byAnyId.set(installation.id, installation);
      byAnyId.set(installation.installationId, installation);
    });
    return byAnyId;
  }, [installationsRef]);

  const equipmentLookup = useMemo(() => {
    const byTag = new Map<string, RunningEquipmentRef>();
    equipmentRef.forEach((equipment) => {
      if (equipment.equipmentTag) byTag.set(equipment.equipmentTag, equipment);
      if (equipment.tagId) byTag.set(equipment.tagId, equipment);
    });
    return byTag;
  }, [equipmentRef]);

  const equipmentGroups = useMemo<EquipmentGroup[]>(() => {
    const grouped = new Map<string, EquipmentLog[]>();
    logs.forEach((log) => {
      const tag = tagOf(log);
      grouped.set(tag, [...(grouped.get(tag) ?? []), log]);
    });

    return Array.from(grouped.entries())
      .map(([tag, entries]) => {
        const ordered = sortByDate(entries);
        const checks = checkSummaries(ordered);
        const first = ordered[0] ?? {};
        const rawInstallation = installationOf(first);
        const equipment = equipmentLookup.get(tag);
        const installationRef = first.installationId
          ? installationLookup.get(first.installationId)
          : installationLookup.get(equipment?.installationId || rawInstallation);
        const installation = installationRef?.installationId || equipment?.installation?.installationId || rawInstallation;
        return {
          tag,
          installation,
          installationId: installationRef?.id || equipment?.installationId || first.installationId || rawInstallation,
          service: canonicalServiceKey(installationRef?.type || equipment?.installation?.type),
          logs: ordered,
          latest: ordered[0],
          running: ordered.filter(isRunning).length,
          stopped: ordered.filter((log) => !isRunning(log)).length,
          totalHours: ordered.reduce((sum, log) => sum + hoursOf(log), 0),
          runDaysFy: fiscalRunDays(ordered),
          sinceBHours: checks[0].sinceHours,
          dueInHours: checks.reduce((lowest, check) => Math.min(lowest, check.dueInHours), Number.POSITIVE_INFINITY),
        };
      })
      .sort((a, b) => new Date(b.latest?.date ?? 0).getTime() - new Date(a.latest?.date ?? 0).getTime());
  }, [equipmentLookup, installationLookup, logs]);

  const services = useMemo(
    () => [{ value: 'all', label: 'All' }, ...uniqueServiceOptions(installationsRef.map((installation) => installation.type))],
    [installationsRef]
  );
  const installationOptions = useMemo(
    () => installationsRef.filter((installation) => selectedService === 'all' || canonicalServiceKey(installation.type) === selectedService),
    [installationsRef, selectedService]
  );
  const visibleGroups = equipmentGroups.filter((group) => {
    const matchesService = selectedService === 'all' || group.service === selectedService;
    const matchesInstallation = selectedInstallationId === 'all'
      || group.installationId === selectedInstallationId
      || group.installation === selectedInstallationId;
    return matchesService && matchesInstallation;
  });

  useEffect(() => {
    const targetTag = Array.isArray(params.equipmentTag) ? params.equipmentTag[0] : params.equipmentTag;
    if (!targetTag || selectedEquipment || targetTag === dismissedEquipmentTag) return;
    const match = equipmentGroups.find((group) => group.tag === targetTag);
    if (match) {
      setSelectedEquipment(match);
    }
  }, [dismissedEquipmentTag, equipmentGroups, params.equipmentTag, selectedEquipment]);

  const stats = useMemo(() => ({
    running: visibleGroups.reduce((sum, group) => sum + (isRunning(group.latest ?? {}) ? 1 : 0), 0),
    dueReview: visibleGroups.filter((group) => group.dueInHours <= 0 || group.stopped > 0 || !isRunning(group.latest ?? {})).length,
    equipment: visibleGroups.length,
    totalHours: visibleGroups.reduce((sum, group) => sum + group.totalHours, 0),
  }), [visibleGroups]);

  const selectService = (service: string) => {
    setSelectedService(service);
    setSelectedInstallationId('all');
  };

  const handleSubmit = async () => {
    if (!formData.equipmentTag.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/equipment-logs', {
        ...formData,
        date: new Date().toISOString(),
        runHours: parseFloat(formData.runHours) || 0,
        discipline: discipline ?? undefined,
      });
      setShowForm(false);
      setFormData({ equipmentTag: '', runStatus: true, remarks: '', runHours: '' });
      void fetchData();
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const closeEquipmentHistory = () => {
    const targetTag = Array.isArray(params.equipmentTag) ? params.equipmentTag[0] : params.equipmentTag;
    setDismissedEquipmentTag(targetTag || selectedEquipment?.tag || null);
    setSelectedEquipment(null);
    if (params.equipmentTag) {
      router.replace({
        pathname: '/modules/logbook',
        params: discipline ? { discipline } : undefined,
      });
    }
  };

  if (loading) return <View style={[s.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color="#d97706" /></View>;
  if (error) return <View style={[s.center, { backgroundColor: colors.backgroundSecondary }]}><Text style={[s.error, { color: colors.error }]}>Error: {error}</Text></View>;

  return (
    <View style={[s.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: discipline ? `${disciplineToLabel(discipline)} Logbook` : 'Digital Logbook', headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={s.addBtn}><MaterialCommunityIcons name="plus" size={22} color="#fff" /></Pressable>
      )}} />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.statsRow}>
          <Stat label="Running" value={stats.running} color="#22c55e" colors={colors} />
          <Stat label="Due/Review" value={stats.dueReview} color="#ef4444" colors={colors} />
          <Stat label="Run Hrs" value={Math.round(stats.totalHours)} color="#d97706" colors={colors} />
        </View>

        <Text style={[s.title, { color: colors.text }]}>Scope</Text>
        <Text style={[s.scopeLabel, { color: colors.textTertiary }]}>Service</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {services.map((service) => (
            <Pressable
              key={service.value}
              onPress={() => selectService(service.value)}
              style={[
                s.filterChip,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                selectedService === service.value && { backgroundColor: colors.warningBg, borderColor: '#d97706' },
              ]}
            >
              <Text style={[s.filterText, { color: selectedService === service.value ? '#b45309' : colors.textSecondary }]}>{service.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={[s.scopeLabel, { color: colors.textTertiary }]}>Installation</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          <Pressable
            onPress={() => setSelectedInstallationId('all')}
            style={[
              s.filterChip,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
              selectedInstallationId === 'all' && { backgroundColor: colors.warningBg, borderColor: '#d97706' },
            ]}
          >
            <Text style={[s.filterText, { color: selectedInstallationId === 'all' ? '#b45309' : colors.textSecondary }]}>All</Text>
          </Pressable>
          {installationOptions.map((installation) => (
            <Pressable
              key={installation.id}
              onPress={() => setSelectedInstallationId(installation.id)}
              style={[
                s.filterChip,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                selectedInstallationId === installation.id && { backgroundColor: colors.warningBg, borderColor: '#d97706' },
              ]}
            >
              <Text style={[s.filterText, { color: selectedInstallationId === installation.id ? '#b45309' : colors.textSecondary }]}>{installation.installationId}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[s.title, { color: colors.text }]}>Asset History</Text>
        {visibleGroups.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <MaterialCommunityIcons name="book-open-page-variant" size={24} color={colors.textTertiary} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No log entries returned for this scope.</Text>
          </View>
        ) : visibleGroups.map((group) => (
          <Pressable key={group.tag} style={[s.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setSelectedEquipment(group)}>
            <View style={s.row}>
              <View style={s.cardCopy}>
                <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>{group.tag}</Text>
                <Text style={[s.meta, { color: colors.textSecondary }]} numberOfLines={1}>{group.installation} • {group.logs.length} entries</Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: isRunning(group.latest ?? {}) ? colors.successBg : colors.errorBg }]}>
                <Text style={[s.statusText, { color: isRunning(group.latest ?? {}) ? colors.success : colors.error }]}>
                  {isRunning(group.latest ?? {}) ? 'Running' : 'Stopped'}
                </Text>
              </View>
            </View>
            <View style={s.cardStats}>
              <Text style={[s.meta, { color: colors.textSecondary }]}>FY days {group.runDaysFy}</Text>
              <Text style={[s.meta, { color: colors.textSecondary }]}>Since B {Math.round(group.sinceBHours)}h</Text>
              <Text style={[s.meta, { color: colors.textSecondary }]}>Due {Number.isFinite(group.dueInHours) ? Math.round(group.dueInHours) : 0}h</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <AddLogModal
        visible={showForm}
        colors={colors}
        formData={formData}
        setFormData={setFormData}
        submitting={submitting}
        onCancel={() => setShowForm(false)}
        onSubmit={handleSubmit}
      />
      <EquipmentHistoryModal group={selectedEquipment} colors={colors} onClose={closeEquipmentHistory} />
    </View>
  );
}

function Stat({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  return (
    <View style={[s.stat, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={[s.statLbl, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function AddLogModal({ visible, colors, formData, setFormData, submitting, onCancel, onSubmit }: {
  visible: boolean;
  colors: any;
  formData: { equipmentTag: string; runStatus: boolean; remarks: string; runHours: string };
  setFormData: (value: { equipmentTag: string; runStatus: boolean; remarks: string; runHours: string }) => void;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[s.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[s.modal, { backgroundColor: colors.card }]}>
          <Text style={[s.modalTitle, { color: colors.text }]}>Add Log Entry</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            placeholder="Equipment Tag *"
            placeholderTextColor={colors.inputPlaceholder}
            value={formData.equipmentTag}
            onChangeText={(equipmentTag) => setFormData({ ...formData, equipmentTag })}
          />
          <TextInput
            style={[s.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            placeholder="Run Hours"
            placeholderTextColor={colors.inputPlaceholder}
            keyboardType="numeric"
            value={formData.runHours}
            onChangeText={(runHours) => setFormData({ ...formData, runHours })}
          />
          <View style={s.switchRow}>
            <Text style={{ color: colors.text }}>Running</Text>
            <Switch value={formData.runStatus} onValueChange={(runStatus) => setFormData({ ...formData, runStatus })} />
          </View>
          <TextInput
            style={[s.input, s.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            placeholder="Remarks"
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            value={formData.remarks}
            onChangeText={(remarks) => setFormData({ ...formData, remarks })}
          />
          <View style={s.actions}>
            <Pressable onPress={onCancel}><Text style={[s.cancel, { color: colors.textSecondary }]}>Cancel</Text></Pressable>
            <Pressable style={[s.submit, submitting && { opacity: 0.55 }]} onPress={onSubmit} disabled={submitting}>
              <Text style={s.submitTxt}>{submitting ? 'Adding' : 'Add'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EquipmentHistoryModal({ group, colors, onClose }: { group: EquipmentGroup | null; colors: any; onClose: () => void }) {
  const recentRunHours = (group?.logs ?? []).slice(0, 5).reverse();
  const runDaysFy = fiscalRunDays(group?.logs ?? []);
  const checks = checkSummaries(group?.logs ?? []);
  const nextDue = checks.reduce((lowest, check) => Math.min(lowest, check.dueInHours), Number.POSITIVE_INFINITY);
  const maxRunHours = Math.max(1, ...recentRunHours.map(hoursOf));
  const chartPoints = recentRunHours.map((log, index) => {
    const x = recentRunHours.length <= 1 ? 160 : 28 + index * (264 / (recentRunHours.length - 1));
    const y = 104 - (hoursOf(log) / maxRunHours) * 72;
    return { log, x, y, hours: hoursOf(log) };
  });

  return (
    <Modal visible={Boolean(group)} animationType="slide">
      <View style={[s.fullModal, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={[s.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.cardBorder }]}>
          <Pressable
            onPress={onClose}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Close equipment history"
            style={[s.closeIcon, { backgroundColor: colors.cardMuted }]}
          >
            <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>{group?.tag}</Text>
          <View style={s.closeIcon} />
        </View>
        {group ? (
          <ScrollView contentContainerStyle={s.content}>
            <View style={s.statsRow}>
              <Stat label="Run Days FY" value={runDaysFy} color="#22c55e" colors={colors} />
              <Stat label="R/Hrs Since B" value={Math.round(checks[0].sinceHours)} color="#d97706" colors={colors} />
              <Stat label="Due Hrs" value={Number.isFinite(nextDue) ? Math.round(nextDue) : 0} color="#ef4444" colors={colors} />
            </View>

            <Text style={[s.title, { color: colors.text }]}>B/C/D Check Hours</Text>
            <View style={[s.checkPanel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {checks.map((check) => (
                <View key={check.code} style={[s.checkRow, { borderBottomColor: colors.divider }]}>
                  <View style={[s.checkCode, { backgroundColor: colors.cardMuted }]}>
                    <Text style={[s.checkCodeText, { color: colors.text }]}>{check.code}</Text>
                  </View>
                  <View style={s.checkCopy}>
                    <Text style={[s.checkPrimary, { color: colors.text }]}>
                      {Math.round(check.sinceHours)} h since last {check.code}
                    </Text>
                    <Text style={[s.checkSecondary, { color: colors.textSecondary }]}>
                      Due in {Math.round(check.dueInHours)} h of {check.intervalHours} h
                    </Text>
                  </View>
                  <Text style={[s.checkDate, { color: colors.textTertiary }]}>
                    {check.lastDate ? new Date(check.lastDate).toLocaleDateString() : 'No check'}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[s.title, { color: colors.text }]}>Run-Hour Trend</Text>
            <View style={[s.trendCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Svg width="100%" height={144} viewBox="0 0 320 144">
                <Line x1="24" y1="104" x2="300" y2="104" stroke={colors.divider} strokeWidth="2" />
                <Line x1="24" y1="32" x2="24" y2="104" stroke={colors.divider} strokeWidth="2" />
                {chartPoints.length > 1 ? (
                  <Polyline
                    points={chartPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {chartPoints.map((point, index) => (
                  <React.Fragment key={`${point.log.id ?? index}`}>
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r="6"
                      fill={isRunning(point.log) ? '#22c55e' : '#ef4444'}
                      stroke={colors.card}
                      strokeWidth="2"
                    />
                    <SvgText x={point.x} y={Math.max(16, point.y - 12)} fill={colors.textSecondary} fontSize="10" fontWeight="700" textAnchor="middle">
                      {`${point.hours.toFixed(point.hours % 1 === 0 ? 0 : 1)}h`}
                    </SvgText>
                    <SvgText x={point.x} y="126" fill={colors.textTertiary} fontSize="10" fontWeight="700" textAnchor="middle">
                      {point.log.date ? new Date(point.log.date).getDate() : '-'}
                    </SvgText>
                  </React.Fragment>
                ))}
                <SvgText x="22" y="26" fill={colors.textTertiary} fontSize="10" textAnchor="start">
                  {`${maxRunHours.toFixed(maxRunHours % 1 === 0 ? 0 : 1)}h`}
                </SvgText>
                <SvgText x="20" y="119" fill={colors.textTertiary} fontSize="10" textAnchor="middle">
                  0
                </SvgText>
              </Svg>
              <Text style={[s.meta, { color: colors.textSecondary }]}>Last 5 log days. Point height follows run hours; color shows status.</Text>
            </View>

            <Text style={[s.title, { color: colors.text }]}>Asset History</Text>
            {group.logs.map((log, index) => (
              <View key={`${log.id ?? index}`} style={[s.historyRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[s.dot, { backgroundColor: isRunning(log) ? '#22c55e' : '#ef4444' }]} />
                <View style={s.cardCopy}>
                  <Text style={[s.cardTitle, { color: colors.text }]}>{log.date ? new Date(log.date).toLocaleString() : 'No date'}</Text>
                  <Text style={[s.meta, { color: colors.textSecondary }]}>{hoursOf(log).toFixed(1)} hrs • {isRunning(log) ? 'Running' : 'Stopped'}</Text>
                  {log.remarks ? <Text style={[s.remarks, { color: colors.textSecondary }]}>{log.remarks}</Text> : null}
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontWeight: '700' },
  addBtn: { backgroundColor: '#d97706', padding: 8, borderRadius: 10, marginRight: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  stat: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '800' },
  statLbl: { fontSize: 11, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 4 },
  scopeLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  chipRow: { gap: 8, paddingBottom: 14 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  filterText: { fontSize: 12, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 4 },
  remarks: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  cardStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '800' },
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 20, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  input: { borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 12, fontSize: 14 },
  textArea: { height: 84, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10 },
  cancel: { padding: 12, fontWeight: '700' },
  submit: { backgroundColor: '#d97706', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, marginLeft: 10 },
  submitTxt: { color: '#fff', fontWeight: '800' },
  fullModal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 56, borderBottomWidth: 1 },
  closeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', marginHorizontal: 10 },
  trendCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  checkPanel: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, marginBottom: 16 },
  checkRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, gap: 10 },
  checkCode: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  checkCodeText: { fontSize: 14, fontWeight: '900' },
  checkCopy: { flex: 1, minWidth: 0 },
  checkPrimary: { fontSize: 13, fontWeight: '800' },
  checkSecondary: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  checkDate: { width: 66, textAlign: 'right', fontSize: 10, fontWeight: '700' },
  trendBars: { height: 96, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  trendItem: { flex: 1, alignItems: 'center' },
  trendLabel: { fontSize: 10, marginTop: 6 },
  historyRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
});
