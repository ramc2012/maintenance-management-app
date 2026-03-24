import { StyleSheet, ScrollView, View, Pressable } from 'react-native';
import { Text } from '@/components/Themed';
import { ModuleCard } from '@/components/ModuleCard';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MODULES = [
  { id: 'assets', name: 'Equipment Master', icon: 'database', color: '#2563eb', bg: '#eff6ff', link: '/modules/assets' },
  { id: 'calibration', name: 'Calibration', icon: 'chart-bell-curve', color: '#16a34a', bg: '#f0fdf4', link: '/modules/calibration' },
  { id: 'logbook', name: 'Digital Logbook', icon: 'book-open-page-variant', color: '#d97706', bg: '#fffbeb', link: '/modules/logbook' },
  { id: 'overhaul', name: 'Major Overhaul', icon: 'wrench', color: '#ea580c', bg: '#fff7ed', link: '/modules/overhaul' },
  { id: 'workshop', name: 'Workshop', icon: 'hammer', color: '#eab308', bg: '#fefce8', link: '/modules/workshop' },
  { id: 'procurement', name: 'Procurement', icon: 'cart', color: '#9333ea', bg: '#faf5ff', link: '/modules/procurement' },
  { id: 'energy', name: 'Energy', icon: 'lightning-bolt', color: '#dc2626', bg: '#fef2f2', link: '/modules/energy' },
  { id: 'stock', name: 'Material Planner', icon: 'clipboard-list', color: '#4f46e5', bg: '#eef2ff', link: '/modules/mrp' },
  { id: 'training', name: 'Training', icon: 'school', color: '#0891b2', bg: '#ecfeff', link: '/modules/training' },
  { id: 'manpower', name: 'Manpower', icon: 'account-group', color: '#db2777', bg: '#fdf2f7', link: '/modules/manpower' },
  { id: 'reports', name: 'Reports', icon: 'chart-bar', color: '#059669', bg: '#ecfdf5', link: '/modules/reports' },
  { id: 'collab', name: 'Collaboration', icon: 'message-text', color: '#7c3aed', bg: '#f5f3ff', link: '/modules/collaboration' },
  { id: 'manuals', name: 'Manuals & Drawings', icon: 'file-document', color: '#14b8a6', bg: '#f0fdfa', link: '/modules/manuals' },
  { id: 'settings', name: 'Settings', icon: 'cog', color: '#475569', bg: '#f8fafc', link: '/modules/settings' },
  { id: 'usermgmt', name: 'User Management', icon: 'account-cog', color: '#0f172a', bg: '#f1f5f9', link: '/modules/usermanagement', adminOnly: true },
];

export default function HomeScreen() {
  const { user, token, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.replace('/login');
    }
  }, [loading, token]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (loading || !token) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Maintenance Management</Text>
            <Text style={styles.subtitle}>ONGC Ankleshwar Asset</Text>
          </View>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <MaterialCommunityIcons name="logout" size={20} color="#64748b" />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
        
        {user && (
          <View style={styles.userBar}>
            <MaterialCommunityIcons name="account-circle" size={20} color="#3b82f6" />
            <Text style={styles.userName}>Welcome, {user.username}</Text>
            <Text style={styles.userRole}>({user.role})</Text>
          </View>
        )}
        
        <View style={styles.grid}>
          {MODULES.filter(m => !m.adminOnly || user?.role === 'ADMIN').map((module) => (
            <ModuleCard key={module.id} {...module} />
          ))}
        </View>
      </ScrollView>

      {/* Kelvin AI Floating Button */}
      <Pressable 
        style={styles.kelvinFab} 
        onPress={() => router.push('/modules/kelvin')}
      >
        <View style={styles.kelvinFabInner}>
          <MaterialCommunityIcons name="robot" size={24} color="#fff" />
          <Text style={styles.kelvinFabText}>KELVIN AI</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#dc2626', fontWeight: '600', marginTop: 4 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  logoutText: { fontSize: 12, color: '#64748b', marginLeft: 4 },
  userBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 10, borderRadius: 8, marginBottom: 16 },
  userName: { fontSize: 14, color: '#1e40af', marginLeft: 8, fontWeight: '500' },
  userRole: { fontSize: 12, color: '#64748b', marginLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  kelvinFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    borderRadius: 28,
    backgroundColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  kelvinFabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  kelvinFabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});
