import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';

import { Text } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorScheme } from '@/constants/theme';
import api from '@/services/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, token, loading: authLoading } = useAuth();
  const { theme, colorScheme, setColorScheme } = useTheme();
  const { colors } = theme;
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && token) {
      router.replace('/');
    }
  }, [authLoading, router, token]);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Enter your username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(username, password);
      await login(res.token, res.user);
      router.replace('/');
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.hero, { backgroundColor: colors.heroSurface, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
        <View style={styles.heroHeader}>
          <View style={[styles.logoWrap, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="wrench-cog-outline" size={28} color="#ffffff" />
          </View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>MAINTENANCE</Text>
          <ThemeModeSwitch colorScheme={colorScheme} setColorScheme={setColorScheme} colors={colors} />
        </View>
        <Text style={[styles.title, { color: colors.heroText }]}>Ankleshwar field access</Text>
        <Text style={[styles.subtitle, { color: colors.heroTextSecondary }]} numberOfLines={2}>
          Sign in for KPIs, execution modules, alerts, and planning workflows.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Sign in</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Use your maintenance system credentials.</Text>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.inputShell, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
          <MaterialCommunityIcons name="account-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Username"
            placeholderTextColor={colors.inputPlaceholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={[styles.inputShell, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
          <MaterialCommunityIcons name="lock-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Password"
            placeholderTextColor={colors.inputPlaceholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Continue</Text>}
        </Pressable>

        <Text style={[styles.hint, { color: colors.textTertiary }]}>Backend default during local setup: `admin` / `admin123`.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function ThemeModeSwitch({
  colorScheme,
  setColorScheme,
  colors,
}: {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  colors: Record<string, string>;
}) {
  const activeScheme = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <View style={[styles.themeSwitch, { backgroundColor: colors.cardMuted, borderColor: colors.cardBorder }]}>
      {[
        { value: 'light' as const, icon: 'white-balance-sunny' as const },
        { value: 'dark' as const, icon: 'moon-waning-crescent' as const },
      ].map((option) => {
        const selected = activeScheme === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.value === 'light' ? 'Use day theme' : 'Use dark theme'}
            style={[styles.themeButton, selected && { backgroundColor: colors.primary }]}
            onPress={() => setColorScheme(option.value)}
          >
            <MaterialCommunityIcons
              name={option.icon}
              size={16}
              color={selected ? '#ffffff' : colors.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 16,
    paddingTop: 72,
  },
  hero: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    marginTop: 12,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
  },
  themeSwitch: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 2,
  },
  themeButton: {
    width: 30,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  errorBox: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    marginLeft: 8,
    fontSize: 13,
  },
  inputShell: {
    height: 52,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 14,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
  },
});
