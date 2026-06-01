import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';
import { disciplineToLabel, type Discipline } from '@/utils/workspace';

// Constants from web app
const CASE_TYPES = ['STORES', 'SPARES', 'CAPITAL', 'SERVICES', 'PETTY'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
const PROCESSED_BY = ['DEPT', 'HPO', 'CPD'];
const PROCUREMENT_METHODS_SPARES_SERVICES = ['OEM CASE', 'OEM RC CASE', 'NON OEM LIMITED TENDER', 'NON OEM OPEN TENDER', 'OTHERS'];
const PROCUREMENT_METHODS_STORES_CAPITAL = ['LIMITED TENDER', 'OPEN TENDER', 'GEM PROCUREMENT', 'OTHERS'];

const STAGES_STANDARD = ['Requirement Raised', 'Approval', 'PR Release', 'Tendering', 'Post Bid Evaluation', 'PO Released', 'QCC', 'GRV', 'Payment', 'Closed'];
const STAGES_PETTY = ['Requirement Raised', 'Approval', 'Enquiry', 'PO Released', 'Receipt', 'Payment', 'Closed'];

const TYPE_COLORS: Record<string, string> = { STORES: '#3b82f6', SPARES: '#f97316', SERVICES: '#8b5cf6', CAPITAL: '#059669', PETTY: '#ec4899' };
const DISCIPLINES: Discipline[] = ['MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION'];

interface Case {
  id: string; title: string; type: string; currentStage: string;
  createdAt: string; updatedAt: string; vendor?: string; vendorCode?: string;
  prValue?: number; poValue?: number; currency?: string; prNumber?: string; poNumber?: string;
  sanctionFileNumber?: string; tenderingFileNumber?: string; procurementMethod?: string;
  tag?: string; processedBy?: string; comments?: any[];
}

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDiscipline(value: string | string[] | undefined): Discipline | null {
  const raw = normalizeParam(value)?.toUpperCase();
  return DISCIPLINES.includes(raw as Discipline) ? (raw as Discipline) : null;
}

function appendDiscipline(endpoint: string, discipline: Discipline | null) {
  if (!discipline) return endpoint;
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}discipline=${encodeURIComponent(discipline)}`;
}

export default function ProcurementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const discipline = parseDiscipline(params.discipline);
  const disciplineLabel = discipline ? disciplineToLabel(discipline) : null;
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Full form data matching web app
  const [formData, setFormData] = useState({
    title: '', type: 'STORES', vendor: '', vendorCode: '',
    prValue: '', poValue: '', currency: 'INR', prNumber: '', poNumber: '',
    sanctionFileNumber: '', tenderingFileNumber: '', procurementMethod: '',
    tag: '', processedBy: '', value: ''
  });

  // Comment form
  const [newComment, setNewComment] = useState('');
  const [commentDate, setCommentDate] = useState('');

  useEffect(() => { fetchData(); }, [discipline]);

  const fetchData = async () => {
    try {
      const [casesRes, analyticsRes] = await Promise.all([
        api.get<Case[]>(appendDiscipline('/cases', discipline)),
        api.get<any>(appendDiscipline('/cases/analytics', discipline))
      ]);
      setCases(casesRes || []);
      setAnalytics(analyticsRes);
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  };

  const getProcurementMethods = (type: string) => {
    if (type === 'SPARES' || type === 'SERVICES') return PROCUREMENT_METHODS_SPARES_SERVICES;
    if (type === 'STORES' || type === 'CAPITAL') return PROCUREMENT_METHODS_STORES_CAPITAL;
    return [];
  };

  const handleCreateCase = async () => {
    if (!formData.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    setSubmitting(true);
    try {
      const payload: any = { ...formData };
      if (formData.prValue) payload.prValue = parseFloat(formData.prValue);
      if (formData.poValue) payload.poValue = parseFloat(formData.poValue);
      if (formData.value) payload.value = parseFloat(formData.value);
      await api.post('/cases', payload);
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSubmitting(false); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedCase) return;
    try {
      await api.post(`/cases/${selectedCase.id}/comments`, { 
        content: newComment, 
        effectiveDate: commentDate || null 
      });
      setNewComment(''); setCommentDate('');
      // Refresh case detail
      const updated = await api.get<Case>(`/cases/${selectedCase.id}`);
      setSelectedCase(updated);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleUpdateStage = async (newStage: string) => {
    if (!selectedCase) return;
    try {
      await api.put(`/cases/${selectedCase.id}/stage`, { stage: newStage });
      const updated = await api.get<Case>(`/cases/${selectedCase.id}`);
      setSelectedCase(updated);
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const resetForm = () => {
    setFormData({
      title: '', type: 'STORES', vendor: '', vendorCode: '',
      prValue: '', poValue: '', currency: 'INR', prNumber: '', poNumber: '',
      sanctionFileNumber: '', tenderingFileNumber: '', procurementMethod: '',
      tag: '', processedBy: '', value: ''
    });
  };

  const openCaseDetail = async (caseItem: Case) => {
    try {
      const detail = await api.get<Case>(`/cases/${caseItem.id}`);
      setSelectedCase(detail);
      setShowDetail(true);
    } catch (e) { setSelectedCase(caseItem); setShowDetail(true); }
  };

  const getStages = (type: string) => type === 'PETTY' ? STAGES_PETTY : STAGES_STANDARD;
  const getStageIndex = (c: Case) => getStages(c.type).indexOf(c.currentStage);
  const formatCurrency = (val?: number, curr?: string) => {
    if (!val) return '-';
    const sym = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : '₹';
    return val >= 100000 ? `${sym}${(val/100000).toFixed(1)}L` : `${sym}${val.toLocaleString()}`;
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(filter.toLowerCase()) ||
      c.vendor?.toLowerCase().includes(filter.toLowerCase());
    return matchesSearch && (!typeFilter || c.type === typeFilter);
  });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#9333ea" /></View>;

  const isPetty = formData.type === 'PETTY';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: disciplineLabel ? `${disciplineLabel} Procurement` : 'Procurement', headerRight: () => (
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </Pressable>
      )}} />
      
      <ScrollView contentContainerStyle={styles.content}>
        {disciplineLabel ? (
          <View style={styles.scopeCard}>
            <MaterialCommunityIcons name="briefcase-search-outline" size={20} color="#7c3aed" />
            <View style={styles.scopeCopy}>
              <Text style={styles.scopeTitle}>{disciplineLabel} Procurement</Text>
              <Text style={styles.scopeText}>MRs, cases, PR/PO values, vendors, and approval stage status for this section.</Text>
            </View>
          </View>
        ) : null}

        {/* Analytics */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#9333ea'}]}>{analytics?.activeCount || 0}</Text><Text style={styles.statLabel}>Active</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, {color:'#22c55e'}]}>{analytics?.closedCount || 0}</Text><Text style={styles.statLabel}>Closed</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{cases.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        </View>

        {/* Type Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Pressable style={[styles.filterChip, !typeFilter && styles.filterActive]} onPress={() => setTypeFilter(null)}>
            <Text style={[styles.filterText, !typeFilter && styles.filterTextActive]}>All</Text>
          </Pressable>
          {CASE_TYPES.map(t => (
            <Pressable key={t} style={[styles.filterChip, typeFilter === t && styles.filterActive, {borderColor: TYPE_COLORS[t]}]} onPress={() => setTypeFilter(typeFilter === t ? null : t)}>
              <Text style={[styles.filterText, typeFilter === t && styles.filterTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
          <TextInput style={styles.searchInput} placeholder="Search cases..." value={filter} onChangeText={setFilter} />
        </View>

        {/* Case List */}
        <Text style={styles.sectionTitle}>Cases ({filteredCases.length})</Text>
        {filteredCases.slice(0, 30).map(c => (
          <Pressable key={c.id} style={styles.card} onPress={() => openCaseDetail(c)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{c.title}</Text>
              <View style={[styles.typeBadge, {backgroundColor: TYPE_COLORS[c.type] || '#94a3b8'}]}>
                <Text style={styles.typeText}>{c.type}</Text>
              </View>
            </View>
            <Text style={styles.cardStage}>{c.currentStage}</Text>
            <View style={styles.stageBar}>
              <View style={[styles.stageFill, {width: `${((getStageIndex(c) + 1) / getStages(c.type).length) * 100}%`, backgroundColor: TYPE_COLORS[c.type]}]} />
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.cardMeta}>{c.vendor || 'No vendor'}</Text>
              <Text style={styles.cardMeta}>{formatCurrency(c.prValue || c.poValue, c.currency)}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* CREATE CASE MODAL - Full Form */}
      <Modal visible={showForm} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowForm(false)}><MaterialCommunityIcons name="close" size={24} color="#64748b" /></Pressable>
            <Text style={styles.modalTitle}>Create New Case</Text>
            <View style={{width: 24}} />
          </View>
          
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            {/* Title */}
            <Text style={styles.label}>Case Title *</Text>
            <TextInput style={styles.input} placeholder="e.g., Laptop Procurement" value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />

            {/* Type + Method Row */}
            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Type *</Text>
                <View style={styles.pickerWrap}>
                  {CASE_TYPES.map(t => (
                    <Pressable key={t} style={[styles.typeBtn, formData.type === t && {backgroundColor: TYPE_COLORS[t]}]} onPress={() => setFormData({...formData, type: t, procurementMethod: ''})}>
                      <Text style={[styles.typeBtnText, formData.type === t && {color: '#fff'}]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Procurement Method (non-PETTY) */}
            {!isPetty && (
              <>
                <Text style={styles.label}>Procurement Method</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {getProcurementMethods(formData.type).map(m => (
                    <Pressable key={m} style={[styles.methodChip, formData.procurementMethod === m && styles.methodActive]} onPress={() => setFormData({...formData, procurementMethod: m})}>
                      <Text style={[styles.methodText, formData.procurementMethod === m && {color: '#fff'}]}>{m}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Vendor Info */}
            <View style={styles.row}>
              <View style={styles.halfCol}><Text style={styles.label}>Vendor</Text><TextInput style={styles.input} placeholder="Vendor Name" value={formData.vendor} onChangeText={t => setFormData({...formData, vendor: t})} /></View>
              <View style={styles.halfCol}><Text style={styles.label}>Vendor Code</Text><TextInput style={styles.input} placeholder="VEN-001" value={formData.vendorCode} onChangeText={t => setFormData({...formData, vendorCode: t})} /></View>
            </View>

            {/* Currency */}
            <Text style={styles.label}>Currency</Text>
            <View style={styles.currRow}>
              {CURRENCIES.map(c => (
                <Pressable key={c} style={[styles.currBtn, formData.currency === c && styles.currActive]} onPress={() => setFormData({...formData, currency: c})}>
                  <Text style={[styles.currText, formData.currency === c && {color: '#fff'}]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            {isPetty ? (
              <><Text style={styles.label}>Value</Text><TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={formData.value} onChangeText={t => setFormData({...formData, value: t})} /></>
            ) : (
              <>
                {/* PR Info */}
                <View style={styles.row}>
                  <View style={styles.halfCol}><Text style={styles.label}>PR Number</Text><TextInput style={styles.input} value={formData.prNumber} onChangeText={t => setFormData({...formData, prNumber: t})} /></View>
                  <View style={styles.halfCol}><Text style={styles.label}>PR Value</Text><TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={formData.prValue} onChangeText={t => setFormData({...formData, prValue: t})} /></View>
                </View>
                {/* PO Info */}
                <View style={styles.row}>
                  <View style={styles.halfCol}><Text style={styles.label}>{formData.type === 'SERVICES' ? 'WO' : 'PO'} Number</Text><TextInput style={styles.input} value={formData.poNumber} onChangeText={t => setFormData({...formData, poNumber: t})} /></View>
                  <View style={styles.halfCol}><Text style={styles.label}>{formData.type === 'SERVICES' ? 'WO' : 'PO'} Value</Text><TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={formData.poValue} onChangeText={t => setFormData({...formData, poValue: t})} /></View>
                </View>
                {/* File Numbers */}
                <View style={styles.row}>
                  <View style={styles.halfCol}><Text style={styles.label}>Sanction File No</Text><TextInput style={styles.input} value={formData.sanctionFileNumber} onChangeText={t => setFormData({...formData, sanctionFileNumber: t})} /></View>
                  <View style={styles.halfCol}><Text style={styles.label}>Tendering File No</Text><TextInput style={styles.input} value={formData.tenderingFileNumber} onChangeText={t => setFormData({...formData, tenderingFileNumber: t})} /></View>
                </View>
              </>
            )}

            {/* Tag + ProcessedBy */}
            <View style={styles.row}>
              <View style={styles.halfCol}><Text style={styles.label}>Tag</Text><TextInput style={styles.input} placeholder="Urgent, Priority" value={formData.tag} onChangeText={t => setFormData({...formData, tag: t})} /></View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Processed By</Text>
                <View style={styles.currRow}>
                  {PROCESSED_BY.map(p => (
                    <Pressable key={p} style={[styles.currBtn, formData.processedBy === p && styles.currActive]} onPress={() => setFormData({...formData, processedBy: p})}>
                      <Text style={[styles.currText, formData.processedBy === p && {color: '#fff'}]}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.formActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setShowForm(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={[styles.submitBtn, submitting && {opacity: 0.5}]} onPress={handleCreateCase} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Case</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* CASE DETAIL MODAL */}
      <Modal visible={showDetail && !!selectedCase} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setShowDetail(false); setSelectedCase(null); }}><MaterialCommunityIcons name="close" size={24} color="#64748b" /></Pressable>
            <Text style={styles.modalTitle} numberOfLines={1}>{selectedCase?.title}</Text>
            <View style={{width: 24}} />
          </View>
          
          {selectedCase && (
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
              {/* Type Badge + Stage */}
              <View style={styles.detailHeader}>
                <View style={[styles.typeBadge, {backgroundColor: TYPE_COLORS[selectedCase.type]}]}>
                  <Text style={styles.typeText}>{selectedCase.type}</Text>
                </View>
                <Text style={styles.stageText}>{selectedCase.currentStage}</Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressSection}>
                <Text style={styles.progressLabel}>Progress ({getStageIndex(selectedCase) + 1}/{getStages(selectedCase.type).length})</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {width: `${((getStageIndex(selectedCase) + 1) / getStages(selectedCase.type).length) * 100}%`, backgroundColor: TYPE_COLORS[selectedCase.type]}]} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stagesScroll}>
                  {getStages(selectedCase.type).map((stage, i) => (
                    <Pressable key={stage} style={[styles.stageChip, i <= getStageIndex(selectedCase) && {backgroundColor: TYPE_COLORS[selectedCase.type]}, i === getStageIndex(selectedCase) && styles.currentStage]} onPress={() => i === getStageIndex(selectedCase) + 1 && handleUpdateStage(stage)}>
                      <Text style={[styles.stageChipText, i <= getStageIndex(selectedCase) && {color: '#fff'}]}>{i + 1}. {stage}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Case Details */}
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Vendor</Text><Text style={styles.detailValue}>{selectedCase.vendor || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Vendor Code</Text><Text style={styles.detailValue}>{selectedCase.vendorCode || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>PR Number</Text><Text style={styles.detailValue}>{selectedCase.prNumber || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>PR Value</Text><Text style={styles.detailValue}>{formatCurrency(selectedCase.prValue, selectedCase.currency)}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>PO Number</Text><Text style={styles.detailValue}>{selectedCase.poNumber || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>PO Value</Text><Text style={styles.detailValue}>{formatCurrency(selectedCase.poValue, selectedCase.currency)}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Method</Text><Text style={styles.detailValue}>{selectedCase.procurementMethod || '-'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Processed By</Text><Text style={styles.detailValue}>{selectedCase.processedBy || '-'}</Text></View>
              </View>

              {/* Comments Section */}
              <Text style={styles.sectionTitle}>Comments ({selectedCase.comments?.length || 0})</Text>
              {selectedCase.comments?.map((comment: any, i: number) => (
                <View key={i} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{comment.user?.username || 'User'}</Text>
                    <Text style={styles.commentTime}>{new Date(comment.timestamp).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                  {comment.stageSnapshot && <Text style={styles.commentStage}>at {comment.stageSnapshot}</Text>}
                </View>
              ))}

              {/* Add Comment */}
              <Text style={styles.label}>Add Comment</Text>
              <TextInput style={[styles.input, {height: 80}]} placeholder="Enter your comment..." multiline value={newComment} onChangeText={setNewComment} />
              <TextInput style={styles.input} placeholder="Effective Date (optional, YYYY-MM-DD)" value={commentDate} onChangeText={setCommentDate} />
              <Pressable style={styles.commentBtn} onPress={handleAddComment}><Text style={styles.commentBtnText}>Post Comment</Text></Pressable>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBtn: { backgroundColor: '#9333ea', padding: 8, borderRadius: 8, marginRight: 8 },
  scopeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  scopeCopy: { flex: 1, minWidth: 0 },
  scopeTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  scopeText: { marginTop: 3, fontSize: 12, lineHeight: 16, color: '#64748b' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b' },
  filterScroll: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  filterActive: { backgroundColor: '#9333ea', borderColor: '#9333ea' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterTextActive: { color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', flex: 1, marginRight: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  cardStage: { fontSize: 12, color: '#64748b', marginTop: 6 },
  stageBar: { height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginTop: 8 },
  stageFill: { height: '100%', borderRadius: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardMeta: { fontSize: 11, color: '#94a3b8' },
  // Modal styles
  modalFull: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', flex: 1, textAlign: 'center' },
  formScroll: { flex: 1 },
  formContent: { padding: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 14, color: '#0f172a' },
  row: { flexDirection: 'row', gap: 12 },
  halfCol: { flex: 1 },
  pickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  typeBtnText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  methodChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#f1f5f9', marginRight: 8, marginTop: 4 },
  methodActive: { backgroundColor: '#9333ea' },
  methodText: { fontSize: 11, color: '#475569' },
  currRow: { flexDirection: 'row', gap: 8 },
  currBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  currActive: { backgroundColor: '#9333ea' },
  currText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  formActions: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12 },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  submitBtn: { flex: 2, padding: 14, alignItems: 'center', backgroundColor: '#9333ea', borderRadius: 12 },
  submitText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  // Detail styles
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  stageText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  progressSection: { marginBottom: 20 },
  progressLabel: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  stagesScroll: { marginTop: 12 },
  stageChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 6 },
  currentStage: { borderWidth: 2, borderColor: '#0f172a' },
  stageChipText: { fontSize: 10, color: '#475569' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailItem: { width: '50%', marginBottom: 12 },
  detailLabel: { fontSize: 11, color: '#94a3b8' },
  detailValue: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
  commentCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentUser: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },
  commentTime: { fontSize: 10, color: '#94a3b8' },
  commentContent: { fontSize: 13, color: '#0f172a' },
  commentStage: { fontSize: 10, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' },
  commentBtn: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  commentBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
