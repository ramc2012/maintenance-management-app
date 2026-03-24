import React, { useState } from 'react';
import { StyleSheet, TextInput, Pressable, ActivityIndicator, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      await login(res.token, res.user);
      router.replace('/');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <View style={styles.logo}>
          <MaterialCommunityIcons name="cog" size={64} color="#2563eb" />
          <Text style={styles.title}>Maintenance Hub</Text>
          <Text style={styles.subtitle}>ONGC Ankleshwar Asset</Text>
        </View>
        
        {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
        
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="account" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        </View>
        
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="lock" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        </View>
        
        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </Pressable>
        
        <Text style={styles.hint}>Use your ONGC credentials</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginTop: 16 },
  subtitle: { fontSize: 14, color: '#dc2626', fontWeight: '600', marginTop: 4 },
  errorBox: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#dc2626', textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 50, fontSize: 16 },
  button: { backgroundColor: '#2563eb', borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { textAlign: 'center', color: '#94a3b8', marginTop: 24, fontSize: 12 },
});
