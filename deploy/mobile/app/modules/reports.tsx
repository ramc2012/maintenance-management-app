import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/services/api';
import { canonicalServiceKey, displayService, uniqueServiceOptions } from '@/utils/serviceGroups';
import { disciplineToLabel, type Discipline } from '@/utils/workspace';

interface ReportMetric {
  label: string;
  value: string | number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bg: string;
}

interface Installation {
  id: string;
  installationId: string;
  name?: string | null;
  type?: string | null;
}

interface EquipmentOption {
  tag: string;
  label: string;
  type: string;
  installationId: string;
}

interface ManpowerOption {
  id: string;
  employeeId: string;
  name: string;
  department?: string;
  section?: string | null;
  designation?: string | null;
}

interface MaintenanceReportLog {
  id: string;
  date: string;
  department?: string;
  section?: string;
  jobType?: string;
  status?: string;
  description?: string;
  remarks?: string;
  notificationNo?: string;
  durationHours?: number;
  installation?: { installationId?: string };
}

interface FieldReportFormState {
  date: string;
  installationId: string;
  department: string;
  section: string;
  jobType: string;
  reportCriticality: string;
  equipmentTag: string;
  notificationNo: string;
  description: string;
  status: string;
  startTime: string;
  endTime: string;
  durationHours: string;
  remarks: string;
  crewMemberIds: string[];
  externalCrewName: string;
  externalCrew: Array<{ name: string; source: 'EXTERNAL' }>;
}

const DISCIPLINES: Discipline[] = ['MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION'];
const JOB_TYPES = ['PM', 'BD', 'CM'];
const STATUSES = ['Open', 'In Progress', 'Closed'];
const CRITICALITIES = [
  { value: '1', label: 'Routine' },
  { value: '2', label: 'Significant' },
  { value: '3', label: 'Critical' },
];

