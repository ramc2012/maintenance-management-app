import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, Modal } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

type ManpowerHour = {
  id: string;
  employeeId: string;
  name: string;
  department?: string;
  section?: string | null;
  designation?: string | null;
  totalHours: number;
  jobCount: number;
  jobs: Array<{
    logId: string;
    date: string;
    hours: number;
    department?: string;
    section?: string;
    installationId?: string;
    description?: string;
  }>;
};

type HoursResponse = {
  from: string;
  to: string;
  totalEmployees: number;
  totalHours: number;
  employees: ManpowerHour[];
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ManpowerScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<HoursResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [sectionFilter, setSectionFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<ManpowerHour | null>(null);

  useEffect(() => { fetchData(); }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get<HoursResponse>(`/maintenance/manpower/hours?date=${encodeURIComponent(selectedDate)}&isActive=true`);
      setSummary(res);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const employees = summary?.employees ?? [];
  const sectionOptions = useMemo(() => {
    const sections = new Set(employees.map((employee) => employee.section || 'Unassigned'));
    return ['all', ...Array.from(sections).sort()];
  }, [employees]);
  const filteredEmployees = employees.filter((employee) => sectionFilter === 'all' || (employee.section || 'Unassigned') === sectionFilter);
  const loggedEmployees = filteredEmployees.filter((employee) => employee.totalHours > 0);
  const visibleTotalHours = filteredEmployees.reduce((sum, employee) => sum + Number(employee.totalHours || 0), 0);

  if (loading) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (error) return <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}><Text style={[styles.error, { color: colors.error }]}>Error: {error}</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{ title: 'Manpower Hours' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.dateCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Pressable style={[styles.dateButton, { backgroundColor: colors.cardMuted }]} onPress={() => setSelectedDate(shiftDate(selectedDate, -1))}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.dateCopy}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Work date</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(selectedDate)}</Text>
          </View>
          <Pressable style={[styles.dateButton, { backgroundColor: colors.cardMuted }]} onPress={() => setSelectedDate(shiftDate(selectedDate, 1))}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{loggedEmployees.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Logged</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statValue, { color: '#3b82f6' }]}>{filteredEmployees.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Employees</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{visibleTotalHours.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Hours</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {sectionOptions.map((section) => {
            const active = sectionFilter === section;
            return (
              <Pressable key={section} style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.cardBorder }]} onPress={() => setSectionFilter(section)}>
                <Text style={[styles.filterText, { color: active ? '#ffffff' : colors.textSecondary }]}>{section === 'all' ? 'All Sections' : section}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Day-wise Employee Hours</Text>
        {filteredEmployees.map((employee) => (
          <Pressable key={employee.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setSelectedEmployee(employee)}>
            <View style={styles.cardHeader}>
              <View style={styles.employeeCopy}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{employee.name}</Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{employee.employeeId} · {employee.section || 'Unassigned'}</Text>
              </View>
              <View style={styles.hoursBadge}>
                <Text style={[styles.hoursValue, { color: employee.totalHours > 0 ? colors.primary : colors.textTertiary }]}>{Number(employee.totalHours || 0).toFixed(1)}h</Text>
                <Text style={[styles.hoursLabel, { color: colors.textSecondary }]}>{employee.jobCount} jobs</Text>
              </View>
            </View>
          </Pressable>
        ))}
        {filteredEmployees.length === 0 ? <Text style={[styles.empty, { color: colors.textTertiary }]}>No manpower records found for this section.</Text> : null}
      </ScrollView>

      <Modal visible={Boolean(selectedEmployee)} animationType="slide" transparent onRequestClose={() => setSelectedEmployee(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedEmployee?.name}</Text>
              <Pressable style={[styles.closeIcon, { backgroundColor: colors.cardMuted }]} onPress={() => setSelectedEmployee(null)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.detailMeta, { color: colors.textSecondary }]}>
              {selectedEmployee?.employeeId} · {selectedEmployee?.section || 'Unassigned'} · {Number(selectedEmployee?.totalHours || 0).toFixed(1)}h
            </Text>
            <ScrollView style={styles.jobList}>
              {selectedEmployee?.jobs.length ? selectedEmployee.jobs.map((job) => (
                <View key={job.logId} style={[styles.jobCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={2}>{job.description || 'Maintenance work'}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{job.installationId || '-'} · {job.section || '-'} · {Number(job.hours || 0).toFixed(1)}h</Text>
                </View>
              )) : <Text style={[styles.empty, { color: colors.textTertiary }]}>No reported work hours for this date.</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 42 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#ef4444' },
  dateCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  dateCopy: { alignItems: 'center' },
  dateLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  dateValue: { marginTop: 3, fontSize: 17, fontWeight: '800' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  filterScroll: { marginBottom: 14 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  filterText: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  employeeCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardSub: { fontSize: 12, marginTop: 4 },
  hoursBadge: { alignItems: 'flex-end' },
  hoursValue: { fontSize: 20, fontWeight: '900' },
  hoursLabel: { fontSize: 11, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 18, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: '78%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  modalTitle: { flex: 1, fontSize: 19, fontWeight: '900' },
  closeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  detailMeta: { marginTop: 6, fontSize: 12 },
  jobList: { marginTop: 14 },
  jobCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  jobTitle: { fontSize: 14, fontWeight: '800' },
});
