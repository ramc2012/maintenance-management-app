/**
 * Themed components — enhanced with ThemeContext support
 *
 * Provides theme-aware Text, View, and new UI primitives (Card, Badge, Button, Input).
 * Falls back gracefully if used outside ThemeProvider.
 */

import React from 'react';
import {
  Text as DefaultText,
  View as DefaultView,
  Pressable,
  PressableProps,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { useTheme } from '@/context/ThemeContext';
import { Radii, Shadows, Spacing } from '@/constants/theme';

// ─── Legacy compatibility hook ──────────────────────────────────────────────
type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

// ─── Text ───────────────────────────────────────────────────────────────────
export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

// ─── View ───────────────────────────────────────────────────────────────────
export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}

// ─── ThemedCard ─────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export function ThemedCard({ children, style, elevated = false }: CardProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <DefaultView
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: Radii.xl,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: Spacing.lg,
        },
        elevated && Shadows.md,
        style,
      ]}
    >
      {children}
    </DefaultView>
  );
}

// ─── ThemedButton ───────────────────────────────────────────────────────────
interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  loading?: boolean;
  style?: ViewStyle;
}

export function ThemedButton({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 13 },
    md: { paddingVertical: 12, paddingHorizontal: 18, fontSize: 15 },
    lg: { paddingVertical: 15, paddingHorizontal: 22, fontSize: 16 },
  }[size];

  const variantStyles = {
    primary: {
      bg: colors.primary,
      text: '#ffffff',
      border: colors.primary,
    },
    secondary: {
      bg: colors.primarySubtle,
      text: colors.primary,
      border: colors.primaryMuted,
    },
    ghost: {
      bg: 'transparent',
      text: colors.primary,
      border: 'transparent',
    },
    danger: {
      bg: colors.error,
      text: '#ffffff',
      border: colors.error,
    },
  }[variant];

  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: variantStyles.bg,
          borderRadius: Radii.md,
          borderWidth: 1,
          borderColor: variantStyles.border,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {icon && <MaterialCommunityIcons name={icon} size={sizeStyles.fontSize + 2} color={variantStyles.text} />}
      <DefaultText style={{ color: variantStyles.text, fontSize: sizeStyles.fontSize, fontWeight: '600' }}>
        {loading ? 'Loading...' : title}
      </DefaultText>
    </Pressable>
  );
}

// ─── ThemedInput ────────────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function ThemedInput({ label, error, containerStyle, style, ...props }: InputProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <DefaultView style={[{ marginBottom: Spacing.md }, containerStyle]}>
      {label && (
        <DefaultText style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
          {label}
        </DefaultText>
      )}
      <TextInput
        placeholderTextColor={colors.inputPlaceholder}
        style={[
          {
            backgroundColor: colors.inputBackground,
            borderWidth: 1,
            borderColor: error ? colors.error : colors.inputBorder,
            borderRadius: Radii.md,
            padding: 14,
            fontSize: 15,
            color: colors.text,
          },
          style,
        ]}
        {...props}
      />
      {error && (
        <DefaultText style={{ fontSize: 11, color: colors.error, marginTop: 4 }}>{error}</DefaultText>
      )}
    </DefaultView>
  );
}

// ─── ThemedBadge ────────────────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
}

export function ThemedBadge({ label, color, backgroundColor, size = 'sm' }: BadgeProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const bgColor = backgroundColor || colors.primarySubtle;
  const textColor = color || colors.primary;
  const fontSize = size === 'sm' ? 10 : 12;
  const padding = size === 'sm' ? { paddingHorizontal: 8, paddingVertical: 3 } : { paddingHorizontal: 10, paddingVertical: 5 };

  return (
    <DefaultView style={[{ backgroundColor: bgColor, borderRadius: Radii.full, ...padding }]}>
      <DefaultText style={{ fontSize, fontWeight: '700', color: textColor }}>{label}</DefaultText>
    </DefaultView>
  );
}

// ─── ThemedDivider ──────────────────────────────────────────────────────────
export function ThemedDivider({ style }: { style?: ViewStyle }) {
  const { theme } = useTheme();
  return <DefaultView style={[{ height: 1, backgroundColor: theme.colors.divider }, style]} />;
}
