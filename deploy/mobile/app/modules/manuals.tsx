import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

const DOCUMENT_CATEGORIES = [
  { id: 'MECHANICAL', icon: 'cog', color: '#3b82f6', bg: '#eff6ff', darkBg: 'rgba(59,130,246,0.15)', docs: [
    { name: 'Compressor Operation Manual', type: 'PDF', size: '2.4 MB' },
    { name: 'Engine Maintenance Guide', type: 'PDF', size: '4.1 MB' },
    { name: 'Pump Assembly Drawing', type: 'DWG', size: '1.2 MB' },
  ]},
  { id: 'ELECTRICAL', icon: 'flash', color: '#f59e0b', bg: '#fffbeb', darkBg: 'rgba(245,158,11,0.15)', docs: [
    { name: 'Motor Control Circuit', type: 'PDF', size: '890 KB' },
    { name: 'Panel Wiring Diagram', type: 'DWG', size: '2.1 MB' },
    { name: 'Power Distribution SLD', type: 'PDF', size: '1.5 MB' },
  ]},
  { id: 'INSTRUMENTATION', icon: 'gauge', color: '#8b5cf6', bg: '#f5f3ff', darkBg: 'rgba(139,92,246,0.15)', docs: [
    { name: 'P&ID Master Drawing', type: 'DWG', size: '5.2 MB' },
    { name: 'Instrument Index', type: 'XLSX', size: '340 KB' },
    { name: 'Control System Manual', type: 'PDF', size: '3.8 MB' },
  ]},
] as const;

export default function ManualsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const toggleCategory = (id: string) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const filteredCategories = DOCUMENT_CATEGORIES.map(cat => ({
    ...cat,
    docs: cat.docs.filter(doc => doc.name.toLowerCase().includes(filter.toLowerCase()))
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Stack.Screen options={{
        title: 'Manuals & Drawings',
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="file-document-multiple" size={40} color="#14b8a6" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Technical Documentation</Text>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search documents..."
            placeholderTextColor={colors.inputPlaceholder}
            value={filter}
            onChangeText={setFilter}
          />
        </View>

        {filteredCategories.map(cat => (
          <View key={cat.id} style={styles.categoryContainer}>
            <Pressable
              style={[styles.categoryHeader, { backgroundColor: theme.isDark ? cat.darkBg : cat.bg }]}
              onPress={() => toggleCategory(cat.id)}
            >
              <View style={styles.categoryLeft}>
                <MaterialCommunityIcons name={cat.icon as any} size={24} color={cat.color} />
                <Text style={[styles.categoryTitle, { color: cat.color }]}>{cat.id}</Text>
              </View>
              <View style={styles.categoryRight}>
                <Text style={[styles.docCount, { color: colors.textTertiary }]}>{cat.docs.length} docs</Text>
                <MaterialCommunityIcons name={expandedCategory === cat.id ? 'chevron-up' : 'chevron-down'} size={20} color={cat.color} />
              </View>
            </Pressable>

            {expandedCategory === cat.id && (
              <View style={[styles.docList, { backgroundColor: colors.card }]}>
                {cat.docs.map((doc, i) => (
                  <Pressable key={i} style={[styles.docItem, { borderBottomColor: colors.backgroundTertiary }]}>
                    <MaterialCommunityIcons name={getDocIcon(doc.type)} size={20} color={colors.textTertiary} />
                    <View style={styles.docInfo}>
                      <Text style={[styles.docName, { color: colors.text }]}>{doc.name}</Text>
                      <Text style={[styles.docMeta, { color: colors.textTertiary }]}>{doc.type} • {doc.size}</Text>
                    </View>
                    <MaterialCommunityIcons name="download" size={20} color="#14b8a6" />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={[styles.infoCard, { backgroundColor: theme.isDark ? 'rgba(8,145,178,0.15)' : '#ecfeff' }]}>
          <MaterialCommunityIcons name="information" size={20} color="#0891b2" />
          <Text style={styles.infoText}>Document viewing and downloads available through web application</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function getDocIcon(type: string): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (type) {
    case 'PDF': return 'file-pdf-box';
    case 'DWG': return 'floor-plan';
    case 'XLSX': return 'file-excel';
    default: return 'file-document';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  categoryContainer: { marginBottom: 12 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center' },
  categoryTitle: { fontSize: 14, fontWeight: '700', marginLeft: 12 },
  categoryRight: { flexDirection: 'row', alignItems: 'center' },
  docCount: { fontSize: 12, marginRight: 8 },
  docList: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: -4, paddingTop: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  docInfo: { flex: 1, marginLeft: 12 },
  docName: { fontSize: 13, fontWeight: '500' },
  docMeta: { fontSize: 11, marginTop: 2 },
  infoCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginTop: 8 },
  infoText: { fontSize: 12, color: '#0891b2', marginLeft: 10, flex: 1 },
});
