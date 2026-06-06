/**
 * Colors.ts — Legacy compatibility layer
 *
 * New code should use `useTheme()` from '@/context/ThemeContext' instead.
 * This file is kept for backward compatibility with existing components
 * that import Colors directly.
 */

import { LightColors, DarkColors } from './theme';

const tintColorLight = '#2563eb';
const tintColorDark = '#93c5fd';

export default {
  light: {
    ...LightColors,
    text: LightColors.text,
    background: LightColors.background,
    tint: tintColorLight,
    tabIconDefault: LightColors.tabInactive,
    tabIconSelected: tintColorLight,
  },
  dark: {
    ...DarkColors,
    text: DarkColors.text,
    background: DarkColors.background,
    tint: tintColorDark,
    tabIconDefault: DarkColors.tabInactive,
    tabIconSelected: tintColorDark,
  },
};
