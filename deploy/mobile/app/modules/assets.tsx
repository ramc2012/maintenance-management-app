import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { disciplineToLabel, type Discipline } from '@/utils/workspace';
import { canonicalServiceKey, displayService, uniqueServiceOptions } from '@/utils/serviceGroups';
import { useTheme } from '@/context/ThemeContext';

const ASSET_CLASSES = ['MOTOR', 'PUMP', 'COMPRESSOR', 'INSTRUMENT', 'VALVE', 'TANK', 'OTHER'];
const ASSET_STATUS = ['IN_STORE', 'INSTALLED', 'REPAIR', 'SCRAPPED'];
const STATUS_COLORS: Record<string, string> = { IN_STORE: '#3b82f6', INSTALLED: '#22c55e', REPAIR: '#eab308', SCRAPPED: '#ef4444' };
const DISCIPLINES: Discipline[] = ['MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION'];

interface Asset {
  id: string; assetCode: string; serialNumber?: string; manufacturer?: string;
  model?: string; modelYear?: number; assetClass: string; status: string;
  installationId?: string;
  installation?: InstallationOption;
  specifications?: any; currentFlId?: string; createdAt: string;
  installations?: Array<{ functionalLocation?: { flId?: string }; installDate?: string; removalDate?: string | null }>;
  currentFl?: { flId?: string } | null;
}

type InstallationOption = {
  id: string;
  installationId: string;
  name?: string | null;
  type?: string | null;
};

type MaintenanceLog = {
  id: string;
  date: string;
  installationId: string;
  installation?: InstallationOption;
  department?: string;
  section?: string;
  jobType?: string;
  status?: string;
  equipmentTag?: string | null;
  equipmentTypeName?: string | null;
  notificationNo?: string | null;
  description?: string;
  durationHours?: number;
  remarks?: string | null;
  teamMembers?: Array<{ manpower?: { name?: string } }>;
}

type DropdownOption = {
  value: string;
  label: string;
  description?: string;
};

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDisciplineParam(value: string | string[] | undefined): Discipline | null {
  const raw = normalizeParam(value)?.toUpperCase();
  return DISCIPLINES.includes(raw as Discipline) ? (raw as Discipline) : null;
}

function isInstrumentAsset(asset: Asset) {
  return String(asset.assetClass || '').toUpperCase() === 'INSTRUMENT';
}

