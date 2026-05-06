/**
 * Design Token System — ONGC Maintenance Management App
 *
 * Centralized design tokens: colors, typography, spacing, radii, shadows.
 * All colors are semantic and support both light and dark modes.
 * Accent colors are swappable via ThemeContext.
 */

// ─── Accent Palettes ────────────────────────────────────────────────────────
export const AccentPalettes = {
  blue: {
    primary: '#2563eb',
    primaryLight: '#3b82f6',
    primaryDark: '#1d4ed8',
    primaryMuted: '#dbeafe',
    primarySubtle: '#eff6ff',
  },
  purple: {
    primary: '#7c3aed',
    primaryLight: '#8b5cf6',
    primaryDark: '#6d28d9',
    primaryMuted: '#ede9fe',
    primarySubtle: '#f5f3ff',
  },
  teal: {
    primary: '#0d9488',
    primaryLight: '#14b8a6',
    primaryDark: '#0f766e',
    primaryMuted: '#ccfbf1',
    primarySubtle: '#f0fdfa',
  },
  rose: {
    primary: '#e11d48',
    primaryLight: '#f43f5e',
    primaryDark: '#be123c',
    primaryMuted: '#ffe4e6',
    primarySubtle: '#fff1f2',
  },
  amber: {
    primary: '#d97706',
    primaryLight: '#f59e0b',
    primaryDark: '#b45309',
    primaryMuted: '#fef3c7',
    primarySubtle: '#fffbeb',
  },
  emerald: {
    primary: '#059669',
    primaryLight: '#10b981',
    primaryDark: '#047857',
    primaryMuted: '#d1fae5',
    primarySubtle: '#ecfdf5',
  },
} as const;

export type AccentName = keyof typeof AccentPalettes;

// ─── Semantic Color Tokens ──────────────────────────────────────────────────
export const LightColors = {
  // Backgrounds
  background: '#ffffff',
  backgroundSecondary: '#f8fafc',
  backgroundTertiary: '#f1f5f9',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',

  // Text
  text: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textInverse: '#ffffff',

  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderFocused: '#2563eb',

  // Status colors
  success: '#16a34a',
  successBg: '#f0fdf4',
  successBorder: '#bbf7d0',
  warning: '#d97706',
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  error: '#dc2626',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  info: '#0891b2',
  infoBg: '#ecfeff',
  infoBorder: '#a5f3fc',

  // Navigation
  tabBar: '#ffffff',
  tabBarBorder: '#e2e8f0',
  tabInactive: '#94a3b8',

  // Cards
  card: '#ffffff',
  cardBorder: '#e2e8f0',

  // Overlays
  overlay: 'rgba(15, 23, 42, 0.5)',
  scrim: 'rgba(0, 0, 0, 0.3)',

  // Inputs
  inputBackground: '#f8fafc',
  inputBorder: '#e2e8f0',
  inputPlaceholder: '#94a3b8',

  // Misc
  skeleton: '#e2e8f0',
  divider: '#f1f5f9',
  shadow: 'rgba(0, 0, 0, 0.08)',
};

export const DarkColors: typeof LightColors = {
  // Backgrounds
  background: '#0f172a',
  backgroundSecondary: '#1e293b',
  backgroundTertiary: '#334155',
  surface: '#1e293b',
  surfaceElevated: '#334155',

  // Text
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textTertiary: '#64748b',
  textInverse: '#0f172a',

  // Borders
  border: '#334155',
  borderLight: '#1e293b',
  borderFocused: '#3b82f6',

  // Status colors
  success: '#4ade80',
  successBg: '#052e16',
  successBorder: '#166534',
  warning: '#fbbf24',
  warningBg: '#422006',
  warningBorder: '#713f12',
  error: '#f87171',
  errorBg: '#450a0a',
  errorBorder: '#7f1d1d',
  info: '#22d3ee',
  infoBg: '#083344',
  infoBorder: '#155e75',

  // Navigation
  tabBar: '#1e293b',
  tabBarBorder: '#334155',
  tabInactive: '#64748b',

  // Cards
  card: '#1e293b',
  cardBorder: '#334155',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  scrim: 'rgba(0, 0, 0, 0.5)',

  // Inputs
  inputBackground: '#334155',
  inputBorder: '#475569',
  inputPlaceholder: '#64748b',

  // Misc
  skeleton: '#334155',
  divider: '#334155',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

// ─── Typography ─────────────────────────────────────────────────────────────
export const Typography = {
  // Display
  displayLarge: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40, letterSpacing: -0.5 },
  displayMedium: { fontSize: 26, fontWeight: '800' as const, lineHeight: 34, letterSpacing: -0.3 },
  displaySmall: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },

  // Headlines
  headlineLarge: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
  headlineMedium: { fontSize: 18, fontWeight: '700' as const, lineHeight: 26 },
  headlineSmall: { fontSize: 16, fontWeight: '700' as const, lineHeight: 24 },

  // Body
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },

  // Labels
  labelLarge: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  labelMedium: { fontSize: 13, fontWeight: '600' as const, lineHeight: 20 },
  labelSmall: { fontSize: 11, fontWeight: '600' as const, lineHeight: 16 },

  // Captions
  caption: { fontSize: 11, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.3 },
  overline: { fontSize: 10, fontWeight: '700' as const, lineHeight: 14, letterSpacing: 0.8 },
};

// ─── Spacing ────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// ─── Border Radii ───────────────────────────────────────────────────────────
export const Radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const;

// ─── Shadows ────────────────────────────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;

// ─── Haptic Patterns ────────────────────────────────────────────────────────
export const HapticPatterns = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
  success: 'success',
  warning: 'warning',
  error: 'error',
} as const;

// ─── Animation durations ────────────────────────────────────────────────────
export const Durations = {
  fast: 150,
  normal: 250,
  slow: 400,
  theme: 300,
} as const;

// ─── Complete theme type ────────────────────────────────────────────────────
export type ColorScheme = 'light' | 'dark' | 'system';

export interface ThemeColors extends Record<string, string> {}

export interface Theme {
  colorScheme: 'light' | 'dark';
  colors: typeof LightColors & { primary: string; primaryLight: string; primaryDark: string; primaryMuted: string; primarySubtle: string };
  typography: typeof Typography;
  spacing: typeof Spacing;
  radii: typeof Radii;
  shadows: typeof Shadows;
  isDark: boolean;
}
