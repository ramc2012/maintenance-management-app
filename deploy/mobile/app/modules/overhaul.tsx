import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

const STATUS_COLORS: Record<string, string> = { PLANNED: '#3b82f6', IN_PROGRESS: '#eab308', COMPLETED: '#22c55e', ON_HOLD: '#f97316' };

export default function MOHScreen() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selectedMoh, setSelectedMoh] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ equipmentTag: '', description: '', plannedDate: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/moh/dashboard');
      setData(res);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!formData.equipmentTag.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/moh', formData);
      setShowForm(false);
      setFormData({ equipmentTag: '', description: '', plannedDate: '' });
      fetchData();
    } catch (e: any) { alert('Failed to create MOH: ' + e.message); } finally { setSubmitting(false); }
  };

  const filteredMOH = data?.recentMOH?.filter((moh: any) =>
    moh.mohNumber?.toLowerCase().includes(filter.toLowerCase()) ||
    moh.equipmentTag?.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  if (loading) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color="#ea580c" /></View>;
  if (error) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><Text style={styles.error}>Error: {error}</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: 'Major Overhaul', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </Pressable>
      )}} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}><Text style={[styles.statValue, {color:'#3b82f6'}]}>{data?.stats?.planned || 0}</Text><Text style={[styles.statLabel, { color: colors.textTertiary }]}>Planned</Text></View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}><Text style={[styles.statValue, {color:'#eab308'}]}>{data?.stats?.inProgress || 0}</Text><Text style={[styles.statLabel, { color: colors.textTertiary }]}>In Progress</Text></View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}><Text style={[styles.statValue, {color:'#22c55e'}]}>{data?.stats?.completed || 0}</Text><Text style={[styles.statLabel, { color: colors.textTertiary }]}>Completed</Text></View>
        </View>

        {data?.overdue?.length > 0 && (
          <View style={styles.alert}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#dc2626" />
            <Text style={styles.alertText}>{data.overdue.length} overdue MOH records</Text>
          </View>
        )}

        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search MOH..." placeholderTextColor={colors.inputPlaceholder} value={filter} onChangeText={setFilter} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>MOH Records ({filteredMOH.length})</Text>
        {filteredMOH.map((moh: any) => (
          <Pressable key={moh.id} style={[styles.card, { backgroundColor: colors.card }]} onPress={() => setSelectedMoh(moh)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{moh.mohNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[moh.status] || '#94a3b8' }]}>
                <Text style={styles.statusText}>{moh.status}</Text>
              </View>
            </View>
            <Text style={[styles.cardSub, { color: colors.textTertiary }]}>{moh.equipmentTag}</Text>
            {moh.description && <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>{moh.description}</Text>}
          </Pressable>
        ))}
      </ScrollView>

      {/* Create MOH Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New MOH Record</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Equipment Tag *" placeholderTextColor={colors.inputPlaceholder} value={formData.equipmentTag} onChangeText={t => setFormData({...formData, equipmentTag: t})} />
            <TextInput style={[styles.input, { height: 80, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Description" placeholderTextColor={colors.inputPlaceholder} multiline value={formData.description} onChangeText={t => setFormData({...formData, description: t})} />
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Planned Date (YYYY-MM-DD)" placeholderTextColor={colors.inputPlaceholder} value={formData.plannedDate} onChangeText={t => setFormData({...formData, plannedDate: t})} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowForm(false)}><Text style={[styles.cancelText, { color: colors.textTertiary }]}>Cancel</Text></Pressable>
              <Pressable style={[styles.submitBtn, submitting && {opacity: 0.5}]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!selectedMoh} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedMoh?.mohNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedMoh?.status] || '#94a3b8', alignSelf: 'flex-start', marginBottom: 16 }]}>
              <Text style={styles.statusText}>{selectedMoh?.status}</Text>
            </View>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Equipment Tag</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedMoh?.equipmentTag}</Text>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Description</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedMoh?.description || 'N/A'}</Text>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Planned Date</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedMoh?.plannedDate ? new Date(selectedMoh.plannedDate).toLocaleDateString() : 'N/A'}</Text>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Actual Date</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedMoh?.actualDate ? new Date(selectedMoh.actualDate).toLocaleDateString() : 'Not completed'}</Text>
            <Pressable style={[styles.closeBtn, { backgroundColor: colors.backgroundTertiary }]} onPress={() => setSelectedMoh(null)}><Text style={[styles.closeText, { color: colors.textSecondary }]}>Close</Text></Pressable>
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
  error: { color: '#ef4444' },
  addBtn: { backgroundColor: '#ea580c', padding: 8, borderRadius: 8, marginRight: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  alert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, marginBottom: 16 },
  alertText: { color: '#dc2626', fontSize: 13, fontWeight: '500', marginLeft: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#ea580c' },
  cardSub: { fontSize: 12, marginTop: 4 },
  cardMeta: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelText: { padding: 12 },
  submitBtn: { backgroundColor: '#ea580c', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 12 },
  submitText: { color: '#fff', fontWeight: '600' },
  detailLabel: { fontSize: 12, marginTop: 12 },
  detailValue: { fontSize: 14, marginTop: 2 },
  closeBtn: { padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  closeText: { fontSize: 14, fontWeight: '600' },
});
