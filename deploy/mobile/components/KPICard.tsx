import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';

export function KPICard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent: string;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}${theme.isDark ? '30' : '18'}` }]}>
        <MaterialCommunityIcons name={icon} size={16} color={accent} />
      </View>
      <Text style={[styles.value, { color: colors.text }]} allowFontScaling={false}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]} allowFontScaling={false}>{label}</Text>
      {hint ? <Text style={[styles.hint, { color: colors.textTertiary }]} numberOfLines={1} allowFontScaling={false}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 112,
    padding: 9,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
  },
  hint: {
    marginTop: 2,
    fontSize: 10,
  },
});
