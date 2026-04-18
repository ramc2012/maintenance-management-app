import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useNetworkStatus } from '@/context/NetworkContext';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons name="wifi-strength-alert-outline" size={16} color="#7c2d12" />
      <Text style={styles.text}>
        You are offline. Live API data will refresh when the connection returns.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffedd5',
    borderBottomWidth: 1,
    borderBottomColor: '#fdba74',
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#7c2d12',
  },
});
