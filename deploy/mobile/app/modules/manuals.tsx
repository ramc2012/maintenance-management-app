import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DOCUMENT_CATEGORIES = [
  { id: 'MECHANICAL', icon: 'cog', color: '#3b82f6', bg: '#eff6ff', docs: [
    { name: 'Compressor Operation Manual', type: 'PDF', size: '2.4 MB' },
    { name: 'Engine Maintenance Guide', type: 'PDF', size: '4.1 MB' },
    { name: 'Pump Assembly Drawing', type: 'DWG', size: '1.2 MB' },
  ]},
  { id: 'ELECTRICAL', icon: 'flash', color: '#f59e0b', bg: '#fffbeb', docs: [
    { name: 'Motor Control Circuit', type: 'PDF', size: '890 KB' },
    { name: 'Panel Wiring Diagram', type: 'DWG', size: '2.1 MB' },
    { name: 'Power Distribution SLD', type: 'PDF', size: '1.5 MB' },
  ]},
  { id: 'INSTRUMENTATION', icon: 'gauge', color: '#8b5cf6', bg: '#f5f3ff', docs: [
    { name: 'P&ID Master Drawing', type: 'DWG', size: '5.2 MB' },
    { name: 'Instrument Index', type: 'XLSX', size: '340 KB' },
    { name: 'Control System Manual', type: 'PDF', size: '3.8 MB' },
  ]},
];

export default function ManualsScreen() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const toggleCategory = (id: string) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const filteredCategories = DOCUMENT_CATEGORIES.map(cat => ({
    ...cat,
    docs: cat.docs.filter(doc => doc.name.toLowerCase().includes(filter.toLowerCase()))
  }));

  const totalDocs = DOCUMENT_CATEGORIES.reduce((sum, cat) => sum + cat.docs.length, 0);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Manuals & Drawings' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="file-document-multiple" size={40} color="#14b8a6" />
          <Text style={styles.headerTitle}>Technical Documentation</Text>
          <Text style={styles.headerSub}>{totalDocs} documents available</Text>
        </View>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
          <TextInput style={styles.searchInput} placeholder="Search documents..." value={filter} onChangeText={setFilter} />
        </View>

        {filteredCategories.map(cat => (
          <View key={cat.id} style={styles.categoryContainer}>
            <Pressable style={[styles.categoryHeader, { backgroundColor: cat.bg }]} onPress={() => toggleCategory(cat.id)}>
              <View style={styles.categoryLeft}>
                <MaterialCommunityIcons name={cat.icon as any} size={24} color={cat.color} />
                <Text style={[styles.categoryTitle, { color: cat.color }]}>{cat.id}</Text>
              </View>
              <View style={styles.categoryRight}>
                <Text style={styles.docCount}>{cat.docs.length} docs</Text>
                <MaterialCommunityIcons name={expandedCategory === cat.id ? 'chevron-up' : 'chevron-down'} size={20} color={cat.color} />
              </View>
            </Pressable>
            
            {expandedCategory === cat.id && (
              <View style={styles.docList}>
                {cat.docs.map((doc, i) => (
                  <Pressable key={i} style={styles.docItem}>
                    <MaterialCommunityIcons name={getDocIcon(doc.type)} size={20} color="#64748b" />
                    <View style={styles.docInfo}>
                      <Text style={styles.docName}>{doc.name}</Text>
                      <Text style={styles.docMeta}>{doc.type} • {doc.size}</Text>
                    </View>
                    <MaterialCommunityIcons name="download" size={20} color="#14b8a6" />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={20} color="#0891b2" />
          <Text style={styles.infoText}>Document viewing and downloads available through web application</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function getDocIcon(type: string): string {
  switch (type) {
    case 'PDF': return 'file-pdf-box';
    case 'DWG': return 'floor-plan';
    case 'XLSX': return 'file-excel';
    default: return 'file-document';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 12 },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  categoryContainer: { marginBottom: 12 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center' },
  categoryTitle: { fontSize: 14, fontWeight: '700', marginLeft: 12 },
  categoryRight: { flexDirection: 'row', alignItems: 'center' },
  docCount: { fontSize: 12, color: '#64748b', marginRight: 8 },
  docList: { backgroundColor: '#fff', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: -4, paddingTop: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  docInfo: { flex: 1, marginLeft: 12 },
  docName: { fontSize: 13, fontWeight: '500', color: '#0f172a' },
  docMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfeff', padding: 14, borderRadius: 12, marginTop: 8 },
  infoText: { fontSize: 12, color: '#0891b2', marginLeft: 10, flex: 1 },
});
