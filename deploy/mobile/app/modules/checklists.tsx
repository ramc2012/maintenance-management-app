import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';

import { Text } from '@/components/Themed';
import api from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────
type SectionType = 'PARAMETERS' | 'STATUS_LIST' | 'INSPECTION_GROUP' | 'WORK_LOG' | 'SIGNOFF';

interface ParameterCol {
  key: string;
  label: string;
}
interface ParameterItem {
  key: string;
  label: string;
  unit?: string;
  note?: string;
  cols?: ParameterCol[];
}
interface StatusItem {
  key: string;
  label: string;
  defaultValue?: string;
}
interface InspectionGroupItem {
  key: string;
  label: string;
}
interface InspectionGroup {
  key: string;
  title: string;
  items: InspectionGroupItem[];
}
interface WorkLogShift {
  key: string;
  label: string;
}
interface SignoffItem {
  key: string;
  label: string;
}

type Section =
  | { key: string; title: string; type: 'PARAMETERS'; items: ParameterItem[] }
  | { key: string; title: string; type: 'STATUS_LIST'; items: StatusItem[] }
  | { key: string; title: string; type: 'INSPECTION_GROUP'; groups: InspectionGroup[] }
  | { key: string; title: string; type: 'WORK_LOG'; shifts: WorkLogShift[] }
  | { key: string; title: string; type: 'SIGNOFF'; items: SignoffItem[] };

interface HeaderField {
  key: string;
  label: string;
  type: string;
  default?: string;
}

interface ChecklistApprovers {
  shiftIncharge: string[];
  instrumentIncharge: string[];
}

interface ChecklistTemplate {
  id: string;
  code: string;
  name: string;
  discipline: string;
  description?: string;
  rigType?: string;
  headerFields: HeaderField[];
  sections: Section[];
  approvers?: ChecklistApprovers;
  isActive: boolean;
  _count?: { submissions: number };
}

type ChecklistStatus = 'DRAFT' | 'SUBMITTED' | 'COMPLETED';

interface ChecklistSubmission {
  id: string;
  templateId: string;
  template?: ChecklistTemplate & { id: string; code: string; name: string; discipline: string };
  date: string;
  shift?: string;
  header: Record<string, string>;
  responses: Record<string, unknown>;
  status: ChecklistStatus;
  flaggedCount: number;
  remarks?: string;
  shiftInchargeSign?: string;
  deptInchargeSign?: string;
  submittedBy?: string;
  submittedAt?: string;
  shiftApprovedBy?: string;
  shiftApprovedAt?: string;
  instrApprovedBy?: string;
  instrApprovedAt?: string;
  createdAt: string;
  updatedAt: string;
}

type Tab = 'templates' | 'fill' | 'history';
type CheckStatus = 'OK' | 'ATTENTION' | 'NA';

const SHIFTS = ['DAY', 'NIGHT', 'GENERAL'] as const;

