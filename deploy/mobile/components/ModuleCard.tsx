import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Text } from './Themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';

interface ModuleCardProps {
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
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={icon} size={32} color={color} />
        </View>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
      </Pressable>
    </Link>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '45%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    marginBottom: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a1a',
  },
});
