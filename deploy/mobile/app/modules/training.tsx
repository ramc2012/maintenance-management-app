import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';

const STATUS_COLORS: Record<string, string> = { SCHEDULED: '#3b82f6', IN_PROGRESS: '#eab308', COMPLETED: '#22c55e', CANCELLED: '#ef4444' };

export default function TrainingScreen() {
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', trainer: '', scheduledDate: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [d, t] = await Promise.all([
        api.get<any>('/training/dashboard'),
        api.get<any[]>('/training')
      ]);
      setDashboard(d);
      setTrainings(t || []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/training', formData);
      setShowForm(false);
      setFormData({ title: '', description: '', trainer: '', scheduledDate: '' });
      fetchData();
    } catch (e: any) { alert('Failed to create training: ' + e.message); } finally { setSubmitting(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0891b2" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>Error: {error}</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Training', headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </Pressable>
      )}} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#3b82f6'}]}>{dashboard?.scheduled || 0}</Text><Text style={styles.statLabel}>Scheduled</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#eab308'}]}>{dashboard?.inProgress || 0}</Text><Text style={styles.statLabel}>In Progress</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#22c55e'}]}>{dashboard?.completed || 0}</Text><Text style={styles.statLabel}>Completed</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Training Sessions ({trainings.length})</Text>
        {trainings.slice(0, 20).map((training, i) => (
          <Pressable key={training.id || i} style={styles.card} onPress={() => setSelectedTraining(training)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{training.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[training.status] || '#94a3b8' }]}>
                <Text style={styles.statusText}>{training.status || 'SCHEDULED'}</Text>
              </View>
            </View>
            <Text style={styles.cardSub}>{training.trainer ? `Trainer: ${training.trainer}` : 'No trainer assigned'}</Text>
            {training.scheduledDate && <Text style={styles.cardMeta}>Date: {new Date(training.scheduledDate).toLocaleDateString()}</Text>}
          </Pressable>
        ))}
        {trainings.length === 0 && <Text style={styles.empty}>No training sessions found</Text>}
      </ScrollView>

      {/* Create Training Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Training Session</Text>
            <TextInput style={styles.input} placeholder="Title *" value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />
            <TextInput style={[styles.input, {height: 80}]} placeholder="Description" multiline value={formData.description} onChangeText={t => setFormData({...formData, description: t})} />
            <TextInput style={styles.input} placeholder="Trainer Name" value={formData.trainer} onChangeText={t => setFormData({...formData, trainer: t})} />
            <TextInput style={styles.input} placeholder="Scheduled Date (YYYY-MM-DD)" value={formData.scheduledDate} onChangeText={t => setFormData({...formData, scheduledDate: t})} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowForm(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Pressable style={[styles.submitBtn, submitting && {opacity: 0.5}]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!selectedTraining} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedTraining?.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedTraining?.status] || '#94a3b8', alignSelf: 'flex-start', marginBottom: 16 }]}>
              <Text style={styles.statusText}>{selectedTraining?.status || 'SCHEDULED'}</Text>
            </View>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailValue}>{selectedTraining?.description || 'N/A'}</Text>
            <Text style={styles.detailLabel}>Trainer</Text>
            <Text style={styles.detailValue}>{selectedTraining?.trainer || 'N/A'}</Text>
            <Text style={styles.detailLabel}>Scheduled Date</Text>
            <Text style={styles.detailValue}>{selectedTraining?.scheduledDate ? new Date(selectedTraining.scheduledDate).toLocaleDateString() : 'N/A'}</Text>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{selectedTraining?.duration || 'N/A'}</Text>
            <Pressable style={styles.closeBtn} onPress={() => setSelectedTraining(null)}><Text style={styles.closeText}>Close</Text></Pressable>
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
  addBtn: { backgroundColor: '#0891b2', padding: 8, borderRadius: 8, marginRight: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#64748b' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0891b2', flex: 1 },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  cardMeta: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelText: { color: '#64748b', padding: 12 },
  submitBtn: { backgroundColor: '#0891b2', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 12 },
  submitText: { color: '#fff', fontWeight: '600' },
  detailLabel: { fontSize: 12, color: '#64748b', marginTop: 12 },
  detailValue: { fontSize: 14, color: '#0f172a', marginTop: 2 },
  closeBtn: { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  closeText: { fontSize: 14, color: '#475569', fontWeight: '600' },
});