interface DropdownOption {
  label: string;
  value: string;
  description?: string;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDiscipline(value: string | string[] | undefined): Discipline | null {
  const raw = normalizeParam(value)?.toUpperCase();
  return DISCIPLINES.includes(raw as Discipline) ? (raw as Discipline) : null;
}

function combineDateAndTime(date: string, time: string) {
  if (!date || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const localDate = new Date(`${date}T${time}:00`);
  return Number.isNaN(localDate.getTime()) ? null : localDate;
}

function calculateDuration(date: string, startTime: string, endTime: string) {
  const start = combineDateAndTime(date, startTime);
  const end = combineDateAndTime(date, endTime);

  if (!start || !end || end <= start) {
    return '';
  }

  return ((end.getTime() - start.getTime()) / 36e5).toFixed(2);
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || 'Select date';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function shiftIsoDate(value: string, days: number) {
  const date = new Date(`${value || todayIsoDate()}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function appendDiscipline(endpoint: string, discipline: Discipline | null) {
  return discipline ? `${endpoint}?discipline=${encodeURIComponent(discipline)}` : endpoint;
}

function appendQuery(endpoint: string, query: Record<string, string | null | undefined>) {
  const params = Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]));
  if (!params.length) {
    return endpoint;
  }

  return `${endpoint}?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

export default function ReportsScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const discipline = parseDiscipline(params.discipline);
  const mode = normalizeParam(params.mode);
  const showFieldForm = mode === 'new' || (user?.persona === 'FIELD' && Boolean(discipline));

  if (showFieldForm) {
    return <FieldReportScreen discipline={discipline} />;
  }

  return <ReportsSummaryScreen discipline={discipline} />;
}

function FieldReportScreen({ discipline }: { discipline: Discipline | null }) {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const disciplineLabel = discipline ? disciplineToLabel(discipline) : 'Field';
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [manpower, setManpower] = useState<ManpowerOption[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FieldReportFormState>({
    date: todayIsoDate(),
    installationId: '',
    department: '',
    section: disciplineLabel,
    jobType: 'PM',
    reportCriticality: '1',
    equipmentTag: '',
    notificationNo: '',
    description: '',
    status: 'In Progress',
    startTime: '',
    endTime: '',
    durationHours: '',
    remarks: '',
    crewMemberIds: [],
    externalCrewName: '',
    externalCrew: [],
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      section: disciplineLabel,
    }));
  }, [disciplineLabel]);

  useEffect(() => {
    const fetchReferenceData = async () => {
      setLoadingRefs(true);
      try {
        const [nextInstallations, nextManpower] = await Promise.all([
          api.get<Installation[]>(appendDiscipline('/equipment/installations', discipline)),
          api.get<ManpowerOption[]>('/maintenance/manpower?isActive=true').catch(() => []),
        ]);
        setInstallations(nextInstallations);
        setManpower(Array.isArray(nextManpower) ? nextManpower : []);
      } finally {
        setLoadingRefs(false);
      }
    };

    void fetchReferenceData();
  }, [discipline]);

  useEffect(() => {
    if (!form.installationId) {
      setEquipment([]);
      return;
    }

    const fetchEquipment = async () => {
      setLoadingEquipment(true);
      try {
        const query = {
          discipline,
          installationId: form.installationId,
        };
        const [instrumentsResult, runningResult] = await Promise.allSettled([
          api.get<any[]>(appendQuery('/equipment/instruments', query)),
          api.get<any[]>(appendQuery('/equipment/running-equip', query)),
        ]);

        const instruments = instrumentsResult.status === 'fulfilled' ? instrumentsResult.value : [];
        const runningEquipment = runningResult.status === 'fulfilled' ? runningResult.value : [];

        setEquipment([
          ...instruments.map((item) => ({
            tag: item.tagId,
            label: `${item.tagId} - ${item.description ?? 'Instrument'}`,
            type: 'INSTRUMENT',
            installationId: item.installationId,
          })),
          ...runningEquipment.map((item) => ({
            tag: item.equipmentTag,
            label: `${item.equipmentTag} - ${item.description ?? 'Equipment'}`,
            type: 'RUNNING_EQUIPMENT',
            installationId: item.installationId,
          })),
        ].filter((item) => Boolean(item.tag) && item.installationId === form.installationId));
      } finally {
        setLoadingEquipment(false);
      }
    };

    void fetchEquipment();
  }, [discipline, form.installationId]);

  const selectedInstallation = useMemo(
    () => installations.find((installation) => installation.id === form.installationId),
    [form.installationId, installations]
  );
  const selectedEquipment = useMemo(
    () => equipment.find((item) => item.tag === form.equipmentTag),
    [equipment, form.equipmentTag]
  );
  const selectedCrew = useMemo(
    () => manpower.filter((person) => form.crewMemberIds.includes(person.id)),
    [form.crewMemberIds, manpower]
  );
  const crewOptions = useMemo(() => {
    const section = form.section.trim().toLowerCase();
    return manpower
      .map((person) => ({
        ...person,
        preferred: section ? String(person.section || '').trim().toLowerCase() === section : false,
      }))
      .sort((left, right) => Number(right.preferred) - Number(left.preferred) || left.name.localeCompare(right.name));
  }, [form.section, manpower]);
  const serviceOptions = useMemo<DropdownOption[]>(
    () => uniqueServiceOptions(installations.map((installation) => installation.type)),
    [installations]
  );
  const filteredInstallations = useMemo(
    () => form.department
      ? installations.filter((installation) => canonicalServiceKey(installation.type) === form.department)
      : installations,
    [form.department, installations]
  );
  const installationOptions = useMemo<DropdownOption[]>(
    () => filteredInstallations.map((installation) => ({
      label: installation.installationId,
      value: installation.id,
      description: [installation.name, displayService(installation.type)].filter(Boolean).join(' · '),
    })),
    [filteredInstallations]
  );
  const equipmentOptions = useMemo<DropdownOption[]>(
    () => [
      { label: 'None', value: '' },
      ...equipment.map((item) => ({
        label: item.tag,
        value: item.tag,
        description: item.label,
      })),
    ],
    [equipment]
  );

  const updateForm = (patch: Partial<FieldReportFormState>) => {
    setForm((current) => {
      const next = { ...current, ...patch };
      if ('date' in patch || 'startTime' in patch || 'endTime' in patch) {
        next.durationHours = calculateDuration(next.date, next.startTime, next.endTime);
      }
      return next;
    });
  };

  const selectInstallation = (installation: Installation) => {
    updateForm({
      installationId: installation.id,
      department: canonicalServiceKey(installation.type),
      equipmentTag: '',
    });
  };

  const selectInstallationId = (installationId: string) => {
    const installation = installations.find((item) => item.id === installationId);
    if (installation) {
      selectInstallation(installation);
    }
  };

  const selectService = (service: string) => {
    updateForm({
      department: service,
      installationId: '',
      equipmentTag: '',
    });
  };

  const submitReport = async () => {
    if (!form.department) {
      Alert.alert('Service required', 'Select the service before choosing the installation.');
      return;
    }

    if (!form.installationId) {
      Alert.alert('Installation required', 'Select the installation before submitting the field report.');
      return;
    }

    if (!form.description.trim()) {
      Alert.alert('Description required', 'Enter the work details for this field report.');
      return;
    }

    setSubmitting(true);
    try {
      const startDateTime = combineDateAndTime(form.date, form.startTime);
      const endDateTime = combineDateAndTime(form.date, form.endTime);
      const payload = {
        date: form.date,
        installationId: form.installationId,
        department: selectedInstallation?.type ? displayService(selectedInstallation.type) : displayService(form.department || disciplineLabel),
        section: form.section || disciplineLabel,
        primaryDiscipline: discipline ?? undefined,
        jobType: form.jobType,
        reportCriticality: Number(form.reportCriticality),
        equipmentTag: form.equipmentTag || undefined,
        equipmentType: selectedEquipment?.type || undefined,
        notificationNo: form.notificationNo || undefined,
        description: form.description.trim(),
        status: form.status,
        startTime: startDateTime?.toISOString() ?? null,
        endTime: endDateTime?.toISOString() ?? null,
        durationHours: Number(form.durationHours || 0),
        remarks: form.remarks.trim() || undefined,
        teamMemberIds: form.crewMemberIds,
        externalCrew: form.externalCrew,
        createdBy: user?.username || 'mobile',
      };

      await api.post('/maintenance/logs', payload);
      Alert.alert('Field report submitted', 'The daily maintenance log has been saved.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
      setForm((current) => ({
        ...current,
        date: todayIsoDate(),
        equipmentTag: '',
        notificationNo: '',
        description: '',
        startTime: '',
        endTime: '',
        durationHours: '',
        remarks: '',
        crewMemberIds: [],
        externalCrewName: '',
        externalCrew: [],
        status: 'In Progress',
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit field report.';
      Alert.alert('Submit failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: 'New Field Report' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.formSectionTitle, { color: colors.text }]}>Scope</Text>
          <View style={styles.compactRow}>
            <View style={styles.compactField}>
              <DatePickerField label="Date" value={form.date} onChange={(date) => updateForm({ date })} />
            </View>
            <View style={styles.compactField}>
              <Dropdown
                label="Service"
                value={form.department}
                options={serviceOptions}
                placeholder={serviceOptions.length ? 'Select service' : 'No services available'}
                onChange={selectService}
                disabled={loadingRefs}
                loading={loadingRefs}
              />
            </View>
          </View>

          <View style={styles.compactRow}>
            <View style={styles.compactField}>
              <LabeledInput label="Section" value={form.section} onChangeText={(section) => updateForm({ section })} />
            </View>
            <View style={styles.compactField}>
              {loadingRefs ? (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Installation</Text>
                  <View style={styles.loadingInline}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={[styles.mutedText, { color: colors.textSecondary }]}>Loading</Text>
                  </View>
                </View>
              ) : (
                <Dropdown
                  label="Installation"
                  value={form.installationId}
                  options={installationOptions}
                  placeholder={form.department ? 'Select installation' : 'Select service'}
                  onChange={selectInstallationId}
                  disabled={!form.department}
                />
              )}
            </View>
          </View>

          <View style={styles.compactRow}>
            <View style={styles.compactField}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Job Type</Text>
              <View style={styles.choiceRowWrap}>
                {JOB_TYPES.map((jobType) => (
                  <ChoiceChip key={jobType} label={jobType} selected={form.jobType === jobType} onPress={() => updateForm({ jobType })} />
                ))}
              </View>
            </View>
            <View style={styles.compactField}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Criticality</Text>
              <View style={styles.choiceRowWrap}>
                {CRITICALITIES.map((criticality) => (
                  <ChoiceChip
                    key={criticality.value}
                    label={criticality.label}
                    selected={form.reportCriticality === criticality.value}
                    onPress={() => updateForm({ reportCriticality: criticality.value })}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.formSectionTitle, { color: colors.text }]}>Work Details</Text>
          <Dropdown
            label="Equipment"
            value={form.equipmentTag}
            options={equipmentOptions}
            placeholder={
              form.installationId
                ? loadingEquipment
                  ? 'Loading equipment'
                  : 'Select equipment'
                : 'Select installation first'
            }
            onChange={(equipmentTag) => updateForm({ equipmentTag })}
            disabled={!form.installationId || loadingEquipment}
            loading={loadingEquipment}
          />

          <LabeledInput
            label="Notification No."
            value={form.notificationNo}
            onChangeText={(notificationNo) => updateForm({ notificationNo })}
            placeholder="Optional"
          />
          <LabeledInput
            label="Description"
            value={form.description}
            onChangeText={(description) => updateForm({ description })}
            placeholder="Work performed, issue observed, action taken"
            multiline
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Status</Text>
          <View style={styles.choiceRowWrap}>
            {STATUSES.map((status) => (
              <ChoiceChip key={status} label={status} selected={form.status === status} onPress={() => updateForm({ status })} />
            ))}
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <TimePickerField label="Start" value={form.startTime} onChange={(startTime) => updateForm({ startTime })} />
            </View>
            <View style={styles.timeField}>
              <TimePickerField label="End" value={form.endTime} onChange={(endTime) => updateForm({ endTime })} />
            </View>
          </View>
          <LabeledInput label="Duration Hours" value={form.durationHours} onChangeText={(durationHours) => updateForm({ durationHours })} placeholder="Auto" keyboardType="decimal-pad" />
          <LabeledInput label="Remarks" value={form.remarks} onChangeText={(remarks) => updateForm({ remarks })} placeholder="Optional" multiline />
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.formSectionTitle, { color: colors.text }]}>Crew Details</Text>
          <CrewSelector
            value={form.crewMemberIds}
            options={crewOptions}
            section={form.section}
            onChange={(crewMemberIds) => updateForm({ crewMemberIds })}
          />
          <View style={styles.externalRow}>
            <View style={styles.externalInputWrap}>
              <LabeledInput
                label="External Person"
                value={form.externalCrewName}
                onChangeText={(externalCrewName) => updateForm({ externalCrewName })}
                placeholder="Name not in manpower"
              />
            </View>
            <Pressable
              style={[styles.addExternalButton, { backgroundColor: colors.primary }, !form.externalCrewName.trim() && styles.disabledButton]}
              disabled={!form.externalCrewName.trim()}
              onPress={() => updateForm({
                externalCrew: [...form.externalCrew, { name: form.externalCrewName.trim(), source: 'EXTERNAL' }],
                externalCrewName: '',
              })}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#ffffff" />
            </Pressable>
          </View>
          {selectedCrew.length || form.externalCrew.length ? (
            <View style={styles.crewPills}>
              {selectedCrew.map((person) => (
                <CrewPill key={person.id} label={`${person.name} (${person.employeeId})`} onRemove={() => updateForm({ crewMemberIds: form.crewMemberIds.filter((id) => id !== person.id) })} />
              ))}
              {form.externalCrew.map((person, index) => (
                <CrewPill key={`${person.name}-${index}`} label={`${person.name} · external`} onRemove={() => updateForm({ externalCrew: form.externalCrew.filter((_, itemIndex) => itemIndex !== index) })} />
              ))}
            </View>
          ) : (
            <Text style={[styles.mutedText, { color: colors.textSecondary }]}>Select regular crew for manpower hour logging. External names stay only on this report.</Text>
          )}
        </View>

        <Pressable style={[styles.submitButton, submitting && styles.disabledButton]} onPress={submitReport} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#ffffff" /> : <MaterialCommunityIcons name="content-save-outline" size={20} color="#ffffff" />}
          <Text style={styles.submitButtonText}>{submitting ? 'Submitting' : 'Submit Field Report'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ReportsSummaryScreen({ discipline }: { discipline: Discipline | null }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const disciplineLabel = discipline ? disciplineToLabel(discipline) : null;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<ReportMetric[]>([]);
  const [reports, setReports] = useState<MaintenanceReportLog[]>([]);
  const [selectedReport, setSelectedReport] = useState<MaintenanceReportLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [discipline]);

  const fetchData = async () => {
    try {
      const [casesAnalytics, workshop, moh, energy, reportLogs] = await Promise.all([
        api.get<any>('/cases/analytics').catch(() => null),
        api.get<any>('/workshop/dashboard').catch(() => null),
        api.get<any>('/moh/dashboard').catch(() => null),
        api.get<any>('/energy/dashboard').catch(() => null),
        api.get<MaintenanceReportLog[]>(appendDiscipline('/maintenance/logs', discipline)).catch(() => []),
      ]);

      const summaryMetrics: ReportMetric[] = [
        { label: 'Active Cases', value: casesAnalytics?.activeCount || 0, icon: 'briefcase-clock', color: '#9333ea', bg: '#faf5ff' },
        { label: 'Closed Cases', value: casesAnalytics?.closedCount || 0, icon: 'briefcase-check', color: '#22c55e', bg: '#f0fdf4' },
        { label: 'Workshop Jobs', value: (workshop?.overall?.pending || 0) + (workshop?.overall?.inProgress || 0), icon: 'wrench', color: '#eab308', bg: '#fefce8' },
        { label: 'Completed Jobs', value: workshop?.overall?.completed || 0, icon: 'check-circle', color: '#22c55e', bg: '#f0fdf4' },
        { label: 'MOH Planned', value: moh?.stats?.planned || 0, icon: 'calendar', color: '#3b82f6', bg: '#eff6ff' },
        { label: 'MOH In Progress', value: moh?.stats?.inProgress || 0, icon: 'progress-clock', color: '#f97316', bg: '#fff7ed' },
        { label: 'Energy (30d)', value: formatCurrency(energy?.summary?.totalFuelCost || 0), icon: 'fuel', color: '#dc2626', bg: '#fef2f2' },
        { label: 'Power Usage', value: `${((energy?.summary?.totalElectricKwh || 0)/1000).toFixed(0)} MWh`, icon: 'flash', color: '#0891b2', bg: '#ecfeff' },
      ];

      setMetrics(summaryMetrics);
      setReports(Array.isArray(reportLogs) ? reportLogs : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color="#059669" /></View>;
  if (error) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><Text style={[styles.error, { color: colors.error }]}>Error: {error}</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: disciplineLabel ? `${disciplineLabel} Reports` : 'Reports' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
        <View style={styles.header}>
          <MaterialCommunityIcons name="file-search-outline" size={34} color="#059669" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{disciplineLabel ? `${disciplineLabel} Reports` : 'Reports'}</Text>
        </View>

        <View style={[styles.reportScopeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.reportScopeStat}>
            <Text style={[styles.metricValue, { color: '#059669' }]}>{reports.length}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Past reports</Text>
          </View>
          <View style={styles.reportScopeCopy}>
            <Text style={[styles.reportScopeTitle, { color: colors.text }]}>{disciplineLabel ? 'Section report history' : 'All report history'}</Text>
            <Text style={[styles.reportScopeText, { color: colors.textSecondary }]}>Tap any report to view the full original report text where seeded from DPR.</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Past Reports</Text>
        {reports.length === 0 ? (
          <View style={[styles.emptyReportCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>No reports returned for this scope.</Text>
          </View>
        ) : reports.slice(0, 40).map((report) => (
          <Pressable key={report.id} style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setSelectedReport(report)}>
            <View style={styles.reportLeft}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color="#059669" />
              <View style={styles.reportCopy}>
                <Text style={[styles.reportName, { color: colors.text }]} numberOfLines={1}>{report.description || 'Maintenance report'}</Text>
                <Text style={[styles.reportMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {new Date(report.date).toLocaleDateString()} · {report.installation?.installationId || '-'} · {report.status || '-'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
          </Pressable>
        ))}

        <View style={[styles.infoCard, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
          <MaterialCommunityIcons name="information" size={20} color="#0891b2" />
          <Text style={[styles.infoText, { color: colors.info }]}>Detailed reports with charts and export options available on web dashboard</Text>
        </View>
      </ScrollView>
      <Modal visible={Boolean(selectedReport)} animationType="slide" onRequestClose={() => setSelectedReport(null)}>
        <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={[styles.reportModalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.cardBorder }]}>
            <Pressable style={[styles.dropdownClose, { backgroundColor: colors.cardMuted }]} onPress={() => setSelectedReport(null)}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.reportModalTitle, { color: colors.text }]} numberOfLines={1}>Maintenance Report</Text>
            <View style={styles.dropdownClose} />
          </View>
          {selectedReport ? (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>{selectedReport.description || 'Maintenance report'}</Text>
                <Text style={[styles.reportMeta, { color: colors.textSecondary }]}>
                  {new Date(selectedReport.date).toLocaleDateString()} · {selectedReport.installation?.installationId || '-'} · {selectedReport.section || '-'}
                </Text>
                <View style={styles.reportDetailGrid}>
                  <ReportDetail label="Service" value={displayService(selectedReport.department) || '-'} colors={colors} />
                  <ReportDetail label="Type" value={selectedReport.jobType || '-'} colors={colors} />
                  <ReportDetail label="Status" value={selectedReport.status || '-'} colors={colors} />
                  <ReportDetail label="Hours" value={`${selectedReport.durationHours ?? 0}`} colors={colors} />
                </View>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Original Full Report</Text>
              <View style={[styles.originalReportCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.originalReportText, { color: colors.text }]}>{selectedReport.remarks || 'No original report text stored for this log.'}</Text>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function ReportDetail({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.reportDetailItem}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.dropdownValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [open, setOpen] = useState(false);
  const quickDates = [
    { label: 'Yesterday', value: shiftIsoDate(todayIsoDate(), -1) },
    { label: 'Today', value: todayIsoDate() },
    { label: 'Tomorrow', value: shiftIsoDate(todayIsoDate(), 1) },
  ];

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable style={[styles.pickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]} onPress={() => setOpen(true)}>
        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.dropdownValue, { color: colors.text }]}>{formatDateLabel(value)}</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.pickerModal, { backgroundColor: colors.card }]}>
            <View style={[styles.dropdownModalHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[styles.dropdownModalTitle, { color: colors.text }]}>Select Date</Text>
              <Pressable style={[styles.dropdownClose, { backgroundColor: colors.cardMuted }]} onPress={() => setOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.dateStepper}>
              <Pressable style={[styles.stepButton, { backgroundColor: colors.cardMuted }]} onPress={() => onChange(shiftIsoDate(value, -1))}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.text} />
              </Pressable>
              <Text style={[styles.datePreview, { color: colors.text }]}>{formatDateLabel(value)}</Text>
              <Pressable style={[styles.stepButton, { backgroundColor: colors.cardMuted }]} onPress={() => onChange(shiftIsoDate(value, 1))}>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.quickGrid}>
              {quickDates.map((option) => (
                <Pressable
                  key={option.label}
                  style={[styles.quickChip, { backgroundColor: value === option.value ? colors.successBg : colors.inputBackground, borderColor: value === option.value ? '#059669' : colors.inputBorder }]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.choiceChipText, { color: value === option.value ? '#047857' : colors.textSecondary }]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function TimePickerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [open, setOpen] = useState(false);
  const times = ['06:00', '07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '17:00', '18:00', '20:00', '22:00'];

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable style={[styles.pickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]} onPress={() => setOpen(true)}>
        <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.dropdownValue, { color: value ? colors.text : colors.inputPlaceholder }]}>{value || 'Select time'}</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.pickerModal, { backgroundColor: colors.card }]}>
            <View style={[styles.dropdownModalHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[styles.dropdownModalTitle, { color: colors.text }]}>{label} Time</Text>
              <Pressable style={[styles.dropdownClose, { backgroundColor: colors.cardMuted }]} onPress={() => setOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.quickGrid}>
              {times.map((time) => (
                <Pressable
                  key={time}
                  style={[styles.timeChip, { backgroundColor: value === time ? colors.successBg : colors.inputBackground, borderColor: value === time ? '#059669' : colors.inputBorder }]}
                  onPress={() => {
                    onChange(time);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.choiceChipText, { color: value === time ? '#047857' : colors.textSecondary }]}>{time}</Text>
                </Pressable>
              ))}
            </View>
            <LabeledInput label="Manual HH:mm" value={value} onChangeText={onChange} placeholder="08:30" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function CrewSelector({
  value,
  options,
  section,
  onChange,
}: {
  value: string[];
  options: Array<ManpowerOption & { preferred?: boolean }>;
  section: string;
  onChange: (value: string[]) => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [open, setOpen] = useState(false);
  const selectedCount = value.length;

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Regular Crew</Text>
      <Pressable style={[styles.dropdownButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]} onPress={() => setOpen(true)}>
        <View style={styles.dropdownCopy}>
          <Text style={[styles.dropdownValue, { color: selectedCount ? colors.text : colors.inputPlaceholder }]}>
            {selectedCount ? `${selectedCount} selected for manpower hours` : 'Select crew'}
          </Text>
          <Text style={[styles.dropdownDescription, { color: colors.textSecondary }]}>Preferred: {section || 'current section'}; other sections allowed</Text>
        </View>
        <MaterialCommunityIcons name="account-multiple-plus-outline" size={20} color={colors.textSecondary} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.dropdownModal, { backgroundColor: colors.card }]}>
            <View style={[styles.dropdownModalHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[styles.dropdownModalTitle, { color: colors.text }]}>Select Crew</Text>
              <Pressable style={[styles.dropdownClose, { backgroundColor: colors.cardMuted }]} onPress={() => setOpen(false)}>
                <MaterialCommunityIcons name="check" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.dropdownList}>
              {options.map((person) => {
                const checked = value.includes(person.id);
                return (
                  <Pressable key={person.id} style={[styles.dropdownOption, checked && { backgroundColor: colors.successBg }]} onPress={() => toggle(person.id)}>
                    <View style={styles.dropdownCopy}>
                      <Text style={[styles.dropdownOptionText, { color: colors.text }]}>{person.name}</Text>
                      <Text style={[styles.dropdownDescription, { color: colors.textSecondary }]}>
                        {person.employeeId} · {person.section || 'No section'}{person.preferred ? ' · preferred' : ''}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name={checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={20} color={checked ? '#059669' : colors.textTertiary} />
                  </Pressable>
                );
              })}
              {options.length === 0 ? <Text style={[styles.dropdownEmpty, { color: colors.textSecondary }]}>No active manpower records available</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function CrewPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <Pressable style={[styles.crewPill, { backgroundColor: colors.cardMuted }]} onPress={onRemove}>
      <Text style={[styles.crewPillText, { color: colors.text }]} numberOfLines={1}>{label}</Text>
      <MaterialCommunityIcons name="close" size={14} color={colors.textSecondary} />
    </Pressable>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function Dropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  loading = false,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        style={[
          styles.dropdownButton,
          { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
          disabled && styles.dropdownDisabled,
        ]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <View style={styles.dropdownCopy}>
          <Text style={[styles.dropdownValue, { color: colors.text }, !selected && { color: colors.inputPlaceholder }]} numberOfLines={1}>
            {loading ? 'Loading...' : selected?.label ?? placeholder}
          </Text>
          {selected?.description ? <Text style={[styles.dropdownDescription, { color: colors.textSecondary }]} numberOfLines={1}>{selected.description}</Text> : null}
        </View>
        {loading ? (
          <ActivityIndicator size="small" color="#059669" />
        ) : (
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
        )}
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.dropdownModal, { backgroundColor: colors.card }]}>
            <View style={[styles.dropdownModalHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[styles.dropdownModalTitle, { color: colors.text }]}>{label}</Text>
              <Pressable style={[styles.dropdownClose, { backgroundColor: colors.cardMuted }]} onPress={() => setOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.dropdownList}>
              {options.map((option) => (
                <Pressable
                  key={option.value || 'empty'}
                  style={[styles.dropdownOption, option.value === value && { backgroundColor: colors.successBg }]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <View style={styles.dropdownCopy}>
                    <Text style={[styles.dropdownOptionText, { color: colors.text }]}>{option.label}</Text>
                    {option.description ? <Text style={[styles.dropdownDescription, { color: colors.textSecondary }]}>{option.description}</Text> : null}
                  </View>
                  {option.value === value ? <MaterialCommunityIcons name="check" size={18} color="#059669" /> : null}
                </Pressable>
              ))}
              {options.length === 0 ? <Text style={[styles.dropdownEmpty, { color: colors.textSecondary }]}>No options available</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <Pressable
      style={[
        styles.choiceChip,
        { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
        selected && { backgroundColor: colors.successBg, borderColor: '#059669' },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.choiceChipText, { color: colors.textSecondary }, selected && { color: '#047857' }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const formatCurrency = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${n.toLocaleString()}`;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#ef4444' },
  header: { alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12, marginTop: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { width: '48%', borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', marginBottom: 12 },
  metricValue: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  metricLabel: { fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'center' },
  reportCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 10 },
  reportLeft: { flexDirection: 'row', alignItems: 'center' },
  reportCopy: { flex: 1, minWidth: 0, marginLeft: 12 },
  reportName: { fontSize: 14, fontWeight: '500', color: '#0f172a', marginLeft: 12 },
  reportMeta: { fontSize: 11, marginTop: 4 },
  reportScopeCard: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12, gap: 12 },
  reportScopeStat: { width: 78, alignItems: 'center', justifyContent: 'center' },
  reportScopeCopy: { flex: 1, minWidth: 0 },
  reportScopeTitle: { fontSize: 14, fontWeight: '800' },
  reportScopeText: { marginTop: 4, fontSize: 12, lineHeight: 17 },
  emptyReportCard: { borderRadius: 12, borderWidth: 1, padding: 18, alignItems: 'center', marginBottom: 12 },
  reportModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1 },
  reportModalTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', marginHorizontal: 10 },
  reportDetailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  reportDetailItem: { width: '50%', marginBottom: 12 },
  originalReportCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  originalReportText: { fontSize: 12, lineHeight: 18 },
  infoCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 14, borderRadius: 12, marginTop: 16 },
  infoText: { fontSize: 12, color: '#0891b2', marginLeft: 10, flex: 1 },
  formCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  formSectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  compactRow: { flexDirection: 'row', gap: 10 },
  compactField: { flex: 1, minWidth: 0 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' },
  textInput: { minHeight: 46, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff', fontSize: 14 },
  multilineInput: { minHeight: 96, textAlignVertical: 'top' },
  loadingInline: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  mutedText: { color: '#64748b', fontSize: 13 },
  choiceRow: { gap: 8, paddingBottom: 12 },
  choiceRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  choiceChip: { maxWidth: 180, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#ffffff' },
  choiceChipSelected: { backgroundColor: '#dcfce7', borderColor: '#059669' },
  choiceChipText: { color: '#334155', fontSize: 13, fontWeight: '700' },
  choiceChipTextSelected: { color: '#047857' },
  dropdownButton: { minHeight: 52, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pickerButton: { minHeight: 52, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', gap: 9 },
  dropdownDisabled: { opacity: 0.8 },
  dropdownCopy: { flex: 1 },
  dropdownValue: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  dropdownPlaceholder: { color: '#94a3b8', fontWeight: '600' },
  dropdownDescription: { color: '#64748b', fontSize: 12, marginTop: 3 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  dropdownModal: { maxHeight: '72%', backgroundColor: '#ffffff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14 },
  dropdownModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  dropdownModalTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  dropdownClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  dropdownList: { paddingHorizontal: 12, paddingVertical: 8 },
  dropdownOption: { minHeight: 52, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dropdownOptionSelected: { backgroundColor: '#dcfce7' },
  dropdownOptionText: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  dropdownEmpty: { color: '#64748b', padding: 16, textAlign: 'center' },
  pickerModal: { maxHeight: '72%', backgroundColor: '#ffffff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 18 },
  dateStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 16 },
  stepButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  datePreview: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  quickChip: { flex: 1, minWidth: 96, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  timeChip: { width: '30%', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  externalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  externalInputWrap: { flex: 1 },
  addExternalButton: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  crewPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  crewPill: { maxWidth: '100%', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  crewPillText: { maxWidth: 260, fontSize: 12, fontWeight: '700' },
  submitButton: { minHeight: 52, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  disabledButton: { opacity: 0.65 },
  submitButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});
