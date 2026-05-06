import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { ExportButton } from '@/components/ExportButton';
import { QRScannerModal } from '@/components/QRScannerModal';
import { Text } from '@/components/Themed';
import api, { resolveApiBaseUrl } from '@/services/api';
import { getStoredToken } from '@/services/authStorage';
import { disciplineToLabel, type Discipline } from '@/utils/workspace';

interface WorkOrderItem {
  id: string;
  woNumber: string;
  description: string;
  priority: string;
  status: string;
  woType?: string;
  scheduledDate?: string | null;
  startDate?: string | null;
  completionDate?: string | null;
  failureMode?: string | null;
  actionTaken?: string | null;
  teamMembers?: { employeeName: string; role: string; hoursWorked?: number }[];
  checklist?: { description: string; isCompleted: boolean }[];
}

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  caption?: string;
  createdAt: string;
}

interface MaintenanceRequestItem {
  id: string;
  reqNumber: string;
  title: string;
  priority: string;
  status: string;
}

export default function WorkOrdersScreen() {
  const params = useLocalSearchParams<{ discipline?: string }>();
  const router = useRouter();
  const discipline = (params.discipline?.toUpperCase() as Discipline | undefined) || undefined;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Detail state
  const [selectedWO, setSelectedWO] = useState<WorkOrderItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  const query = useMemo(() => (discipline ? `?discipline=${discipline}` : ''), [discipline]);

  const fetchData = useCallback(async () => {
    try {
      const [woRes, reqRes, statsRes] = await Promise.all([
        api.get<WorkOrderItem[]>(`/workorders${query}`),
        api.get<MaintenanceRequestItem[]>(`/maintenance-requests${query}`),
        api.get<any>(`/workorders/stats${query}`),
      ]);
      setWorkOrders(woRes || []);
      setRequests(reqRes || []);
      setStats(statsRes);
      setError(null);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load work orders';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openDetail = async (wo: WorkOrderItem) => {
    setSelectedWO(wo);
    setDetailVisible(true);
    setLoadingAttachments(true);
    try {
      // Fetch full detail
      const detail = await api.get<WorkOrderItem>(`/workorders/${wo.id}/detail`).catch(() => wo);
      setSelectedWO(detail);
      // Fetch attachments
      const atts = await api.get<Attachment[]>(`/workorders/${wo.id}/attachments`).catch(() => []);
      setAttachments(atts || []);
    } catch {}
    setLoadingAttachments(false);
  };

  const handlePhotoCapture = async () => {
    if (!selectedWO) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await uploadAttachment(result.assets[0].uri, result.assets[0].fileName || 'photo.jpg');
  };

  const handlePickImage = async () => {
    if (!selectedWO) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await uploadAttachment(result.assets[0].uri, result.assets[0].fileName || 'image.jpg');
  };

  const uploadAttachment = async (uri: string, fileName: string) => {
    if (!selectedWO) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', {
        uri,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      await api.upload(`/workorders/${selectedWO.id}/attachments`, formData);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Refresh attachments
      const atts = await api.get<Attachment[]>(`/workorders/${selectedWO.id}/attachments`).catch(() => []);
      setAttachments(atts || []);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Unknown error');
    }
    setUploading(false);
  };

  const deleteAttachment = (att: Attachment) => {
    if (!selectedWO) return;
    Alert.alert('Delete Attachment', `Remove "${att.fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/workorders/${selectedWO.id}/attachments/${att.id}`);
            setAttachments((prev) => prev.filter((a) => a.id !== att.id));
          } catch {}
        },
      },
    ]);
  };

  const handleQRScan = (code: string) => {
    setQrVisible(false);
    // Try to find WO by number or navigate to assets
    const found = workOrders.find((w) => w.woNumber === code);
    if (found) {
      openDetail(found);
    } else {
      router.push({ pathname: '/modules/assets', params: { search: code } });
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  }

  const counts = stats?.counts ?? {};
  const visibleWorkOrders = workOrders.filter((item) => item.status !== 'CLOSED').slice(0, 20);
  const visibleRequests = requests.filter((item) => item.status === 'PENDING' || item.status === 'APPROVED').slice(0, 10);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: discipline ? `${disciplineToLabel(discipline)} Work Orders` : 'My Work Orders' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{discipline ? `${disciplineToLabel(discipline)} execution board` : 'Execution board'}</Text>
          <Text style={styles.subtitle}>Open work, pending requests, and quick links for field closure and reporting.</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <MetricCard label="Open" value={counts.open ?? 0} accent="#2563eb" />
          <MetricCard label="In Progress" value={counts.inProgress ?? 0} accent="#d97706" />
          <MetricCard label="Overdue" value={counts.overdue ?? 0} accent="#dc2626" />
          <MetricCard label="Closed" value={counts.closed ?? 0} accent="#059669" />
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.quickAction} onPress={() => setQrVisible(true)}>
            <MaterialCommunityIcons name="qrcode-scan" size={20} color="#2563eb" />
            <Text style={styles.quickActionText}>Scan QR</Text>
          </Pressable>
          <ExportButton endpoint={`/workorders/export${query}`} fileName="WorkOrders.xlsx" label="Export" />
        </View>

        {/* Work Orders */}
        <Text style={styles.sectionTitle}>Active work orders</Text>
        {visibleWorkOrders.length === 0 ? (
          <EmptyState message="No open work orders in this scope." />
        ) : (
          visibleWorkOrders.map((wo) => (
            <Pressable key={wo.id} style={styles.card} onPress={() => openDetail(wo)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{wo.woNumber}</Text>
                <StatusPill value={wo.status} />
              </View>
              <Text style={styles.cardCopy}>{wo.description}</Text>
              <View style={styles.cardMetaRow}>
                <View style={styles.metaChips}>
                  <PriorityChip value={wo.priority} />
                  {wo.woType && <Text style={styles.cardMeta}>{wo.woType}</Text>}
                </View>
                <Text style={styles.cardMeta}>
                  {wo.scheduledDate ? new Date(wo.scheduledDate).toLocaleDateString() : 'No date'}
                </Text>
              </View>
            </Pressable>
          ))
        )}

        {/* Pending Requests */}
        <Text style={styles.sectionTitle}>Pending maintenance requests</Text>
        {visibleRequests.length === 0 ? (
          <EmptyState message="No pending or approved requests." />
        ) : (
          visibleRequests.map((request) => (
            <View key={request.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{request.reqNumber}</Text>
                <StatusPill value={request.status} />
              </View>
              <Text style={styles.cardCopy}>{request.title}</Text>
              <PriorityChip value={request.priority} />
            </View>
          ))
        )}
      </ScrollView>

      {/* WO Detail Modal */}
      <Modal visible={detailVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{selectedWO?.woNumber}</Text>
              <Text style={styles.modalSubtitle}>{selectedWO?.woType} | {selectedWO?.priority}</Text>
            </View>
            <Pressable onPress={() => setDetailVisible(false)} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color="#0f172a" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Status & Description */}
            <View style={styles.detailSection}>
              <StatusPill value={selectedWO?.status || ''} />
              <Text style={styles.detailDesc}>{selectedWO?.description}</Text>
            </View>

            {/* Dates */}
            <View style={styles.detailGrid}>
              <DetailItem label="Scheduled" value={selectedWO?.scheduledDate ? new Date(selectedWO.scheduledDate).toLocaleDateString() : '—'} />
              <DetailItem label="Started" value={selectedWO?.startDate ? new Date(selectedWO.startDate).toLocaleDateString() : '—'} />
              <DetailItem label="Completed" value={selectedWO?.completionDate ? new Date(selectedWO.completionDate).toLocaleDateString() : '—'} />
              {selectedWO?.failureMode && <DetailItem label="Failure Mode" value={selectedWO.failureMode} />}
            </View>

            {/* Action Taken */}
            {selectedWO?.actionTaken && (
              <View style={styles.actionTakenCard}>
                <Text style={styles.actionTakenLabel}>Action Taken</Text>
                <Text style={styles.actionTakenText}>{selectedWO.actionTaken}</Text>
              </View>
            )}

            {/* Team Members */}
            {selectedWO?.teamMembers && selectedWO.teamMembers.length > 0 && (
              <View style={styles.teamSection}>
                <Text style={styles.teamTitle}>Team ({selectedWO.teamMembers.length})</Text>
                {selectedWO.teamMembers.map((m, i) => (
                  <View key={i} style={styles.teamRow}>
                    <Text style={styles.teamName}>{m.employeeName}</Text>
                    <View style={styles.teamMeta}>
                      <Text style={styles.teamRole}>{m.role}</Text>
                      {m.hoursWorked != null && <Text style={styles.teamHours}>{m.hoursWorked}h</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Checklist */}
            {selectedWO?.checklist && selectedWO.checklist.length > 0 && (
              <View style={styles.checklistSection}>
                <Text style={styles.checklistTitle}>Checklist</Text>
                {selectedWO.checklist.map((item, i) => (
                  <View key={i} style={styles.checkRow}>
                    <MaterialCommunityIcons
                      name={item.isCompleted ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={18}
                      color={item.isCompleted ? '#22c55e' : '#94a3b8'}
                    />
                    <Text style={[styles.checkText, item.isCompleted && styles.checkDone]}>{item.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Attachments */}
            <View style={styles.attachSection}>
              <View style={styles.attachHeader}>
                <Text style={styles.attachTitle}>Attachments ({attachments.length})</Text>
                <View style={styles.attachActions}>
                  <Pressable style={styles.attachBtn} onPress={handlePhotoCapture} disabled={uploading}>
                    <MaterialCommunityIcons name="camera" size={18} color="#2563eb" />
                  </Pressable>
                  <Pressable style={styles.attachBtn} onPress={handlePickImage} disabled={uploading}>
                    <MaterialCommunityIcons name="image-plus" size={18} color="#2563eb" />
                  </Pressable>
                </View>
              </View>

              {uploading && <ActivityIndicator color="#2563eb" style={{ marginVertical: 10 }} />}

              {loadingAttachments ? (
                <ActivityIndicator color="#2563eb" style={{ marginVertical: 16 }} />
              ) : attachments.length === 0 ? (
                <View style={styles.attachEmpty}>
                  <MaterialCommunityIcons name="paperclip" size={24} color="#94a3b8" />
                  <Text style={styles.attachEmptyText}>No attachments. Use camera or gallery to add photos.</Text>
                </View>
              ) : (
                <View style={styles.attachGrid}>
                  {attachments.map((att) => (
                    <Pressable key={att.id} style={styles.attachThumb} onLongPress={() => deleteAttachment(att)}>
                      {att.mimeType?.startsWith('image/') ? (
                        <Image
                          source={{ uri: `${resolveApiBaseUrl()}/workorders/${selectedWO?.id}/attachments/${att.id}/file` }}
                          style={styles.attachImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.attachDoc}>
                          <MaterialCommunityIcons name="file-document-outline" size={24} color="#64748b" />
                          <Text style={styles.attachFileName} numberOfLines={1}>{att.fileName}</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
              <Text style={styles.attachHint}>Long-press to delete an attachment</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* QR Scanner */}
      <QRScannerModal visible={qrVisible} onClose={() => setQrVisible(false)} onCodeScanned={handleQRScan} />
    </View>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function StatusPill({ value }: { value: string }) {
  const backgroundColor =
    value === 'OPEN' ? '#dbeafe' :
    value === 'IN_PROGRESS' ? '#ffedd5' :
    value === 'COMPLETED' ? '#dcfce7' :
    value === 'APPROVED' ? '#dcfce7' :
    value === 'PENDING' ? '#e5e7eb' :
    value === 'CLOSED' ? '#f0fdf4' :
    '#f1f5f9';
  const color =
    value === 'OPEN' ? '#1d4ed8' :
    value === 'IN_PROGRESS' ? '#c2410c' :
    value === 'COMPLETED' ? '#166534' :
    value === 'APPROVED' ? '#166534' :
    value === 'PENDING' ? '#475569' :
    value === 'CLOSED' ? '#065f46' :
    '#334155';

  return (
    <View style={[styles.statusPill, { backgroundColor }]}>
      <Text style={[styles.statusText, { color }]}>{value.replace('_', ' ')}</Text>
    </View>
  );
}

function PriorityChip({ value }: { value: string }) {
  const color =
    value === 'EMERGENCY' ? '#dc2626' :
    value === 'HIGH' ? '#ea580c' :
    value === 'NORMAL' ? '#2563eb' :
    '#64748b';
  return <Text style={[styles.priorityChip, { color }]}>{value}</Text>;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyCard}>
      <MaterialCommunityIcons name="clipboard-text-outline" size={22} color="#94a3b8" />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#dc2626' },
  header: { marginBottom: 18 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#64748b' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  metricCard: { width: '48%', borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 12 },
  metricValue: { fontSize: 24, fontWeight: '800' },
  metricLabel: { marginTop: 6, fontSize: 12, color: '#64748b' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickAction: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff' },
  quickActionText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10, marginTop: 4 },
  card: { borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardCopy: { marginTop: 8, fontSize: 13, lineHeight: 19, color: '#334155' },
  cardMetaRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaChips: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardMeta: { fontSize: 12, color: '#64748b' },
  priorityChip: { fontSize: 11, fontWeight: '700' },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyCard: { borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', padding: 18, alignItems: 'center', gap: 10, marginBottom: 12 },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  modalContent: { padding: 16, paddingBottom: 40 },
  detailSection: { gap: 12, marginBottom: 18 },
  detailDesc: { fontSize: 15, lineHeight: 22, color: '#334155' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  detailItem: { width: '47%', borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  actionTakenCard: { borderRadius: 14, backgroundColor: '#ecfdf5', padding: 14, marginBottom: 18 },
  actionTakenLabel: { fontSize: 11, fontWeight: '700', color: '#059669' },
  actionTakenText: { marginTop: 6, fontSize: 13, lineHeight: 20, color: '#065f46' },
  teamSection: { borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 18 },
  teamTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  teamName: { fontSize: 13, fontWeight: '600', color: '#334155' },
  teamMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamRole: { fontSize: 11, fontWeight: '600', color: '#2563eb', backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  teamHours: { fontSize: 12, color: '#64748b' },
  checklistSection: { borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 18 },
  checklistTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  checkText: { flex: 1, fontSize: 13, color: '#334155' },
  checkDone: { textDecorationLine: 'line-through', color: '#94a3b8' },
  attachSection: { borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', padding: 14 },
  attachHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  attachTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  attachActions: { flexDirection: 'row', gap: 8 },
  attachBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  attachEmpty: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  attachEmptyText: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
  attachGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attachThumb: { width: '31%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  attachImage: { width: '100%', height: '100%' },
  attachDoc: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', gap: 4 },
  attachFileName: { fontSize: 9, color: '#64748b', paddingHorizontal: 4 },
  attachHint: { marginTop: 10, fontSize: 11, color: '#94a3b8', textAlign: 'center' },
});
