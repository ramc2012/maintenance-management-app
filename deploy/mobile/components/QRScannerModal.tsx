import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, type BarcodeScanningResult } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';

export function QRScannerModal({
  visible,
  onClose,
  onCodeScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
}) {
  const [locked, setLocked] = useState(false);

  const handleScan = (result: BarcodeScanningResult) => {
    if (locked) {
      return;
    }
    setLocked(true);
    onCodeScanned(result.data);
    onClose();
    setTimeout(() => setLocked(false), 800);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan equipment QR</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color="#0f172a" />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Point the camera at an equipment or asset code.</Text>
        <View style={styles.scannerFrame}>
          <CameraView
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13'] }}
            onBarcodeScanned={handleScan}
            style={styles.camera}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 10,
    color: '#475569',
    fontSize: 14,
  },
  scannerFrame: {
    flex: 1,
    marginVertical: 24,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  camera: {
    flex: 1,
  },
});
