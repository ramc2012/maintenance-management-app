import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';

export default function EnergyScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ fuelCost: '', electricityKwh: '', electricityCost: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/energy/dashboard');
      setData(res);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/energy/logs', {
        ...formData,
        fuelCost: parseFloat(formData.fuelCost) || 0,
        electricityKwh: parseFloat(formData.electricityKwh) || 0,
        electricityCost: parseFloat(formData.electricityCost) || 0,
      });
      setShowForm(false);
      setFormData({ fuelCost: '', electricityKwh: '', electricityCost: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (e: any) { alert('Failed to add log: ' + e.message); } finally { setSubmitting(false); }
  };

  const formatCurrency = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${n.toLocaleString()}`;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>Error: {error}</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Energy', headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </Pressable>
      )}} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Last 30 Days Summary</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, {backgroundColor:'#fef2f2'}]}><Text style={styles.statValue}>{formatCurrency(data?.summary?.totalFuelCost || 0)}</Text><Text style={styles.statLabel}>Fuel Cost</Text></View>
          <View style={[styles.statCard, {backgroundColor:'#fefce8'}]}><Text style={styles.statValue}>{formatCurrency(data?.summary?.totalElectricCost || 0)}</Text><Text style={styles.statLabel}>Electricity</Text></View>
          <View style={[styles.statCard, {backgroundColor:'#eff6ff'}]}><Text style={styles.statValue}>{((data?.summary?.totalElectricKwh || 0)/1000).toFixed(0)} MWh</Text><Text style={styles.statLabel}>Consumption</Text></View>
          <View style={[styles.statCard, {backgroundColor:'#f0fdf4'}]}><Text style={styles.statValue}>{data?.summary?.pendingBillsCount || 0}</Text><Text style={styles.statLabel}>Pending Bills</Text></View>
        </View>
        <Text style={styles.sectionTitle}>Recent Logs</Text>
        {data?.recentLogs?.map((log: any, i: number) => (
          <Pressable key={log.id || i} style={styles.card} onPress={() => setSelectedLog(log)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{new Date(log.date).toLocaleDateString()}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardMeta}>Fuel: ₹{log.fuelCost?.toLocaleString() || 0}</Text>
              <Text style={styles.cardMeta}>kWh: {log.electricityKwh || 0}</Text>
            </View>
          </Pressable>
        ))}
        {(!data?.recentLogs || data.recentLogs.length === 0) && <Text style={styles.empty}>No logs found</Text>}
      </ScrollView>

      {/* Add Log Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Energy Log</Text>
            <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={formData.date} onChangeText={t => setFormData({...formData, date: t})} />
            <TextInput style={styles.input} placeholder="Fuel Cost (₹)" keyboardType="numeric" value={formData.fuelCost} onChangeText={t => setFormData({...formData, fuelCost: t})} />
            <TextInput style={styles.input} placeholder="Electricity (kWh)" keyboardType="numeric" value={formData.electricityKwh} onChangeText={t => setFormData({...formData, electricityKwh: t})} />
            <TextInput style={styles.input} placeholder="Electricity Cost (₹)" keyboardType="numeric" value={formData.electricityCost} onChangeText={t => setFormData({...formData, electricityCost: t})} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowForm(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Pressable style={[styles.submitBtn, submitting && {opacity: 0.5}]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add Log</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!selectedLog} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Energy Log</Text>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{selectedLog?.date ? new Date(selectedLog.date).toLocaleDateString() : 'N/A'}</Text>
            <Text style={styles.detailLabel}>Fuel Cost</Text>
            <Text style={styles.detailValue}>₹{selectedLog?.fuelCost?.toLocaleString() || 0}</Text>
            <Text style={styles.detailLabel}>Electricity Consumption</Text>
            <Text style={styles.detailValue}>{selectedLog?.electricityKwh || 0} kWh</Text>
            <Text style={styles.detailLabel}>Electricity Cost</Text>
            <Text style={styles.detailValue}>₹{selectedLog?.electricityCost?.toLocaleString() || 0}</Text>
            <Pressable style={styles.closeBtn} onPress={() => setSelectedLog(null)}><Text style={styles.closeText}>Close</Text></Pressable>
          </View>
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
  addBtn: { backgroundColor: '#dc2626', padding: 8, borderRadius: 8, marginRight: 8 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardMeta: { fontSize: 12, color: '#475569' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelText: { color: '#64748b', padding: 12 },
  submitBtn: { backgroundColor: '#dc2626', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 12 },
  submitText: { color: '#fff', fontWeight: '600' },
  detailLabel: { fontSize: 12, color: '#64748b', marginTop: 12 },
  detailValue: { fontSize: 14, color: '#0f172a', marginTop: 2 },
  closeBtn: { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  closeText: { fontSize: 14, color: '#475569', fontWeight: '600' },
});
