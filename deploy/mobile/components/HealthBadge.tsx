import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';

const HEALTH_COLORS: Record<string, string> = {
  A: '#16a34a',
  B: '#65a30d',
  C: '#d97706',
  D: '#dc2626',
};

export function HealthBadge({ grade }: { grade: 'A' | 'B' | 'C' | 'D' }) {
  const backgroundColor = HEALTH_COLORS[grade] ?? '#64748b';

  return (
    <View style={[styles.badge, { backgroundColor: `${backgroundColor}18`, borderColor: `${backgroundColor}40` }]}>
      <Text style={[styles.label, { color: backgroundColor }]}>Health {grade}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
