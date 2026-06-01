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
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import api from '@/services/api';
import { canonicalServiceKey, uniqueServiceOptions } from '@/utils/serviceGroups';

type TabKey = 'dashboard' | 'daily' | 'reports';

type InstallationOption = {
  id: string;
  installationId: string;
  name?: string | null;
  type?: string | null;
};

type EnergyLog = {
  id: string;
  date: string;
  installationId: string;
  installation?: InstallationOption;
  fuelType?: string | null;
  fuelQuantity?: number | null;
  fuelUnit?: string | null;
  fuelCost?: number | null;
  electricityKwh?: number | null;
  electricityCost?: number | null;
  generatorHours?: number | null;
  remarks?: string | null;
};

type EnergyBill = {
  id: string;
  month: number;
  year: number;
  installation?: InstallationOption;
  unitsConsumed: number;
  totalAmount: number;
  status?: string;
};

const FUEL_UNITS: Record<string, string> = {
  DIESEL: 'L',
  NATURAL_GAS: 'SCM',
  LPG: 'kg',
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const formatCurrency = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Math.round(n).toLocaleString()}`;

export default function EnergyScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [dailyLogs, setDailyLogs] = useState<EnergyLog[]>([]);
  const [bills, setBills] = useState<EnergyBill[]>([]);
  const [installations, setInstallations] = useState<InstallationOption[]>([]);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [installationFilter, setInstallationFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<EnergyLog | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: todayIsoDate(),
    installationId: '',
    fuelType: '',
    fuelQuantity: '',
    fuelCost: '',
    electricityKwh: '',
    electricityCost: '',
    generatorHours: '',
    remarks: '',
  });
  const [error, setError] = useState<string | null>(null);

  const scopedParams = installationFilter !== 'all' ? `?installationId=${encodeURIComponent(installationFilter)}` : '';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, dailyRes, billsRes, installationRes] = await Promise.all([
        api.get<any>(`/energy/dashboard${scopedParams}`).catch(() => null),
        api.get<EnergyLog[]>(`/energy/daily${scopedParams}`).catch(() => []),
        api.get<EnergyBill[]>(`/energy/bills${scopedParams}`).catch(() => []),
        api.get<InstallationOption[]>('/equipment/installations').catch(() => []),
      ]);
      setDashboard(dashboardRes);
      setDailyLogs(Array.isArray(dailyRes) ? dailyRes : []);
      setBills(Array.isArray(billsRes) ? billsRes : []);
      setInstallations(Array.isArray(installationRes) ? installationRes : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load energy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [installationFilter]);

  const serviceOptions = useMemo(
    () => [{ value: 'all', label: 'All' }, ...uniqueServiceOptions(installations.map((installation) => installation.type))],
    [installations]
  );

  const installationOptions = useMemo(
    () => installations.filter((installation) => serviceFilter === 'all' || canonicalServiceKey(installation.type) === serviceFilter),
    [installations, serviceFilter]
  );

  const visibleLogs = useMemo(() => {
    if (installationFilter !== 'all') return dailyLogs;
    if (serviceFilter === 'all') return dailyLogs;
    return dailyLogs.filter((log) => canonicalServiceKey(log.installation?.type) === serviceFilter);
  }, [dailyLogs, installationFilter, serviceFilter]);

  const summary = useMemo(() => {
    const source = installationFilter === 'all' && serviceFilter !== 'all' ? visibleLogs : dashboard?.recentLogs || visibleLogs;
    const logs = Array.isArray(source) ? source : [];
    return {
      totalFuelCost: logs.reduce((sum, log) => sum + (log.fuelCost || 0), 0) || dashboard?.summary?.totalFuelCost || 0,
      totalElectricCost: logs.reduce((sum, log) => sum + (log.electricityCost || 0), 0) || dashboard?.summary?.totalElectricCost || 0,
      totalElectricKwh: logs.reduce((sum, log) => sum + (log.electricityKwh || 0), 0) || dashboard?.summary?.totalElectricKwh || 0,
      totalFuelQty: logs.reduce((sum, log) => sum + (log.fuelQuantity || 0), 0) || dashboard?.summary?.totalFuelQty || 0,
      pendingBillsCount: dashboard?.summary?.pendingBillsCount || bills.filter((bill) => bill.status === 'PENDING').length,
    };
  }, [bills, dashboard, installationFilter, serviceFilter, visibleLogs]);

  const selectService = (service: string) => {
    setServiceFilter(service);
    setInstallationFilter('all');
    setFormData((current) => ({ ...current, installationId: '' }));
  };

  const submitLog = async () => {
    if (!formData.installationId) {
      Alert.alert('Installation required', 'Select installation before saving the energy log.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/energy/daily', {
        installationId: formData.installationId,
        date: new Date(formData.date).toISOString(),
        fuelType: formData.fuelType || null,
        fuelUnit: formData.fuelType ? FUEL_UNITS[formData.fuelType] : null,
        fuelQuantity: Number(formData.fuelQuantity || 0),
        fuelCost: Number(formData.fuelCost || 0),
        electricityKwh: Number(formData.electricityKwh || 0),
        electricityCost: Number(formData.electricityCost || 0),
        generatorHours: Number(formData.generatorHours || 0),
        remarks: formData.remarks || null,
        loggedBy: 'mobile',
      });
      setShowForm(false);
      setFormData({
        date: todayIsoDate(),
        installationId: installationFilter !== 'all' ? installationFilter : '',
        fuelType: '',
        fuelQuantity: '',
        fuelCost: '',
        electricityKwh: '',
        electricityCost: '',
        generatorHours: '',
        remarks: '',
      });
      void fetchData();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unable to save energy log.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: 'Energy Management', headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="plus" size={22} color="#fff" />
        </Pressable>
      ) }} />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <View style={[styles.notice, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
            <Text style={[styles.noticeText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        <ScopeFilters
          colors={colors}
          services={serviceOptions}
          installations={installationOptions}
          serviceFilter={serviceFilter}
          installationFilter={installationFilter}
          onService={selectService}
          onInstallation={setInstallationFilter}
        />

        <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {(['dashboard', 'daily', 'reports'] as TabKey[]).map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && { backgroundColor: colors.primarySubtle }]}>
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
                {tab === 'dashboard' ? 'Dashboard' : tab === 'daily' ? 'Daily' : 'Reports'}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'dashboard' ? (
          <>
            <View style={styles.statsGrid}>
              <MetricCard label="Fuel Cost" value={formatCurrency(summary.totalFuelCost)} icon="fuel" color="#dc2626" colors={colors} />
              <MetricCard label="Electric Cost" value={formatCurrency(summary.totalElectricCost)} icon="flash" color="#0891b2" colors={colors} />
              <MetricCard label="Power Usage" value={`${(summary.totalElectricKwh / 1000).toFixed(1)} MWh`} icon="lightning-bolt" color="#2563eb" colors={colors} />
              <MetricCard label="Pending Bills" value={summary.pendingBillsCount} icon="file-clock-outline" color="#d97706" colors={colors} />
            </View>
            <SectionTitle title="Fuel Mix" colors={colors} />
            <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {Object.entries(fuelMix(visibleLogs)).length === 0 ? (
                <Text style={[styles.empty, { color: colors.textTertiary }]}>No fuel quantities in this scope.</Text>
              ) : Object.entries(fuelMix(visibleLogs)).map(([type, quantity]) => (
                <View key={type} style={[styles.listRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.listTitle, { color: colors.text }]}>{type.replace('_', ' ')}</Text>
                  <Text style={[styles.listMeta, { color: colors.textSecondary }]}>{quantity.toLocaleString()} {FUEL_UNITS[type] || ''}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {activeTab === 'daily' ? (
          <>
            <SectionTitle title="Daily Energy Logs" colors={colors} />
            {visibleLogs.length === 0 ? <Empty colors={colors} text="No daily energy logs for this scope." /> : visibleLogs.map((log) => (
              <Pressable key={log.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setSelectedLog(log)}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{log.date ? new Date(log.date).toLocaleDateString() : '-'}</Text>
                  <Text style={[styles.cardValue, { color: colors.primary }]}>{log.installation?.installationId || log.installationId}</Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Fuel {log.fuelQuantity || 0} {log.fuelUnit || ''}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{log.electricityKwh || 0} kWh</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{formatCurrency((log.fuelCost || 0) + (log.electricityCost || 0))}</Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}

        {activeTab === 'reports' ? (
          <>
            <SectionTitle title="Monthly Bills" colors={colors} />
            {bills.length === 0 ? <Empty colors={colors} text="No monthly bills returned." /> : bills.slice(0, 20).map((bill) => (
              <View key={bill.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{bill.month}/{bill.year}</Text>
                  <Text style={[styles.cardValue, { color: bill.status === 'PAID' ? colors.success : colors.warning }]}>{bill.status || 'PENDING'}</Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{bill.installation?.installationId || '-'}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{bill.unitsConsumed?.toLocaleString?.() || 0} kWh</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{formatCurrency(bill.totalAmount || 0)}</Text>
                </View>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      <EnergyLogModal
        visible={showForm}
        colors={colors}
        formData={formData}
        setFormData={setFormData}
        installations={installationOptions}
        submitting={submitting}
        onCancel={() => setShowForm(false)}
        onSubmit={submitLog}
      />
      <EnergyDetailModal log={selectedLog} colors={colors} onClose={() => setSelectedLog(null)} />
    </View>
  );
}

function fuelMix(logs: EnergyLog[]) {
  return logs.reduce<Record<string, number>>((acc, log) => {
    if (log.fuelType && log.fuelQuantity) acc[log.fuelType] = (acc[log.fuelType] || 0) + log.fuelQuantity;
    return acc;
  }, {});
}

function ScopeFilters({ colors, services, installations, serviceFilter, installationFilter, onService, onInstallation }: {
  colors: any;
  services: Array<{ value: string; label: string }>;
  installations: InstallationOption[];
  serviceFilter: string;
  installationFilter: string;
  onService: (service: string) => void;
  onInstallation: (installation: string) => void;
}) {
  return (
    <>
      <Text style={[styles.scopeLabel, { color: colors.textTertiary }]}>Service</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {services.map((service) => (
          <Pressable key={service.value} onPress={() => onService(service.value)} style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.cardBorder }, serviceFilter === service.value && { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
            <Text style={[styles.chipText, { color: serviceFilter === service.value ? colors.primary : colors.textSecondary }]}>{service.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={[styles.scopeLabel, { color: colors.textTertiary }]}>Installation</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Pressable onPress={() => onInstallation('all')} style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.cardBorder }, installationFilter === 'all' && { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
          <Text style={[styles.chipText, { color: installationFilter === 'all' ? colors.primary : colors.textSecondary }]}>All</Text>
        </Pressable>
        {installations.map((installation) => (
          <Pressable key={installation.id} onPress={() => onInstallation(installation.id)} style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.cardBorder }, installationFilter === installation.id && { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
            <Text style={[styles.chipText, { color: installationFilter === installation.id ? colors.primary : colors.textSecondary }]}>{installation.installationId}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

function MetricCard({ label, value, icon, color, colors }: { label: string; value: string | number; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; colors: any }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, colors }: { title: string; colors: any }) {
  return <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>;
}

function Empty({ colors, text }: { colors: any; text: string }) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.empty, { color: colors.textTertiary }]}>{text}</Text>
    </View>
  );
}

function EnergyLogModal({ visible, colors, formData, setFormData, installations, submitting, onCancel, onSubmit }: {
  visible: boolean;
  colors: any;
  formData: Record<string, string>;
  setFormData: (value: any) => void;
  installations: InstallationOption[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Daily Energy Log</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Date YYYY-MM-DD" placeholderTextColor={colors.inputPlaceholder} value={formData.date} onChangeText={(date) => setFormData({ ...formData, date })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {installations.map((installation) => (
              <Pressable key={installation.id} onPress={() => setFormData({ ...formData, installationId: installation.id })} style={[styles.chip, { borderColor: colors.cardBorder, backgroundColor: colors.cardMuted }, formData.installationId === installation.id && { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
                <Text style={[styles.chipText, { color: formData.installationId === installation.id ? colors.primary : colors.textSecondary }]}>{installation.installationId}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {Object.keys(FUEL_UNITS).map((fuelType) => (
              <Pressable key={fuelType} onPress={() => setFormData({ ...formData, fuelType })} style={[styles.chip, { borderColor: colors.cardBorder, backgroundColor: colors.cardMuted }, formData.fuelType === fuelType && { backgroundColor: colors.warningBg, borderColor: colors.warning }]}>
                <Text style={[styles.chipText, { color: formData.fuelType === fuelType ? colors.warning : colors.textSecondary }]}>{fuelType.replace('_', ' ')}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Fuel Qty" placeholderTextColor={colors.inputPlaceholder} keyboardType="numeric" value={formData.fuelQuantity} onChangeText={(fuelQuantity) => setFormData({ ...formData, fuelQuantity })} />
            <TextInput style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Fuel Cost" placeholderTextColor={colors.inputPlaceholder} keyboardType="numeric" value={formData.fuelCost} onChangeText={(fuelCost) => setFormData({ ...formData, fuelCost })} />
          </View>
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Electric kWh" placeholderTextColor={colors.inputPlaceholder} keyboardType="numeric" value={formData.electricityKwh} onChangeText={(electricityKwh) => setFormData({ ...formData, electricityKwh })} />
            <TextInput style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Electric Cost" placeholderTextColor={colors.inputPlaceholder} keyboardType="numeric" value={formData.electricityCost} onChangeText={(electricityCost) => setFormData({ ...formData, electricityCost })} />
          </View>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Generator Hours" placeholderTextColor={colors.inputPlaceholder} keyboardType="numeric" value={formData.generatorHours} onChangeText={(generatorHours) => setFormData({ ...formData, generatorHours })} />
          <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Remarks" placeholderTextColor={colors.inputPlaceholder} multiline value={formData.remarks} onChangeText={(remarks) => setFormData({ ...formData, remarks })} />
          <View style={styles.modalActions}>
            <Pressable onPress={onCancel}><Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text></Pressable>
            <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.55 }]} disabled={submitting} onPress={onSubmit}>
              <Text style={styles.submitText}>{submitting ? 'Saving' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EnergyDetailModal({ log, colors, onClose }: { log: EnergyLog | null; colors: any; onClose: () => void }) {
  return (
    <Modal visible={Boolean(log)} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Energy Log</Text>
          {[
            ['Installation', log?.installation?.installationId || log?.installationId || '-'],
            ['Date', log?.date ? new Date(log.date).toLocaleDateString() : '-'],
            ['Fuel', `${log?.fuelQuantity || 0} ${log?.fuelUnit || ''} ${log?.fuelType || ''}`.trim()],
            ['Fuel Cost', formatCurrency(log?.fuelCost || 0)],
            ['Electricity', `${log?.electricityKwh || 0} kWh`],
            ['Electricity Cost', formatCurrency(log?.electricityCost || 0)],
            ['Generator Hours', `${log?.generatorHours || 0}`],
          ].map(([label, value]) => (
            <View key={label} style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{label}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
            </View>
          ))}
          {log?.remarks ? <Text style={[styles.remarks, { color: colors.textSecondary }]}>{log.remarks}</Text> : null}
          <Pressable style={[styles.closeBtn, { backgroundColor: colors.primary }]} onPress={onClose}><Text style={styles.submitText}>Close</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBtn: { padding: 8, borderRadius: 10, marginRight: 8 },
  notice: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  noticeText: { fontSize: 12, fontWeight: '700' },
  scopeLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  chipRow: { gap: 8, paddingBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: '800' },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 4, marginBottom: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabText: { fontSize: 12, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  metricCard: { width: '48.5%', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  metricValue: { fontSize: 20, fontWeight: '900', marginTop: 10 },
  metricLabel: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginTop: 8, marginBottom: 10 },
  panel: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  listRow: { minHeight: 54, borderBottomWidth: 1, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { fontSize: 13, fontWeight: '800' },
  listMeta: { fontSize: 12, fontWeight: '700' },
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 18 },
  empty: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '900' },
  cardValue: { fontSize: 13, fontWeight: '900' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 10 },
  cardMeta: { flex: 1, fontSize: 11, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '88%' },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 14 },
  input: { borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 14, marginBottom: 10 },
  textArea: { minHeight: 78, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 },
  cancelText: { padding: 12, fontSize: 14, fontWeight: '800' },
  submitBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 10 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  detailRow: { borderBottomWidth: 1, paddingVertical: 10 },
  detailLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  detailValue: { fontSize: 14, fontWeight: '800', marginTop: 3 },
  remarks: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  closeBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 12, marginTop: 16 },
});
