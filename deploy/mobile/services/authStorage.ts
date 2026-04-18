import * as SecureStore from 'expo-secure-store';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

const AUTH_TOKEN_KEY = 'mm_auth_token';
const AUTH_USER_KEY = 'mm_auth_user';

export async function getStoredSession(): Promise<AuthSession | null> {
  const [token, userJson] = await Promise.all([
    SecureStore.getItemAsync(AUTH_TOKEN_KEY),
    SecureStore.getItemAsync(AUTH_USER_KEY),
  ]);

  if (!token || !userJson) {
    return null;
  }

  try {
    return {
      token,
      user: JSON.parse(userJson) as AuthUser,
    };
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function storeSession(session: AuthSession) {
  await Promise.all([
    SecureStore.setItemAsync(AUTH_TOKEN_KEY, session.token),
    SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(session.user)),
  ]);
}

export async function clearStoredSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
    SecureStore.deleteItemAsync(AUTH_USER_KEY),
  ]);
}

export async function getStoredToken() {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}
