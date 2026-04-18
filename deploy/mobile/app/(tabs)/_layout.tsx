import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { NotificationBadge } from '@/components/NotificationBadge';
import { useNotificationsBadge } from '@/context/NotificationContext';

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

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: styles.headerTitle,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: '#1d4ed8',
        tabBarInactiveTintColor: '#64748b',
        sceneStyle: styles.scene,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Maintenance Hub',
          tabBarIcon: ({ color }) => <TabIcon icon="view-dashboard-outline" color={color} />,
          headerRight: () => (
            <Pressable onPress={() => router.push('/modules/settings')} style={styles.headerAction}>
              <MaterialCommunityIcons name="cog-outline" size={22} color="#334155" />
            </Pressable>
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
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerAction: {
    marginRight: 16,
  },
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  scene: {
    backgroundColor: '#f8fafc',
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
