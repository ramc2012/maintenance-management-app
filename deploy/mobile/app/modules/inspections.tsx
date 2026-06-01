import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/Themed';
import api from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

interface InspectionRound {
  id: string;
  name: string;
  frequency: string;
  assignedDept: string | null;
  isActive: boolean;
  flIds: { id: string; name: string; description?: string }[];
}

interface InspectionExecution {
  id: string;
  roundId: string;
  round?: InspectionRound;
  executedBy: string;
  executedAt: string;
  completedAt: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED';
  readings: Reading[];
  flaggedItems: FlaggedItem[];
}

interface Reading {
  flId: string;
  flName: string;
  value?: number | null;
  unit?: string;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'NOT_CHECKED';
  notes?: string;
}

interface FlaggedItem {
  flId: string;
  flName: string;
  note: string;
}

type Tab = 'rounds' | 'active' | 'history';

const FREQ_ACCENT: Record<string, string> = {
  DAILY: '#2563eb',
  WEEKLY: '#059669',
  MONTHLY: '#d97706',
};

const STATUS_ACCENT: Record<string, { bg: string; color: string }> = {
  NORMAL: { bg: '#dcfce7', color: '#166534' },
  WARNING: { bg: '#fef3c7', color: '#92400e' },
  CRITICAL: { bg: '#fee2e2', color: '#991b1b' },
  NOT_CHECKED: { bg: '#f1f5f9', color: '#475569' },
};

