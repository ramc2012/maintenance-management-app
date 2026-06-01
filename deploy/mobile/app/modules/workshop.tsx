import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

const SHOP_TYPES = ['FABRICATION', 'DIESEL', 'MACHINE', 'ELECTRICAL'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const STATUSES = ['PENDING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

const STATUS_COLORS: Record<string, string> = { PENDING: '#3b82f6', IN_PROGRESS: '#eab308', ON_HOLD: '#64748b', COMPLETED: '#22c55e', CANCELLED: '#ef4444' };
const PRIORITY_COLORS: Record<string, string> = { LOW: '#94a3b8', NORMAL: '#3b82f6', HIGH: '#f97316', URGENT: '#ef4444' };

interface WorkshopJob {
  id: string;
  jobNumber: string;
  shopType: string;
  title: string;
  description?: string;
  requestedBy: string;
  requestDate: string;
  priority: string;
  status: string;
  assignedTo?: string;
  estimatedHours?: number;
  actualHours?: number;
  equipmentTag?: string;
  workOrderRef?: string;
  remarks?: string;
}

export default function WorkshopScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<WorkshopJob | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [equipment, setEquipment] = useState<any[]>([]);

  // Create form
  const [formData, setFormData] = useState({
    title: '', description: '', shopType: 'ELECTRICAL', priority: 'NORMAL',
    equipmentTag: '', workOrderRef: '', assignedTo: '', estimatedHours: '', remarks: ''
  });

  const [closeData, setCloseData] = useState({
    actualHours: '', remarks: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, statsRes, eqRes] = await Promise.all([
        api.get<WorkshopJob[]>('/workshop'),
        api.get<any>('/workshop/dashboard'),
        api.get<any[]>('/equipment/running').catch(() => [])
      ]);
      setJobs(jobsRes || []);
      setStats(statsRes);
      setEquipment(eqRes || []);
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    setSubmitting(true);
    try {
      const username = user?.username || 'mobile.user';
      await api.post('/workshop', {
        title: formData.title,
        description: formData.description,
        shopType: formData.shopType,
        priority: formData.priority,
        equipmentTag: formData.equipmentTag || null,
        workOrderRef: formData.workOrderRef || null,
        assignedTo: formData.assignedTo || null,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        remarks: formData.remarks || null,
        requestedBy: username,
        createdBy: username,
        requestDate: new Date().toISOString()
      });
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSubmitting(false); }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedJob) return;
    try {
      await api.put(`/workshop/${selectedJob.id}/status`, { status: newStatus });
      setSelectedJob({ ...selectedJob, status: newStatus });
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleCloseJob = async () => {
    if (!selectedJob) return;
    setSubmitting(true);
    try {
      await api.put(`/workshop/${selectedJob.id}`, {
        status: 'COMPLETED',
        actualHours: closeData.actualHours ? parseFloat(closeData.actualHours) : null,
        remarks: closeData.remarks || null,
        completedDate: new Date().toISOString()
      });
      setShowCloseForm(false);
      setShowDetail(false);
      resetCloseData();
      fetchData();
      Alert.alert('Success', 'Workshop job completed successfully');
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', shopType: 'ELECTRICAL', priority: 'NORMAL', equipmentTag: '', workOrderRef: '', assignedTo: '', estimatedHours: '', remarks: '' });
  };

  const resetCloseData = () => {
    setCloseData({ actualHours: '', remarks: '' });
  };

  const filteredJobs = jobs.filter(j => {
    const search = filter.toLowerCase();
    const matchesSearch = j.jobNumber?.toLowerCase().includes(search) ||
      j.title?.toLowerCase().includes(search) ||
      j.description?.toLowerCase().includes(search);
    return matchesSearch && (!statusFilter || j.status === statusFilter);
  });

  if (loading) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color="#eab308" /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: 'Workshop', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </Pressable>
      )}} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}><Text style={[styles.statValue, {color:'#3b82f6'}]}>{stats?.overall?.pending || 0}</Text><Text style={[styles.statLabel, { color: colors.textTertiary }]}>Pending</Text></View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}><Text style={[styles.statValue, {color:'#eab308'}]}>{stats?.overall?.inProgress || 0}</Text><Text style={[styles.statLabel, { color: colors.textTertiary }]}>In Progress</Text></View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}><Text style={[styles.statValue, {color:'#22c55e'}]}>{stats?.overall?.completed || 0}</Text><Text style={[styles.statLabel, { color: colors.textTertiary }]}>Completed</Text></View>
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Pressable style={[styles.filterChip, { backgroundColor: colors.backgroundTertiary }, !statusFilter && styles.filterActive]} onPress={() => setStatusFilter(null)}>
            <Text style={[styles.filterText, { color: colors.textTertiary }, !statusFilter && styles.filterTextActive]}>All</Text>
          </Pressable>
          {STATUSES.map(s => (
            <Pressable key={s} style={[styles.filterChip, { backgroundColor: colors.backgroundTertiary }, statusFilter === s && {backgroundColor: STATUS_COLORS[s]}]} onPress={() => setStatusFilter(statusFilter === s ? null : s)}>
              <Text style={[styles.filterText, { color: colors.textTertiary }, statusFilter === s && {color: '#fff'}]}>{s.replace('_', ' ')}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search jobs..." placeholderTextColor={colors.inputPlaceholder} value={filter} onChangeText={setFilter} />
        </View>

        {/* Job List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Workshop Jobs ({filteredJobs.length})</Text>
        {filteredJobs.slice(0, 30).map((job, i) => (
          <Pressable key={job.id || i} style={[styles.card, { backgroundColor: colors.card }]} onPress={() => { setSelectedJob(job); setShowDetail(true); }}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardWO}>{job.jobNumber}</Text>
              <View style={styles.badges}>
                <View style={[styles.priorityBadge, {backgroundColor: PRIORITY_COLORS[job.priority]}]}>
                  <Text style={styles.badgeText}>{job.priority}</Text>
                </View>
                <View style={[styles.statusBadge, {backgroundColor: STATUS_COLORS[job.status]}]}>
                  <Text style={styles.badgeText}>{job.status.replace('_', ' ')}</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.cardDesc, { color: colors.text }]} numberOfLines={2}>{job.title}</Text>
            <View style={styles.cardFooter}>
              <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>{job.shopType}</Text>
              <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>{job.requestDate ? new Date(job.requestDate).toLocaleDateString() : '-'}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* CREATE JOB MODAL */}
      <Modal visible={showForm} animationType="slide">
        <View style={[styles.modalFull, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowForm(false)}><MaterialCommunityIcons name="close" size={24} color={colors.textTertiary} /></Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Workshop Job</Text>
            <View style={{width: 24}} />
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Text style={[styles.label, { color: colors.textTertiary }]}>Title *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Job title" placeholderTextColor={colors.inputPlaceholder} value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />

            <Text style={[styles.label, { color: colors.textTertiary }]}>Description</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text, height: 80 }]} multiline placeholder="Describe the job..." placeholderTextColor={colors.inputPlaceholder} value={formData.description} onChangeText={t => setFormData({...formData, description: t})} />

            <Text style={[styles.label, { color: colors.textTertiary }]}>Shop</Text>
            <View style={styles.chipRow}>
              {SHOP_TYPES.map(t => (
                <Pressable key={t} style={[styles.typeChip, { backgroundColor: colors.backgroundTertiary }, formData.shopType === t && styles.typeActive]} onPress={() => setFormData({...formData, shopType: t})}>
                  <Text style={[styles.typeText, { color: colors.textSecondary }, formData.shopType === t && {color: '#fff'}]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textTertiary }]}>Priority</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map(p => (
                <Pressable key={p} style={[styles.typeChip, { backgroundColor: colors.backgroundTertiary }, formData.priority === p && {backgroundColor: PRIORITY_COLORS[p]}]} onPress={() => setFormData({...formData, priority: p})}>
                  <Text style={[styles.typeText, { color: colors.textSecondary }, formData.priority === p && {color: '#fff'}]}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textTertiary }]}>Equipment (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {equipment.slice(0, 10).map(eq => (
                <Pressable key={eq.equipmentTag} style={[styles.eqChip, { backgroundColor: colors.backgroundTertiary }, formData.equipmentTag === eq.equipmentTag && styles.eqActive]} onPress={() => setFormData({...formData, equipmentTag: eq.equipmentTag})}>
                  <Text style={[styles.eqText, { color: colors.textSecondary }, formData.equipmentTag === eq.equipmentTag && {color: '#fff'}]}>{eq.equipmentTag}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.textTertiary }]}>Assigned To</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Workshop team or technician" placeholderTextColor={colors.inputPlaceholder} value={formData.assignedTo} onChangeText={t => setFormData({...formData, assignedTo: t})} />

            <Text style={[styles.label, { color: colors.textTertiary }]}>Estimated Hours</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} keyboardType="numeric" placeholderTextColor={colors.inputPlaceholder} value={formData.estimatedHours} onChangeText={t => setFormData({...formData, estimatedHours: t})} />

            <Text style={[styles.label, { color: colors.textTertiary }]}>Work Order Reference</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Optional WO reference" placeholderTextColor={colors.inputPlaceholder} value={formData.workOrderRef} onChangeText={t => setFormData({...formData, workOrderRef: t})} />

            <Text style={[styles.label, { color: colors.textTertiary }]}>Remarks</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text, height: 60 }]} multiline placeholderTextColor={colors.inputPlaceholder} value={formData.remarks} onChangeText={t => setFormData({...formData, remarks: t})} />
          </ScrollView>

          <View style={[styles.formActions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <Pressable style={[styles.cancelBtn, { backgroundColor: colors.backgroundTertiary }]} onPress={() => setShowForm(false)}><Text style={[styles.cancelText, { color: colors.textTertiary }]}>Cancel</Text></Pressable>
            <Pressable style={[styles.submitBtn, submitting && {opacity: 0.5}]} onPress={handleCreate} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Job</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* JOB DETAIL MODAL */}
      <Modal visible={showDetail && !!selectedJob} animationType="slide">
        <View style={[styles.modalFull, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowDetail(false); setSelectedJob(null); }}><MaterialCommunityIcons name="close" size={24} color={colors.textTertiary} /></Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedJob?.jobNumber}</Text>
            {selectedJob?.status !== 'COMPLETED' && selectedJob?.status !== 'CANCELLED' && (
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

              <Text style={[styles.descText, { color: colors.text }]}>{selectedJob.title}</Text>
              {selectedJob.description ? <Text style={[styles.cardDesc, { color: colors.text }]}>{selectedJob.description}</Text> : null}

              {/* Status Update */}
              {selectedJob.status !== 'COMPLETED' && selectedJob.status !== 'CANCELLED' && (
                <>
                  <Text style={[styles.label, { color: colors.textTertiary }]}>Update Status</Text>
                  <View style={styles.chipRow}>
                    {STATUSES.filter(s => s !== 'COMPLETED' && s !== 'CANCELLED').map(s => (
                      <Pressable key={s} style={[styles.typeChip, { backgroundColor: colors.backgroundTertiary }, selectedJob.status === s && {backgroundColor: STATUS_COLORS[s]}]} onPress={() => handleUpdateStatus(s)}>
                        <Text style={[styles.typeText, { color: colors.textSecondary }, selectedJob.status === s && {color: '#fff'}]}>{s.replace('_', ' ')}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <View style={[styles.detailGrid, { backgroundColor: colors.card }]}>
                <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Shop</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selectedJob.shopType}</Text></View>
                <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Requested</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selectedJob.requestDate ? new Date(selectedJob.requestDate).toLocaleDateString() : '-'}</Text></View>
                <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Equipment</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selectedJob.equipmentTag || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Assigned</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selectedJob.assignedTo || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Estimated Hours</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selectedJob.estimatedHours || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Actual Hours</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selectedJob.actualHours || '-'}</Text></View>
              </View>

              {selectedJob.status !== 'COMPLETED' && selectedJob.status !== 'CANCELLED' && (
                <Pressable style={styles.closeBtn} onPress={() => setShowCloseForm(true)}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.closeBtnText}>Complete Job</Text>
                </Pressable>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* COMPLETE JOB FORM */}
      <Modal visible={showCloseForm} animationType="slide">
        <View style={[styles.modalFull, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowCloseForm(false)}><MaterialCommunityIcons name="close" size={24} color={colors.textTertiary} /></Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Complete Job</Text>
            <View style={{width: 24}} />
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Text style={[styles.label, { color: colors.textTertiary }]}>Actual Hours</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} keyboardType="numeric" placeholderTextColor={colors.inputPlaceholder} value={closeData.actualHours} onChangeText={t => setCloseData({...closeData, actualHours: t})} />

            <Text style={[styles.label, { color: colors.textTertiary }]}>Remarks</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text, height: 80 }]} multiline placeholderTextColor={colors.inputPlaceholder} value={closeData.remarks} onChangeText={t => setCloseData({...closeData, remarks: t})} />
          </ScrollView>

          <View style={[styles.formActions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <Pressable style={[styles.cancelBtn, { backgroundColor: colors.backgroundTertiary }]} onPress={() => setShowCloseForm(false)}><Text style={[styles.cancelText, { color: colors.textTertiary }]}>Cancel</Text></Pressable>
            <Pressable style={[styles.submitBtn, {backgroundColor: '#22c55e'}, submitting && {opacity: 0.5}]} onPress={handleCloseJob} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Complete Job</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBtn: { backgroundColor: '#eab308', padding: 8, borderRadius: 8, marginRight: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  filterScroll: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 8 },
  filterActive: { backgroundColor: '#eab308' },
  filterText: { fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardWO: { fontSize: 14, fontWeight: '700', color: '#eab308' },
  badges: { flexDirection: 'row', gap: 6 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  cardDesc: { fontSize: 13, marginTop: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardMeta: { fontSize: 11 },
  modalFull: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  formScroll: { flex: 1 },
  formContent: { padding: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  halfCol: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  typeActive: { backgroundColor: '#eab308' },
  typeText: { fontSize: 11, fontWeight: '600' },
  eqChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  eqActive: { backgroundColor: '#3b82f6' },
  eqText: { fontSize: 10 },
  formActions: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12 },
  cancelText: { fontSize: 14, fontWeight: '600' },
  submitBtn: { flex: 2, padding: 14, alignItems: 'center', backgroundColor: '#eab308', borderRadius: 12 },
  submitText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  descText: { fontSize: 15, marginVertical: 12, lineHeight: 22 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 12, padding: 12, marginTop: 8 },
  detailItem: { width: '50%', marginBottom: 12 },
  detailLabel: { fontSize: 11 },
  detailValue: { fontSize: 13, fontWeight: '500' },
  closeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#22c55e', padding: 14, borderRadius: 12, marginTop: 16 },
  closeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 8 },
  isoChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8, alignItems: 'center', minWidth: 80 },
  isoActive: { backgroundColor: '#0f172a' },
  isoCode: { fontSize: 12, fontWeight: '700' },
  isoName: { fontSize: 9, marginTop: 2 },
});
