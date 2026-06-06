import FontAwesome from '@expo/vector-icons/FontAwesome';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { AuthProvider } from '@/context/AuthContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { resolveApiBaseUrl } from '@/services/api';
import { queryClient } from '@/services/queryClient';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NetworkProvider>
          <NotificationProvider>
            <ThemeProvider>
              <AppErrorBoundary>
                <RootLayoutNav />
              </AppErrorBoundary>
            </ThemeProvider>
          </NotificationProvider>
        </NetworkProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { theme, isDark } = useTheme();
  const { loading, token } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  resolveApiBaseUrl();

  useEffect(() => {
    if (loading) {
      return;
    }

    const isAuthScreen = segments[0] === 'login';

    if (!token && !isAuthScreen) {
      router.replace('/login');
      return;
    }

    if (token && isAuthScreen) {
      router.replace('/');
    }
  }, [loading, router, segments, token]);

  if (loading) {
    return null;
  }

  // Build navigation theme from our custom theme
  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
        },
      };

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.backgroundSecondary },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </NavThemeProvider>
  );
}
