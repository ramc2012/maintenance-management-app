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
import api from '@/services/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, token, loading: authLoading } = useAuth();
  const { theme } = useTheme();
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
      style={[styles.container, { backgroundColor: theme.isDark ? colors.background : '#e2e8f0' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.hero, { backgroundColor: theme.isDark ? colors.surface : '#0f172a' }]}>
        <View style={[styles.logoWrap, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="wrench-cog-outline" size={34} color="#ffffff" />
        </View>
        <Text style={styles.eyebrow}>MAINTENANCE MANAGEMENT</Text>
        <Text style={styles.title}>Field access for Ankleshwar operations.</Text>
        <Text style={styles.subtitle}>
          Sign in to access KPI monitoring, execution modules, notifications, and planning workflows from the mobile shell.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.isDark ? colors.surfaceElevated : '#ffffff' }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Sign in</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Use your maintenance system credentials.</Text>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  hero: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 18,
  },
  logoWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  eyebrow: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: '#cbd5e1',
  },
  card: {
    borderRadius: 28,
    padding: 22,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 14,
  },
  errorBox: {
    marginTop: 18,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    marginLeft: 8,
    fontSize: 13,
  },
  inputShell: {
    height: 56,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 18,
    height: 54,
    borderRadius: 18,
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
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
  },
});