export default function AssetsScreen() {
  const params = useLocalSearchParams();
  const discipline = parseDisciplineParam(params.discipline);
  const { theme } = useTheme();
  const { colors } = theme;
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [installations, setInstallations] = useState<InstallationOption[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [installationFilter, setInstallationFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);

  // Full form fields
  const [formData, setFormData] = useState({
    assetCode: '', serialNumber: '', manufacturer: '', model: '',
    modelYear: '', assetClass: 'MOTOR', status: 'IN_STORE',
    // Specifications (dynamic based on class)
    voltage: '', power: '', rpm: '', head: '', flowRate: '', capacity: ''
  });

  useEffect(() => { fetchData(); }, [discipline]);

  const scopedEndpoint = (endpoint: string) => {
    if (!discipline) return endpoint;
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${separator}discipline=${encodeURIComponent(discipline)}`;
  };

  const fetchData = async () => {
    try {
      const [res, runningRes, installationRes, maintenanceRes] = await Promise.all([
        api.get<Asset[]>('/assets').catch(() => []),
        api.get<any[]>(scopedEndpoint('/equipment/running-equip')).catch(() => []),
        api.get<InstallationOption[]>(scopedEndpoint('/equipment/installations')).catch(() => []),
        api.get<MaintenanceLog[]>(scopedEndpoint('/maintenance/logs')).catch(() => []),
      ]);
      const registryAssets = (Array.isArray(res) ? res : []);
      const runningAssets = (Array.isArray(runningRes) ? runningRes : []).map(eq => ({
        id: eq.equipmentTag,
        assetCode: eq.equipmentTag,
        serialNumber: eq.specifications?.serialNumber,
        manufacturer: eq.make,
        model: eq.model,
        assetClass: eq.equipmentTypeName || eq.category || 'RUNNING',
        status: 'INSTALLED',
        specifications: eq.specifications,
        installationId: eq.installationId,
        installation: eq.installation,
        createdAt: eq.createdAt,
      }));
      const merged = new Map<string, Asset>();
      [...registryAssets, ...runningAssets].forEach((asset) => {
        if (asset?.assetCode) merged.set(asset.assetCode, asset);
      });
      setAssets(Array.from(merged.values()));
      setInstallations(Array.isArray(installationRes) ? installationRes : []);
      setMaintenanceLogs(Array.isArray(maintenanceRes) ? maintenanceRes : []);
    } catch (e: any) {
      // Fallback
      try {
        const [res, installationRes, maintenanceRes] = await Promise.all([
          api.get<any[]>(scopedEndpoint('/equipment/running')),
          api.get<InstallationOption[]>(scopedEndpoint('/equipment/installations')).catch(() => []),
          api.get<MaintenanceLog[]>(scopedEndpoint('/maintenance/logs')).catch(() => []),
        ]);
        setAssets(res?.map(eq => ({
          id: eq.equipmentTag, assetCode: eq.equipmentTag, serialNumber: eq.serialNo,
          manufacturer: eq.make, model: eq.model, assetClass: eq.category || 'OTHER',
          status: eq.status || 'INSTALLED', specifications: eq.specifications, installationId: eq.installationId, installation: eq.installation, createdAt: eq.createdAt
        })) || []);
        setInstallations(Array.isArray(installationRes) ? installationRes : []);
        setMaintenanceLogs(Array.isArray(maintenanceRes) ? maintenanceRes : []);
      } catch { setError(e.message); }
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formData.assetCode.trim()) { Alert.alert('Error', 'Asset Code is required'); return; }
    setSubmitting(true);
    try {
      const specs: any = {};
      if (formData.voltage) specs.voltage = formData.voltage;
      if (formData.power) specs.power = parseFloat(formData.power);
      if (formData.rpm) specs.rpm = parseInt(formData.rpm);
      if (formData.head) specs.head = parseFloat(formData.head);
      if (formData.flowRate) specs.flowRate = parseFloat(formData.flowRate);
      if (formData.capacity) specs.capacity = parseFloat(formData.capacity);

      await api.post('/assets', {
        assetCode: formData.assetCode,
        serialNumber: formData.serialNumber || null,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        modelYear: formData.modelYear ? parseInt(formData.modelYear) : null,
        assetClass: formData.assetClass,
        status: formData.status,
        specifications: Object.keys(specs).length > 0 ? specs : null
      });
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSubmitting(false); }
  };

  const openDetail = async (asset: Asset) => {
    setSelectedAsset(asset);
    setShowDetail(true);
    try {
      const history = await api.get<any[]>(`/assets/${asset.id}/history`);
      setAssetHistory(history || []);
    } catch { setAssetHistory([]); }
  };

  const closeDetail = () => {
    setShowDetail(false);
  };

  const clearDetail = () => {
    setSelectedAsset(null);
    setAssetHistory([]);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedAsset) return;
    try {
      await api.patch(`/assets/${selectedAsset.id}`, { status: newStatus });
      setSelectedAsset({ ...selectedAsset, status: newStatus });
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const resetForm = () => {
    setFormData({
      assetCode: '', serialNumber: '', manufacturer: '', model: '',
      modelYear: '', assetClass: 'MOTOR', status: 'IN_STORE',
      voltage: '', power: '', rpm: '', head: '', flowRate: '', capacity: ''
    });
  };

  const disciplineAssets = useMemo(() => assets.filter((asset) => {
    if (discipline === 'INSTRUMENTATION') {
      return isInstrumentAsset(asset);
    }
    if (discipline === 'MECHANICAL' || discipline === 'ELECTRICAL') {
      return !isInstrumentAsset(asset);
    }
    return true;
  }), [assets, discipline]);

  const historyAssets = useMemo(() => {
    const byCode = new Map<string, Asset>();
    disciplineAssets.forEach((asset) => byCode.set(asset.assetCode, asset));
    maintenanceLogs.forEach((log) => {
      const tag = log.equipmentTag?.trim();
      if (!tag || byCode.has(tag)) return;
      byCode.set(tag, {
        id: `maintenance-${tag}`,
        assetCode: tag,
        assetClass: log.equipmentTypeName || 'EQUIPMENT',
        status: log.status === 'Closed' ? 'INSTALLED' : 'REPAIR',
        manufacturer: log.section || log.department || undefined,
        model: log.notificationNo || undefined,
        createdAt: log.date,
      });
    });
    return Array.from(byCode.values()).sort((left, right) => left.assetCode.localeCompare(right.assetCode));
  }, [disciplineAssets, maintenanceLogs]);

  const installationLookup = useMemo(() => {
    const map = new Map<string, InstallationOption>();
    installations.forEach((installation) => {
      map.set(installation.id, installation);
      map.set(installation.installationId, installation);
    });
    return map;
  }, [installations]);

  const logsByEquipment = useMemo(() => {
    const map = new Map<string, MaintenanceLog[]>();
    maintenanceLogs.forEach((log) => {
      const tag = log.equipmentTag?.trim();
      if (!tag) return;
      map.set(tag, [...(map.get(tag) ?? []), log]);
    });
    return map;
  }, [maintenanceLogs]);

  const serviceOptions = useMemo<DropdownOption[]>(
    () => [{ value: 'all', label: 'All' }, ...uniqueServiceOptions(installations.map((installation) => installation.type))],
    [installations]
  );

  const installationOptions = useMemo(
    () => installations.filter((installation) => serviceFilter === 'all' || canonicalServiceKey(installation.type) === serviceFilter),
    [installations, serviceFilter]
  );

  const installationDropdownOptions = useMemo<DropdownOption[]>(
    () => [
      { value: 'all', label: 'All' },
      ...installationOptions.map((installation) => ({
        value: installation.id,
        label: installation.installationId,
        description: displayService(installation.type),
      })),
    ],
    [installationOptions]
  );

  const maintenanceForAsset = (asset: Asset) =>
    (logsByEquipment.get(asset.assetCode) ?? []).sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

  const assetInstallationIds = (asset: Asset, logs: MaintenanceLog[]) => {
    const ids = new Set<string>();
    logs.forEach((log) => {
      if (log.installationId) ids.add(log.installationId);
      if (log.installation?.installationId) ids.add(log.installation.installationId);
    });
    if (asset.installationId) ids.add(asset.installationId);
    if (asset.installation?.id) ids.add(asset.installation.id);
    if (asset.installation?.installationId) ids.add(asset.installation.installationId);
    return ids;
  };

  const scopedAssets = historyAssets.filter(a => {
    const matchesSearch = a.assetCode?.toLowerCase().includes(filter.toLowerCase()) ||
      a.manufacturer?.toLowerCase().includes(filter.toLowerCase()) ||
      a.model?.toLowerCase().includes(filter.toLowerCase());
    const logs = maintenanceForAsset(a);
    const scopedInstallations = assetInstallationIds(a, logs);
    const matchesInstallation = installationFilter === 'all' || scopedInstallations.has(installationFilter);
    const assetInstallation = a.installationId ? installationLookup.get(a.installationId) : a.installation;
    const matchesService = serviceFilter === 'all' || canonicalServiceKey(assetInstallation?.type) === serviceFilter || logs.some((log) => {
      const installation = installationLookup.get(log.installationId) || (log.installation?.installationId ? installationLookup.get(log.installation.installationId) : undefined);
      return canonicalServiceKey(installation?.type || log.department) === serviceFilter;
    });
    return matchesSearch &&
      matchesService &&
      matchesInstallation &&
      (!classFilter || a.assetClass === classFilter) && 
      (!statusFilter || a.status === statusFilter);
  });

  const equipmentOptions = useMemo<DropdownOption[]>(
    () => [
      { value: 'all', label: 'All' },
      ...scopedAssets.map((asset) => ({
        value: asset.assetCode,
        label: asset.assetCode,
        description: `${asset.assetClass || 'Equipment'} · ${maintenanceForAsset(asset).length} logs`,
      })),
    ],
    [scopedAssets, maintenanceLogs]
  );

  const filteredAssets = scopedAssets.filter((asset) => equipmentFilter === 'all' || asset.assetCode === equipmentFilter);

  const stats = {
    total: historyAssets.length,
    installed: historyAssets.filter(a => a.status === 'INSTALLED').length,
    inStore: historyAssets.filter(a => a.status === 'IN_STORE').length,
    repair: historyAssets.filter(a => a.status === 'REPAIR').length
  };

  const selectedLogs = selectedAsset ? maintenanceForAsset(selectedAsset) : [];

  if (loading) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (error) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><Text style={[styles.error, { color: colors.error }]}>Error: {error}</Text></View>;

  const getSpecFields = () => {
    switch (formData.assetClass) {
      case 'MOTOR': return ['voltage', 'power', 'rpm'];
      case 'PUMP': return ['power', 'head', 'flowRate'];
      case 'COMPRESSOR': return ['power', 'capacity'];
      case 'TANK': return ['capacity'];
      default: return [];
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: discipline ? `${disciplineToLabel(discipline)} Maintenance History` : 'Maintenance History', headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </Pressable>
      )}} />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}><Text style={[styles.statValue, {color:'#22c55e'}]}>{stats.installed}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Installed</Text></View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}><Text style={[styles.statValue, {color:'#3b82f6'}]}>{stats.inStore}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Store</Text></View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}><Text style={[styles.statValue, {color:'#eab308'}]}>{stats.repair}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Repair</Text></View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}><Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text></View>
        </View>

        {/* Filters */}
        <Dropdown
          label="Service"
          value={serviceFilter}
          options={serviceOptions}
          placeholder="Select service"
          onChange={(service) => {
            setServiceFilter(service);
            setInstallationFilter('all');
            setEquipmentFilter('all');
          }}
        />
        <Dropdown
          label="Installation"
          value={installationFilter}
          options={installationDropdownOptions}
          placeholder={serviceFilter === 'all' ? 'All installations' : 'Select installation'}
          onChange={(installation) => {
            setInstallationFilter(installation);
            setEquipmentFilter('all');
          }}
        />
        <Dropdown
          label="Equipment"
          value={equipmentFilter}
          options={equipmentOptions}
          placeholder={installationFilter === 'all' ? 'All equipment in scope' : 'Select equipment'}
          onChange={setEquipmentFilter}
        />

        <Text style={[styles.scopeLabel, { color: colors.textTertiary }]}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {ASSET_STATUS.map(s => (
            <Pressable key={s} style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }, statusFilter === s && {backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s]}]} onPress={() => setStatusFilter(statusFilter === s ? null : s)}>
              <Text style={[styles.filterText, { color: colors.textSecondary }, statusFilter === s && {color: '#fff'}]}>{s.replace('_', ' ')}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search equipment..." placeholderTextColor={colors.inputPlaceholder} value={filter} onChangeText={setFilter} />
        </View>

        {/* Asset List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment Maintenance History ({filteredAssets.length})</Text>
        {filteredAssets.slice(0, 30).map((asset, i) => (
          <Pressable key={asset.id || i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => openDetail(asset)}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.primary }]}>{asset.assetCode}</Text>
              <View style={[styles.statusBadge, {backgroundColor: STATUS_COLORS[asset.status] || '#94a3b8'}]}>
                <Text style={styles.statusText}>{asset.status?.replace('_', ' ')}</Text>
              </View>
            </View>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{asset.assetClass} • {asset.manufacturer || 'Unknown'}</Text>
            <View style={styles.cardFooter}>
              <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>{maintenanceForAsset(asset).length} maintenance logs</Text>
              <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>{asset.model || asset.serialNumber || '-'}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* CREATE ASSET MODAL */}
      <Modal visible={showForm} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowForm(false)}><MaterialCommunityIcons name="close" size={24} color="#64748b" /></Pressable>
            <Text style={styles.modalTitle}>Create New Asset</Text>
            <View style={{width: 24}} />
          </View>
          
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Text style={styles.label}>Asset Code *</Text>
            <TextInput style={styles.input} placeholder="AST-001" value={formData.assetCode} onChangeText={t => setFormData({...formData, assetCode: t})} />

            <Text style={styles.label}>Asset Class *</Text>
            <View style={styles.chipRow}>
              {ASSET_CLASSES.map(c => (
                <Pressable key={c} style={[styles.classChip, formData.assetClass === c && styles.classActive]} onPress={() => setFormData({...formData, assetClass: c})}>
                  <Text style={[styles.classText, formData.assetClass === c && {color: '#fff'}]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Status *</Text>
            <View style={styles.chipRow}>
              {ASSET_STATUS.map(s => (
                <Pressable key={s} style={[styles.classChip, formData.status === s && {backgroundColor: STATUS_COLORS[s]}]} onPress={() => setFormData({...formData, status: s})}>
                  <Text style={[styles.classText, formData.status === s && {color: '#fff'}]}>{s.replace('_', ' ')}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.row}>
              <View style={styles.halfCol}><Text style={styles.label}>Manufacturer</Text><TextInput style={styles.input} value={formData.manufacturer} onChangeText={t => setFormData({...formData, manufacturer: t})} /></View>
              <View style={styles.halfCol}><Text style={styles.label}>Model</Text><TextInput style={styles.input} value={formData.model} onChangeText={t => setFormData({...formData, model: t})} /></View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfCol}><Text style={styles.label}>Serial Number</Text><TextInput style={styles.input} value={formData.serialNumber} onChangeText={t => setFormData({...formData, serialNumber: t})} /></View>
              <View style={styles.halfCol}><Text style={styles.label}>Model Year</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.modelYear} onChangeText={t => setFormData({...formData, modelYear: t})} /></View>
            </View>

            {/* Dynamic Specifications */}
            {getSpecFields().length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Specifications</Text>
                <View style={styles.row}>
                  {getSpecFields().includes('voltage') && <View style={styles.halfCol}><Text style={styles.label}>Voltage (V)</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.voltage} onChangeText={t => setFormData({...formData, voltage: t})} /></View>}
                  {getSpecFields().includes('power') && <View style={styles.halfCol}><Text style={styles.label}>Power (kW)</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.power} onChangeText={t => setFormData({...formData, power: t})} /></View>}
                </View>
                <View style={styles.row}>
                  {getSpecFields().includes('rpm') && <View style={styles.halfCol}><Text style={styles.label}>RPM</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.rpm} onChangeText={t => setFormData({...formData, rpm: t})} /></View>}
                  {getSpecFields().includes('head') && <View style={styles.halfCol}><Text style={styles.label}>Head (m)</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.head} onChangeText={t => setFormData({...formData, head: t})} /></View>}
                </View>
                <View style={styles.row}>
                  {getSpecFields().includes('flowRate') && <View style={styles.halfCol}><Text style={styles.label}>Flow Rate (m³/h)</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.flowRate} onChangeText={t => setFormData({...formData, flowRate: t})} /></View>}
                  {getSpecFields().includes('capacity') && <View style={styles.halfCol}><Text style={styles.label}>Capacity</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.capacity} onChangeText={t => setFormData({...formData, capacity: t})} /></View>}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.formActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setShowForm(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={[styles.submitBtn, submitting && {opacity: 0.5}]} onPress={handleCreate} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Asset</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ASSET DETAIL MODAL */}
      <Modal visible={showDetail} animationType="slide" onRequestClose={closeDetail} onDismiss={clearDetail}>
        <SafeAreaView style={[styles.modalFull, { backgroundColor: colors.backgroundSecondary }]} edges={['top', 'left', 'right']}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.cardBorder }]}>
            <Pressable
              onPress={closeDetail}
              onPressIn={closeDetail}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel="Close asset detail"
              testID="asset-detail-close"
              style={[styles.modalCloseButton, { backgroundColor: colors.cardMuted }]}
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedAsset?.assetCode}</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          {selectedAsset && (
            <>
              <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
                <View style={styles.detailHeader}>
                  <View style={[styles.statusBadge, {backgroundColor: STATUS_COLORS[selectedAsset.status]}]}>
                    <Text style={styles.statusText}>{selectedAsset.status?.replace('_', ' ')}</Text>
                  </View>
                  <Text style={styles.classText}>{selectedAsset.assetClass}</Text>
                </View>

                {/* Update Status */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>Update Status</Text>
                <View style={styles.chipRow}>
                  {ASSET_STATUS.map(s => (
                    <Pressable key={s} style={[styles.classChip, { backgroundColor: colors.cardMuted }, selectedAsset.status === s && {backgroundColor: STATUS_COLORS[s]}]} onPress={() => handleUpdateStatus(s)}>
                      <Text style={[styles.classText, { color: colors.textSecondary }, selectedAsset.status === s && {color: '#fff'}]}>{s.replace('_', ' ')}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Details Grid */}
                <View style={[styles.detailGrid, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Manufacturer</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selectedAsset.manufacturer || '-'}</Text></View>
                  <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Model</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selectedAsset.model || '-'}</Text></View>
                  <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Serial Number</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selectedAsset.serialNumber || '-'}</Text></View>
                  <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Model Year</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selectedAsset.modelYear || '-'}</Text></View>
                </View>

                {/* Specifications */}
                {selectedAsset.specifications && (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Specifications</Text>
                    <View style={[styles.specGrid, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      {Object.entries(selectedAsset.specifications).map(([key, val]) => (
                        <View key={key} style={styles.specItem}>
                          <Text style={[styles.specLabel, { color: colors.textTertiary }]}>{key}</Text>
                          <Text style={[styles.specValue, { color: colors.text }]}>{String(val)}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Maintenance History ({selectedLogs.length})</Text>
                {selectedLogs.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No daily report or closed work order history for this equipment.</Text>
                ) : (
                  selectedLogs.map((log, i) => {
                    const installation = installationLookup.get(log.installationId) || log.installation;
                    const team = log.teamMembers?.map((member) => member.manpower?.name).filter(Boolean).join(', ');
                    return (
                    <View key={log.id || i} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <View style={styles.cardHeader}>
                        <Text style={[styles.historyLocation, { color: colors.primary }]}>{log.notificationNo || log.jobType || 'Daily report'}</Text>
                        <Text style={[styles.historyDate, { color: colors.textTertiary }]}>{log.date ? new Date(log.date).toLocaleDateString() : '-'}</Text>
                      </View>
                      <Text style={[styles.historyDescription, { color: colors.text }]}>{log.description || 'Maintenance activity'}</Text>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                        {displayService(installation?.type || log.department)} • {installation?.installationId || log.installationId} • {log.status || '-'}
                      </Text>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                        {log.durationHours ?? 0} hrs{team ? ` • ${team}` : ''}
                      </Text>
                      {log.remarks ? <Text style={[styles.historyRemarks, { color: colors.textSecondary }]}>{log.remarks}</Text> : null}
                    </View>
                    );
                  })
                )}
              </ScrollView>
              <View style={[styles.detailFooter, { backgroundColor: colors.surface, borderTopColor: colors.cardBorder }]}>
                <Pressable style={[styles.detailFooterButton, { backgroundColor: colors.primary }]} onPress={closeDetail}>
                  <Text style={styles.detailFooterText}>Close</Text>
                </Pressable>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function Dropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        style={[styles.dropdownButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
        onPress={() => setOpen(true)}
      >
        <View style={styles.dropdownCopy}>
          <Text style={[styles.dropdownValue, { color: colors.text }, !selected && { color: colors.inputPlaceholder }]} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Text>
          {selected?.description ? <Text style={[styles.dropdownDescription, { color: colors.textSecondary }]} numberOfLines={1}>{selected.description}</Text> : null}
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
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
                  key={option.value}
                  style={[styles.dropdownOption, option.value === value && { backgroundColor: colors.primarySubtle }]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <View style={styles.dropdownCopy}>
                    <Text style={[styles.dropdownOptionText, { color: colors.text }]}>{option.label}</Text>
                    {option.description ? <Text style={[styles.dropdownDescription, { color: colors.textSecondary }]}>{option.description}</Text> : null}
                  </View>
                  {option.value === value ? <MaterialCommunityIcons name="check" size={18} color={colors.primary} /> : null}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#ef4444' },
  addBtn: { backgroundColor: '#2563eb', padding: 8, borderRadius: 8, marginRight: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center', marginHorizontal: 2 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 10, color: '#64748b' },
  filterScroll: { marginBottom: 12 },
  scopeLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  dropdownButton: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dropdownCopy: { flex: 1, minWidth: 0 },
  dropdownValue: { fontSize: 14, fontWeight: '800' },
  dropdownDescription: { fontSize: 12, marginTop: 3 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  dropdownModal: { maxHeight: '72%', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14 },
  dropdownModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  dropdownModalTitle: { fontSize: 16, fontWeight: '900' },
  dropdownClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dropdownList: { paddingHorizontal: 12, paddingVertical: 8 },
  dropdownOption: { minHeight: 52, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dropdownOptionText: { fontSize: 14, fontWeight: '800' },
  dropdownEmpty: { padding: 16, textAlign: 'center' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, marginRight: 8 },
  filterText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12, marginTop: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  cardMeta: { fontSize: 11, color: '#94a3b8' },
  modalFull: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalCloseButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', zIndex: 10, elevation: 3 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  headerSpacer: { width: 44, height: 44 },
  formScroll: { flex: 1 },
  formContent: { padding: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 14, color: '#0f172a' },
  row: { flexDirection: 'row', gap: 12 },
  halfCol: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  classChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  classActive: { backgroundColor: '#2563eb' },
  classText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  formActions: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12 },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  submitBtn: { flex: 2, padding: 14, alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 12 },
  submitText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  detailFooter: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  detailFooterButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 12, backgroundColor: '#0f172a' },
  detailFooterText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: 12, padding: 12 },
  detailItem: { width: '50%', marginBottom: 12 },
  detailLabel: { fontSize: 11, color: '#94a3b8' },
  detailValue: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: 12, padding: 12 },
  specItem: { width: '50%', marginBottom: 8 },
  specLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'capitalize' },
  specValue: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 12 },
  historyCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  historyLocation: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  historyDate: { fontSize: 11, color: '#64748b', marginTop: 4 },
  historyDescription: { fontSize: 13, fontWeight: '700', marginTop: 8, lineHeight: 18 },
  historyRemarks: { fontSize: 12, marginTop: 8, lineHeight: 18 },
});
