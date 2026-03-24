import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Pressable, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

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
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'User Management',
        headerRight: () => (
          <Pressable onPress={() => setShowAddForm(true)} style={styles.addBtn}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </Pressable>
        )
      }} />

      {/* Tab */}
      <View style={styles.tabRow}>
        {(['users', 'roles'] as const).map(t => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'users' ? 'Users' : 'Roles'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'users' ? (
        <>
          {/* Search */}
          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput style={styles.search} placeholder="Search users..." placeholderTextColor="#94a3b8" value={search} onChangeText={setSearch} />
          </View>

          {/* Role Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
            {ROLE_FILTERS.map(r => (
              <Pressable key={r} style={[styles.filterChip, roleFilter === r && styles.filterChipActive]} onPress={() => setRoleFilter(r)}>
                <Text style={[styles.filterText, roleFilter === r && styles.filterTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Summary */}
          <Text style={styles.countText}>{filteredUsers.length} of {users.length} users</Text>

          {/* User List */}
          <ScrollView contentContainerStyle={styles.listContent}>
            {filteredUsers.map(u => (
              <Pressable key={u.id} style={styles.userCard} onPress={() => setSelectedUser(u)}>
                <View style={styles.userCardLeft}>
                  <View style={[styles.roleChip, { backgroundColor: (ROLE_COLORS[u.role] || '#64748b') + '20' }]}>
                    <Text style={[styles.roleChipText, { color: ROLE_COLORS[u.role] || '#64748b' }]}>{u.role}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.username}>{u.username}</Text>
                    {u.department?.name && <Text style={styles.dept}>{u.department.name}</Text>}
                    {u.lastLogin && <Text style={styles.meta}>Last login: {new Date(u.lastLogin).toLocaleDateString()}</Text>}
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#94a3b8" />
              </Pressable>
            ))}
            {filteredUsers.length === 0 && <Text style={styles.empty}>No users found</Text>}
          </ScrollView>
        </>
      ) : (
        /* Roles Tab */
        <ScrollView contentContainerStyle={styles.listContent}>
          {ROLES.map(role => (
            <View key={role} style={styles.roleCard}>
              <View style={[styles.roleIcon, { backgroundColor: (ROLE_COLORS[role] || '#64748b') + '20' }]}>
                <MaterialCommunityIcons name="shield-account" size={22} color={ROLE_COLORS[role] || '#64748b'} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleName}>{role}</Text>
                <Text style={styles.roleDesc}>{roleDescriptions[role]}</Text>
              </View>
              <View style={styles.roleCount}>
                <Text style={[styles.roleCountNum, { color: ROLE_COLORS[role] || '#64748b' }]}>{roleCounts[role] || 0}</Text>
                <Text style={styles.roleCountLabel}>users</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add User Modal */}
      <Modal visible={showAddForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New User</Text>
            <TextInput style={styles.input} placeholder="Username *" placeholderTextColor="#94a3b8" value={formData.username} onChangeText={t => setFormData({ ...formData, username: t })} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Password *" placeholderTextColor="#94a3b8" secureTextEntry value={formData.password} onChangeText={t => setFormData({ ...formData, password: t })} />
            <Text style={styles.inputLabel}>Role</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {ROLES.map(r => (
                <Pressable key={r} style={[styles.filterChip, formData.role === r && styles.filterChipActive, { marginRight: 6 }]} onPress={() => setFormData({ ...formData, role: r })}>
                  <Text style={[styles.filterText, formData.role === r && styles.filterTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowAddForm(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Pressable style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleCreate} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Create User</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* User Detail Modal */}
      <Modal visible={!!selectedUser} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedUser?.username}</Text>
            <View style={[styles.roleChip, { backgroundColor: (ROLE_COLORS[selectedUser?.role] || '#64748b') + '20', alignSelf: 'flex-start', marginBottom: 16 }]}>
              <Text style={[styles.roleChipText, { color: ROLE_COLORS[selectedUser?.role] || '#64748b' }]}>{selectedUser?.role}</Text>
            </View>
            {selectedUser?.department?.name && <><Text style={styles.detailLabel}>Department</Text><Text style={styles.detailValue}>{selectedUser.department.name}</Text></>}
            {selectedUser?.lastLogin && <><Text style={styles.detailLabel}>Last Login</Text><Text style={styles.detailValue}>{new Date(selectedUser.lastLogin).toLocaleString()}</Text></>}
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => handleResetPassword(selectedUser?.id)} style={styles.resetBtn}>
                <MaterialCommunityIcons name="lock-reset" size={16} color="#3b82f6" />
                <Text style={styles.resetText}>Reset Password</Text>
              </Pressable>
              <Pressable style={styles.closeBtn} onPress={() => setSelectedUser(null)}><Text style={styles.closeText}>Close</Text></Pressable>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444' },
  addBtn: { backgroundColor: '#3b82f6', padding: 7, borderRadius: 8, marginRight: 8 },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  tabTextActive: { color: '#3b82f6', fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  search: { flex: 1, fontSize: 14, color: '#0f172a' },
  filterBar: { paddingLeft: 12, marginBottom: 4, maxHeight: 44 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f1f5f9', marginRight: 8, height: 34, justifyContent: 'center' },
  filterChipActive: { backgroundColor: '#3b82f6' },
  filterText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  countText: { fontSize: 12, color: '#94a3b8', paddingHorizontal: 16, paddingBottom: 6 },
  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  userCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  roleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 12 },
  roleChipText: { fontSize: 11, fontWeight: '700' },
  userInfo: { flex: 1 },
  username: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  dept: { fontSize: 12, color: '#64748b', marginTop: 1 },
  meta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 32 },
  roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 },
  roleIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  roleDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  roleCount: { alignItems: 'center' },
  roleCountNum: { fontSize: 20, fontWeight: '700' },
  roleCountLabel: { fontSize: 10, color: '#94a3b8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  inputLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 14, fontSize: 14, color: '#0f172a', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 16 },
  cancelText: { color: '#64748b', padding: 12 },
  submitBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginLeft: 10 },
  submitText: { color: '#fff', fontWeight: '700' },
  detailLabel: { fontSize: 11, color: '#94a3b8', marginTop: 10 },
  detailValue: { fontSize: 14, color: '#0f172a', marginTop: 2 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#eff6ff', borderRadius: 10 },
  resetText: { color: '#3b82f6', fontWeight: '600', fontSize: 13, marginLeft: 6 },
  closeBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginLeft: 10 },
  closeText: { color: '#475569', fontWeight: '600' },
});
