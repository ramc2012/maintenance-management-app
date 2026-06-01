import React from 'react';
import { Linking, StyleSheet, Pressable, View } from 'react-native';
import { Text } from './Themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export interface ModuleCardProps {
  id: string;
  name: string;
  caption?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bg: string;
  link: string;
}

export const ModuleCard = ({ name, caption, icon, color, bg, link }: ModuleCardProps) => {
  const { theme } = useTheme();
  const router = useRouter();
  const { colors } = theme;
  const cardBackground = theme.isDark ? colors.card : bg;
  const iconBackground = theme.isDark ? `${color}24` : `${color}18`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => {
        if (/^https?:\/\//.test(link)) {
          Linking.openURL(link);
          return;
        }
        router.push(link as any);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBackground, borderColor: colors.cardBorder, shadowColor: colors.shadow },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBackground }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2} allowFontScaling={false}>{name}</Text>
      {caption ? (
        <Text style={[styles.caption, { color: colors.textTertiary }]} numberOfLines={1} allowFontScaling={false}>{caption}</Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '31.5%',
    minHeight: 78,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 7,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1,
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
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  name: {
    minHeight: 26,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  caption: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 13,
  },
});
