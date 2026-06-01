import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useNetworkStatus } from '@/context/NetworkContext';
import { useTheme } from '@/context/ThemeContext';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const { theme } = useTheme();
  const { colors } = theme;

  if (isOnline) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: colors.warningBg, borderBottomColor: colors.warningBorder }]}>
      <MaterialCommunityIcons name="wifi-strength-alert-outline" size={16} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning }]}>
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
    borderBottomWidth: 1,
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
