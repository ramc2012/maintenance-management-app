import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';

const SERVICE_LINES = ['PT', 'TT', 'FT', 'LT', 'PDT'];
const CAL_RESULTS = ['PASS', 'FAIL', 'OUT_OF_TOLERANCE'];

interface Instrument {
  id?: string; tagId: string; tag?: string; type: string; serviceLine?: string;
  description: string; make?: string; model?: string; serialNo?: string;
  rangeMin?: number; rangeMax?: number; unit?: string;
  calibrationFreqMonths?: number; nextDueDate?: string; lastCalibrationDate?: string;
}

export default function CalibrationScreen() {
  const [loading, setLoading] = useState(true);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState(90);
  const [selectedInst, setSelectedInst] = useState<Instrument | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCalForm, setShowCalForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calHistory, setCalHistory] = useState<any[]>([]);

  // Calibration form with 5-point data
  const [calForm, setCalForm] = useState({
    currentCalDate: new Date().toISOString().split('T')[0],
    performedBy: '',
    result: 'PASS',
    masterStdId: '',
    remarks: '',
    // 5-point data
    point1_input: '', point1_expected: '', point1_actual: '',
    point2_input: '', point2_expected: '', point2_actual: '',
    point3_input: '', point3_expected: '', point3_actual: '',
    point4_input: '', point4_expected: '', point4_actual: '',
    point5_input: '', point5_expected: '', point5_actual: '',
  });

  const [standards, setStandards] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, [daysFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [instRes, stdRes] = await Promise.all([
        api.get<Instrument[]>(`/calibration/due?days=${daysFilter}`),
        api.get<any[]>('/calibration/standards').catch(() => [])
      ]);
      setInstruments(instRes || []);
      setStandards(stdRes || []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const openDetail = async (inst: Instrument) => {
    setSelectedInst(inst);
    setShowDetail(true);
    try {
      const history = await api.get<any[]>(`/calibration/logs?instrumentTagId=${inst.tagId || inst.tag}`);
      setCalHistory(history || []);
    } catch { setCalHistory([]); }
  };

  const openCalForm = () => {
    setShowCalForm(true);
    // Pre-fill with range values
    if (selectedInst?.rangeMin !== undefined && selectedInst?.rangeMax !== undefined) {
      const range = selectedInst.rangeMax - selectedInst.rangeMin;
      const points = [0, 25, 50, 75, 100].map(pct => selectedInst.rangeMin! + (range * pct / 100));
      setCalForm({
        ...calForm,
        point1_expected: points[0].toString(), point1_input: '0%',
        point2_expected: points[1].toString(), point2_input: '25%',
        point3_expected: points[2].toString(), point3_input: '50%',
        point4_expected: points[3].toString(), point4_input: '75%',
        point5_expected: points[4].toString(), point5_input: '100%',
      });
    }
  };

  const handleRecordCalibration = async () => {
    if (!calForm.performedBy.trim()) { Alert.alert('Error', 'Performed By is required'); return; }
    if (!selectedInst) return;
    setSubmitting(true);
    try {
      const fivePointData = [
        { input: calForm.point1_input, expected: calForm.point1_expected, actual: calForm.point1_actual },
        { input: calForm.point2_input, expected: calForm.point2_expected, actual: calForm.point2_actual },
        { input: calForm.point3_input, expected: calForm.point3_expected, actual: calForm.point3_actual },
        { input: calForm.point4_input, expected: calForm.point4_expected, actual: calForm.point4_actual },
        { input: calForm.point5_input, expected: calForm.point5_expected, actual: calForm.point5_actual },
      ].filter(p => p.actual);

      await api.post('/calibration/logs', {
        instrumentTagId: selectedInst.tagId || selectedInst.tag,
        masterStdId: calForm.masterStdId || 'DEFAULT-STD',
        currentCalDate: calForm.currentCalDate,
        result: calForm.result,
        performedBy: calForm.performedBy,
        fivePointData,
        remarks: calForm.remarks
      });

      setShowCalForm(false);
      resetCalForm();
      openDetail(selectedInst);
      fetchData();
      Alert.alert('Success', 'Calibration recorded successfully');
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSubmitting(false); }
  };

  const resetCalForm = () => {
    setCalForm({
      currentCalDate: new Date().toISOString().split('T')[0],
      performedBy: '', result: 'PASS', masterStdId: '', remarks: '',
      point1_input: '', point1_expected: '', point1_actual: '',
      point2_input: '', point2_expected: '', point2_actual: '',
      point3_input: '', point3_expected: '', point3_actual: '',
      point4_input: '', point4_expected: '', point4_actual: '',
      point5_input: '', point5_expected: '', point5_actual: '',
    });
  };

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (days: number | null) => {
    if (days === null) return '#94a3b8';
    if (days < 0) return '#ef4444';
    if (days <= 30) return '#f97316';
    if (days <= 60) return '#eab308';
    return '#22c55e';
  };

  const filteredInstruments = instruments.filter(inst =>
    (inst.tagId || inst.tag || '').toLowerCase().includes(filter.toLowerCase()) ||
    inst.description?.toLowerCase().includes(filter.toLowerCase())
  );

  const stats = {
    overdue: instruments.filter(i => getDaysUntilDue(i.nextDueDate)! < 0).length,
    due30: instruments.filter(i => { const d = getDaysUntilDue(i.nextDueDate); return d !== null && d >= 0 && d <= 30; }).length,
    total: instruments.length
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>Error: {error}</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Calibration' }} />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#ef4444'}]}>{stats.overdue}</Text><Text style={styles.statLabel}>Overdue</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#f97316'}]}>{stats.due30}</Text><Text style={styles.statLabel}>Due 30d</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.total}</Text><Text style={styles.statLabel}>Total</Text></View>
        </View>

        {/* Days Filter */}
        <View style={styles.filterRow}>
          {[30, 60, 90, 180, 365].map(d => (
            <Pressable key={d} style={[styles.filterChip, daysFilter === d && styles.filterActive]} onPress={() => setDaysFilter(d)}>
              <Text style={[styles.filterText, daysFilter === d && styles.filterTextActive]}>{d}d</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
          <TextInput style={styles.searchInput} placeholder="Search instruments..." value={filter} onChangeText={setFilter} />
        </View>

        {/* Instrument List */}
        <Text style={styles.sectionTitle}>Due for Calibration ({filteredInstruments.length})</Text>
        {filteredInstruments.map((inst, i) => {
          const days = getDaysUntilDue(inst.nextDueDate);
          return (
            <Pressable key={inst.tagId || inst.tag || i} style={styles.card} onPress={() => openDetail(inst)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{inst.tagId || inst.tag}</Text>
                <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(days) }]}>
                  <Text style={styles.urgencyText}>{days !== null ? (days < 0 ? 'OVERDUE' : `${days}d`) : '-'}</Text>
                </View>
              </View>
              <Text style={styles.cardSub}>{inst.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>{inst.serviceLine || inst.type}</Text>
                <Text style={styles.cardMeta}>Range: {inst.rangeMin}-{inst.rangeMax} {inst.unit}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* INSTRUMENT DETAIL MODAL */}
      <Modal visible={showDetail && !!selectedInst} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setShowDetail(false); setSelectedInst(null); }}><MaterialCommunityIcons name="close" size={24} color="#64748b" /></Pressable>
            <Text style={styles.modalTitle}>{selectedInst?.tagId || selectedInst?.tag}</Text>
            <Pressable onPress={openCalForm}><MaterialCommunityIcons name="clipboard-check" size={24} color="#16a34a" /></Pressable>
          </View>
          
          {selectedInst && (
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
              <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(getDaysUntilDue(selectedInst.nextDueDate)), alignSelf: 'flex-start', marginBottom: 16 }]}>
                <Text style={styles.urgencyText}>
                  {getDaysUntilDue(selectedInst.nextDueDate) !== null 
                    ? (getDaysUntilDue(selectedInst.nextDueDate)! < 0 ? 'OVERDUE' : `Due in ${getDaysUntilDue(selectedInst.nextDueDate)} days`)
                    : 'No due date'}
                </Text>
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Type</Text><Text style={styles.detailValue}>{selectedInst.type}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Service Line</Text><Text style={styles.detailValue}>{selectedInst.serviceLine || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Make</Text><Text style={styles.detailValue}>{selectedInst.make || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Model</Text><Text style={styles.detailValue}>{selectedInst.model || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Serial No</Text><Text style={styles.detailValue}>{selectedInst.serialNo || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Range</Text><Text style={styles.detailValue}>{selectedInst.rangeMin} - {selectedInst.rangeMax} {selectedInst.unit}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Frequency</Text><Text style={styles.detailValue}>{selectedInst.calibrationFreqMonths || 12} months</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Last Cal</Text><Text style={styles.detailValue}>{selectedInst.lastCalibrationDate ? new Date(selectedInst.lastCalibrationDate).toLocaleDateString() : '-'}</Text></View>
              </View>

              <Pressable style={styles.calButton} onPress={openCalForm}>
                <MaterialCommunityIcons name="clipboard-check" size={20} color="#fff" />
                <Text style={styles.calButtonText}>Record Calibration</Text>
              </Pressable>

              {/* Calibration History */}
              <Text style={styles.sectionTitle}>Calibration History ({calHistory.length})</Text>
              {calHistory.length === 0 ? (
                <Text style={styles.emptyText}>No calibration history</Text>
              ) : (
                calHistory.map((log, i) => (
                  <View key={i} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={[styles.resultBadge, { color: log.result === 'PASS' ? '#22c55e' : '#ef4444' }]}>{log.result}</Text>
                      <Text style={styles.historyDate}>{new Date(log.currentCalDate).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.historyMeta}>Performed by: {log.performedBy}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* CALIBRATION FORM MODAL */}
      <Modal visible={showCalForm} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCalForm(false)}><MaterialCommunityIcons name="close" size={24} color="#64748b" /></Pressable>
            <Text style={styles.modalTitle}>Record Calibration</Text>
            <View style={{width: 24}} />
          </View>
          
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Text style={styles.instTag}>{selectedInst?.tagId || selectedInst?.tag}</Text>
            <Text style={styles.instDesc}>{selectedInst?.description}</Text>

            <Text style={styles.label}>Calibration Date *</Text>
            <TextInput style={styles.input} value={calForm.currentCalDate} onChangeText={t => setCalForm({...calForm, currentCalDate: t})} />

            <Text style={styles.label}>Performed By *</Text>
            <TextInput style={styles.input} placeholder="Enter name" value={calForm.performedBy} onChangeText={t => setCalForm({...calForm, performedBy: t})} />

            <Text style={styles.label}>Result</Text>
            <View style={styles.resultRow}>
              {CAL_RESULTS.map(r => (
                <Pressable key={r} style={[styles.resultBtn, calForm.result === r && (r === 'PASS' ? styles.passBtn : styles.failBtn)]} onPress={() => setCalForm({...calForm, result: r})}>
                  <Text style={[styles.resultBtnText, calForm.result === r && {color: '#fff'}]}>{r}</Text>
                </Pressable>
              ))}
            </View>

            {/* 5-Point Data */}
            <Text style={styles.sectionTitle}>5-Point Check</Text>
            <View style={styles.pointHeader}>
              <Text style={styles.pointCol}>Input</Text>
              <Text style={styles.pointCol}>Expected</Text>
              <Text style={styles.pointCol}>Actual</Text>
            </View>
            {[1, 2, 3, 4, 5].map(p => (
              <View key={p} style={styles.pointRow}>
                <TextInput style={[styles.input, styles.pointInput]} placeholder={`${(p-1)*25}%`} 
                  value={(calForm as any)[`point${p}_input`]} 
                  onChangeText={t => setCalForm({...calForm, [`point${p}_input`]: t})} />
                <TextInput style={[styles.input, styles.pointInput]} placeholder="Expected" 
                  value={(calForm as any)[`point${p}_expected`]} 
                  onChangeText={t => setCalForm({...calForm, [`point${p}_expected`]: t})} />
                <TextInput style={[styles.input, styles.pointInput]} placeholder="Actual" 
                  value={(calForm as any)[`point${p}_actual`]} 
                  onChangeText={t => setCalForm({...calForm, [`point${p}_actual`]: t})} />
              </View>
            ))}

            <Text style={styles.label}>Remarks</Text>
            <TextInput style={[styles.input, {height: 80}]} multiline placeholder="Any observations..." value={calForm.remarks} onChangeText={t => setCalForm({...calForm, remarks: t})} />
          </ScrollView>

          <View style={styles.formActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setShowCalForm(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={[styles.submitBtn, submitting && {opacity: 0.5}]} onPress={handleRecordCalibration} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Calibration</Text>}
            </Pressable>
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
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b' },
  filterRow: { flexDirection: 'row', marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#f1f5f9', marginRight: 8 },
  filterActive: { backgroundColor: '#16a34a' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterTextActive: { color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#16a34a' },
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  urgencyText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  cardSub: { fontSize: 13, color: '#0f172a', marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardMeta: { fontSize: 11, color: '#64748b' },
  modalFull: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  formScroll: { flex: 1 },
  formContent: { padding: 16 },
  instTag: { fontSize: 20, fontWeight: '700', color: '#16a34a', marginBottom: 4 },
  instDesc: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 14, color: '#0f172a' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  detailItem: { width: '50%', marginBottom: 12 },
  detailLabel: { fontSize: 11, color: '#94a3b8' },
  detailValue: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
  calButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', padding: 14, borderRadius: 12, marginTop: 16, marginBottom: 8 },
  calButtonText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 8 },
  historyCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultBadge: { fontSize: 12, fontWeight: '700' },
  historyDate: { fontSize: 11, color: '#64748b' },
  historyMeta: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 12 },
  resultRow: { flexDirection: 'row', gap: 8 },
  resultBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  passBtn: { backgroundColor: '#22c55e' },
  failBtn: { backgroundColor: '#ef4444' },
  resultBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  pointHeader: { flexDirection: 'row', marginBottom: 8 },
  pointCol: { flex: 1, fontSize: 11, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  pointRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pointInput: { flex: 1, textAlign: 'center', padding: 10 },
  formActions: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12 },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  submitBtn: { flex: 2, padding: 14, alignItems: 'center', backgroundColor: '#16a34a', borderRadius: 12 },
  submitText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
