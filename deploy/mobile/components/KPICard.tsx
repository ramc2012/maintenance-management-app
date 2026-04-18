import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';

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
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 170,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#0f172a',
  },
  label: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
});
