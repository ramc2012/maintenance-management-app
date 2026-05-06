/**
 * ThemeContext — manages app appearance state
 *
 * Features:
 * - Light / Dark / System color scheme
 * - 6 accent color options
 * - Persists to AsyncStorage
 * - Provides computed theme object to consumers
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AccentName,
  AccentPalettes,
  ColorScheme,
  DarkColors,
  Durations,
  LightColors,
  Radii,
  Shadows,
  Spacing,
  Theme,
  Typography,
} from '@/constants/theme';

// Storage keys
const STORAGE_KEY_SCHEME = '@theme_color_scheme';
const STORAGE_KEY_ACCENT = '@theme_accent_color';

// ─── Context Types ──────────────────────────────────────────────────────────
interface ThemeContextValue {
  /** Resolved theme object for rendering */
  theme: Theme;
  /** User preference: light | dark | system */
  colorScheme: ColorScheme;
  /** Currently active accent name */
  accentName: AccentName;
  /** Set color scheme preference */
  setColorScheme: (scheme: ColorScheme) => void;
  /** Set accent color */
  setAccentColor: (name: AccentName) => void;
  /** Quick check */
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('system');
  const [accentName, setAccentNameState] = useState<AccentName>('blue');
  const [loaded, setLoaded] = useState(false);

  // Load persisted preferences
  useEffect(() => {
    (async () => {
      try {
        const [savedScheme, savedAccent] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_SCHEME),
          AsyncStorage.getItem(STORAGE_KEY_ACCENT),
        ]);
        if (savedScheme && ['light', 'dark', 'system'].includes(savedScheme)) {
          setColorSchemeState(savedScheme as ColorScheme);
        }
        if (savedAccent && savedAccent in AccentPalettes) {
          setAccentNameState(savedAccent as AccentName);
        }
      } catch {
        // Silently use defaults
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Setters with persistence
  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    AsyncStorage.setItem(STORAGE_KEY_SCHEME, scheme).catch(() => {});
  }, []);

  const setAccentColor = useCallback((name: AccentName) => {
    setAccentNameState(name);
    AsyncStorage.setItem(STORAGE_KEY_ACCENT, name).catch(() => {});
  }, []);

  // Resolve effective mode
  const resolvedScheme: 'light' | 'dark' = useMemo(() => {
    if (colorScheme === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return colorScheme;
  }, [colorScheme, systemScheme]);

  const isDark = resolvedScheme === 'dark';

  // Build theme
  const theme: Theme = useMemo(() => {
    const baseColors = isDark ? DarkColors : LightColors;
    const accent = AccentPalettes[accentName];

    return {
      colorScheme: resolvedScheme,
      colors: {
        ...baseColors,
        primary: accent.primary,
        primaryLight: accent.primaryLight,
        primaryDark: accent.primaryDark,
        primaryMuted: accent.primaryMuted,
        primarySubtle: accent.primarySubtle,
      },
      typography: Typography,
      spacing: Spacing,
      radii: Radii,
      shadows: Shadows,
      isDark,
    };
  }, [isDark, accentName, resolvedScheme]);

  const value: ThemeContextValue = useMemo(
    () => ({ theme, colorScheme, accentName, setColorScheme, setAccentColor, isDark }),
    [theme, colorScheme, accentName, setColorScheme, setAccentColor, isDark]
  );

  // Don't render until preferences are loaded (prevents theme flash)
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

// ─── Shorthand hook — just the colors ───────────────────────────────────────
export function useColors() {
  const { theme } = useTheme();
  return theme.colors;
}
