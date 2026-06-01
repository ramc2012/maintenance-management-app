import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Pressable, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const ROLES = ['ADMIN', 'MANAGER', 'ENGINEER', 'OPERATOR', 'VIEWER'];
const ROLE_FILTERS = ['All', ...ROLES];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#ef4444',
  MANAGER: '#f97316',
  ENGINEER: '#3b82f6',
  OPERATOR: '#10b981',
  VIEWER: '#8b5cf6',
};

export default function UserManagementScreen() {
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'OPERATOR', departmentId: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get<any[]>('/users');
      setUsers(res || []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formData.username.trim() || !formData.password.trim()) return Alert.alert('Error', 'Username and password are required.');
    setSubmitting(true);
    try {
      await api.post('/users', formData);
      setShowAddForm(false);
      setFormData({ username: '', password: '', role: 'OPERATOR', departmentId: '' });
      fetchUsers();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to create user.'); } finally { setSubmitting(false); }
  };

  const handleResetPassword = async (userId: string) => {
    Alert.prompt('Reset Password', 'Enter new password for this user:', async (newPassword) => {
      if (!newPassword || newPassword.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters.');
      try {
        await api.patch(`/users/${userId}`, { password: newPassword });
        Alert.alert('Done', 'Password has been reset.');
        setSelectedUser(null);
      } catch (e: any) { Alert.alert('Error', e.message); }
    }, 'secure-text');
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.username?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = ROLES.reduce((acc, r) => ({ ...acc, [r]: users.filter(u => u.role === r).length }), {} as Record<string, number>);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.errorText}>Error: {error}</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{
        title: 'User Management',
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: () => (
          <Pressable onPress={() => setShowAddForm(true)} style={styles.addBtn}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </Pressable>
        )
      }} />

      {/* Tab */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['users', 'roles'] as const).map(t => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, { color: colors.textTertiary }, tab === t && styles.tabTextActive]}>{t === 'users' ? 'Users' : 'Roles'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'users' ? (
        <>
          {/* Search */}
          <View style={[styles.searchRow, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
            <TextInput style={[styles.search, { color: colors.text }]} placeholder="Search users..." placeholderTextColor={colors.inputPlaceholder} value={search} onChangeText={setSearch} />
          </View>

          {/* Role Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
            {ROLE_FILTERS.map(r => (
              <Pressable key={r} style={[styles.filterChip, { backgroundColor: colors.backgroundTertiary }, roleFilter === r && styles.filterChipActive]} onPress={() => setRoleFilter(r)}>
                <Text style={[styles.filterText, { color: colors.textTertiary }, roleFilter === r && styles.filterTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Summary */}
          <Text style={[styles.countText, { color: colors.textTertiary }]}>{filteredUsers.length} of {users.length} users</Text>

          {/* User List */}
          <ScrollView contentContainerStyle={styles.listContent}>
            {filteredUsers.map(u => (
              <Pressable key={u.id} style={[styles.userCard, { backgroundColor: colors.card }]} onPress={() => setSelectedUser(u)}>
                <View style={styles.userCardLeft}>
                  <View style={[styles.roleChip, { backgroundColor: (ROLE_COLORS[u.role] || '#64748b') + '20' }]}>
                    <Text style={[styles.roleChipText, { color: ROLE_COLORS[u.role] || '#64748b' }]}>{u.role}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.username, { color: colors.text }]}>{u.username}</Text>
                    {u.department?.name && <Text style={[styles.dept, { color: colors.textTertiary }]}>{u.department.name}</Text>}
                    {u.lastLogin && <Text style={[styles.meta, { color: colors.textTertiary }]}>Last login: {new Date(u.lastLogin).toLocaleDateString()}</Text>}
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
              </Pressable>
            ))}
            {filteredUsers.length === 0 && <Text style={[styles.empty, { color: colors.textTertiary }]}>No users found</Text>}
          </ScrollView>
        </>
      ) : (
        /* Roles Tab */
        <ScrollView contentContainerStyle={styles.listContent}>
          {ROLES.map(role => (
            <View key={role} style={[styles.roleCard, { backgroundColor: colors.card }]}>
              <View style={[styles.roleIcon, { backgroundColor: (ROLE_COLORS[role] || '#64748b') + '20' }]}>
                <MaterialCommunityIcons name="shield-account" size={22} color={ROLE_COLORS[role] || '#64748b'} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={[styles.roleName, { color: colors.text }]}>{role}</Text>
                <Text style={[styles.roleDesc, { color: colors.textTertiary }]}>{roleDescriptions[role]}</Text>
              </View>
              <View style={styles.roleCount}>
                <Text style={[styles.roleCountNum, { color: ROLE_COLORS[role] || '#64748b' }]}>{roleCounts[role] || 0}</Text>
                <Text style={[styles.roleCountLabel, { color: colors.textTertiary }]}>{roleCounts[role] || 0}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add User Modal */}
      <Modal visible={showAddForm} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New User</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Username *" placeholderTextColor={colors.inputPlaceholder} value={formData.username} onChangeText={t => setFormData({ ...formData, username: t })} autoCapitalize="none" />
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]} placeholder="Password *" placeholderTextColor={colors.inputPlaceholder} secureTextEntry value={formData.password} onChangeText={t => setFormData({ ...formData, password: t })} />
            <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Role</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {ROLES.map(r => (
                <Pressable key={r} style={[styles.filterChip, { backgroundColor: colors.backgroundTertiary, marginRight: 6 }, formData.role === r && styles.filterChipActive]} onPress={() => setFormData({ ...formData, role: r })}>
                  <Text style={[styles.filterText, { color: colors.textTertiary }, formData.role === r && styles.filterTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowAddForm(false)}><Text style={[styles.cancelText, { color: colors.textTertiary }]}>Cancel</Text></Pressable>
              <Pressable style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleCreate} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Create User</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* User Detail Modal */}
      <Modal visible={!!selectedUser} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedUser?.username}</Text>
            <View style={[styles.roleChip, { backgroundColor: (ROLE_COLORS[selectedUser?.role] || '#64748b') + '20', alignSelf: 'flex-start', marginBottom: 16 }]}>
              <Text style={[styles.roleChipText, { color: ROLE_COLORS[selectedUser?.role] || '#64748b' }]}>{selectedUser?.role}</Text>
            </View>
            {selectedUser?.department?.name && <><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Department</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selectedUser.department.name}</Text></>}
            {selectedUser?.lastLogin && <><Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Last Login</Text><Text style={[styles.detailValue, { color: colors.text }]}>{new Date(selectedUser.lastLogin).toLocaleString()}</Text></>}
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Created</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => handleResetPassword(selectedUser?.id)} style={[styles.resetBtn, { backgroundColor: colors.backgroundTertiary }]}>
                <MaterialCommunityIcons name="lock-reset" size={16} color="#3b82f6" />
                <Text style={styles.resetText}>Reset Password</Text>
              </Pressable>
              <Pressable style={[styles.closeBtn, { backgroundColor: colors.backgroundTertiary }]} onPress={() => setSelectedUser(null)}><Text style={[styles.closeText, { color: colors.textSecondary }]}>Close</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const roleDescriptions: Record<string, string> = {
  ADMIN: 'Full access to all modules and user management',
  MANAGER: 'View and manage all operational data',
  ENGINEER: 'Create and update technical records',
  OPERATOR: 'Log daily operations and view data',
  VIEWER: 'Read-only access to all modules',
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444' },
  addBtn: { backgroundColor: '#3b82f6', padding: 7, borderRadius: 8, marginRight: 8 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: '#3b82f6', fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  search: { flex: 1, fontSize: 14 },
  filterBar: { paddingLeft: 12, marginBottom: 4, maxHeight: 44 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, marginRight: 8, height: 34, justifyContent: 'center' },
  filterChipActive: { backgroundColor: '#3b82f6' },
  filterText: { fontSize: 12, fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  countText: { fontSize: 12, paddingHorizontal: 16, paddingBottom: 6 },
  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  userCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8 },
  userCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  roleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 12 },
  roleChipText: { fontSize: 11, fontWeight: '700' },
  userInfo: { flex: 1 },
  username: { fontSize: 15, fontWeight: '600' },
  dept: { fontSize: 12, marginTop: 1 },
  meta: { fontSize: 11, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 32 },
  roleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 16, marginBottom: 8 },
  roleIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 15, fontWeight: '700' },
  roleDesc: { fontSize: 12, marginTop: 2 },
  roleCount: { alignItems: 'center' },
  roleCountNum: { fontSize: 20, fontWeight: '700' },
  roleCountLabel: { fontSize: 10 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  inputLabel: { fontSize: 12, marginBottom: 6 },
  input: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 14, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 16 },
  cancelText: { padding: 12 },
  submitBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginLeft: 10 },
  submitText: { color: '#fff', fontWeight: '700' },
  detailLabel: { fontSize: 11, marginTop: 10 },
  detailValue: { fontSize: 14, marginTop: 2 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  resetText: { color: '#3b82f6', fontWeight: '600', fontSize: 13, marginLeft: 6 },
  closeBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginLeft: 10 },
  closeText: { fontWeight: '600' },
});
