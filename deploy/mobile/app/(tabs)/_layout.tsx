import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { NotificationBadge } from '@/components/NotificationBadge';
import { useNotificationsBadge } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';

function TabIcon({
  icon,
  color,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}) {
  return <MaterialCommunityIcons name={icon} size={22} color={color} />;
}

export default function TabLayout() {
  const router = useRouter();
  const { unreadCount } = useNotificationsBadge();
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: [styles.headerTitle, { color: colors.text }],
        headerStyle: { backgroundColor: colors.surface },
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder }],
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        sceneStyle: { backgroundColor: colors.backgroundSecondary },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Maintenance Hub',
          tabBarIcon: ({ color }) => <TabIcon icon="view-dashboard-outline" color={color} />,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push('/(tabs)/two')} style={styles.headerAction}>
                <MaterialCommunityIcons name="bell-outline" size={22} color={colors.textSecondary} />
                <View style={styles.headerBadge}>
                  <NotificationBadge count={unreadCount} />
                </View>
              </Pressable>
              <Pressable onPress={() => router.push('/modules/settings')} style={styles.headerAction}>
                <MaterialCommunityIcons name="cog-outline" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Inbox',
          headerTitle: 'Notifications',
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconWrap}>
              <TabIcon icon="bell-outline" color={color} />
              <View style={styles.tabBadge}>
                <NotificationBadge count={unreadCount} />
              </View>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIconWrap: {
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -7,
    right: -14,
  },
});
