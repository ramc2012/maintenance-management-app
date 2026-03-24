import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Pressable, Switch, Alert, TextInput } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [pushNotifications, setPushNotifications] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [workOrderAlerts, setWorkOrderAlerts] = useState(true);
  const [calibrationReminders, setCalibrationReminders] = useState(true);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'This will clear all locally cached data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          const keys = await AsyncStorage.getAllKeys();
          const cacheKeys = keys.filter(k => k.startsWith('cache_'));
          await AsyncStorage.multiRemove(cacheKeys);
          Alert.alert('Done', 'Cache cleared successfully.');
        }
      }
    ]);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) return Alert.alert('Error', 'Fill in all password fields.');
    if (newPassword.length < 6) return Alert.alert('Error', 'New password must be at least 6 characters.');
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      Alert.alert('Success', 'Password changed. Please log in again.', [
        { text: 'OK', onPress: async () => { await logout(); router.replace('/login'); } }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
      setOldPassword('');
      setNewPassword('');
      setShowChangePassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Settings' }} />

      {/* Profile */}
      <SectionHeader title="Profile" />
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <MaterialCommunityIcons name="account-circle" size={48} color="#3b82f6" style={{ marginRight: 14 }} />
          <View>
            <Text style={styles.profileName}>{user?.username || 'User'}</Text>
            <Text style={styles.profileRole}>{user?.role || 'Member'}</Text>
          </View>
        </View>
      </View>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <View style={styles.card}>
        <SettingRow icon="bell" label="Push Notifications" right={<Switch value={pushNotifications} onValueChange={setPushNotifications} trackColor={{ false: '#e2e8f0', true: '#3b82f6' }} />} />
        <Divider />
        <SettingRow icon="email" label="Email Notifications" right={<Switch value={emailNotifications} onValueChange={setEmailNotifications} trackColor={{ false: '#e2e8f0', true: '#3b82f6' }} />} />
        <Divider />
        <SettingRow icon="hammer-wrench" label="Work Order Alerts" right={<Switch value={workOrderAlerts} onValueChange={setWorkOrderAlerts} trackColor={{ false: '#e2e8f0', true: '#3b82f6' }} />} />
        <Divider />
        <SettingRow icon="gauge" label="Calibration Reminders" right={<Switch value={calibrationReminders} onValueChange={setCalibrationReminders} trackColor={{ false: '#e2e8f0', true: '#3b82f6' }} />} />
      </View>

      {/* Data & Storage */}
      <SectionHeader title="Data & Storage" />
      <View style={styles.card}>
        <Pressable onPress={handleClearCache}>
          <SettingRow
            icon="trash-can-outline"
            label="Clear Cache"
            iconColor="#ef4444"
            labelColor="#ef4444"
            right={<MaterialCommunityIcons name="chevron-right" size={18} color="#94a3b8" />}
          />
        </Pressable>
      </View>

      {/* Security */}
      <SectionHeader title="Security" />
      <View style={styles.card}>
        <Pressable onPress={() => setShowChangePassword(v => !v)}>
          <SettingRow
            icon="lock-reset"
            label="Change Password"
            right={<MaterialCommunityIcons name={showChangePassword ? 'chevron-up' : 'chevron-right'} size={18} color="#94a3b8" />}
          />
        </Pressable>
        {showChangePassword && (
          <View style={styles.passwordForm}>
            <PasswordField placeholder="Current Password" value={oldPassword} onChangeText={setOldPassword} />
            <PasswordField placeholder="New Password (min 6 chars)" value={newPassword} onChangeText={setNewPassword} />
            <Pressable
              style={[styles.changePassBtn, changingPassword && styles.btnDisabled]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              <Text style={styles.changePassText}>{changingPassword ? 'Updating…' : 'Update Password'}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* About */}
      <SectionHeader title="About" />
      <View style={styles.card}>
        <SettingRow icon="information-outline" label="Version" right={<Text style={styles.metaText}>2.1.0</Text>} />
        <Divider />
        <SettingRow icon="office-building" label="Organisation" right={<Text style={styles.metaText}>ONGC Ankleshwar</Text>} />
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingRow({ icon, label, right, iconColor = '#3b82f6', labelColor = '#0f172a' }: {
  icon: string; label: string; right: React.ReactNode; iconColor?: string; labelColor?: string;
}) {
  return (
    <View style={styles.settingRow}>
      <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} style={styles.settingIcon} />
      <Text style={[styles.settingLabel, { color: labelColor }]}>{label}</Text>
      {right}
    </View>
  );
}

function PasswordField({ placeholder, value, onChangeText }: { placeholder: string; value: string; onChangeText: (t: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.passRow}>
      <TextInput
        style={styles.passInput}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={!show}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
      />
      <Pressable onPress={() => setShow(v => !v)} style={styles.eyeBtn}>
        <MaterialCommunityIcons name={show ? 'eye-off' : 'eye'} size={18} color="#64748b" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 48 },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 6 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  profileRole: { fontSize: 13, color: '#64748b', marginTop: 2 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  settingIcon: { marginRight: 14 },
  settingLabel: { flex: 1, fontSize: 15 },
  metaText: { fontSize: 14, color: '#64748b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 50 },
  passwordForm: { paddingHorizontal: 16, paddingBottom: 16 },
  passRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingLeft: 14, marginBottom: 10 },
  passInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#0f172a' },
  eyeBtn: { padding: 12 },
  changePassBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 4 },
  changePassText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ef4444', marginHorizontal: 16, marginTop: 28, borderRadius: 12, padding: 15 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },
});
