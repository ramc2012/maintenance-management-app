import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';

const ASSET_CLASSES = ['MOTOR', 'PUMP', 'COMPRESSOR', 'INSTRUMENT', 'VALVE', 'TANK', 'OTHER'];
const ASSET_STATUS = ['IN_STORE', 'INSTALLED', 'REPAIR', 'SCRAPPED'];
const STATUS_COLORS: Record<string, string> = { IN_STORE: '#3b82f6', INSTALLED: '#22c55e', REPAIR: '#eab308', SCRAPPED: '#ef4444' };

interface Asset {
  id: string; assetCode: string; serialNumber?: string; manufacturer?: string;
  model?: string; modelYear?: number; assetClass: string; status: string;
  specifications?: any; currentFlId?: string; createdAt: string;
}

export default function AssetsScreen() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api.get<Asset[]>('/assets');
      setAssets(res || []);
    } catch (e: any) {
      // Fallback
      try {
        const res = await api.get<any[]>('/equipment/running');
        setAssets(res?.map(eq => ({
          id: eq.equipmentTag, assetCode: eq.equipmentTag, serialNumber: eq.serialNo,
          manufacturer: eq.make, model: eq.model, assetClass: eq.category || 'OTHER',
          status: eq.status || 'INSTALLED', specifications: eq.specifications, createdAt: eq.createdAt
        })) || []);
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

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.assetCode?.toLowerCase().includes(filter.toLowerCase()) ||
      a.manufacturer?.toLowerCase().includes(filter.toLowerCase()) ||
      a.model?.toLowerCase().includes(filter.toLowerCase());
    return matchesSearch && 
      (!classFilter || a.assetClass === classFilter) && 
      (!statusFilter || a.status === statusFilter);
  });

  const stats = {
    total: assets.length,
    installed: assets.filter(a => a.status === 'INSTALLED').length,
    inStore: assets.filter(a => a.status === 'IN_STORE').length,
    repair: assets.filter(a => a.status === 'REPAIR').length
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>Error: {error}</Text></View>;

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
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Asset Master', headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </Pressable>
      )}} />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#22c55e'}]}>{stats.installed}</Text><Text style={styles.statLabel}>Installed</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#3b82f6'}]}>{stats.inStore}</Text><Text style={styles.statLabel}>In Store</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#eab308'}]}>{stats.repair}</Text><Text style={styles.statLabel}>Repair</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.total}</Text><Text style={styles.statLabel}>Total</Text></View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {ASSET_STATUS.map(s => (
            <Pressable key={s} style={[styles.filterChip, statusFilter === s && {backgroundColor: STATUS_COLORS[s]}]} onPress={() => setStatusFilter(statusFilter === s ? null : s)}>
              <Text style={[styles.filterText, statusFilter === s && {color: '#fff'}]}>{s.replace('_', ' ')}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
          <TextInput style={styles.searchInput} placeholder="Search assets..." value={filter} onChangeText={setFilter} />
        </View>

        {/* Asset List */}
        <Text style={styles.sectionTitle}>Assets ({filteredAssets.length})</Text>
        {filteredAssets.slice(0, 30).map((asset, i) => (
          <Pressable key={asset.id || i} style={styles.card} onPress={() => openDetail(asset)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{asset.assetCode}</Text>
              <View style={[styles.statusBadge, {backgroundColor: STATUS_COLORS[asset.status] || '#94a3b8'}]}>
                <Text style={styles.statusText}>{asset.status?.replace('_', ' ')}</Text>
              </View>
            </View>
            <Text style={styles.cardSub}>{asset.assetClass} • {asset.manufacturer || 'Unknown'}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardMeta}>{asset.model || '-'}</Text>
              <Text style={styles.cardMeta}>{asset.serialNumber || '-'}</Text>
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
      <Modal visible={showDetail && !!selectedAsset} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setShowDetail(false); setSelectedAsset(null); }}><MaterialCommunityIcons name="close" size={24} color="#64748b" /></Pressable>
            <Text style={styles.modalTitle}>{selectedAsset?.assetCode}</Text>
            <View style={{width: 24}} />
          </View>
          
          {selectedAsset && (
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
              <View style={styles.detailHeader}>
                <View style={[styles.statusBadge, {backgroundColor: STATUS_COLORS[selectedAsset.status]}]}>
                  <Text style={styles.statusText}>{selectedAsset.status?.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.classText}>{selectedAsset.assetClass}</Text>
              </View>

              {/* Update Status */}
              <Text style={styles.label}>Update Status</Text>
              <View style={styles.chipRow}>
                {ASSET_STATUS.map(s => (
                  <Pressable key={s} style={[styles.classChip, selectedAsset.status === s && {backgroundColor: STATUS_COLORS[s]}]} onPress={() => handleUpdateStatus(s)}>
                    <Text style={[styles.classText, selectedAsset.status === s && {color: '#fff'}]}>{s.replace('_', ' ')}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Details Grid */}
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Manufacturer</Text><Text style={styles.detailValue}>{selectedAsset.manufacturer || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Model</Text><Text style={styles.detailValue}>{selectedAsset.model || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Serial Number</Text><Text style={styles.detailValue}>{selectedAsset.serialNumber || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Model Year</Text><Text style={styles.detailValue}>{selectedAsset.modelYear || '-'}</Text></View>
              </View>

              {/* Specifications */}
              {selectedAsset.specifications && (
                <>
                  <Text style={styles.sectionTitle}>Specifications</Text>
                  <View style={styles.specGrid}>
                    {Object.entries(selectedAsset.specifications).map(([key, val]) => (
                      <View key={key} style={styles.specItem}>
                        <Text style={styles.specLabel}>{key}</Text>
                        <Text style={styles.specValue}>{String(val)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Installation History */}
              <Text style={styles.sectionTitle}>Installation History ({assetHistory.length})</Text>
              {assetHistory.length === 0 ? (
                <Text style={styles.emptyText}>No installation history</Text>
              ) : (
                assetHistory.map((h, i) => (
                  <View key={i} style={styles.historyCard}>
                    <Text style={styles.historyLocation}>{h.functionalLocation?.flId || h.flId}</Text>
                    <Text style={styles.historyDate}>Installed: {new Date(h.installDate).toLocaleDateString()}</Text>
                    {h.removalDate && <Text style={styles.historyDate}>Removed: {new Date(h.removalDate).toLocaleDateString()}</Text>}
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
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
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', marginHorizontal: 2 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 10, color: '#64748b' },
  filterScroll: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#f1f5f9', marginRight: 8 },
  filterText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  cardMeta: { fontSize: 11, color: '#94a3b8' },
  modalFull: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
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
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  detailItem: { width: '50%', marginBottom: 12 },
  detailLabel: { fontSize: 11, color: '#94a3b8' },
  detailValue: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  specItem: { width: '50%', marginBottom: 8 },
  specLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'capitalize' },
  specValue: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 12 },
  historyCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  historyLocation: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  historyDate: { fontSize: 11, color: '#64748b', marginTop: 4 },
});
