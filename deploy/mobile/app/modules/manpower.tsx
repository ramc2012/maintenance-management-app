import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';

export default function ManpowerScreen() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ workDescription: '', totalPersonnel: '', hoursWorked: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api.get<any[]>('/maintenance/manpower');
      setReports(res || []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!formData.workDescription.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/maintenance/manpower', {
        ...formData,
        totalPersonnel: parseInt(formData.totalPersonnel) || 0,
        hoursWorked: parseFloat(formData.hoursWorked) || 0,
      });
      setShowForm(false);
      setFormData({ workDescription: '', totalPersonnel: '', hoursWorked: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (e: any) { alert('Failed to create report: ' + e.message); } finally { setSubmitting(false); }
  };

  const totalPersonnel = reports.reduce((sum, r) => sum + (r.totalPersonnel || 0), 0);
  const totalHours = reports.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#db2777" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>Error: {error}</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Manpower', headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </Pressable>
      )}} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#db2777'}]}>{reports.length}</Text><Text style={styles.statLabel}>Reports</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#3b82f6'}]}>{totalPersonnel}</Text><Text style={styles.statLabel}>Personnel</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{totalHours.toFixed(0)}</Text><Text style={styles.statLabel}>Total Hours</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Daily Work Reports</Text>
        {reports.slice(0, 20).map((report, i) => (
          <Pressable key={report.id || i} style={styles.card} onPress={() => setSelectedReport(report)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{new Date(report.date).toLocaleDateString()}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
            <Text style={styles.cardSub}>{report.workDescription}</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardMeta}><MaterialCommunityIcons name="account-group" size={12} color="#64748b" /> {report.totalPersonnel || 0} personnel</Text>
              <Text style={styles.cardMeta}><MaterialCommunityIcons name="clock" size={12} color="#64748b" /> {report.hoursWorked || 0} hrs</Text>
            </View>
          </Pressable>
        ))}
        {reports.length === 0 && <Text style={styles.empty}>No work reports found</Text>}
      </ScrollView>

      {/* Add Report Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Work Report</Text>
            <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={formData.date} onChangeText={t => setFormData({...formData, date: t})} />
            <TextInput style={[styles.input, {height: 80}]} placeholder="Work Description *" multiline value={formData.workDescription} onChangeText={t => setFormData({...formData, workDescription: t})} />
            <TextInput style={styles.input} placeholder="Total Personnel" keyboardType="numeric" value={formData.totalPersonnel} onChangeText={t => setFormData({...formData, totalPersonnel: t})} />
            <TextInput style={styles.input} placeholder="Hours Worked" keyboardType="numeric" value={formData.hoursWorked} onChangeText={t => setFormData({...formData, hoursWorked: t})} />
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
      <Modal visible={!!selectedReport} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Work Report</Text>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{selectedReport?.date ? new Date(selectedReport.date).toLocaleDateString() : 'N/A'}</Text>
            <Text style={styles.detailLabel}>Work Description</Text>
            <Text style={styles.detailValue}>{selectedReport?.workDescription || 'N/A'}</Text>
            <Text style={styles.detailLabel}>Total Personnel</Text>
            <Text style={styles.detailValue}>{selectedReport?.totalPersonnel || 0}</Text>
            <Text style={styles.detailLabel}>Hours Worked</Text>
            <Text style={styles.detailValue}>{selectedReport?.hoursWorked || 0}</Text>
            <Pressable style={styles.closeBtn} onPress={() => setSelectedReport(null)}><Text style={styles.closeText}>Close</Text></Pressable>
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
  addBtn: { backgroundColor: '#db2777', padding: 8, borderRadius: 8, marginRight: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#db2777' },
  cardSub: { fontSize: 13, color: '#0f172a', marginTop: 6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardMeta: { fontSize: 11, color: '#64748b' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelText: { color: '#64748b', padding: 12 },
  submitBtn: { backgroundColor: '#db2777', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 12 },
  submitText: { color: '#fff', fontWeight: '600' },
  detailLabel: { fontSize: 12, color: '#64748b', marginTop: 12 },
  detailValue: { fontSize: 14, color: '#0f172a', marginTop: 2 },
  closeBtn: { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  closeText: { fontSize: 14, color: '#475569', fontWeight: '600' },
});
