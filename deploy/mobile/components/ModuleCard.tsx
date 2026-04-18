import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Text } from './Themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';

export interface ModuleCardProps {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bg: string;
  link: string;
}

export const ModuleCard = ({ name, icon, color, bg, link }: ModuleCardProps) => {
  return (
    <Link href={link as any} asChild>
      <Pressable style={({ pressed }) => [
        styles.card,
        { backgroundColor: bg },
        pressed && styles.pressed
      ]}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}18` }]}>
          <MaterialCommunityIcons name={icon} size={32} color={color} />
        </View>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        <Text style={styles.caption}>Open module</Text>
      </Pressable>
    </Link>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '47%',
    minHeight: 152,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  caption: {
    fontSize: 12,
    color: '#64748b',
  },
});