export default function InspectionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;
  const [tab, setTab] = useState<Tab>('rounds');
  const [rounds, setRounds] = useState<InspectionRound[]>([]);
  const [executions, setExecutions] = useState<InspectionExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeExecution, setActiveExecution] = useState<InspectionExecution | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [roundsRes, execsRes] = await Promise.all([
        api.get<InspectionRound[]>('/inspections/rounds'),
        api.get<InspectionExecution[]>('/inspections/executions'),
      ]);
      setRounds(roundsRes || []);
      setExecutions(execsRes || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const startExecution = async (round: InspectionRound) => {
    try {
      const exec = await api.post<InspectionExecution>('/inspections/executions', { roundId: round.id });
      setActiveExecution(exec);
      setReadings(exec.readings || round.flIds.map((fl) => ({ flId: fl.id, flName: fl.name, status: 'NOT_CHECKED' as const })));
      setTab('active');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to start';
      Alert.alert('Error', msg);
    }
  };

  const updateReading = (index: number, field: keyof Reading, value: unknown) => {
    setReadings((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveProgress = async () => {
    if (!activeExecution) return;
    setSaving(true);
    try {
      await api.put(`/inspections/executions/${activeExecution.id}`, { readings });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Save failed');
    }
    setSaving(false);
  };

  const completeExecution = async () => {
    if (!activeExecution) return;
    const criticals = readings.filter((r) => r.status === 'CRITICAL');
    const message = criticals.length > 0
      ? `${criticals.length} CRITICAL reading(s) will auto-create maintenance requests. Complete anyway?`
      : 'Mark this inspection as completed?';

    Alert.alert('Complete Inspection', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await api.post(`/inspections/executions/${activeExecution.id}/complete`, { readings });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setActiveExecution(null);
            setReadings([]);
            setTab('history');
            fetchData();
          } catch {
            Alert.alert('Error', 'Complete failed');
          }
          setSaving(false);
        },
      },
    ]);
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color="#0f766e" /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: 'Inspections', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([
          { key: 'rounds', label: 'Rounds', icon: 'clipboard-list-outline' },
          { key: 'active', label: 'Execute', icon: 'play-circle-outline' },
          { key: 'history', label: 'History', icon: 'history' },
        ] as const).map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key)}
          >
            <MaterialCommunityIcons name={t.icon} size={18} color={tab === t.key ? '#0f766e' : colors.textTertiary} />
            <Text style={[styles.tabText, { color: colors.textTertiary }, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Rounds Tab */}
      {tab === 'rounds' && (
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}>
          <View style={[styles.hero, { backgroundColor: theme.isDark ? colors.surface : '#0f172a' }]}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={32} color="#5eead4" />
            <Text style={[styles.heroTitle, { color: '#ffffff' }]}>Inspection Rounds</Text>
          </View>

          {rounds.length === 0 ? (
            <EmptyState message="No inspection rounds configured. Create them from the web dashboard." colors={colors} />
          ) : (
            rounds.filter((r) => r.isActive).map((round) => (
              <Pressable key={round.id} style={[styles.roundCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => startExecution(round)}>
                <View style={styles.roundHeader}>
                  <View style={styles.roundLeft}>
                    <Text style={[styles.roundName, { color: colors.text }]}>{round.name}</Text>
                    <View style={styles.roundMeta}>
                      <FrequencyPill value={round.frequency} />
                      <Text style={[styles.roundDept, { color: colors.textTertiary }]}>{round.assignedDept || 'All'}</Text>
                      <Text style={[styles.roundFLCount, { color: colors.textTertiary }]}>{round.flIds.length} FLs</Text>
                    </View>
                  </View>
                  <View style={styles.startBtn}>
                    <MaterialCommunityIcons name="play" size={16} color="#ffffff" />
                  </View>
                </View>
                <View style={[styles.flPreview, { borderTopColor: colors.backgroundTertiary }]}>
                  {round.flIds.slice(0, 3).map((fl, i) => (
                    <Text key={fl.id} style={[styles.flItem, { color: colors.textSecondary }]}>{i + 1}. {fl.name}</Text>
                  ))}
                  {round.flIds.length > 3 && (
                    <Text style={[styles.flMore, { color: colors.textTertiary }]}>+{round.flIds.length - 3} more locations</Text>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Active Execution Tab */}
      {tab === 'active' && (
        <View style={{ flex: 1 }}>
          {!activeExecution ? (
            <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}>
              <MaterialCommunityIcons name="clipboard-clock-outline" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No active execution</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Go to Rounds tab and tap a round to start.</Text>
            </View>
          ) : (
            <>
              {/* Execution header */}
              <View style={[styles.execHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Text style={[styles.execTitle, { color: colors.text }]}>{activeExecution.round?.name || 'Inspection'}</Text>
                <Text style={[styles.execMeta, { color: colors.textTertiary }]}>{readings.filter((r) => r.status !== 'NOT_CHECKED').length}/{readings.length} checked</Text>
              </View>

              {/* Readings list */}
              <FlatList
                data={readings}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={styles.readingsList}
                renderItem={({ item, index }) => (
                  <ReadingCard
                    reading={item}
                    index={index}
                    onUpdate={(field, value) => updateReading(index, field, value)}
                    colors={colors}
                  />
                )}
              />

              {/* Action bar */}
              <View style={[styles.execActions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <Pressable style={[styles.saveBtn, { borderColor: '#0f766e', backgroundColor: theme.isDark ? colors.backgroundTertiary : '#ecfdf5' }]} onPress={saveProgress} disabled={saving}>
                  <MaterialCommunityIcons name="content-save-outline" size={18} color="#0f766e" />
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Progress'}</Text>
                </Pressable>
                <Pressable style={styles.completeBtn} onPress={completeExecution} disabled={saving}>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="#ffffff" />
                  <Text style={styles.completeBtnText}>{saving ? 'Processing...' : 'Complete'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}>
          {executions.length === 0 ? (
            <EmptyState message="No completed inspections yet." colors={colors} />
          ) : (
            executions.slice(0, 20).map((exec) => (
              <View key={exec.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyRound, { color: colors.text }]}>{exec.round?.name || 'Unknown Round'}</Text>
                  <StatusPill status={exec.status} />
                </View>
                <View style={styles.historyMeta}>
                  <Text style={[styles.historyDate, { color: colors.textTertiary }]}>{new Date(exec.executedAt).toLocaleDateString()}</Text>
                  <Text style={[styles.historyBy, { color: colors.textTertiary }]}>{exec.executedBy}</Text>
                  {exec.flaggedItems?.length > 0 && (
                    <View style={styles.flagBadge}>
                      <MaterialCommunityIcons name="flag" size={12} color="#dc2626" />
                      <Text style={styles.flagText}>{exec.flaggedItems.length}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ReadingCard({ reading, index, onUpdate, colors }: { reading: Reading; index: number; onUpdate: (field: keyof Reading, value: unknown) => void; colors: any }) {
  const statusConfig = STATUS_ACCENT[reading.status] || STATUS_ACCENT.NOT_CHECKED;

  return (
    <View style={[styles.readingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.readingHeader}>
        <View style={styles.readingNum}>
          <Text style={styles.readingNumText}>{index + 1}</Text>
        </View>
        <Text style={[styles.readingName, { color: colors.text }]} numberOfLines={1}>{reading.flName}</Text>
      </View>

      <View style={styles.readingInputs}>
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Value</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="0.0"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="decimal-pad"
              value={reading.value != null ? String(reading.value) : ''}
              onChangeText={(t) => onUpdate('value', t ? parseFloat(t) : null)}
            />
          </View>
          <View style={styles.inputHalf}>
            <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Unit</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="bar, C, m3/h"
              placeholderTextColor={colors.inputPlaceholder}
              value={reading.unit || ''}
              onChangeText={(t) => onUpdate('unit', t)}
            />
          </View>
        </View>

        <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Status</Text>
        <View style={styles.statusRow}>
          {(['NORMAL', 'WARNING', 'CRITICAL', 'NOT_CHECKED'] as const).map((s) => {
            const cfg = STATUS_ACCENT[s];
            const isSelected = reading.status === s;
            return (
              <Pressable
                key={s}
                style={[styles.statusChip, { borderColor: colors.border }, isSelected && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                onPress={() => {
                  onUpdate('status', s);
                  if (s === 'CRITICAL') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }}
              >
                <Text style={[styles.statusChipText, { color: colors.textTertiary }, isSelected && { color: cfg.color, fontWeight: '700' }]}>{s === 'NOT_CHECKED' ? 'N/A' : s.slice(0, 4)}</Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={[styles.textInput, styles.notesInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="Notes / observations..."
          placeholderTextColor={colors.inputPlaceholder}
          value={reading.notes || ''}
          onChangeText={(t) => onUpdate('notes', t)}
          multiline
        />
      </View>

      {reading.status === 'CRITICAL' && (
        <View style={styles.criticalBanner}>
          <MaterialCommunityIcons name="alert-circle" size={14} color="#991b1b" />
          <Text style={styles.criticalText}>Will auto-create maintenance request on completion</Text>
        </View>
      )}
    </View>
  );
}

function FrequencyPill({ value }: { value: string }) {
  const accent = FREQ_ACCENT[value] || '#64748b';
  return (
    <View style={[styles.freqPill, { backgroundColor: `${accent}15` }]}>
      <Text style={[styles.freqText, { color: accent }]}>{value}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const isComplete = status === 'COMPLETED';
  return (
    <View style={[styles.statusPillSmall, { backgroundColor: isComplete ? '#dcfce7' : '#fef3c7' }]}>
      <Text style={[styles.statusPillText, { color: isComplete ? '#166534' : '#92400e' }]}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

function EmptyState({ message, colors }: { message: string; colors: any }) {
  return (
    <View style={styles.emptyCard}>
      <MaterialCommunityIcons name="clipboard-text-outline" size={28} color={colors.textTertiary} />
      <Text style={[styles.emptyMessage, { color: colors.textTertiary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#0f766e' },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#0f766e' },
  hero: { borderRadius: 18, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroTitle: { fontSize: 20, fontWeight: '800' },
  roundCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
  roundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundLeft: { flex: 1 },
  roundName: { fontSize: 16, fontWeight: '700' },
  roundMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  roundDept: { fontSize: 12 },
  roundFLCount: { fontSize: 12 },
  startBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#0f766e', alignItems: 'center', justifyContent: 'center' },
  flPreview: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 4 },
  flItem: { fontSize: 12 },
  flMore: { fontSize: 12, fontStyle: 'italic' },
  freqPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  freqText: { fontSize: 10, fontWeight: '700' },
  execHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  execTitle: { fontSize: 16, fontWeight: '700' },
  execMeta: { fontSize: 12 },
  readingsList: { padding: 16, paddingBottom: 100 },
  readingCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  readingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  readingNum: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#0f766e', alignItems: 'center', justifyContent: 'center' },
  readingNumText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  readingName: { flex: 1, fontSize: 14, fontWeight: '600' },
  readingInputs: { gap: 10 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  textInput: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  notesInput: { height: 60, textAlignVertical: 'top', paddingTop: 10 },
  statusRow: { flexDirection: 'row', gap: 6 },
  statusChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  statusChipText: { fontSize: 11, fontWeight: '600' },
  criticalBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: '#fef2f2' },
  criticalText: { fontSize: 11, color: '#991b1b', flex: 1 },
  execActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1 },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, borderWidth: 1 },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#0f766e' },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, backgroundColor: '#0f766e' },
  completeBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  historyCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyRound: { fontSize: 14, fontWeight: '700' },
  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  historyDate: { fontSize: 12 },
  historyBy: { fontSize: 12 },
  flagBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  flagText: { fontSize: 11, fontWeight: '700', color: '#dc2626' },
  statusPillSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  emptyCard: { alignItems: 'center', padding: 30, gap: 12 },
  emptyMessage: { fontSize: 13, textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtext: { fontSize: 13, textAlign: 'center', maxWidth: 240 },
});
