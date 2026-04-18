import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';

export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  const label = count > 99 ? '99+' : String(count);

  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
