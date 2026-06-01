import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

const CATEGORIES = [
  { id: 'STORES', icon: 'package-variant', color: '#2563eb', bg: '#eff6ff' },
  { id: 'SPARES', icon: 'wrench', color: '#d97706', bg: '#fffbeb' },
  { id: 'CAPITAL', icon: 'hard-hat', color: '#059669', bg: '#ecfdf5' },
];

export default function MRPScreen() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api.get<any[]>('/budgets');
      setBudgets(res || []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const fmt = (n: number) => n >= 10000000 ? `₹${(n/10000000).toFixed(1)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${n.toLocaleString()}`;

  const filteredBudgets = budgets.filter(b => {
    const matchesSearch = b.title?.toLowerCase().includes(filter.toLowerCase()) || b.category?.toLowerCase().includes(filter.toLowerCase());
    return matchesSearch && (!categoryFilter || b.category === categoryFilter);
  });

  const getTotals = () => {
    const result: Record<string, { allocated: number, utilized: number }> = {};
    CATEGORIES.forEach(c => { result[c.id] = { allocated: 0, utilized: 0 }; });
    budgets.forEach(b => {
      if (result[b.category]) {
        result[b.category].allocated += b.allocatedAmount || 0;
        result[b.category].utilized += b.utilizedAmount || 0;
      }
    });
    return result;
  };

  const totals = getTotals();
  const totalAllocated = Object.values(totals).reduce((sum, t) => sum + t.allocated, 0);
  const totalUtilized = Object.values(totals).reduce((sum, t) => sum + t.utilized, 0);

  if (loading) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color="#4f46e5" /></View>;
  if (error) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><Text style={styles.error}>Error: {error}</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: 'Material Planner', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryTitle, { color: colors.textTertiary }]}>Budget Overview</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{fmt(totalAllocated)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Allocated</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, {color:'#22c55e'}]}>{fmt(totalUtilized)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Utilized</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, {color:'#3b82f6'}]}>{totalAllocated > 0 ? Math.round((totalUtilized/totalAllocated)*100) : 0}%</Text>
              <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Usage</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map(c => (
            <Pressable key={c.id} style={[styles.catCard, {backgroundColor: c.bg}, categoryFilter === c.id && styles.catActive]} onPress={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)}>
              <MaterialCommunityIcons name={c.icon as any} size={28} color={c.color} />
              <Text style={[styles.catLabel, { color: colors.textSecondary }]}>{c.id}</Text>
              <Text style={[styles.catValue, {color: c.color}]}>{fmt(totals[c.id]?.allocated || 0)}</Text>
              <Text style={[styles.catMeta, { color: colors.textTertiary }]}>{totals[c.id]?.allocated > 0 ? Math.round((totals[c.id].utilized/totals[c.id].allocated)*100) : 0}% used</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search budgets..." placeholderTextColor={colors.inputPlaceholder} value={filter} onChangeText={setFilter} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Items ({filteredBudgets.length})</Text>
        {filteredBudgets.slice(0, 20).map((b, i) => (
          <Pressable key={b.id || i} style={[styles.card, { backgroundColor: colors.card }]} onPress={() => setSelectedBudget(b)}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{b.title}</Text>
              <View style={[styles.badge, {backgroundColor: CATEGORIES.find(c => c.id === b.category)?.bg}]}>
                <Text style={[styles.badgeText, {color: CATEGORIES.find(c => c.id === b.category)?.color}]}>{b.category}</Text>
              </View>
            </View>
            <View style={styles.cardRow}>
              <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>Allocated: {fmt(b.allocatedAmount || 0)}</Text>
              <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>Used: {fmt(b.utilizedAmount || 0)}</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${Math.min((b.utilizedAmount || 0) / (b.allocatedAmount || 1) * 100, 100)}%` }]} />
            </View>
          </Pressable>
        ))}
        {filteredBudgets.length === 0 && <Text style={[styles.empty, { color: colors.textTertiary }]}>No budgets found</Text>}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedBudget} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedBudget?.title}</Text>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Category</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedBudget?.category}</Text>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Allocated Amount</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{fmt(selectedBudget?.allocatedAmount || 0)}</Text>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Utilized Amount</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{fmt(selectedBudget?.utilizedAmount || 0)}</Text>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Remaining</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{fmt((selectedBudget?.allocatedAmount || 0) - (selectedBudget?.utilizedAmount || 0))}</Text>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Fiscal Year</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedBudget?.fiscalYear || 'N/A'}</Text>
            <Pressable style={[styles.closeBtn, { backgroundColor: colors.backgroundTertiary }]} onPress={() => setSelectedBudget(null)}><Text style={[styles.closeText, { color: colors.textSecondary }]}>Close</Text></Pressable>
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
  summaryCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  summaryLabel: { fontSize: 11, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  catGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  catCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  catActive: { borderWidth: 2, borderColor: '#4f46e5' },
  catLabel: { fontSize: 10, fontWeight: '600', marginTop: 8 },
  catValue: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  catMeta: { fontSize: 10, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardMeta: { fontSize: 11 },
  progressBar: { height: 4, borderRadius: 2, marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: '#4f46e5', borderRadius: 2 },
  empty: { textAlign: 'center', marginTop: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  detailLabel: { fontSize: 12, marginTop: 12 },
  detailValue: { fontSize: 14, marginTop: 2 },
  closeBtn: { padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  closeText: { fontSize: 14, fontWeight: '600' },
});