const DISCIPLINE_ACCENT: Record<string, string> = {
  MECHANICAL: '#2563eb',
  ELECTRICAL: '#d97706',
  INSTRUMENTATION: '#059669',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ChecklistsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const accent = colors.primary;
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [submissions, setSubmissions] = useState<ChecklistSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fill state
  const [activeTemplate, setActiveTemplate] = useState<ChecklistTemplate | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [header, setHeader] = useState<Record<string, string>>({});
  const [date, setDate] = useState<string>(todayISO());
  const [shift, setShift] = useState<string>('DAY');
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [remarks, setRemarks] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // History detail
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, ChecklistSubmission>>({});

  const fetchData = useCallback(async () => {
    try {
      const [tplRes, subRes] = await Promise.all([
        api.get<ChecklistTemplate[]>('/checklists/templates?active=true'),
        api.get<ChecklistSubmission[]>('/checklists/submissions?limit=50'),
      ]);
      setTemplates(tplRes || []);
      setSubmissions(subRes || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ─── Start filling a template ───────────────────────────────────────────────
  const startTemplate = async (template: ChecklistTemplate) => {
    try {
      // Fetch full template (list version may omit sections)
      const full = await api.get<ChecklistTemplate>(`/checklists/templates/${template.id}`);
      const tpl = full || template;
      setActiveTemplate(tpl);
      setEditingId(null);
      // Prefill header defaults
      const initialHeader: Record<string, string> = {};
      (tpl.headerFields || []).forEach((f) => {
        initialHeader[f.key] = f.default ?? '';
      });
      setDate(todayISO());
      setShift('DAY');

      // Prefill status lists from the latest submission (verify & change).
      let prevResponses: Record<string, any> | null = null;
      let prevHeader: Record<string, any> = {};
      try {
        const latest = await api.get<ChecklistSubmission[]>(
          `/checklists/submissions?templateId=${tpl.id}&limit=1`,
        );
        if (latest && latest.length) {
          prevResponses = (latest[0].responses as Record<string, any>) || null;
          prevHeader = (latest[0].header as Record<string, any>) || {};
        }
      } catch { /* best-effort prefill */ }

      setHeader({ ...prevHeader, ...initialHeader });
      setPrefilled(Boolean(prevResponses));
      setResponses(buildInitialResponses(tpl, prevResponses));
      setRemarks('');
      setTab('fill');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load template';
      Alert.alert('Error', msg);
    }
  };

  // ─── Edit an existing draft submission ──────────────────────────────────────
  const editSubmission = async (submission: ChecklistSubmission) => {
    try {
      const full = await api.get<ChecklistSubmission>(`/checklists/submissions/${submission.id}`);
      const sub = full || submission;
      const tpl = sub.template;
      if (!tpl || !tpl.sections) {
        Alert.alert('Error', 'Template details unavailable for this submission.');
        return;
      }
      setActiveTemplate(tpl as ChecklistTemplate);
      setEditingId(sub.id);
      setPrefilled(false);
      setHeader({ ...(sub.header || {}) });
      setDate(sub.date ? sub.date.slice(0, 10) : todayISO());
      setShift(sub.shift || 'DAY');
      setResponses({ ...buildInitialResponses(tpl as ChecklistTemplate), ...(sub.responses as Record<string, any>) });
      setRemarks(sub.remarks || '');
      setTab('fill');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load submission';
      Alert.alert('Error', msg);
    }
  };

  // ─── Response mutators ──────────────────────────────────────────────────────
  const setSectionResponse = (sectionKey: string, value: any) => {
    setResponses((prev) => ({ ...prev, [sectionKey]: value }));
  };

  const setParamValue = (sectionKey: string, itemKey: string, colKey: string | null, value: string) => {
    setResponses((prev) => {
      const section = { ...(prev[sectionKey] || {}) };
      if (colKey) {
        section[itemKey] = { ...(section[itemKey] || {}), [colKey]: value };
      } else {
        section[itemKey] = { value };
      }
      return { ...prev, [sectionKey]: section };
    });
  };

  const setStatusEntry = (
    sectionKey: string,
    itemKey: string,
    patch: Partial<{ status: CheckStatus; value: string; remark: string }>,
  ) => {
    setResponses((prev) => {
      const section = { ...(prev[sectionKey] || {}) };
      section[itemKey] = { ...(section[itemKey] || {}), ...patch };
      return { ...prev, [sectionKey]: section };
    });
  };

  const setWorkLog = (sectionKey: string, shiftKey: string, field: 'crew' | 'jobs', value: string) => {
    setResponses((prev) => {
      const section = { ...(prev[sectionKey] || {}) };
      section[shiftKey] = { ...(section[shiftKey] || {}), [field]: value };
      return { ...prev, [sectionKey]: section };
    });
  };

  const setSignoff = (sectionKey: string, itemKey: string, value: string) => {
    setResponses((prev) => {
      const section = { ...(prev[sectionKey] || {}) };
      section[itemKey] = value;
      return { ...prev, [sectionKey]: section };
    });
  };

  // ─── Flag count (number of ATTENTION entries) ───────────────────────────────
  const flaggedCount = useMemo(() => countFlags(activeTemplate, responses), [activeTemplate, responses]);

  // ─── Save / Submit ──────────────────────────────────────────────────────────
  const persist = async (status: ChecklistStatus) => {
    if (!activeTemplate) return;
    setSaving(true);
    const body = {
      templateId: activeTemplate.id,
      date,
      shift,
      header,
      responses,
      remarks: remarks || undefined,
      status,
      flaggedCount,
    };
    try {
      if (editingId) {
        await api.put(`/checklists/submissions/${editingId}`, body);
      } else {
        await api.post('/checklists/submissions', body);
      }
      if (status === 'SUBMITTED') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setActiveTemplate(null);
      setEditingId(null);
      setResponses({});
      setHeader({});
      setRemarks('');
      setTab('history');
      fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : `${status === 'DRAFT' ? 'Save' : 'Submit'} failed`;
      Alert.alert('Error', msg);
    }
    setSaving(false);
  };

  const onSubmit = () => {
    const message =
      flaggedCount > 0
        ? `${flaggedCount} item(s) flagged for ATTENTION. Submit this checklist?`
        : 'Submit this checklist?';
    Alert.alert('Submit Checklist', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', onPress: () => persist('SUBMITTED') },
    ]);
  };

  // ─── History detail toggle ──────────────────────────────────────────────────
  const toggleDetail = async (submission: ChecklistSubmission) => {
    if (expandedId === submission.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(submission.id);
    if (!detailCache[submission.id]) {
      try {
        const full = await api.get<ChecklistSubmission>(`/checklists/submissions/${submission.id}`);
        if (full) setDetailCache((prev) => ({ ...prev, [submission.id]: full }));
      } catch {}
    }
  };

  // ─── Download submission as Excel ────────────────────────────────────────────
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const downloadSubmission = async (submission: ChecklistSubmission) => {
    const rig = (submission.header as any)?.rigName || submission.template?.code || 'DPR';
    const dateStr = submission.date ? new Date(submission.date).toISOString().slice(0, 10) : 'undated';
    const fileName = `${String(rig).replace(/[^a-z0-9]+/gi, '_')}_${dateStr}.xlsx`;
    setDownloadingId(submission.id);
    try {
      const uri = await api.download(`/checklists/submissions/${submission.id}/export`, fileName);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Downloaded', `Saved to ${uri}`);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Download failed';
      Alert.alert('Download failed', msg);
    } finally {
      setDownloadingId(null);
    }
  };

  // ─── Approval (two-gate) ─────────────────────────────────────────────────────
  const [approvingKey, setApprovingKey] = useState<string | null>(null);
  const eligibleFor = (gate: 'SHIFT' | 'INSTRUMENT', submission: ChecklistSubmission): boolean => {
    if (!user?.username) return false;
    if (user.role === 'ADMIN') return true;
    const ap = submission.template?.approvers;
    const list = (gate === 'SHIFT' ? ap?.shiftIncharge : ap?.instrumentIncharge) || [];
    return list.map((u) => u.toLowerCase()).includes(user.username.toLowerCase());
  };
  const approveSubmission = async (submission: ChecklistSubmission, gate: 'SHIFT' | 'INSTRUMENT') => {
    setApprovingKey(`${submission.id}:${gate}`);
    try {
      const updated = await api.post<ChecklistSubmission>(
        `/checklists/submissions/${submission.id}/approve`,
        { gate },
      );
      if (updated) {
        setDetailCache((prev) => ({ ...prev, [submission.id]: { ...prev[submission.id], ...updated } }));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(updated.status === 'COMPLETED' ? 'Completed' : 'Approved', updated.status === 'COMPLETED' ? 'Both approvals done — checklist completed.' : 'Approval recorded.');
        fetchData();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Approval failed';
      Alert.alert('Approval failed', msg);
    } finally {
      setApprovingKey(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen
        options={{ title: 'Daily Checklist', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}
      />

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(
          [
            { key: 'templates', label: 'Templates', icon: 'clipboard-list-outline' },
            { key: 'fill', label: 'Fill', icon: 'clipboard-edit-outline' },
            { key: 'history', label: 'History', icon: 'history' },
          ] as const
        ).map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tabItem, tab === t.key && { borderBottomWidth: 2, borderBottomColor: accent }]}
            onPress={() => setTab(t.key)}
          >
            <MaterialCommunityIcons name={t.icon} size={18} color={tab === t.key ? accent : colors.textTertiary} />
            <Text style={[styles.tabText, { color: tab === t.key ? accent : colors.textTertiary }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Templates Tab */}
      {tab === 'templates' && (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        >
          <View style={[styles.hero, { backgroundColor: theme.isDark ? colors.surface : '#0f172a' }]}>
            <MaterialCommunityIcons name="clipboard-check-multiple-outline" size={32} color="#5eead4" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: '#ffffff' }]}>Daily Checklist / DPR</Text>
              <Text style={[styles.heroSubtitle, { color: '#cbd5e1' }]}>Pick a template to start a daily report</Text>
            </View>
          </View>

          {templates.length === 0 ? (
            <EmptyState message="No active checklist templates. Create them from the web dashboard." colors={colors} />
          ) : (
            templates.map((template) => (
              <Pressable
                key={template.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => startTemplate(template)}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{template.name}</Text>
                    <View style={styles.cardMeta}>
                      <DisciplinePill value={template.discipline} colors={colors} />
                      {template.rigType ? (
                        <Text style={[styles.metaText, { color: colors.textTertiary }]}>{template.rigType}</Text>
                      ) : null}
                      <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                        {template._count?.submissions ?? 0} submissions
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.startBtn, { backgroundColor: accent }]}>
                    <MaterialCommunityIcons name="pencil" size={16} color="#ffffff" />
                  </View>
                </View>
                {template.description ? (
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {template.description}
                  </Text>
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Fill Tab */}
      {tab === 'fill' && (
        <View style={{ flex: 1 }}>
          {!activeTemplate ? (
            <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}>
              <MaterialCommunityIcons name="clipboard-text-clock-outline" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No checklist in progress</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Go to Templates and tap one to start filling.
              </Text>
            </View>
          ) : (
            <>
              <ScrollView contentContainerStyle={styles.fillContent} keyboardShouldPersistTaps="handled">
                {/* Title */}
                <View style={[styles.fillHeader, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.fillTitle, { color: colors.text }]}>{activeTemplate.name}</Text>
                  <View style={styles.cardMeta}>
                    <DisciplinePill value={activeTemplate.discipline} colors={colors} />
                    {editingId ? (
                      <Text style={[styles.metaText, { color: colors.warning }]}>Editing draft</Text>
                    ) : null}
                  </View>
                </View>

                {prefilled ? (
                  <View style={[styles.prefillBanner, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
                    <MaterialCommunityIcons name="history" size={16} color={colors.info} />
                    <Text style={[styles.prefillText, { color: colors.info }]}>
                      Status lists prefilled from the last report — verify and change only what differs.
                    </Text>
                  </View>
                ) : null}

                {/* Date + Shift */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Report Details</Text>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="2026-06-06"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={date}
                    onChangeText={setDate}
                    autoCapitalize="none"
                  />
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Shift</Text>
                  <View style={styles.chipRow}>
                    {SHIFTS.map((s) => {
                      const selected = shift === s;
                      return (
                        <Pressable
                          key={s}
                          style={[
                            styles.chip,
                            { borderColor: colors.border },
                            selected && { backgroundColor: colors.primarySubtle, borderColor: accent },
                          ]}
                          onPress={() => setShift(s)}
                        >
                          <Text style={[styles.chipText, { color: selected ? accent : colors.textTertiary }, selected && { fontWeight: '700' }]}>
                            {s}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Header fields */}
                  {(activeTemplate.headerFields || []).map((f) => (
                    <View key={f.key}>
                      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>{f.label}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                        placeholder={f.label}
                        placeholderTextColor={colors.inputPlaceholder}
                        value={header[f.key] ?? ''}
                        onChangeText={(v) => setHeader((prev) => ({ ...prev, [f.key]: v }))}
                        keyboardType={f.type === 'number' ? 'numeric' : 'default'}
                      />
                    </View>
                  ))}
                </View>

                {/* Sections */}
                {(activeTemplate.sections || []).map((section) => (
                  <SectionRenderer
                    key={section.key}
                    section={section}
                    responses={responses[section.key] || {}}
                    colors={colors}
                    accent={accent}
                    onParamValue={(itemKey, colKey, value) => setParamValue(section.key, itemKey, colKey, value)}
                    onStatusEntry={(itemKey, patch) => setStatusEntry(section.key, itemKey, patch)}
                    onWorkLog={(shiftKey, field, value) => setWorkLog(section.key, shiftKey, field, value)}
                    onSignoff={(itemKey, value) => setSignoff(section.key, itemKey, value)}
                  />
                ))}

                {/* Remarks */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Remarks</Text>
                  <TextInput
                    style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="General remarks / observations..."
                    placeholderTextColor={colors.inputPlaceholder}
                    value={remarks}
                    onChangeText={setRemarks}
                    multiline
                  />
                </View>

                {flaggedCount > 0 ? (
                  <View style={[styles.flagBanner, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                    <MaterialCommunityIcons name="flag" size={14} color={colors.warning} />
                    <Text style={[styles.flagBannerText, { color: colors.warning }]}>
                      {flaggedCount} item(s) flagged for attention
                    </Text>
                  </View>
                ) : null}
              </ScrollView>

              {/* Action bar */}
              <View style={[styles.actions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <Pressable
                  style={[styles.draftBtn, { borderColor: accent, backgroundColor: colors.primarySubtle }]}
                  onPress={() => persist('DRAFT')}
                  disabled={saving}
                >
                  <MaterialCommunityIcons name="content-save-outline" size={18} color={accent} />
                  <Text style={[styles.draftBtnText, { color: accent }]}>{saving ? 'Saving...' : 'Save Draft'}</Text>
                </Pressable>
                <Pressable style={[styles.submitBtn, { backgroundColor: accent }]} onPress={onSubmit} disabled={saving}>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>{saving ? 'Working...' : 'Submit'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        >
          {submissions.length === 0 ? (
            <EmptyState message="No checklist submissions yet." colors={colors} />
          ) : (
            submissions.map((sub) => {
              const expanded = expandedId === sub.id;
              const detail = detailCache[sub.id];
              return (
                <View key={sub.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Pressable onPress={() => toggleDetail(sub)}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{sub.template?.name || 'Checklist'}</Text>
                        <View style={styles.cardMeta}>
                          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                            {sub.date ? new Date(sub.date).toLocaleDateString() : ''}
                          </Text>
                          {sub.shift ? <Text style={[styles.metaText, { color: colors.textTertiary }]}>{sub.shift}</Text> : null}
                          {sub.submittedBy ? (
                            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{sub.submittedBy}</Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.historyRight}>
                        <StatusPill status={sub.status} colors={colors} />
                        {sub.flaggedCount > 0 ? (
                          <View style={[styles.flagBadge, { backgroundColor: colors.warningBg }]}>
                            <MaterialCommunityIcons name="flag" size={11} color={colors.warning} />
                            <Text style={[styles.flagBadgeText, { color: colors.warning }]}>{sub.flaggedCount}</Text>
                          </View>
                        ) : null}
                        <MaterialCommunityIcons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={colors.textTertiary}
                        />
                      </View>
                    </View>
                  </Pressable>

                  {expanded ? (
                    <View style={[styles.detailBox, { borderTopColor: colors.divider }]}>
                      {sub.status === 'DRAFT' ? (
                        <Pressable
                          style={[styles.resumeBtn, { borderColor: accent }]}
                          onPress={() => editSubmission(sub)}
                        >
                          <MaterialCommunityIcons name="pencil" size={14} color={accent} />
                          <Text style={[styles.resumeBtnText, { color: accent }]}>Resume editing</Text>
                        </Pressable>
                      ) : null}
                      {detail ? (
                        <>
                          <SubmissionSummary submission={detail} colors={colors} />

                          {/* Approvals — two gates */}
                          {detail.status !== 'DRAFT' ? (
                            <View style={styles.approvalWrap}>
                              {([
                                { gate: 'SHIFT' as const, label: 'Shift Incharge', by: detail.shiftApprovedBy, at: detail.shiftApprovedAt },
                                { gate: 'INSTRUMENT' as const, label: 'Instr. Incharge', by: detail.instrApprovedBy, at: detail.instrApprovedAt },
                              ]).map(({ gate, label, by, at }) => {
                                const approved = Boolean(by);
                                const canI = !approved && detail.status === 'SUBMITTED' && eligibleFor(gate, detail);
                                const busy = approvingKey === `${detail.id}:${gate}`;
                                return (
                                  <View
                                    key={gate}
                                    style={[
                                      styles.approvalGate,
                                      { borderColor: approved ? colors.success : colors.border, backgroundColor: approved ? colors.successBg : colors.backgroundSecondary },
                                    ]}
                                  >
                                    <View style={styles.approvalHead}>
                                      <Text style={[styles.approvalLabel, { color: colors.text }]}>{label}</Text>
                                      <MaterialCommunityIcons
                                        name={approved ? 'check-circle' : 'clock-outline'}
                                        size={15}
                                        color={approved ? colors.success : colors.textTertiary}
                                      />
                                    </View>
                                    {approved ? (
                                      <Text style={[styles.approvalMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                                        {by}{at ? ` · ${new Date(at).toLocaleDateString()}` : ''}
                                      </Text>
                                    ) : canI ? (
                                      <Pressable
                                        style={[styles.approveBtn, { backgroundColor: accent }]}
                                        onPress={() => approveSubmission(detail, gate)}
                                        disabled={busy}
                                      >
                                        {busy ? (
                                          <ActivityIndicator size="small" color="#ffffff" />
                                        ) : (
                                          <>
                                            <MaterialCommunityIcons name="stamper" size={13} color="#ffffff" />
                                            <Text style={styles.approveBtnText}>Approve</Text>
                                          </>
                                        )}
                                      </Pressable>
                                    ) : (
                                      <Text style={[styles.approvalMeta, { color: colors.textTertiary }]}>Pending</Text>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          ) : null}

                          <Pressable
                            style={[styles.downloadBtn, { backgroundColor: accent }]}
                            onPress={() => downloadSubmission(detail)}
                            disabled={downloadingId === sub.id}
                          >
                            {downloadingId === sub.id ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <MaterialCommunityIcons name="file-excel-outline" size={16} color="#ffffff" />
                            )}
                            <Text style={styles.downloadBtnText}>
                              {downloadingId === sub.id ? 'Preparing…' : 'Download Excel'}
                            </Text>
                          </Pressable>
                        </>
                      ) : (
                        <View style={styles.detailLoading}>
                          <ActivityIndicator size="small" color={accent} />
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Section Renderer ─────────────────────────────────────────────────────────
function SectionRenderer({
  section,
  responses,
  colors,
  accent,
  onParamValue,
  onStatusEntry,
  onWorkLog,
  onSignoff,
}: {
  section: Section;
  responses: Record<string, any>;
  colors: any;
  accent: string;
  onParamValue: (itemKey: string, colKey: string | null, value: string) => void;
  onStatusEntry: (itemKey: string, patch: Partial<{ status: CheckStatus; value: string; remark: string }>) => void;
  onWorkLog: (shiftKey: string, field: 'crew' | 'jobs', value: string) => void;
  onSignoff: (itemKey: string, value: string) => void;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>

      {section.type === 'PARAMETERS' &&
        section.items.map((item, i) => (
          <View
            key={item.key}
            style={[styles.paramRow, i % 2 === 1 && { backgroundColor: colors.backgroundSecondary }]}
          >
            <Text style={[styles.paramLabel, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.label}
              {item.unit ? <Text style={{ color: colors.textTertiary }}> ({item.unit})</Text> : null}
            </Text>
            {item.cols && item.cols.length > 0 ? (
              <View style={styles.paramCols}>
                {item.cols.map((col) => (
                  <View key={col.key} style={styles.paramColCell}>
                    <Text style={[styles.paramColLabel, { color: colors.textTertiary }]}>{col.label}</Text>
                    <TextInput
                      style={[styles.numInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="0"
                      placeholderTextColor={colors.inputPlaceholder}
                      keyboardType="numeric"
                      maxLength={6}
                      value={responses[item.key]?.[col.key] ?? ''}
                      onChangeText={(v) => onParamValue(item.key, col.key, v)}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <TextInput
                style={[styles.numInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="numeric"
                maxLength={6}
                value={responses[item.key]?.value ?? ''}
                onChangeText={(v) => onParamValue(item.key, null, v)}
              />
            )}
          </View>
        ))}

      {section.type === 'STATUS_LIST' &&
        section.items.map((item, i) => {
          const entry = responses[item.key] || {};
          const attention = entry.status === 'ATTENTION';
          return (
            <View
              key={item.key}
              style={[
                styles.statusItemRow,
                i % 2 === 1 && { backgroundColor: colors.backgroundSecondary },
                attention && { backgroundColor: colors.errorBg },
              ]}
            >
              <Text style={[styles.statusItemLabel, { color: attention ? colors.error : colors.textSecondary }]} numberOfLines={1}>
                {item.label}
              </Text>
              <View style={styles.statusControls}>
                <View style={{ flex: 1 }}>
                  <StatusChips
                    value={entry.status}
                    colors={colors}
                    accent={accent}
                    onChange={(status) => onStatusEntry(item.key, { status })}
                  />
                </View>
                <TextInput
                  style={[styles.numInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder={item.defaultValue ?? '—'}
                  placeholderTextColor={colors.inputPlaceholder}
                  maxLength={10}
                  value={entry.value ?? ''}
                  onChangeText={(v) => onStatusEntry(item.key, { value: v })}
                />
              </View>
            </View>
          );
        })}

      {section.type === 'INSPECTION_GROUP' &&
        section.groups.map((group) => (
          <View key={group.key} style={styles.groupBlock}>
            <Text style={[styles.groupTitle, { color: colors.text }]}>{group.title}</Text>
            {group.items.map((item, i) => {
              const entry = responses[item.key] || {};
              const attention = entry.status === 'ATTENTION';
              return (
                <View
                  key={item.key}
                  style={[
                    styles.inspRow,
                    i % 2 === 1 && { backgroundColor: colors.backgroundSecondary },
                    attention && { backgroundColor: colors.warningBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.inspLabel,
                      { color: attention ? colors.warning : colors.textSecondary },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <StatusChips
                    value={entry.status}
                    colors={colors}
                    accent={accent}
                    onChange={(status) => onStatusEntry(item.key, { status })}
                  />
                  {attention ? (
                    <TextInput
                      style={[
                        styles.input,
                        styles.smallInput,
                        { backgroundColor: colors.inputBackground, borderColor: colors.error, color: colors.text },
                      ]}
                      placeholder="Remark (required for attention)"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={entry.remark ?? ''}
                      onChangeText={(v) => onStatusEntry(item.key, { remark: v })}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}

      {section.type === 'WORK_LOG' &&
        section.shifts.map((sh) => {
          const entry = responses[sh.key] || {};
          return (
            <View key={sh.key} style={styles.itemBlock}>
              <Text style={[styles.groupTitle, { color: colors.text }]}>{sh.label}</Text>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Crew</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="Crew on duty"
                placeholderTextColor={colors.inputPlaceholder}
                value={entry.crew ?? ''}
                onChangeText={(v) => onWorkLog(sh.key, 'crew', v)}
              />
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Jobs</Text>
              <TextInput
                style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="Jobs carried out this shift..."
                placeholderTextColor={colors.inputPlaceholder}
                value={entry.jobs ?? ''}
                onChangeText={(v) => onWorkLog(sh.key, 'jobs', v)}
                multiline
              />
            </View>
          );
        })}

      {section.type === 'SIGNOFF' &&
        section.items.map((item) => (
          <View key={item.key} style={styles.itemBlock}>
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>{item.label}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="Name"
              placeholderTextColor={colors.inputPlaceholder}
              value={responses[item.key] ?? ''}
              onChangeText={(v) => onSignoff(item.key, v)}
            />
          </View>
        ))}
    </View>
  );
}

// ─── Status Chips (OK / ATTENTION / NA) ───────────────────────────────────────
function StatusChips({
  value,
  colors,
  accent,
  onChange,
}: {
  value?: CheckStatus;
  colors: any;
  accent: string;
  onChange: (status: CheckStatus) => void;
}) {
  const options: { key: CheckStatus; label: string; color: string }[] = [
    { key: 'OK', label: 'OK', color: colors.success },
    { key: 'ATTENTION', label: 'ATTENTION', color: colors.warning },
    { key: 'NA', label: 'N/A', color: colors.textTertiary },
  ];
  return (
    <View style={styles.statusRow}>
      {options.map((opt) => {
        const selected = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            style={[
              styles.statusChip,
              { borderColor: colors.border },
              selected && { backgroundColor: `${opt.color}22`, borderColor: opt.color },
            ]}
            onPress={() => {
              onChange(opt.key);
              if (opt.key === 'ATTENTION') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Text style={[styles.statusChipText, { color: selected ? opt.color : colors.textTertiary }, selected && { fontWeight: '700' }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Read-only submission summary ─────────────────────────────────────────────
function SubmissionSummary({ submission, colors }: { submission: ChecklistSubmission; colors: any }) {
  const tpl = submission.template;
  const sections = tpl?.sections || [];

  return (
    <View style={{ gap: 10 }}>
      {/* Header fields */}
      {tpl?.headerFields && tpl.headerFields.length > 0 ? (
        <View style={styles.summaryBlock}>
          {tpl.headerFields.map((f) => (
            <SummaryRow key={f.key} label={f.label} value={submission.header?.[f.key] || '—'} colors={colors} />
          ))}
        </View>
      ) : null}

      {sections.map((section) => {
        const data = (submission.responses?.[section.key] as Record<string, any>) || {};
        return (
          <View key={section.key} style={styles.summaryBlock}>
            <Text style={[styles.summarySection, { color: colors.text }]}>{section.title}</Text>

            {section.type === 'PARAMETERS' &&
              section.items.map((item) => {
                const v = data[item.key];
                let display = '—';
                if (v) {
                  if (item.cols && item.cols.length > 0) {
                    display = item.cols.map((c) => `${c.label}: ${v[c.key] ?? '—'}`).join('  ');
                  } else {
                    display = v.value ?? '—';
                  }
                }
                return <SummaryRow key={item.key} label={item.label} value={display} colors={colors} />;
              })}

            {section.type === 'STATUS_LIST' &&
              section.items.map((item) => {
                const v = data[item.key] || {};
                const txt = [v.status, v.value].filter(Boolean).join(' · ') || '—';
                return <SummaryRow key={item.key} label={item.label} value={txt} status={v.status} colors={colors} />;
              })}

            {section.type === 'INSPECTION_GROUP' &&
              section.groups.map((group) => (
                <View key={group.key} style={{ gap: 4 }}>
                  <Text style={[styles.summaryGroup, { color: colors.textSecondary }]}>{group.title}</Text>
                  {group.items.map((item) => {
                    const v = data[item.key] || {};
                    const txt = [v.status, v.remark].filter(Boolean).join(' · ') || '—';
                    return <SummaryRow key={item.key} label={item.label} value={txt} status={v.status} colors={colors} />;
                  })}
                </View>
              ))}

            {section.type === 'WORK_LOG' &&
              section.shifts.map((sh) => {
                const v = data[sh.key] || {};
                const txt = [v.crew && `Crew: ${v.crew}`, v.jobs && `Jobs: ${v.jobs}`].filter(Boolean).join('\n') || '—';
                return <SummaryRow key={sh.key} label={sh.label} value={txt} colors={colors} />;
              })}

            {section.type === 'SIGNOFF' &&
              section.items.map((item) => (
                <SummaryRow key={item.key} label={item.label} value={(data[item.key] as string) || '—'} colors={colors} />
              ))}
          </View>
        );
      })}

      {submission.remarks ? (
        <View style={styles.summaryBlock}>
          <Text style={[styles.summarySection, { color: colors.text }]}>Remarks</Text>
          <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>{submission.remarks}</Text>
        </View>
      ) : null}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  status,
  colors,
}: {
  label: string;
  value: string;
  status?: CheckStatus;
  colors: any;
}) {
  const statusColor =
    status === 'ATTENTION' ? colors.warning : status === 'OK' ? colors.success : colors.textSecondary;
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textTertiary }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, { color: status ? statusColor : colors.text }]}>{value}</Text>
    </View>
  );
}

// ─── Small UI parts ───────────────────────────────────────────────────────────
function DisciplinePill({ value, colors }: { value: string; colors: any }) {
  const accent = DISCIPLINE_ACCENT[value] || colors.textSecondary;
  return (
    <View style={[styles.pill, { backgroundColor: `${accent}1f` }]}>
      <Text style={[styles.pillText, { color: accent }]}>{value}</Text>
    </View>
  );
}

function StatusPill({ status, colors }: { status: ChecklistStatus; colors: any }) {
  const map: Record<ChecklistStatus, { color: string; bg: string }> = {
    DRAFT: { color: colors.warning, bg: colors.warningBg },
    SUBMITTED: { color: colors.info, bg: colors.infoBg },
    COMPLETED: { color: colors.success, bg: colors.successBg },
  };
  const { color, bg } = map[status] || map.DRAFT;
  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <Text style={[styles.statusPillText, { color }]}>{status}</Text>
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

// ─── Response init + flag counting ────────────────────────────────────────────
// Seeds status lists / inspection groups / sign-offs from the latest submission
// (so the user only verifies & changes). Parameters & work-log left blank.
function buildInitialResponses(
  template: ChecklistTemplate,
  prev?: Record<string, any> | null,
): Record<string, any> {
  const out: Record<string, any> = {};
  (template.sections || []).forEach((section) => {
    const prevSection = (prev && prev[section.key]) || {};
    if (section.type === 'STATUS_LIST') {
      const obj: Record<string, any> = {};
      section.items.forEach((item) => {
        const p = prevSection[item.key] || {};
        obj[item.key] = { status: p.status ?? 'OK', value: p.value ?? item.defaultValue ?? '' };
      });
      out[section.key] = obj;
    } else if (section.type === 'INSPECTION_GROUP') {
      const obj: Record<string, any> = {};
      section.groups.forEach((group) => {
        group.items.forEach((item) => {
          const p = prevSection[item.key] || {};
          obj[item.key] = { status: p.status ?? 'OK', remark: p.remark ?? '' };
        });
      });
      out[section.key] = obj;
    } else if (section.type === 'SIGNOFF') {
      out[section.key] = { ...prevSection };
    } else {
      out[section.key] = {};
    }
  });
  return out;
}

function countFlags(template: ChecklistTemplate | null, responses: Record<string, any>): number {
  if (!template) return 0;
  let count = 0;
  (template.sections || []).forEach((section) => {
    const data = responses[section.key] || {};
    if (section.type === 'STATUS_LIST') {
      section.items.forEach((item) => {
        if (data[item.key]?.status === 'ATTENTION') count += 1;
      });
    } else if (section.type === 'INSPECTION_GROUP') {
      section.groups.forEach((group) => {
        group.items.forEach((item) => {
          if (data[item.key]?.status === 'ATTENTION') count += 1;
        });
      });
    }
  });
  return count;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  tabText: { fontSize: 13, fontWeight: '600' },
  hero: { borderRadius: 18, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroTitle: { fontSize: 18, fontWeight: '800' },
  heroSubtitle: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 12 },
  cardDesc: { fontSize: 12, marginTop: 10, lineHeight: 17 },
  startBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: '700' },
  // Fill
  fillContent: { padding: 16, paddingBottom: 110 },
  fillHeader: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  prefillBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  prefillText: { flex: 1, fontSize: 12, lineHeight: 17 },
  fillTitle: { fontSize: 17, fontWeight: '800' },
  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  smallInput: { minHeight: 40, marginTop: 8 },
  multiline: { minHeight: 70, textAlignVertical: 'top', paddingTop: 10 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  chipText: { fontSize: 12, fontWeight: '600' },
  itemBlock: { marginBottom: 14 },
  itemLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  itemNote: { fontSize: 11, marginBottom: 6 },
  colRow: { flexDirection: 'row', gap: 8 },
  colCell: { flex: 1 },
  colLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  groupBlock: { marginBottom: 8 },
  groupTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  // Compact + zebra rows
  numInput: { width: 64, height: 36, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, fontSize: 13, textAlign: 'center' },
  paramRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8 },
  paramLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  paramCols: { flexDirection: 'row', gap: 8 },
  paramColCell: { alignItems: 'center' },
  paramColLabel: { fontSize: 9, fontWeight: '700', marginBottom: 2 },
  statusItemRow: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginBottom: 2 },
  statusItemLabel: { fontSize: 13, fontWeight: '600', marginBottom: 5 },
  statusControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inspRow: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginBottom: 2 },
  inspLabel: { fontSize: 12, fontWeight: '500', marginBottom: 5 },
  statusRow: { flexDirection: 'row', gap: 6 },
  statusChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  statusChipText: { fontSize: 11, fontWeight: '600' },
  flagBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  flagBannerText: { fontSize: 12, fontWeight: '600', flex: 1 },
  actions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1 },
  draftBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, borderWidth: 1 },
  draftBtnText: { fontSize: 14, fontWeight: '600' },
  submitBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14 },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  // History
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  flagBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  flagBadgeText: { fontSize: 11, fontWeight: '700' },
  detailBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  detailLoading: { paddingVertical: 16, alignItems: 'center' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 10, marginTop: 4 },
  downloadBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  approvalWrap: { flexDirection: 'row', gap: 8, marginTop: 4 },
  approvalGate: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  approvalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  approvalLabel: { fontSize: 12, fontWeight: '700' },
  approvalMeta: { fontSize: 11 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 8 },
  approveBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start', paddingHorizontal: 14 },
  resumeBtnText: { fontSize: 12, fontWeight: '700' },
  summaryBlock: { gap: 6 },
  summarySection: { fontSize: 13, fontWeight: '700' },
  summaryGroup: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { fontSize: 12, flex: 1 },
  summaryValue: { fontSize: 12, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  // Empty
  emptyCard: { alignItems: 'center', padding: 30, gap: 12 },
  emptyMessage: { fontSize: 13, textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtext: { fontSize: 13, textAlign: 'center', maxWidth: 240 },
});
