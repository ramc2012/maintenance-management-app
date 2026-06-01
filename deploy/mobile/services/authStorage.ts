import { Platform } from 'react-native';

// expo-secure-store only works on native (iOS/Android).
// On web, fall back to localStorage so the app works in a browser preview.
let SecureStore: typeof import('expo-secure-store') | null = null;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  persona?: 'MANAGER' | 'FIELD' | 'HYBRID';
  defaultDiscipline?: 'MECHANICAL' | 'ELECTRICAL' | 'INSTRUMENTATION' | null;
  disciplineAccess?: Array<{
    discipline: 'MECHANICAL' | 'ELECTRICAL' | 'INSTRUMENTATION';
    accessLevel: 'VIEW' | 'EXECUTE' | 'MANAGE';
    isDefault: boolean;
    canViewProcurement: boolean;
    canUpdateProcurement: boolean;
    canRaiseRequirements: boolean;
  }>;
  capabilities?: {
    managerOverview: boolean;
    fieldWorkspace: boolean;
    workspaces: Array<'MECHANICAL' | 'ELECTRICAL' | 'INSTRUMENTATION'>;
    canViewProcurement: boolean;
    canUpdateProcurement: boolean;
    canRaiseRequirements: boolean;
    canUseLogbook: boolean;
    canUseCalibration: boolean;
    canManageUsers: boolean;
  };
  canCreateWorkOrder?: boolean;
  canCloseWorkOrder?: boolean;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

const AUTH_TOKEN_KEY = 'mm_auth_token';
const AUTH_USER_KEY = 'mm_auth_user';

// ── Unified get/set/delete that works on both native and web ────────────────

async function getItem(key: string): Promise<string | null> {
  if (SecureStore) return SecureStore.getItemAsync(key);
  return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
}

async function setItem(key: string, value: string): Promise<void> {
  if (SecureStore) { await SecureStore.setItemAsync(key, value); return; }
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (SecureStore) { await SecureStore.deleteItemAsync(key); return; }
  if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getStoredSession(): Promise<AuthSession | null> {
  const [token, userJson] = await Promise.all([
    getItem(AUTH_TOKEN_KEY),
    getItem(AUTH_USER_KEY),
  ]);

  if (!token || !userJson) return null;

  try {
    return { token, user: JSON.parse(userJson) as AuthUser };
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function storeSession(session: AuthSession) {
  await Promise.all([
    setItem(AUTH_TOKEN_KEY, session.token),
    setItem(AUTH_USER_KEY, JSON.stringify(session.user)),
  ]);
}

export async function clearStoredSession() {
  await Promise.all([
    deleteItem(AUTH_TOKEN_KEY),
    deleteItem(AUTH_USER_KEY),
  ]);
}

export async function getStoredToken() {
  return getItem(AUTH_TOKEN_KEY);
}
