import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import api from '@/services/api';
import { canonicalServiceKey, uniqueServiceOptions } from '@/utils/serviceGroups';
import { type Discipline } from '@/utils/workspace';

const CAL_RESULTS = ['PASS', 'FAIL', 'OUT_OF_TOLERANCE'];
const DISCIPLINES: Discipline[] = ['MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION'];

type Instrument = {
  id?: string;
  tagId?: string;
  tag?: string;
  type?: string;
  serviceLine?: string;
  description?: string;
  make?: string;
  model?: string;
  serialNo?: string;
  rangeMin?: number;
  rangeMax?: number;
  unit?: string;
  calibrationFreqMonths?: number;
  nextDueDate?: string;
  lastCalibrationDate?: string;
  installationId?: string;
  installation?: string | { name?: string; installationId?: string };
  functionalLocation?: string;
};

type InstallationOption = {
  id: string;
  installationId: string;
  name?: string | null;
  type?: string | null;
};

function parseDiscipline(raw?: string | string[]): Discipline | null {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase();
  return DISCIPLINES.includes(value as Discipline) ? (value as Discipline) : null;
}

function appendDiscipline(endpoint: string, discipline: Discipline | null) {
  if (!discipline) return endpoint;
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}discipline=${encodeURIComponent(discipline)}`;
}

function tagOf(inst: Instrument) {
  return inst.tagId || inst.tag || 'Instrument';
}

function installationOf(inst: Instrument) {
  if (typeof inst.installation === 'object') {
    return inst.installation.name || inst.installation.installationId || inst.installationId || inst.functionalLocation || 'Unassigned';
  }
  return inst.installation || inst.installationId || inst.functionalLocation || 'Unassigned';
}

function getDaysUntilDue(dueDate?: string) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgency(days: number | null) {
  if (days === null) return { label: '-', color: '#94a3b8', bg: '#f1f5f9' };
  if (days < 0) return { label: 'Overdue', color: '#ef4444', bg: '#fef2f2' };
  if (days <= 30) return { label: `${days}d`, color: '#f97316', bg: '#fff7ed' };
  if (days <= 60) return { label: `${days}d`, color: '#eab308', bg: '#fefce8' };
  return { label: `${days}d`, color: '#22c55e', bg: '#f0fdf4' };
}

export default function CalibrationScreen() {
  const params = useLocalSearchParams<{ discipline?: string }>();
  const discipline = parseDiscipline(params.discipline);
  const { theme } = useTheme();
  const { colors } = theme;
  const [loading, setLoading] = useState(true);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [installationsRef, setInstallationsRef] = useState<InstallationOption[]>([]);
  const [standards, setStandards] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState(90);
  const [selectedService, setSelectedService] = useState('all');
  const [selectedInstallationId, setSelectedInstallationId] = useState('all');
  const [selectedInst, setSelectedInst] = useState<Instrument | null>(null);
  const [showCalForm, setShowCalForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calHistory, setCalHistory] = useState<any[]>([]);
  const [calForm, setCalForm] = useState({
    currentCalDate: new Date().toISOString().split('T')[0],
    performedBy: '',
    result: 'PASS',
    masterStdId: '',
    remarks: '',
    point1_input: '0%', point1_expected: '', point1_actual: '',
    point2_input: '25%', point2_expected: '', point2_actual: '',
    point3_input: '50%', point3_expected: '', point3_actual: '',
    point4_input: '75%', point4_expected: '', point4_actual: '',
    point5_input: '100%', point5_expected: '', point5_actual: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [instRes, stdRes, installationRes] = await Promise.all([
        api.get<Instrument[]>(appendDiscipline(`/calibration/due?days=${daysFilter}`, discipline)),
        api.get<any[]>('/calibration/standards').catch(() => []),
        api.get<InstallationOption[]>(appendDiscipline('/equipment/installations', discipline)).catch(() => []),
      ]);
      setInstruments(Array.isArray(instRes) ? instRes : []);
      setStandards(Array.isArray(stdRes) ? stdRes : []);
      setInstallationsRef(Array.isArray(installationRes) ? installationRes : []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [daysFilter, discipline]);

  const installationLookup = useMemo(() => {
    const byAnyId = new Map<string, InstallationOption>();
    installationsRef.forEach((installation) => {
      byAnyId.set(installation.id, installation);
      byAnyId.set(installation.installationId, installation);
    });
    return byAnyId;
  }, [installationsRef]);

  const resolveInstallation = (inst: Instrument) => {
    const rawInstallation = installationOf(inst);
    return inst.installationId ? installationLookup.get(inst.installationId) : installationLookup.get(rawInstallation);
  };

  const displayInstallation = (inst: Instrument) => resolveInstallation(inst)?.installationId || installationOf(inst);

  const openDetail = async (inst: Instrument) => {
    setSelectedInst({ ...inst, installation: displayInstallation(inst) });
    try {
      const history = await api.get<any[]>(`/calibration/logs?instrumentTagId=${encodeURIComponent(tagOf(inst))}`);
      setCalHistory(Array.isArray(history) ? history : []);
    } catch {
      setCalHistory([]);
    }
  };

  const openCalForm = () => {
    if (selectedInst?.rangeMin !== undefined && selectedInst?.rangeMax !== undefined) {
      const range = selectedInst.rangeMax - selectedInst.rangeMin;
      const points = [0, 25, 50, 75, 100].map((pct) => selectedInst.rangeMin! + (range * pct / 100));
      setCalForm((current) => ({
        ...current,
        point1_expected: String(points[0]),
        point2_expected: String(points[1]),
        point3_expected: String(points[2]),
        point4_expected: String(points[3]),
        point5_expected: String(points[4]),
      }));
    }
    setShowCalForm(true);
  };

  const handleRecordCalibration = async () => {
    if (!selectedInst) return;
    if (!calForm.performedBy.trim()) {
      Alert.alert('Performed By required', 'Enter the technician name before saving.');
      return;
    }

    setSubmitting(true);
    try {
      const fivePointData = [1, 2, 3, 4, 5]
        .map((point) => ({
          input: (calForm as any)[`point${point}_input`],
          expected: (calForm as any)[`point${point}_expected`],
          actual: (calForm as any)[`point${point}_actual`],
        }))
        .filter((point) => point.actual);

      await api.post('/calibration/logs', {
        instrumentTagId: tagOf(selectedInst),
        masterStdId: calForm.masterStdId || standards[0]?.id || 'DEFAULT-STD',
        currentCalDate: calForm.currentCalDate,
        result: calForm.result,
        performedBy: calForm.performedBy,
        fivePointData,
        remarks: calForm.remarks,
      });

      setShowCalForm(false);
      await openDetail(selectedInst);
      await fetchData();
      Alert.alert('Saved', 'Calibration record saved.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const services = useMemo(
    () => [{ value: 'all', label: 'All' }, ...uniqueServiceOptions(installationsRef.map((installation) => installation.type))],
    [installationsRef]
  );
  const installationOptions = useMemo(
    () => installationsRef.filter((installation) => selectedService === 'all' || canonicalServiceKey(installation.type) === selectedService),
    [installationsRef, selectedService]
  );
  const filteredInstruments = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return instruments.filter((inst) => {
      const installation = resolveInstallation(inst);
      const matchesSearch = !query
        || tagOf(inst).toLowerCase().includes(query)
        || (inst.description ?? '').toLowerCase().includes(query)
        || (inst.serviceLine ?? '').toLowerCase().includes(query);
      const matchesService = selectedService === 'all' || canonicalServiceKey(installation?.type) === selectedService;
      const matchesInstallation = selectedInstallationId === 'all'
        || installation?.id === selectedInstallationId
        || inst.installationId === selectedInstallationId
        || installationOf(inst) === selectedInstallationId;
      return matchesSearch && matchesService && matchesInstallation;
    });
  }, [filter, installationLookup, instruments, selectedInstallationId, selectedService]);

  const stats = useMemo(() => ({
    overdue: filteredInstruments.filter((inst) => {
      const days = getDaysUntilDue(inst.nextDueDate);
      return days !== null && days < 0;
    }).length,
    due30: filteredInstruments.filter((inst) => {
      const days = getDaysUntilDue(inst.nextDueDate);
      return days !== null && days >= 0 && days <= 30;
    }).length,
    installations: installationOptions.length,
  }), [filteredInstruments, installationOptions.length]);

  const selectService = (service: string) => {
    setSelectedService(service);
    setSelectedInstallationId('all');
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color="#16a34a" /></View>;
  if (error) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><Text style={[styles.error, { color: colors.error }]}>Error: {error}</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: 'Calibration' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <StatCard label="Overdue" value={stats.overdue} color="#ef4444" colors={colors} />
          <StatCard label="Due 30d" value={stats.due30} color="#f97316" colors={colors} />
          <StatCard label="Plants" value={stats.installations} color="#16a34a" colors={colors} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Due Window</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[30, 60, 90, 180, 365].map((days) => (
            <Pressable
              key={days}
              style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }, daysFilter === days && styles.filterActive]}
              onPress={() => setDaysFilter(days)}
            >
              <Text style={[styles.filterText, { color: daysFilter === days ? '#fff' : colors.textSecondary }]}>{days}d</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Scope</Text>
        <Text style={[styles.scopeLabel, { color: colors.textTertiary }]}>Service</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {services.map((service) => (
            <Pressable
              key={service.value}
              style={[
                styles.installationChip,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                selectedService === service.value && { backgroundColor: colors.successBg, borderColor: '#16a34a' },
              ]}
              onPress={() => selectService(service.value)}
            >
              <Text style={[styles.filterText, { color: selectedService === service.value ? '#047857' : colors.textSecondary }]}>{service.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={[styles.scopeLabel, { color: colors.textTertiary }]}>Installation</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable
            style={[
              styles.installationChip,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
              selectedInstallationId === 'all' && { backgroundColor: colors.successBg, borderColor: '#16a34a' },
            ]}
            onPress={() => setSelectedInstallationId('all')}
          >
            <Text style={[styles.filterText, { color: selectedInstallationId === 'all' ? '#047857' : colors.textSecondary }]}>All</Text>
          </Pressable>
          {installationOptions.map((installation) => (
            <Pressable
              key={installation.id}
              style={[
                styles.installationChip,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                selectedInstallationId === installation.id && { backgroundColor: colors.successBg, borderColor: '#16a34a' },
              ]}
              onPress={() => setSelectedInstallationId(installation.id)}
            >
              <Text style={[styles.filterText, { color: selectedInstallationId === installation.id ? '#047857' : colors.textSecondary }]}>{installation.installationId}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.inputPlaceholder} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search instruments"
            placeholderTextColor={colors.inputPlaceholder}
            value={filter}
            onChangeText={setFilter}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Due List ({filteredInstruments.length})</Text>
        {filteredInstruments.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <MaterialCommunityIcons name="chart-bell-curve" size={24} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No instruments match this view.</Text>
          </View>
        ) : filteredInstruments.map((inst, index) => {
          const due = urgency(getDaysUntilDue(inst.nextDueDate));
          return (
            <Pressable key={tagOf(inst) || index} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => openDetail(inst)}>
              <View style={styles.cardHeader}>
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{tagOf(inst)}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]} numberOfLines={2}>{inst.description || inst.type || 'Instrument'}</Text>
                </View>
                <View style={[styles.urgencyBadge, { backgroundColor: due.bg }]}>
                  <Text style={[styles.urgencyText, { color: due.color }]}>{due.label}</Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>{displayInstallation(inst)}</Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>{inst.serviceLine || inst.type || '-'} • {inst.rangeMin ?? '-'}-{inst.rangeMax ?? '-'} {inst.unit ?? ''}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <InstrumentDetailModal
        instrument={selectedInst}
        history={calHistory}
        colors={colors}
        onClose={() => setSelectedInst(null)}
        onRecord={openCalForm}
      />
      <CalibrationFormModal
        visible={showCalForm}
        colors={colors}
        instrument={selectedInst}
        calForm={calForm}
        setCalForm={setCalForm}
        submitting={submitting}
        onCancel={() => setShowCalForm(false)}
        onSubmit={handleRecordCalibration}
      />
    </View>
  );
}

function StatCard({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <MaterialCommunityIcons name="chart-bell-curve" size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function InstrumentDetailModal({ instrument, history, colors, onClose, onRecord }: {
  instrument: Instrument | null;
  history: any[];
  colors: any;
  onClose: () => void;
  onRecord: () => void;
}) {
  const due = urgency(getDaysUntilDue(instrument?.nextDueDate));

  return (
    <Modal visible={Boolean(instrument)} animationType="slide">
      <View style={[styles.modalFull, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.cardBorder }]}>
          <Pressable onPress={onClose} style={[styles.closeIcon, { backgroundColor: colors.cardMuted }]}>
            <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>{instrument ? tagOf(instrument) : ''}</Text>
          <Pressable onPress={onRecord} style={[styles.closeIcon, { backgroundColor: colors.successBg }]}>
            <MaterialCommunityIcons name="clipboard-check" size={20} color="#16a34a" />
          </Pressable>
        </View>

        {instrument ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.statusPanel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.urgencyBadge, { backgroundColor: due.bg, alignSelf: 'flex-start' }]}>
                <Text style={[styles.urgencyText, { color: due.color }]}>{due.label}</Text>
              </View>
              <Text style={[styles.detailTitle, { color: colors.text }]}>{instrument.description || instrument.type || 'Instrument'}</Text>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{installationOf(instrument)}</Text>
            </View>

            <View style={[styles.detailGrid, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Detail label="Type" value={instrument.type || '-'} colors={colors} />
              <Detail label="Service" value={instrument.serviceLine || '-'} colors={colors} />
              <Detail label="Make" value={instrument.make || '-'} colors={colors} />
              <Detail label="Model" value={instrument.model || '-'} colors={colors} />
              <Detail label="Serial" value={instrument.serialNo || '-'} colors={colors} />
              <Detail label="Range" value={`${instrument.rangeMin ?? '-'} - ${instrument.rangeMax ?? '-'} ${instrument.unit ?? ''}`} colors={colors} />
              <Detail label="Frequency" value={`${instrument.calibrationFreqMonths || 12} months`} colors={colors} />
              <Detail label="Last Cal" value={instrument.lastCalibrationDate ? new Date(instrument.lastCalibrationDate).toLocaleDateString() : '-'} colors={colors} />
            </View>

            <Pressable style={styles.calButton} onPress={onRecord}>
              <MaterialCommunityIcons name="clipboard-check" size={20} color="#fff" />
              <Text style={styles.calButtonText}>Record Calibration</Text>
            </Pressable>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Calibration History ({history.length})</Text>
            {history.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No calibration history returned.</Text>
              </View>
            ) : history.map((log, index) => (
              <View key={`${log.id ?? index}`} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.resultBadge, { color: log.result === 'PASS' ? '#22c55e' : '#ef4444' }]}>{log.result || 'RESULT'}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{log.currentCalDate ? new Date(log.currentCalDate).toLocaleDateString() : '-'}</Text>
                </View>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Performed by {log.performedBy || '-'}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

function Detail({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.detailItem}>
      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function CalibrationFormModal({ visible, colors, instrument, calForm, setCalForm, submitting, onCancel, onSubmit }: {
  visible: boolean;
  colors: any;
  instrument: Instrument | null;
  calForm: Record<string, string>;
  setCalForm: (form: any) => void;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalFull, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.cardBorder }]}>
          <Pressable onPress={onCancel} style={[styles.closeIcon, { backgroundColor: colors.cardMuted }]}>
            <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Record Calibration</Text>
          <View style={styles.closeIcon} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.instTag, { color: '#16a34a' }]}>{instrument ? tagOf(instrument) : ''}</Text>
          <Text style={[styles.instDesc, { color: colors.textSecondary }]}>{instrument?.description}</Text>
          <Field label="Calibration Date" value={calForm.currentCalDate} onChangeText={(currentCalDate) => setCalForm({ ...calForm, currentCalDate })} colors={colors} />
          <Field label="Performed By" value={calForm.performedBy} onChangeText={(performedBy) => setCalForm({ ...calForm, performedBy })} colors={colors} placeholder="Technician name" />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Result</Text>
          <View style={styles.resultRow}>
            {CAL_RESULTS.map((result) => (
              <Pressable
                key={result}
                style={[
                  styles.resultBtn,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  calForm.result === result && { backgroundColor: result === 'PASS' ? '#22c55e' : '#ef4444', borderColor: result === 'PASS' ? '#22c55e' : '#ef4444' },
                ]}
                onPress={() => setCalForm({ ...calForm, result })}
              >
                <Text style={[styles.resultBtnText, { color: calForm.result === result ? '#fff' : colors.textSecondary }]}>{result}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>5-Point Check</Text>
          {[1, 2, 3, 4, 5].map((point) => (
            <View key={point} style={styles.pointRow}>
              <Field compact value={calForm[`point${point}_input`]} onChangeText={(value) => setCalForm({ ...calForm, [`point${point}_input`]: value })} colors={colors} placeholder="Input" />
              <Field compact value={calForm[`point${point}_expected`]} onChangeText={(value) => setCalForm({ ...calForm, [`point${point}_expected`]: value })} colors={colors} placeholder="Expected" />
              <Field compact value={calForm[`point${point}_actual`]} onChangeText={(value) => setCalForm({ ...calForm, [`point${point}_actual`]: value })} colors={colors} placeholder="Actual" />
            </View>
          ))}
          <Field label="Remarks" value={calForm.remarks} onChangeText={(remarks) => setCalForm({ ...calForm, remarks })} colors={colors} placeholder="Observations" multiline />
        </ScrollView>

        <View style={[styles.formActions, { backgroundColor: colors.surface, borderTopColor: colors.cardBorder }]}>
          <Pressable style={[styles.cancelBtn, { backgroundColor: colors.cardMuted }]} onPress={onCancel}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={onSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Calibration</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, value, onChangeText, colors, placeholder, compact = false, multiline = false }: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: any;
  placeholder?: string;
  compact?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={[styles.fieldWrap, compact && styles.fieldCompact]}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <TextInput
        style={[styles.input, compact && styles.pointInput, multiline && styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  statCard: { flex: 1, minHeight: 70, borderWidth: 1, borderRadius: 14, padding: 10, alignItems: 'center' },
  statIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 19, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 4 },
  scopeLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  filterRow: { gap: 8, paddingBottom: 14 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  filterActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  installationChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  filterText: { fontSize: 12, fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, minHeight: 46, fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardFooter: { marginTop: 10, gap: 4 },
  cardMeta: { fontSize: 12, marginTop: 4 },
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  urgencyText: { fontSize: 11, fontWeight: '800' },
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 20, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  modalFull: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 56, borderBottomWidth: 1 },
  closeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', marginHorizontal: 10 },
  statusPanel: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  detailTitle: { fontSize: 17, fontWeight: '800', marginTop: 10 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: 14, padding: 14 },
  detailItem: { width: '50%', marginBottom: 12, paddingRight: 8 },
  detailLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  calButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', padding: 14, borderRadius: 12, marginTop: 14, marginBottom: 16, gap: 8 },
  calButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  historyCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  resultBadge: { fontSize: 12, fontWeight: '800' },
  instTag: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  instDesc: { fontSize: 14, marginBottom: 14 },
  fieldWrap: { marginBottom: 12 },
  fieldCompact: { flex: 1, marginBottom: 0 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 46, fontSize: 14 },
  textArea: { minHeight: 82, textAlignVertical: 'top' },
  resultRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  resultBtn: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 11, alignItems: 'center' },
  resultBtnText: { fontSize: 11, fontWeight: '800' },
  pointRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pointInput: { textAlign: 'center', paddingHorizontal: 8 },
  formActions: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12 },
  cancelText: { fontSize: 14, fontWeight: '800' },
  submitBtn: { flex: 2, padding: 14, alignItems: 'center', backgroundColor: '#16a34a', borderRadius: 12 },
  submitText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
