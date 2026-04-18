import React from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';

import { Text } from '@/components/Themed';
import api from '@/services/api';

export function ExportButton({
  endpoint,
  fileName,
  label = 'Export',
}: {
  endpoint: string;
  fileName: string;
  label?: string;
}) {
  const handleExport = async () => {
    try {
      const uri = await api.download(endpoint, fileName);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Export saved', `File downloaded to ${uri}`);
        return;
      }
      await Sharing.shareAsync(uri);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export file.';
      Alert.alert('Export failed', message);
    }
  };

  return (
    <Pressable style={styles.button} onPress={handleExport}>
      <MaterialCommunityIcons name="download" size={18} color="#0f172a" />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  label: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
});
