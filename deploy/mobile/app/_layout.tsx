import FontAwesome from '@expo/vector-icons/FontAwesome';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/context/AuthContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { NotificationProvider } from '@/context/NotificationContext';
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
            <AppErrorBoundary>
              <RootLayoutNav />
            </AppErrorBoundary>
          </NotificationProvider>
        </NetworkProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <OfflineBanner />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
