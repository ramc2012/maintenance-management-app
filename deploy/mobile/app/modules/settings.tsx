import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Pressable, Switch, Alert, TextInput } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { AccentPalettes, AccentName, ColorScheme } from '@/constants/theme';
import api from '@/services/api';

const ACCENT_OPTIONS: { name: AccentName; label: string }[] = [
  { name: 'blue', label: 'Blue' },
  { name: 'purple', label: 'Purple' },
  { name: 'teal', label: 'Teal' },
  { name: 'rose', label: 'Rose' },
  { name: 'amber', label: 'Amber' },
  { name: 'emerald', label: 'Emerald' },
];

const SCHEME_OPTIONS: { value: ColorScheme; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { value: 'dark', label: 'Dark', icon: 'moon-waning-crescent' },
  { value: 'system', label: 'System', icon: 'cellphone' },
];

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, colorScheme, accentName, setColorScheme, setAccentColor, isDark } = useTheme();
  const { colors } = theme;
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

  const handleSchemeChange = (scheme: ColorScheme) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setColorScheme(scheme);
  };

  const handleAccentChange = (name: AccentName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAccentColor(name);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Settings', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />

      {/* Profile */}
      <SectionHeader title="Profile" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySubtle }]}>
            <MaterialCommunityIcons name="account" size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.username || 'User'}</Text>
            <Text style={[styles.profileRole, { color: colors.textSecondary }]}>{user?.role || 'Member'}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colors.primarySubtle }]}>
            <Text style={[styles.roleBadgeText, { color: colors.primary }]}>{user?.role || 'USER'}</Text>
          </View>
        </View>
      </View>

      {/* Appearance */}
      <SectionHeader title="Appearance" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {/* Color Scheme Selector */}
        <View style={styles.settingSection}>
          <Text style={[styles.settingSectionTitle, { color: colors.text }]}>Theme Mode</Text>
          <Text style={[styles.settingSectionHint, { color: colors.textTertiary }]}>Choose how the app looks</Text>
          <View style={styles.schemeRow}>
            {SCHEME_OPTIONS.map((opt) => {
              const isSelected = colorScheme === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.schemeOption,
                    {
                      backgroundColor: isSelected ? colors.primarySubtle : colors.backgroundTertiary,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleSchemeChange(opt.value)}
                >
                  <MaterialCommunityIcons
                    name={opt.icon}
                    size={22}
                    color={isSelected ? colors.primary : colors.textTertiary}
                  />
                  <Text style={[styles.schemeLabel, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.innerDivider, { backgroundColor: colors.divider }]} />

        {/* Accent Color Picker */}
        <View style={styles.settingSection}>
          <Text style={[styles.settingSectionTitle, { color: colors.text }]}>Accent Color</Text>
          <Text style={[styles.settingSectionHint, { color: colors.textTertiary }]}>Personalize buttons, links, and highlights</Text>
          <View style={styles.accentRow}>
            {ACCENT_OPTIONS.map((opt) => {
              const palette = AccentPalettes[opt.name];
              const isSelected = accentName === opt.name;
              return (
                <Pressable
                  key={opt.name}
                  style={styles.accentOption}
                  onPress={() => handleAccentChange(opt.name)}
                >
                  <View
                    style={[
                      styles.accentCircle,
                      { backgroundColor: palette.primary },
                      isSelected && styles.accentCircleSelected,
                      isSelected && { borderColor: isDark ? '#ffffff' : '#0f172a' },
                    ]}
                  >
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={16} color="#ffffff" />
                    )}
                  </View>
                  <Text style={[styles.accentLabel, { color: isSelected ? colors.text : colors.textTertiary }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.innerDivider, { backgroundColor: colors.divider }]} />

        {/* Preview */}
        <View style={styles.settingSection}>
          <Text style={[styles.settingSectionTitle, { color: colors.text }]}>Preview</Text>
          <View style={[styles.previewCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <View style={styles.previewRow}>
              <View style={[styles.previewDot, { backgroundColor: colors.primary }]} />
              <View style={[styles.previewLine, { backgroundColor: colors.text, opacity: 0.7 }]} />
            </View>
            <View style={styles.previewRow}>
              <View style={[styles.previewDot, { backgroundColor: colors.success }]} />
              <View style={[styles.previewLineShort, { backgroundColor: colors.textSecondary, opacity: 0.5 }]} />
            </View>
            <View style={[styles.previewBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.previewBtnText}>Button</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Notifications */}
      <SectionHeader title="Notifications" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <SettingRow icon="bell" label="Push Notifications" colors={colors} right={<Switch value={pushNotifications} onValueChange={setPushNotifications} trackColor={{ false: colors.backgroundTertiary, true: colors.primary }} thumbColor="#ffffff" />} />
        <Divider colors={colors} />
        <SettingRow icon="email" label="Email Notifications" colors={colors} right={<Switch value={emailNotifications} onValueChange={setEmailNotifications} trackColor={{ false: colors.backgroundTertiary, true: colors.primary }} thumbColor="#ffffff" />} />
        <Divider colors={colors} />
        <SettingRow icon="hammer-wrench" label="Work Order Alerts" colors={colors} right={<Switch value={workOrderAlerts} onValueChange={setWorkOrderAlerts} trackColor={{ false: colors.backgroundTertiary, true: colors.primary }} thumbColor="#ffffff" />} />
        <Divider colors={colors} />
        <SettingRow icon="gauge" label="Calibration Reminders" colors={colors} right={<Switch value={calibrationReminders} onValueChange={setCalibrationReminders} trackColor={{ false: colors.backgroundTertiary, true: colors.primary }} thumbColor="#ffffff" />} />
      </View>

      {/* Data & Storage */}
      <SectionHeader title="Data & Storage" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Pressable onPress={handleClearCache}>
          <SettingRow
            icon="trash-can-outline"
            label="Clear Cache"
            colors={colors}
            iconColor={colors.error}
            labelColor={colors.error}
            right={<MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />}
          />
        </Pressable>
      </View>

      {/* Security */}
      <SectionHeader title="Security" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Pressable onPress={() => setShowChangePassword(v => !v)}>
          <SettingRow
            icon="lock-reset"
            label="Change Password"
            colors={colors}
            right={<MaterialCommunityIcons name={showChangePassword ? 'chevron-up' : 'chevron-right'} size={18} color={colors.textTertiary} />}
          />
        </Pressable>
        {showChangePassword && (
          <View style={styles.passwordForm}>
            <PasswordField placeholder="Current Password" value={oldPassword} onChangeText={setOldPassword} colors={colors} />
            <PasswordField placeholder="New Password (min 6 chars)" value={newPassword} onChangeText={setNewPassword} colors={colors} />
            <Pressable
              style={[styles.changePassBtn, { backgroundColor: colors.primary }, changingPassword && styles.btnDisabled]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              <Text style={styles.changePassText}>{changingPassword ? 'Updating…' : 'Update Password'}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* About */}
      <SectionHeader title="About" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <SettingRow icon="information-outline" label="Version" colors={colors} right={<Text style={[styles.metaText, { color: colors.textSecondary }]}>2.1.0</Text>} />
        <Divider colors={colors} />
        <SettingRow icon="office-building" label="Organisation" colors={colors} right={<Text style={[styles.metaText, { color: colors.textSecondary }]}>ONGC Ankleshwar</Text>} />
      </View>

      {/* Logout */}
      <Pressable style={[styles.logoutBtn, { backgroundColor: colors.error }]} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>{title.toUpperCase()}</Text>;
}

function Divider({ colors }: { colors: any }) {
  return <View style={[styles.divider, { backgroundColor: colors.divider }]} />;
}

function SettingRow({ icon, label, right, colors, iconColor, labelColor }: {
  icon: string; label: string; right: React.ReactNode; colors: any; iconColor?: string; labelColor?: string;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIconWrap, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={iconColor || colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: labelColor || colors.text }]}>{label}</Text>
      {right}
    </View>
  );
}

function PasswordField({ placeholder, value, onChangeText, colors }: { placeholder: string; value: string; onChangeText: (t: string) => void; colors: any }) {
  const [show, setShow] = useState(false);
  return (
    <View style={[styles.passRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
      <TextInput
        style={[styles.passInput, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        secureTextEntry={!show}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
      />
      <Pressable onPress={() => setShow(v => !v)} style={styles.eyeBtn}>
        <MaterialCommunityIcons name={show ? 'eye-off' : 'eye'} size={18} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 48 },
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  card: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileRole: { fontSize: 13, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Appearance
  settingSection: { padding: 16 },
  settingSectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  settingSectionHint: { fontSize: 12, marginBottom: 14 },
  innerDivider: { height: 1, marginHorizontal: 16 },

  schemeRow: { flexDirection: 'row', gap: 10 },
  schemeOption: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
  schemeLabel: { fontSize: 12, fontWeight: '600', marginTop: 6 },

  accentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  accentOption: { alignItems: 'center', gap: 6 },
  accentCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  accentCircleSelected: { borderWidth: 3 },
  accentLabel: { fontSize: 10, fontWeight: '600' },

  previewCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewDot: { width: 10, height: 10, borderRadius: 5 },
  previewLine: { height: 8, borderRadius: 4, flex: 1 },
  previewLineShort: { height: 8, borderRadius: 4, width: '60%' },
  previewBtn: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 4 },
  previewBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  // Settings Rows
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  settingIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  metaText: { fontSize: 14 },
  divider: { height: 1, marginLeft: 60 },

  // Password
  passwordForm: { paddingHorizontal: 16, paddingBottom: 16 },
  passRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingLeft: 14, marginBottom: 10 },
  passInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  eyeBtn: { padding: 12 },
  changePassBtn: { borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 4 },
  changePassText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },

  // Logout
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 16, marginTop: 28, borderRadius: 14, padding: 15 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },
});
