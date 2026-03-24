import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';

const JOB_TYPES = ['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'EMERGENCY'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'EMERGENCY'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];

// ISO 14224 Codes
const FAILURE_MODES = [
  { code: 'BRD', name: 'Bearing Damage' },
  { code: 'LKG', name: 'Leakage' },
  { code: 'STK', name: 'Stuck' },
  { code: 'OHT', name: 'Overheat' },
  { code: 'VIB', name: 'Vibration' },
  { code: 'ELE', name: 'Electrical Failure' }
];

const CAUSE_CODES = [
  { code: 'LUB', name: 'Lubrication Failure' },
  { code: 'WER', name: 'Wear' },
  { code: 'OVL', name: 'Overload' },
  { code: 'AGE', name: 'Age/Deterioration' },
  { code: 'HUM', name: 'Human Error' }
];

const ACTION_CODES = [
  { code: 'REP', name: 'Replace' },
  { code: 'RPA', name: 'Repair' },
  { code: 'ADJ', name: 'Adjust' },
  { code: 'CLN', name: 'Clean' },
  { code: 'LUB', name: 'Lubricate' }
];

const STATUS_COLORS: Record<string, string> = { OPEN: '#3b82f6', IN_PROGRESS: '#eab308', COMPLETED: '#22c55e', CLOSED: '#64748b' };
const PRIORITY_COLORS: Record<string, string> = { LOW: '#94a3b8', NORMAL: '#3b82f6', HIGH: '#f97316', EMERGENCY: '#ef4444' };

interface WorkOrder {
  id: string; woNumber: string; description: string; woType: string;
  priority: string; status: string; scheduledDate?: string;
  startDate?: string; completionDate?: string; failureMode?: string;
  causeCode?: string; actionTaken?: string; labourHours?: number;
  downtime?: number; remarks?: string; flId?: string;
  functionalLocation?: { flId: string; name: string };
}

export default function WorkshopScreen() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<WorkOrder[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<WorkOrder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [equipment, setEquipment] = useState<any[]>([]);

  // Create form
  const [formData, setFormData] = useState({
    description: '', woType: 'CORRECTIVE', priority: 'NORMAL',
    scheduledDate: '', flId: '', remarks: ''
  });

  // Close form (ISO 14224)
  const [closeData, setCloseData] = useState({
    failureMode: '', causeCode: '', actionTaken: '',
    labourHours: '', downtime: '', remarks: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, statsRes, eqRes] = await Promise.all([
        api.get<WorkOrder[]>('/workshop'),
        api.get<any>('/workshop/dashboard'),
        api.get<any[]>('/equipment/running').catch(() => [])
      ]);
      setJobs(jobsRes || []);
      setStats(statsRes);
      setEquipment(eqRes || []);
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formData.description.trim()) { Alert.alert('Error', 'Description is required'); return; }
    setSubmitting(true);
    try {
      await api.post('/workshop', {
        description: formData.description,
        woType: formData.woType,
        priority: formData.priority,
        scheduledDate: formData.scheduledDate || null,
        flId: formData.flId || null,
        remarks: formData.remarks || null
      });
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSubmitting(false); }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedJob) return;
    try {
      await api.patch(`/workshop/${selectedJob.id}`, { status: newStatus });
      setSelectedJob({ ...selectedJob, status: newStatus });
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleCloseJob = async () => {
    if (!selectedJob) return;
    setSubmitting(true);
    try {
      await api.patch(`/workshop/${selectedJob.id}`, {
        status: 'CLOSED',
        failureMode: closeData.failureMode || null,
        causeCode: closeData.causeCode || null,
        actionTaken: closeData.actionTaken || null,
        labourHours: closeData.labourHours ? parseFloat(closeData.labourHours) : null,
        downtime: closeData.downtime ? parseFloat(closeData.downtime) : null,
        remarks: closeData.remarks || null,
        completionDate: new Date().toISOString()
      });
      setShowCloseForm(false);
      setShowDetail(false);
      resetCloseData();
      fetchData();
      Alert.alert('Success', 'Work order closed successfully');
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setFormData({ description: '', woType: 'CORRECTIVE', priority: 'NORMAL', scheduledDate: '', flId: '', remarks: '' });
  };

  const resetCloseData = () => {
    setCloseData({ failureMode: '', causeCode: '', actionTaken: '', labourHours: '', downtime: '', remarks: '' });
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.woNumber?.toLowerCase().includes(filter.toLowerCase()) ||
      j.description?.toLowerCase().includes(filter.toLowerCase());
    return matchesSearch && (!statusFilter || j.status === statusFilter);
  });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#eab308" /></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Workshop', headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </Pressable>
      )}} />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#3b82f6'}]}>{stats?.openCount || 0}</Text><Text style={styles.statLabel}>Open</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#eab308'}]}>{stats?.inProgressCount || 0}</Text><Text style={styles.statLabel}>In Progress</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#22c55e'}]}>{stats?.completedCount || 0}</Text><Text style={styles.statLabel}>Completed</Text></View>
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Pressable style={[styles.filterChip, !statusFilter && styles.filterActive]} onPress={() => setStatusFilter(null)}>
            <Text style={[styles.filterText, !statusFilter && styles.filterTextActive]}>All</Text>
          </Pressable>
          {STATUSES.map(s => (
            <Pressable key={s} style={[styles.filterChip, statusFilter === s && {backgroundColor: STATUS_COLORS[s]}]} onPress={() => setStatusFilter(statusFilter === s ? null : s)}>
              <Text style={[styles.filterText, statusFilter === s && {color: '#fff'}]}>{s.replace('_', ' ')}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
          <TextInput style={styles.searchInput} placeholder="Search jobs..." value={filter} onChangeText={setFilter} />
        </View>

        {/* Job List */}
        <Text style={styles.sectionTitle}>Work Orders ({filteredJobs.length})</Text>
        {filteredJobs.slice(0, 30).map((job, i) => (
          <Pressable key={job.id || i} style={styles.card} onPress={() => { setSelectedJob(job); setShowDetail(true); }}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardWO}>{job.woNumber}</Text>
              <View style={styles.badges}>
                <View style={[styles.priorityBadge, {backgroundColor: PRIORITY_COLORS[job.priority]}]}>
                  <Text style={styles.badgeText}>{job.priority}</Text>
                </View>
                <View style={[styles.statusBadge, {backgroundColor: STATUS_COLORS[job.status]}]}>
                  <Text style={styles.badgeText}>{job.status.replace('_', ' ')}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>{job.description}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardMeta}>{job.woType}</Text>
              <Text style={styles.cardMeta}>{job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : '-'}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* CREATE JOB MODAL */}
      <Modal visible={showForm} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowForm(false)}><MaterialCommunityIcons name="close" size={24} color="#64748b" /></Pressable>
            <Text style={styles.modalTitle}>Create Work Order</Text>
            <View style={{width: 24}} />
          </View>
          
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Text style={styles.label}>Description *</Text>
            <TextInput style={[styles.input, {height: 80}]} multiline placeholder="Describe the work..." value={formData.description} onChangeText={t => setFormData({...formData, description: t})} />

            <Text style={styles.label}>Job Type</Text>
            <View style={styles.chipRow}>
              {JOB_TYPES.map(t => (
                <Pressable key={t} style={[styles.typeChip, formData.woType === t && styles.typeActive]} onPress={() => setFormData({...formData, woType: t})}>
                  <Text style={[styles.typeText, formData.woType === t && {color: '#fff'}]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Priority</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map(p => (
                <Pressable key={p} style={[styles.typeChip, formData.priority === p && {backgroundColor: PRIORITY_COLORS[p]}]} onPress={() => setFormData({...formData, priority: p})}>
                  <Text style={[styles.typeText, formData.priority === p && {color: '#fff'}]}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Equipment (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {equipment.slice(0, 10).map(eq => (
                <Pressable key={eq.equipmentTag} style={[styles.eqChip, formData.flId === eq.equipmentTag && styles.eqActive]} onPress={() => setFormData({...formData, flId: eq.equipmentTag})}>
                  <Text style={[styles.eqText, formData.flId === eq.equipmentTag && {color: '#fff'}]}>{eq.equipmentTag}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Scheduled Date</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={formData.scheduledDate} onChangeText={t => setFormData({...formData, scheduledDate: t})} />

            <Text style={styles.label}>Remarks</Text>
            <TextInput style={[styles.input, {height: 60}]} multiline value={formData.remarks} onChangeText={t => setFormData({...formData, remarks: t})} />
          </ScrollView>

          <View style={styles.formActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setShowForm(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={[styles.submitBtn, submitting && {opacity: 0.5}]} onPress={handleCreate} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Job</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* JOB DETAIL MODAL */}
      <Modal visible={showDetail && !!selectedJob} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setShowDetail(false); setSelectedJob(null); }}><MaterialCommunityIcons name="close" size={24} color="#64748b" /></Pressable>
            <Text style={styles.modalTitle}>{selectedJob?.woNumber}</Text>
            {selectedJob?.status !== 'CLOSED' && (
              <Pressable onPress={() => setShowCloseForm(true)}><MaterialCommunityIcons name="check-circle" size={24} color="#22c55e" /></Pressable>
            )}
          </View>
          
          {selectedJob && (
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
              <View style={styles.badges}>
                <View style={[styles.priorityBadge, {backgroundColor: PRIORITY_COLORS[selectedJob.priority]}]}>
                  <Text style={styles.badgeText}>{selectedJob.priority}</Text>
                </View>
                <View style={[styles.statusBadge, {backgroundColor: STATUS_COLORS[selectedJob.status]}]}>
                  <Text style={styles.badgeText}>{selectedJob.status.replace('_', ' ')}</Text>
                </View>
              </View>

              <Text style={styles.descText}>{selectedJob.description}</Text>

              {/* Status Update */}
              {selectedJob.status !== 'CLOSED' && (
                <>
                  <Text style={styles.label}>Update Status</Text>
                  <View style={styles.chipRow}>
                    {STATUSES.filter(s => s !== 'CLOSED').map(s => (
                      <Pressable key={s} style={[styles.typeChip, selectedJob.status === s && {backgroundColor: STATUS_COLORS[s]}]} onPress={() => handleUpdateStatus(s)}>
                        <Text style={[styles.typeText, selectedJob.status === s && {color: '#fff'}]}>{s.replace('_', ' ')}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.detailGrid}>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Type</Text><Text style={styles.detailValue}>{selectedJob.woType}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Scheduled</Text><Text style={styles.detailValue}>{selectedJob.scheduledDate ? new Date(selectedJob.scheduledDate).toLocaleDateString() : '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Equipment</Text><Text style={styles.detailValue}>{selectedJob.flId || selectedJob.functionalLocation?.flId || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Labour Hours</Text><Text style={styles.detailValue}>{selectedJob.labourHours || '-'}</Text></View>
              </View>

              {/* ISO 14224 Closing Codes (if closed) */}
              {selectedJob.status === 'CLOSED' && (
                <>
                  <Text style={styles.sectionTitle}>Closing Details (ISO 14224)</Text>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}><Text style={styles.detailLabel}>Failure Mode</Text><Text style={styles.detailValue}>{selectedJob.failureMode || '-'}</Text></View>
                    <View style={styles.detailItem}><Text style={styles.detailLabel}>Cause Code</Text><Text style={styles.detailValue}>{selectedJob.causeCode || '-'}</Text></View>
                    <View style={styles.detailItem}><Text style={styles.detailLabel}>Action Taken</Text><Text style={styles.detailValue}>{selectedJob.actionTaken || '-'}</Text></View>
                    <View style={styles.detailItem}><Text style={styles.detailLabel}>Downtime (hrs)</Text><Text style={styles.detailValue}>{selectedJob.downtime || '-'}</Text></View>
                  </View>
                </>
              )}

              {selectedJob.status !== 'CLOSED' && (
                <Pressable style={styles.closeBtn} onPress={() => setShowCloseForm(true)}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.closeBtnText}>Close Work Order</Text>
                </Pressable>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* CLOSE JOB FORM (ISO 14224) */}
      <Modal visible={showCloseForm} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCloseForm(false)}><MaterialCommunityIcons name="close" size={24} color="#64748b" /></Pressable>
            <Text style={styles.modalTitle}>Close Work Order</Text>
            <View style={{width: 24}} />
          </View>
          
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Text style={styles.sectionTitle}>ISO 14224 Closing Codes</Text>

            <Text style={styles.label}>Failure Mode</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {FAILURE_MODES.map(f => (
                <Pressable key={f.code} style={[styles.isoChip, closeData.failureMode === f.code && styles.isoActive]} onPress={() => setCloseData({...closeData, failureMode: f.code})}>
                  <Text style={[styles.isoCode, closeData.failureMode === f.code && {color: '#fff'}]}>{f.code}</Text>
                  <Text style={[styles.isoName, closeData.failureMode === f.code && {color: '#fff'}]}>{f.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Cause Code</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CAUSE_CODES.map(c => (
                <Pressable key={c.code} style={[styles.isoChip, closeData.causeCode === c.code && styles.isoActive]} onPress={() => setCloseData({...closeData, causeCode: c.code})}>
                  <Text style={[styles.isoCode, closeData.causeCode === c.code && {color: '#fff'}]}>{c.code}</Text>
                  <Text style={[styles.isoName, closeData.causeCode === c.code && {color: '#fff'}]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Action Taken</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ACTION_CODES.map(a => (
                <Pressable key={a.code} style={[styles.isoChip, closeData.actionTaken === a.code && styles.isoActive]} onPress={() => setCloseData({...closeData, actionTaken: a.code})}>
                  <Text style={[styles.isoCode, closeData.actionTaken === a.code && {color: '#fff'}]}>{a.code}</Text>
                  <Text style={[styles.isoName, closeData.actionTaken === a.code && {color: '#fff'}]}>{a.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.row}>
              <View style={styles.halfCol}><Text style={styles.label}>Labour Hours</Text><TextInput style={styles.input} keyboardType="numeric" value={closeData.labourHours} onChangeText={t => setCloseData({...closeData, labourHours: t})} /></View>
              <View style={styles.halfCol}><Text style={styles.label}>Downtime (hrs)</Text><TextInput style={styles.input} keyboardType="numeric" value={closeData.downtime} onChangeText={t => setCloseData({...closeData, downtime: t})} /></View>
            </View>

            <Text style={styles.label}>Remarks</Text>
            <TextInput style={[styles.input, {height: 80}]} multiline value={closeData.remarks} onChangeText={t => setCloseData({...closeData, remarks: t})} />
          </ScrollView>

          <View style={styles.formActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setShowCloseForm(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={[styles.submitBtn, {backgroundColor: '#22c55e'}, submitting && {opacity: 0.5}]} onPress={handleCloseJob} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Close Job</Text>}
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
  addBtn: { backgroundColor: '#eab308', padding: 8, borderRadius: 8, marginRight: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b' },
  filterScroll: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#f1f5f9', marginRight: 8 },
  filterActive: { backgroundColor: '#eab308' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterTextActive: { color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardWO: { fontSize: 14, fontWeight: '700', color: '#eab308' },
  badges: { flexDirection: 'row', gap: 6 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#0f172a', marginTop: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardMeta: { fontSize: 11, color: '#64748b' },
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
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  typeActive: { backgroundColor: '#eab308' },
  typeText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  eqChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8 },
  eqActive: { backgroundColor: '#3b82f6' },
  eqText: { fontSize: 10, color: '#475569' },
  formActions: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12 },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  submitBtn: { flex: 2, padding: 14, alignItems: 'center', backgroundColor: '#eab308', borderRadius: 12 },
  submitText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  descText: { fontSize: 15, color: '#0f172a', marginVertical: 12, lineHeight: 22 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
  detailItem: { width: '50%', marginBottom: 12 },
  detailLabel: { fontSize: 11, color: '#94a3b8' },
  detailValue: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
  closeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#22c55e', padding: 14, borderRadius: 12, marginTop: 16 },
  closeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 8 },
  isoChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', marginRight: 8, alignItems: 'center', minWidth: 80 },
  isoActive: { backgroundColor: '#0f172a' },
  isoCode: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  isoName: { fontSize: 9, color: '#64748b', marginTop: 2 },
});
