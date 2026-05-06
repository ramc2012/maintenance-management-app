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
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={accent} />
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {hint ? <Text style={[styles.hint, { color: colors.textTertiary }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 170,
    padding: 16,
    borderRadius: 18,
    marginRight: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
  },
  label: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
  },
});
