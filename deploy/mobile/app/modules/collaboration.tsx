import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

export default function CollaborationScreen() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [loading, setLoading] = useState(true);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDiscussion, setSelectedDiscussion] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'GENERAL' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api.get<any[]>('/collaboration/discussions');
      setDiscussions(res || []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/collaboration/discussions', formData);
      setShowForm(false);
      setFormData({ title: '', content: '', category: 'GENERAL' });
      fetchData();
    } catch (e: any) { alert('Failed to create discussion: ' + e.message); } finally { setSubmitting(false); }
  };

  const CATEGORIES = ['GENERAL', 'TECHNICAL', 'SAFETY', 'IMPROVEMENT'];
  const CAT_COLORS: Record<string, string> = { GENERAL: '#3b82f6', TECHNICAL: '#8b5cf6', SAFETY: '#ef4444', IMPROVEMENT: '#22c55e' };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color="#7c3aed" /></View>;
  if (error) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><Text style={styles.error}>Error: {error}</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: 'Collaboration', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </Pressable>
      )}} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}><MaterialCommunityIcons name="message-text" size={24} color="#7c3aed" /><Text style={[styles.statValue, { color: colors.text }]}>{discussions.length}</Text><Text style={[styles.statLabel, { color: colors.textTertiary }]}>Discussions</Text></View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}><MaterialCommunityIcons name="comment-multiple" size={24} color="#3b82f6" /><Text style={[styles.statValue, { color: colors.text }]}>{discussions.reduce((sum, d) => sum + (d.repliesCount || 0), 0)}</Text><Text style={[styles.statLabel, { color: colors.textTertiary }]}>Replies</Text></View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Discussions</Text>
        {discussions.slice(0, 20).map((disc, i) => (
          <Pressable key={disc.id || i} style={[styles.card, { backgroundColor: colors.card }]} onPress={() => setSelectedDiscussion(disc)}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{disc.title}</Text>
              <View style={[styles.badge, { backgroundColor: CAT_COLORS[disc.category] || '#94a3b8' }]}>
                <Text style={styles.badgeText}>{disc.category || 'GENERAL'}</Text>
              </View>
            </View>
            <Text style={[styles.cardSub, { color: colors.textTertiary }]} numberOfLines={2}>{disc.content}</Text>
            <View style={styles.cardFooter}>
              <Text style={[styles.cardMeta, { color: colors.textTertiary }]}><MaterialCommunityIcons name="account" size={12} color={colors.textTertiary} /> {disc.author || 'Anonymous'}</Text>
              <Text style={[styles.cardMeta, { color: colors.textTertiary }]}><MaterialCommunityIcons name="comment" size={12} color={colors.textTertiary} /> {disc.repliesCount || 0} replies</Text>
            </View>
          </Pressable>
        ))}
        {discussions.length === 0 && <Text style={[styles.empty, { color: colors.textTertiary }]}>No discussions yet. Start the conversation!</Text>}
      </ScrollView>

      {/* Create Discussion Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Discussion</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Title *" placeholderTextColor={colors.inputPlaceholder} value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />
            <TextInput style={[styles.input, { height: 100, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Content" placeholderTextColor={colors.inputPlaceholder} multiline value={formData.content} onChangeText={t => setFormData({...formData, content: t})} />
            <Text style={[styles.label, { color: colors.textTertiary }]}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map(c => (
                <Pressable key={c} style={[styles.chip, { backgroundColor: colors.backgroundTertiary }, formData.category === c && styles.chipActive]} onPress={() => setFormData({...formData, category: c})}>
                  <Text style={[styles.chipText, { color: colors.textSecondary }, formData.category === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowForm(false)}><Text style={[styles.cancelText, { color: colors.textTertiary }]}>Cancel</Text></Pressable>
              <Pressable style={[styles.submitBtn, submitting && {opacity: 0.5}]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Post</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!selectedDiscussion} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedDiscussion?.title}</Text>
            <View style={[styles.badge, { backgroundColor: CAT_COLORS[selectedDiscussion?.category] || '#94a3b8', alignSelf: 'flex-start', marginBottom: 16 }]}>
              <Text style={styles.badgeText}>{selectedDiscussion?.category || 'GENERAL'}</Text>
            </View>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Posted by</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDiscussion?.author || 'Anonymous'}</Text>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Content</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDiscussion?.content || 'No content'}</Text>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Posted</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDiscussion?.createdAt ? new Date(selectedDiscussion.createdAt).toLocaleDateString() : 'N/A'}</Text>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Replies</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDiscussion?.repliesCount || 0} replies</Text>
            <Pressable style={[styles.closeBtn, { backgroundColor: colors.backgroundTertiary }]} onPress={() => setSelectedDiscussion(null)}><Text style={[styles.closeText, { color: colors.textSecondary }]}>Close</Text></Pressable>
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
  addBtn: { backgroundColor: '#7c3aed', padding: 8, borderRadius: 8, marginRight: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 4 },
  statValue: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  statLabel: { fontSize: 11 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '600' },
  cardSub: { fontSize: 13, marginTop: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cardMeta: { fontSize: 11 },
  empty: { textAlign: 'center', marginTop: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#7c3aed' },
  chipText: { fontSize: 11 },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelText: { padding: 12 },
  submitBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 12 },
  submitText: { color: '#fff', fontWeight: '600' },
  detailLabel: { fontSize: 12, marginTop: 12 },
  detailValue: { fontSize: 14, marginTop: 2 },
  closeBtn: { padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  closeText: { fontSize: 14, fontWeight: '600' },
});
