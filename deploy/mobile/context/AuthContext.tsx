import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { Alert } from 'react-native';

import {
  clearStoredSession,
  getStoredSession,
  storeSession,
  type AuthSession,
  type AuthUser,
} from '@/services/authStorage';
import { subscribeToUnauthorized } from '@/services/apiEvents';
import { queryClient } from '@/services/queryClient';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

type AuthAction =
  | { type: 'BOOTSTRAP_START' }
  | { type: 'BOOTSTRAP_COMPLETE'; payload: AuthSession | null }
  | { type: 'LOGIN'; payload: AuthSession }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  user: null,
  token: null,
  loading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'BOOTSTRAP_START':
      return { ...state, loading: true };
    case 'BOOTSTRAP_COMPLETE':
      return {
        user: action.payload?.user ?? null,
        token: action.payload?.token ?? null,
        loading: false,
      };
    case 'LOGIN':
      return {
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
      };
    case 'LOGOUT':
      return {
        user: null,
        token: null,
        loading: false,
      };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const authVersionRef = useRef(0);
  const tokenRef = useRef<string | null>(null);
  const handlingUnauthorizedRef = useRef(false);

  useEffect(() => {
    tokenRef.current = state.token;
  }, [state.token]);

  useEffect(() => {
    let cancelled = false;
    const bootstrapVersion = authVersionRef.current;

    const loadStoredAuth = async () => {
      dispatch({ type: 'BOOTSTRAP_START' });

      try {
        const session = await getStoredSession();
        if (!cancelled && authVersionRef.current === bootstrapVersion) {
          dispatch({ type: 'BOOTSTRAP_COMPLETE', payload: session });
        }
      } catch (error) {
        console.error('Failed to load auth session:', error);
        if (!cancelled && authVersionRef.current === bootstrapVersion) {
          dispatch({ type: 'BOOTSTRAP_COMPLETE', payload: null });
        }
      }
    };

    void loadStoredAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const clearSession = async (showExpiredMessage = false) => {
    authVersionRef.current += 1;
    await clearStoredSession();
    queryClient.clear();
    dispatch({ type: 'LOGOUT' });

    if (showExpiredMessage) {
      Alert.alert('Session expired', 'Please sign in again to continue.');
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToUnauthorized(() => {
      if (!tokenRef.current || handlingUnauthorizedRef.current) {
        return;
      }

      handlingUnauthorizedRef.current = true;

      void (async () => {
        try {
          await clearSession(true);
        } finally {
          handlingUnauthorizedRef.current = false;
        }
      })();
    });

    return unsubscribe;
  }, []);

  const login = async (token: string, user: AuthUser) => {
    authVersionRef.current += 1;
    const session = { token, user };
    await storeSession(session);
    dispatch({ type: 'LOGIN', payload: session });
  };

  const logout = async () => {
    await clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        loading: state.loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
