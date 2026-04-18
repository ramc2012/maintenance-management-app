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
import api from '@/services/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, token, loading: authLoading } = useAuth();
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <MaterialCommunityIcons name="wrench-cog-outline" size={34} color="#dbeafe" />
        </View>
        <Text style={styles.eyebrow}>MAINTENANCE MANAGEMENT</Text>
        <Text style={styles.title}>Field access for Ankleshwar operations.</Text>
        <Text style={styles.subtitle}>
          Sign in to access KPI monitoring, execution modules, notifications, and planning workflows from the mobile shell.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign in</Text>
        <Text style={styles.cardSubtitle}>Use your maintenance system credentials.</Text>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#b91c1c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputShell}>
          <MaterialCommunityIcons name="account-outline" size={18} color="#64748b" />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#94a3b8"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputShell}>
          <MaterialCommunityIcons name="lock-outline" size={18} color="#64748b" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Continue</Text>}
        </Pressable>

        <Text style={styles.hint}>Backend default during local setup: `admin` / `admin123`.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    padding: 20,
  },
  hero: {
    backgroundColor: '#0f172a',
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
    backgroundColor: '#1d4ed8',
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
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 22,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748b',
  },
  errorBox: {
    marginTop: 18,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#fef2f2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    marginLeft: 8,
    color: '#b91c1c',
    fontSize: 13,
  },
  inputShell: {
    height: 56,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#0f172a',
  },
  button: {
    marginTop: 18,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#1d4ed8',
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
    color: '#64748b',
  },
});
