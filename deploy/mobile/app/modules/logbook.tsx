import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal, Switch } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';

export default function LogbookScreen() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [formData, setFormData] = useState({ equipmentTag: '', runStatus: true, remarks: '', runHours: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { const res = await api.get<any[]>('/equipment-logs'); setLogs(res || []); } 
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!formData.equipmentTag.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/equipment-logs', { ...formData, date: new Date().toISOString(), runHours: parseFloat(formData.runHours) || 0 });
      setShowForm(false); setFormData({ equipmentTag: '', runStatus: true, remarks: '', runHours: '' }); fetchData();
    } catch (e: any) { alert('Failed: ' + e.message); } finally { setSubmitting(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#d97706" /></View>;
  if (error) return <View style={s.center}><Text style={s.error}>Error: {error}</Text></View>;

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Digital Logbook', headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={s.addBtn}><MaterialCommunityIcons name="plus" size={24} color="#fff" /></Pressable>
      )}} />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.statsRow}>
          <View style={s.stat}><Text style={[s.statVal, {color:'#22c55e'}]}>{logs.filter(l => l.runStatus).length}</Text><Text style={s.statLbl}>Running</Text></View>
          <View style={s.stat}><Text style={[s.statVal, {color:'#ef4444'}]}>{logs.filter(l => !l.runStatus).length}</Text><Text style={s.statLbl}>Stopped</Text></View>
          <View style={s.stat}><Text style={s.statVal}>{logs.length}</Text><Text style={s.statLbl}>Total</Text></View>
        </View>
        <Text style={s.title}>Recent Logs</Text>
        {logs.slice(0, 20).map((log, i) => (
          <Pressable key={log.id || i} style={s.card} onPress={() => setSelectedLog(log)}>
            <View style={s.row}><Text style={s.cardTitle}>{log.equipmentTag}</Text><View style={[s.dot, { backgroundColor: log.runStatus ? '#22c55e' : '#ef4444' }]} /></View>
            <Text style={s.meta}>{new Date(log.date).toLocaleDateString()} • {log.runHours || 0} hrs</Text>
            {log.remarks && <Text style={s.remarks}>{log.remarks}</Text>}
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <Text style={s.modalTitle}>Add Log Entry</Text>
          <TextInput style={s.input} placeholder="Equipment Tag *" value={formData.equipmentTag} onChangeText={t => setFormData({...formData, equipmentTag: t})} />
          <TextInput style={s.input} placeholder="Run Hours" keyboardType="numeric" value={formData.runHours} onChangeText={t => setFormData({...formData, runHours: t})} />
          <View style={s.switchRow}><Text>Running</Text><Switch value={formData.runStatus} onValueChange={v => setFormData({...formData, runStatus: v})} /></View>
          <TextInput style={[s.input, {height: 80}]} placeholder="Remarks" multiline value={formData.remarks} onChangeText={t => setFormData({...formData, remarks: t})} />
          <View style={s.actions}>
            <Pressable onPress={() => setShowForm(false)}><Text style={s.cancel}>Cancel</Text></Pressable>
            <Pressable style={s.submit} onPress={handleSubmit}><Text style={s.submitTxt}>Add</Text></Pressable>
          </View>
        </View></View>
      </Modal>
      <Modal visible={!!selectedLog} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <Text style={s.modalTitle}>{selectedLog?.equipmentTag}</Text>
          <Text style={s.lbl}>Date</Text><Text style={s.val}>{selectedLog?.date ? new Date(selectedLog.date).toLocaleString() : 'N/A'}</Text>
          <Text style={s.lbl}>Hours</Text><Text style={s.val}>{selectedLog?.runHours || 0}</Text>
          <Text style={s.lbl}>Status</Text><Text style={s.val}>{selectedLog?.runStatus ? 'Running' : 'Stopped'}</Text>
          <Text style={s.lbl}>Remarks</Text><Text style={s.val}>{selectedLog?.remarks || 'None'}</Text>
          <Pressable style={s.closeBtn} onPress={() => setSelectedLog(null)}><Text style={s.closeTxt}>Close</Text></Pressable>
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' }, content: { padding: 16 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#ef4444' }, addBtn: { backgroundColor: '#d97706', padding: 8, borderRadius: 8, marginRight: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  statVal: { fontSize: 24, fontWeight: '700', color: '#0f172a' }, statLbl: { fontSize: 11, color: '#64748b' },
  title: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' }, dot: { width: 10, height: 10, borderRadius: 5 },
  meta: { fontSize: 11, color: '#64748b', marginTop: 4 }, remarks: { fontSize: 12, color: '#475569', marginTop: 6, fontStyle: 'italic' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancel: { color: '#64748b', padding: 12 }, submit: { backgroundColor: '#d97706', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 12 },
  submitTxt: { color: '#fff', fontWeight: '600' }, lbl: { fontSize: 12, color: '#64748b', marginTop: 12 }, val: { fontSize: 14, color: '#0f172a', marginTop: 2 },
  closeBtn: { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' }, closeTxt: { color: '#475569', fontWeight: '600' },
});
